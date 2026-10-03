#!/usr/bin/env node
// Behavioral eval suite: runs real, isolated Claude Code sessions against scenarios.
//
//   npm run eval                     every scenario once
//   npm run eval -- --runs 3         each scenario 3 times (passes if ⌈2N/3⌉ runs pass)
//   npm run eval -- --only full-flow
//
// Uses your logged-in Claude Code and counts against your plan's usage.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { ask, judge } = require("./claude");
const { passThreshold, outputDir, outputDirs } = require("./lib");
const { validate, validateDirection, resolveTokens, checkContrast } = require("../skills/design-direction/scripts/build");
const scenarios = require("./scenarios");

const ROOT = path.join(__dirname, "..");
const CONCURRENCY = 3;

function parseArgs(argv) {
  const opts = { runs: 1, only: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--runs") opts.runs = Math.max(1, parseInt(argv[++i], 10) || 1);
    else if (argv[i] === "--only") opts.only = argv[++i];
  }
  return opts;
}

function sandbox(id, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `dds-eval-${id}-${run}-`));
  execFileSync(process.execPath, [path.join(ROOT, "bin", "install.js")], { cwd: dir, stdio: "ignore" });
  return dir;
}

function context(dir, text, transcript, state) {
  const out = () => outputDir(dir);
  const readJson = (file) => {
    const o = out();
    try {
      return o ? JSON.parse(fs.readFileSync(path.join(o, file), "utf8")) : null;
    } catch {
      return null;
    }
  };
  const inOut = (file) => (out() ? path.join(out(), file) : null);
  return {
    text,
    transcript,
    dir,
    state,
    out,
    outs: () => outputDirs(dir),
    // Resolved the same way the generator does, so meta can come from direction.json
    tokens: () => resolveTokens(readJson("tokens.json"), readJson("direction.json")),
    direction: () => readJson("direction.json"),
    read: (file) => (inOut(file) && fs.existsSync(inOut(file)) ? fs.readFileSync(inOut(file), "utf8") : null),
    files: () => (out() ? fs.readdirSync(out()) : []),
    validate,
    validateDirection,
    checkContrast,
    fileExists: (file) => Boolean(inOut(file) && fs.existsSync(inOut(file))),
    mtime: (file) => (inOut(file) && fs.existsSync(inOut(file)) ? fs.statSync(inOut(file)).mtimeMs : 0),
  };
}

async function runScenario(scenario, run) {
  const dir = sandbox(scenario.id, run);
  if (scenario.setup) scenario.setup(dir);
  const state = {};
  const failures = [];
  const transcript = [];
  let sessionId = null;
  let costUsd = 0;

  try {
    for (const [i, turn] of scenario.turns.entries()) {
      const res = await ask(dir, turn.prompt, sessionId);
      sessionId = res.sessionId;
      costUsd += res.costUsd;
      transcript.push(`## Turn ${i + 1} — user\n\n${turn.prompt}\n\n## Turn ${i + 1} — assistant\n\n${res.text}`);
      const ctx = context(dir, res.text, transcript.join("\n\n"), state);
      for (const check of turn.checks) {
        let verdict;
        if (check.code) {
          try {
            verdict = check.code(ctx);
          } catch (err) {
            verdict = `check threw: ${err.message}`;
          }
          if (verdict !== true) failures.push(`turn ${i + 1} · ${check.name}: ${verdict}`);
        } else {
          const { rubric, material } = check.judge(ctx);
          const j = await judge(dir, rubric, material);
          if (!j.pass) failures.push(`turn ${i + 1} · ${check.name}: ${j.reason}`);
        }
      }
    }
  } catch (err) {
    failures.push(`error: ${err.message}`);
  }

  fs.writeFileSync(path.join(dir, "transcript.md"), transcript.join("\n\n"));
  return { id: scenario.id, run, pass: failures.length === 0, failures, dir, costUsd };
}

// Run async jobs with a concurrency limit, preserving order
async function pool(jobs, limit) {
  const results = new Array(jobs.length);
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const i = next++;
      results[i] = await jobs[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));
  return results;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const selected = scenarios.filter((s) => !opts.only || s.id === opts.only);
  if (!selected.length) {
    console.error(`No scenario "${opts.only}". Available: ${scenarios.map((s) => s.id).join(", ")}`);
    process.exit(2);
  }

  const started = Date.now();
  console.log(`Running ${selected.length} scenario(s) × ${opts.runs} run(s), ${CONCURRENCY} at a time…\n`);
  const jobs = selected.flatMap((s) =>
    Array.from({ length: opts.runs }, (_, r) => async () => {
      const res = await runScenario(s, r + 1);
      console.log(`${res.pass ? "✓" : "✗"} ${s.id} #${r + 1}${res.pass ? "" : `  (${res.dir})`}`);
      return res;
    })
  );
  const results = await pool(jobs, CONCURRENCY);

  const need = passThreshold(opts.runs);
  let allPass = true;
  console.log(`\n| Scenario | Passed | Result |\n|---|---|---|`);
  for (const s of selected) {
    const rs = results.filter((r) => r.id === s.id);
    const passed = rs.filter((r) => r.pass).length;
    const ok = passed >= need;
    if (!ok) allPass = false;
    console.log(`| ${s.id} | ${passed}/${rs.length} | ${ok ? "PASS" : "FAIL"} |`);
  }

  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.log("\nFailures:");
    for (const r of failed) {
      console.log(`\n${r.id} #${r.run} — transcript: ${path.join(r.dir, "transcript.md")}`);
      for (const f of r.failures) console.log(`  - ${f}`);
    }
  }
  const cost = results.reduce((sum, r) => sum + r.costUsd, 0);
  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`\n${allPass ? "PASS" : "FAIL"} · ${mins} min · ~$${cost.toFixed(2)} API-equivalent usage`);
  process.exit(allPass ? 0 : 1);
}

main();

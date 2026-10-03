// Pure helpers for the eval runner (unit-tested in test/eval-utils.test.js)

const fs = require("fs");
const path = require("path");

// A scenario passes if at least ⌈2N/3⌉ of N runs pass (1 of 1 when N = 1)
function passThreshold(runs) {
  return runs <= 1 ? 1 : Math.ceil((2 * runs) / 3);
}

// Parse `claude -p --output-format stream-json --verbose` output into
// { text, sessionId, isError, costUsd }. text joins every assistant text block in the turn.
function parseStream(stdout) {
  const texts = [];
  let sessionId = null;
  let isError = false;
  let costUsd = 0;
  for (const line of stdout.split("\n")) {
    if (!line.trim().startsWith("{")) continue;
    let ev;
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    if (ev.session_id) sessionId = ev.session_id;
    if (ev.type === "assistant" && ev.message && Array.isArray(ev.message.content)) {
      for (const block of ev.message.content) if (block.type === "text" && block.text) texts.push(block.text);
    }
    if (ev.type === "result") {
      isError = Boolean(ev.is_error);
      costUsd = ev.total_cost_usd || 0;
      if (!texts.length && ev.result) texts.push(ev.result);
    }
  }
  return { text: texts.join("\n\n"), sessionId, isError, costUsd };
}

// Extract {"pass": bool, "reason": string} from a judge reply, tolerating prose and code fences
function parseJudge(text) {
  const candidates = String(text).match(/\{[\s\S]*?\}/g) || [];
  for (const c of candidates.reverse()) {
    try {
      const j = JSON.parse(c);
      if (typeof j.pass === "boolean") return { pass: j.pass, reason: String(j.reason || "") };
    } catch {
      // try the next candidate
    }
  }
  return { pass: false, reason: `judge returned no verdict: ${String(text).slice(0, 200)}` };
}

// True when Claude Code answered with a plan/session usage-limit notice instead of doing the turn
function usageLimitHit(text) {
  return /hit your (session|usage|weekly) limit|usage limit reached/i.test(String(text));
}

// Relative paths of all files under dir, skipping .claude/
function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === ".claude") return [];
    const full = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(full, base) : [path.relative(base, full)];
  });
}

// Every design-direction-*/ folder holding a direction.json or tokens.json
function outputDirs(dir) {
  const hits = listFiles(dir).filter((f) => /^design-direction-[^/]+\/(direction|tokens)\.json$/.test(f));
  return [...new Set(hits.map((f) => path.join(dir, path.dirname(f))))].sort();
}

// The design-direction-*/ output folder Claude created, or null
function outputDir(dir) {
  return outputDirs(dir)[0] || null;
}

module.exports = { passThreshold, parseStream, parseJudge, usageLimitHit, listFiles, outputDir, outputDirs };

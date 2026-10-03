const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { passThreshold, parseStream, parseJudge, outputDir, outputDirs } = require("../evals/lib");

const tests = {
  "passThreshold: 1 of 1, 2 of 3, 4 of 5"() {
    assert.strictEqual(passThreshold(1), 1);
    assert.strictEqual(passThreshold(3), 2);
    assert.strictEqual(passThreshold(5), 4);
  },

  "parseStream: joins assistant text blocks and reads session/result"() {
    const lines = [
      JSON.stringify({ type: "system", subtype: "init", session_id: "s-1" }),
      JSON.stringify({ type: "assistant", session_id: "s-1", message: { content: [{ type: "text", text: "Hello" }, { type: "tool_use", name: "Write" }] } }),
      "not json",
      JSON.stringify({ type: "assistant", session_id: "s-1", message: { content: [{ type: "text", text: "World" }] } }),
      JSON.stringify({ type: "result", session_id: "s-1", is_error: false, result: "World", total_cost_usd: 0.12 }),
    ].join("\n");
    assert.deepStrictEqual(parseStream(lines), { text: "Hello\n\nWorld", sessionId: "s-1", isError: false, costUsd: 0.12 });
  },

  "parseStream: falls back to result text when no assistant blocks"() {
    const out = JSON.stringify({ type: "result", session_id: "s-2", is_error: true, result: "boom" });
    const r = parseStream(out);
    assert.strictEqual(r.text, "boom");
    assert.strictEqual(r.isError, true);
  },

  "usageLimitHit: detects Claude usage-limit replies"() {
    const { usageLimitHit } = require("../evals/lib");
    assert.strictEqual(usageLimitHit("You've hit your session limit · resets 3:10pm (Asia/Calcutta)"), true);
    assert.strictEqual(usageLimitHit("Claude usage limit reached. Your limit will reset at 5pm."), true);
    assert.strictEqual(usageLimitHit("### Mood Brief: Seedbook — no limits here"), false);
  },

  "parseJudge: plain JSON, fenced JSON, prose around JSON"() {
    assert.deepStrictEqual(parseJudge('{"pass": true, "reason": "ok"}'), { pass: true, reason: "ok" });
    assert.deepStrictEqual(parseJudge('```json\n{"pass": false, "reason": "no"}\n```'), { pass: false, reason: "no" });
    assert.strictEqual(parseJudge('Verdict:\n{"pass": true, "reason": "fine"}\nDone.').pass, true);
  },

  "parseJudge: missing verdict counts as a failure"() {
    const r = parseJudge("I think it passes.");
    assert.strictEqual(r.pass, false);
    assert.match(r.reason, /no verdict/);
  },

  "hasMoodBrief: detects a real brief, ignores mentions"() {
    const { hasMoodBrief } = require("../evals/scenarios");
    assert.strictEqual(hasMoodBrief("One more question before I write the mood brief."), false);
    assert.strictEqual(hasMoodBrief("### Mood Brief: Pennywise\n\n**Tone Words**\ncalm"), true);
    assert.strictEqual(hasMoodBrief("**Tone Words**\ncalm · capable"), true);
    assert.strictEqual(hasMoodBrief("## Mood Brief — Pennywise"), true);
  },

  "outputDir: finds design-direction-*/ by tokens.json or direction.json"() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dds-eval-"));
    assert.strictEqual(outputDir(dir), null);
    fs.mkdirSync(path.join(dir, "design-direction-hush"));
    fs.writeFileSync(path.join(dir, "design-direction-hush", "direction.json"), "{}");
    assert.strictEqual(outputDir(dir), path.join(dir, "design-direction-hush"));
    const other = fs.mkdtempSync(path.join(os.tmpdir(), "dds-eval-"));
    fs.mkdirSync(path.join(other, "design-direction-ledgerly"));
    fs.writeFileSync(path.join(other, "design-direction-ledgerly", "tokens.json"), "{}");
    assert.strictEqual(outputDir(other), path.join(other, "design-direction-ledgerly"));
  },

  "outputDirs: lists every direction folder"() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dds-eval-"));
    for (const slug of ["a", "b"]) {
      fs.mkdirSync(path.join(dir, `design-direction-${slug}`));
      fs.writeFileSync(path.join(dir, `design-direction-${slug}`, "direction.json"), "{}");
    }
    assert.strictEqual(outputDirs(dir).length, 2);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`✗ ${name}\n  ${err.message}`);
  }
}
console.log(`\n${Object.keys(tests).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

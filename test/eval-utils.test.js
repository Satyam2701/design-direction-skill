const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { passThreshold, parseStream, parseJudge, outputDir } = require("../evals/lib");

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

  "outputDir: finds design-direction-*/tokens.json"() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dds-eval-"));
    assert.strictEqual(outputDir(dir), null);
    fs.mkdirSync(path.join(dir, "design-direction-hush"));
    fs.writeFileSync(path.join(dir, "design-direction-hush", "tokens.json"), "{}");
    assert.strictEqual(outputDir(dir), path.join(dir, "design-direction-hush"));
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

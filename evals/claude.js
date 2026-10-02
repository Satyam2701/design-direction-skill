// Runs isolated headless Claude Code turns for the eval suite

const { spawn } = require("child_process");
const { parseStream, parseJudge } = require("./lib");

// User skills, plugins, hooks, and MCP servers stay out; only project .claude/skills load
const ISOLATION = ["--setting-sources", "project", "--strict-mcp-config"];
const TURN_TIMEOUT_MS = 8 * 60 * 1000;

function runClaude(args, cwd) {
  return new Promise((resolve) => {
    const child = spawn("claude", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    const timer = setTimeout(() => child.kill("SIGTERM"), TURN_TIMEOUT_MS);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

// One conversation turn. Pass sessionId to continue the same conversation.
async function ask(cwd, prompt, sessionId) {
  const args = [
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    ...ISOLATION,
    "--allowedTools", "Write", "Edit", "Read", "Bash(node:*)", "Bash(mkdir:*)", "Bash(ls:*)",
    "--disallowedTools", "Bash(open:*)", "Bash(xdg-open:*)",
  ];
  if (sessionId) args.push("--resume", sessionId);
  args.push("--", prompt);
  const res = await runClaude(args, cwd);
  const parsed = parseStream(res.stdout);
  if (!parsed.sessionId || (!parsed.text && res.code !== 0)) {
    throw new Error(`claude exited ${res.code}: ${(res.stderr || res.stdout).trim().slice(-400)}`);
  }
  return parsed;
}

// Grade material against a rubric with a separate, tool-less claude call
async function judge(cwd, rubric, material) {
  const prompt = `You are a strict grader for an automated test. Grade the material below against the rubric.

RUBRIC:
${rubric}

MATERIAL:
<<<
${material}
>>>

Reply with ONLY a JSON object, no other text: {"pass": true or false, "reason": "<one short sentence>"}`;
  const res = await runClaude(["-p", "--output-format", "stream-json", "--verbose", ...ISOLATION, "--", prompt], cwd);
  return parseJudge(parseStream(res.stdout).text);
}

module.exports = { ask, judge };

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const INSTALLER = path.join(__dirname, "..", "bin", "install.js");
const SKILL_SRC = path.join(__dirname, "..", "skills", "design-direction", "SKILL.md");
const SKILL = fs.readFileSync(SKILL_SRC, "utf8");

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dds-test-"));
  const home = path.join(root, "home");
  const project = path.join(root, "project");
  fs.mkdirSync(home);
  fs.mkdirSync(project);
  return { root, home, project };
}

function run(box, args = []) {
  return execFileSync(process.execPath, [INSTALLER, ...args], {
    cwd: box.project,
    env: { ...process.env, HOME: box.home, USERPROFILE: box.home },
    encoding: "utf8",
  });
}

const tests = {
  "installs into project at .claude/skills/design-direction/SKILL.md"() {
    const box = sandbox();
    run(box);
    const target = path.join(box.project, ".claude", "skills", "design-direction", "SKILL.md");
    assert.strictEqual(fs.readFileSync(target, "utf8"), SKILL);
    assert.ok(!fs.existsSync(path.join(box.home, ".claude")), "should not touch home dir");
  },

  "--global installs into ~/.claude/skills/design-direction/SKILL.md"() {
    const box = sandbox();
    run(box, ["--global"]);
    const target = path.join(box.home, ".claude", "skills", "design-direction", "SKILL.md");
    assert.strictEqual(fs.readFileSync(target, "utf8"), SKILL);
    assert.ok(!fs.existsSync(path.join(box.project, ".claude")), "should not touch project dir");
  },

  "re-running reports already up to date"() {
    const box = sandbox();
    run(box);
    assert.match(run(box), /already up to date/);
  },

  "updates an outdated install"() {
    const box = sandbox();
    const target = path.join(box.project, ".claude", "skills", "design-direction", "SKILL.md");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "old");
    assert.match(run(box), /Updating existing skill/);
    assert.strictEqual(fs.readFileSync(target, "utf8"), SKILL);
  },

  "removes the legacy v1.0.0 flat file"() {
    const box = sandbox();
    const legacy = path.join(box.project, ".claude", "skills", "design-direction.md");
    fs.mkdirSync(path.dirname(legacy), { recursive: true });
    fs.writeFileSync(legacy, SKILL);
    assert.match(run(box), /Removed old skill file/);
    assert.ok(!fs.existsSync(legacy));
    assert.ok(fs.existsSync(path.join(box.project, ".claude", "skills", "design-direction", "SKILL.md")));
  },

  "--help prints usage without installing"() {
    const box = sandbox();
    assert.match(run(box, ["--help"]), /Usage:/);
    assert.ok(!fs.existsSync(path.join(box.project, ".claude")));
  },

  "SKILL.md has frontmatter name matching its directory"() {
    const match = SKILL.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(match, "missing YAML frontmatter");
    assert.match(match[1], /^name: design-direction$/m);
    assert.match(match[1], /^description:/m);
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

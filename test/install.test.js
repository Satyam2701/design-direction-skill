const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const INSTALLER = path.join(__dirname, "..", "bin", "install.js");
const SKILL_SRC = path.join(__dirname, "..", "skills", "design-direction", "SKILL.md");
const SKILL = fs.readFileSync(SKILL_SRC, "utf8");

// Minimal frontmatter parser: handles `key: value` and folded `key: >` blocks
function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fields = {};
  let key = null;
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([a-z-]+):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      fields[key] = kv[2] === ">" ? "" : kv[2];
    } else if (key && /^\s+\S/.test(line)) {
      fields[key] = (fields[key] + " " + line.trim()).trim();
    }
  }
  return fields;
}

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

  "description is at most 400 characters and covers key triggers"() {
    const { description } = parseFrontmatter(SKILL);
    assert.ok(description.length <= 400, `description is ${description.length} chars`);
    for (const phrase of ["style guide", "moodboard", "brand direction", "color palette"]) {
      assert.ok(description.includes(phrase), `description missing "${phrase}"`);
    }
  },

  "Phase 1 has smart intake with quick mode"() {
    for (const marker of ["### Intake", "Start by extracting", "all at once"]) {
      assert.ok(SKILL.includes(marker), `SKILL.md missing "${marker}"`);
    }
  },

  "Phase 2 palette has dark mode, semantic roles and contrast check"() {
    assert.ok(SKILL.includes("| Role | Light | Dark | Usage |"), "missing Light/Dark palette header");
    for (const role of ["On Primary", "Success", "Warning", "Error", "Info"]) {
      assert.match(SKILL, new RegExp(`^\\| ${role} \\|`, "m"), `palette missing role "${role}"`);
    }
    assert.ok(SKILL.includes("Contrast Check"), "missing Contrast Check section");
    assert.ok(SKILL.includes("Compute, never estimate"), "missing compute-not-estimate rule");
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

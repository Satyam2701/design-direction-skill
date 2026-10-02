#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");

const SKILL_NAME = "design-direction";
const SKILL_SRC_DIR = path.join(__dirname, "..", "skills", SKILL_NAME);

// Relative paths of every file in the skill directory (SKILL.md, scripts/...)
function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full)];
  });
}

const args = process.argv.slice(2);
const isGlobal = args.includes("--global") || args.includes("-g");
const isHelp = args.includes("--help") || args.includes("-h");

if (isHelp) {
  console.log(`
design-direction-skill installer

Usage:
  npx design-direction-skill           Install into current project (.claude/skills/design-direction/)
  npx design-direction-skill --global  Install globally (~/.claude/skills/design-direction/)

Options:
  -g, --global   Install globally for all projects
  -h, --help     Show this help message
`);
  process.exit(0);
}

const skillsDir = isGlobal
  ? path.join(os.homedir(), ".claude", "skills")
  : path.join(process.cwd(), ".claude", "skills");

// Claude Code loads skills from .claude/skills/<name>/SKILL.md
const targetDir = path.join(skillsDir, SKILL_NAME);
const targetFile = path.join(targetDir, "SKILL.md");

// v1.0.0 installed to .claude/skills/design-direction.md, which Claude Code never loads
const legacyFile = path.join(skillsDir, `${SKILL_NAME}.md`);
if (fs.existsSync(legacyFile)) {
  fs.unlinkSync(legacyFile);
  console.log(`✗ Removed old skill file from a previous version:\n  ${legacyFile}`);
}

const files = listFiles(SKILL_SRC_DIR);
const isCurrent = (rel) => {
  const dest = path.join(targetDir, rel);
  return fs.existsSync(dest) && fs.readFileSync(dest).equals(fs.readFileSync(path.join(SKILL_SRC_DIR, rel)));
};

// Check if already installed
if (fs.existsSync(targetFile)) {
  if (files.every(isCurrent)) {
    console.log(`✓ design-direction skill is already up to date at:\n  ${targetDir}`);
    process.exit(0);
  }
  console.log(`↻ Updating existing skill at:\n  ${targetDir}`);
} else {
  console.log(`Installing design-direction skill to:\n  ${targetDir}`);
}

for (const rel of files) {
  const dest = path.join(targetDir, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(SKILL_SRC_DIR, rel), dest);
}

console.log(`
✓ Done! The design-direction skill is ready.

How to use it in Claude Code:
  /design-direction

Or just describe your idea:
  "I'm designing a [product] that should feel..."

${isGlobal ? "The skill is available in all your projects." : "The skill is available in this project only.\nRun with --global to install for all projects."}
`);

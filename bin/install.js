#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");

const SKILL_NAME = "design-direction";
const SKILL_SRC = path.join(__dirname, "..", "skills", SKILL_NAME, "SKILL.md");

const args = process.argv.slice(2);
const isGlobal = args.includes("--global") || args.includes("-g");
const isHelp = args.includes("--help") || args.includes("-h");

if (isHelp) {
  console.log(`
design-direction-skill installer

Usage:
  npx design-direction-skill           Install into current project (.claude/skills/)
  npx design-direction-skill --global  Install globally (~/.claude/skills/)

Options:
  -g, --global   Install globally for all projects
  -h, --help     Show this help message
`);
  process.exit(0);
}

const targetDir = isGlobal
  ? path.join(os.homedir(), ".claude", "skills")
  : path.join(process.cwd(), ".claude", "skills");

const targetFile = path.join(targetDir, `${SKILL_NAME}.md`);

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Check if already installed
if (fs.existsSync(targetFile)) {
  const existing = fs.readFileSync(targetFile, "utf8");
  const incoming = fs.readFileSync(SKILL_SRC, "utf8");
  if (existing === incoming) {
    console.log(`✓ design-direction skill is already up to date at:\n  ${targetFile}`);
    process.exit(0);
  }
  console.log(`↻ Updating existing skill at:\n  ${targetFile}`);
} else {
  console.log(`Installing design-direction skill to:\n  ${targetFile}`);
}

fs.copyFileSync(SKILL_SRC, targetFile);

console.log(`
✓ Done! The design-direction skill is ready.

How to use it in Claude Code:
  /design-direction

Or just describe your idea:
  "I'm designing a [product] that should feel..."

${isGlobal ? "The skill is available in all your projects." : "The skill is available in this project only.\nRun with --global to install for all projects."}
`);

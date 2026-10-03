# design-direction

[![npm](https://img.shields.io/npm/v/design-direction-skill)](https://www.npmjs.com/package/design-direction-skill)
[![GitHub](https://img.shields.io/badge/github-Satyam2701%2Fdesign--direction--skill-blue)](https://github.com/Satyam2701/design-direction-skill)

A Claude Code skill for standalone designers. Takes a vague product idea and turns it into a complete, actionable design direction through three collaborative phases.

---

## What It Does

Most designers know the feeling: you have a product to design but the brief is fuzzy. "Make it feel modern and clean" is not a direction. This skill fixes that.

You describe your idea in plain language. Claude picks up what you've already said, asks only what's missing (one at a time, or all at once if you prefer), then walks you through three phases:

**Phase 1 — Mood Brief**
Tone words, color story, typography personality, visual do's and don'ts, and a design manifesto. Something you can pin above your desk.

**Phase 2 — Concrete Spec**
A full palette in light and dark mode — including semantic success, warning, error, and info colors — with every text pairing checked against WCAG AA contrast. Plus type scale, spacing system, and component style rules.

Phase 2 also generates a **visual style tile** — one HTML page showing your palette, type specimen, spacing, and real components (buttons, inputs, cards, alerts) in your product's own voice, with a light/dark toggle — plus **developer-ready tokens**: CSS variables, a Tailwind v4 theme, and a W3C design-tokens JSON that Figma token plugins can import. Everything is generated from one `tokens.json`, so what you approve is exactly what developers get.

**Phase 3 — Feature Thinking**
User flows, feature ideas, and micro-interaction concepts — all tied to your specific direction and audience.

---

## Installation

**Option A — npm (recommended):**
```bash
# Install into current project only
npx design-direction-skill

# Install globally for all projects
npx design-direction-skill --global
```

**Option B — Manual (project level):**
```bash
mkdir -p .claude/skills/design-direction/scripts
curl -o .claude/skills/design-direction/SKILL.md \
  https://raw.githubusercontent.com/Satyam2701/design-direction-skill/main/skills/design-direction/SKILL.md
curl -o .claude/skills/design-direction/scripts/build.js \
  https://raw.githubusercontent.com/Satyam2701/design-direction-skill/main/skills/design-direction/scripts/build.js
```

**Option C — Manual (global):**
```bash
mkdir -p ~/.claude/skills/design-direction/scripts
curl -o ~/.claude/skills/design-direction/SKILL.md \
  https://raw.githubusercontent.com/Satyam2701/design-direction-skill/main/skills/design-direction/SKILL.md
curl -o ~/.claude/skills/design-direction/scripts/build.js \
  https://raw.githubusercontent.com/Satyam2701/design-direction-skill/main/skills/design-direction/scripts/build.js
```

---

## Usage

Start a session in Claude Code and trigger the skill in any of these ways:

```
/design-direction
```

Or just describe your idea naturally:

```
I'm designing a fintech app that should feel trustworthy but not boring
```

```
Help me nail the vibe for a recipe app targeting busy parents
```

```
I want something that feels premium but approachable — not sure where to start
```

Claude will take it from there.

---

## Example Session

```
You:     I'm building a wellness app that should feel calm and premium

Claude:  Who is this for? Tell me about the person who'll use this —
         their age, vibe, what they care about.

You:     Women in their 30s, career-focused, want to slow down but
         don't have much time

Claude:  What does this product actually do? Give me the one-sentence version.

...

Claude:  ── Mood Brief ──────────────────────────────
         Tone Words: still luxury · earned slowness · quiet ritual
         Color Story: [3 palette directions with rationale]
         Typography: humanist serif + geometric sans
         ...
         Does this mood feel right?

You:     Yes, love it

Claude:  ── Design Spec ─────────────────────────────
         Primary: #2C3E35   Surface: #F7F4EF
         Heading 1: 48px / 300 / 1.15
         ...

Claude:  ── Feature Thinking ────────────────────────
         User Flows: Onboarding · Daily Check-in · Progress
         Feature Ideas: [5 ideas tied to the direction]
         Interactions: [6 micro-interaction concepts]
```

---

## Output

Everything lands in one folder in your project:

```
design-direction-wellness-app/
├── style-tile.html      ← open in a browser; light/dark toggle
├── tokens.json          ← source of truth (W3C design tokens; Figma token plugins can import it)
├── tokens.css           ← CSS custom properties, light + dark
├── tailwind.css         ← Tailwind v4 @theme
└── design-direction-wellness-app-2026-10-03.md   ← the full direction, saved at the end
```

Revisions regenerate the files, so the tile always matches the spec. Drop the markdown into Figma notes, Notion, or Linear, and hand the token files straight to a developer.

---

## Requirements

- Claude Code (CLI, desktop, or IDE extension)
- Node.js 16+ for the style tile and token files (if `npx` works, you have it). Without Node, the skill still runs and produces the spec as text.
- No API keys, no dependencies

---

## Testing

```bash
npm test                      # installer, generator, and eval-helper unit tests (fast, no network)
npm run eval                  # behavioral evals: real Claude Code sessions against scenarios
npm run eval -- --runs 3      # each scenario 3×; passes if 2 of 3 runs pass (use before releases)
npm run eval -- --only full-flow
```

`npm run eval` drives headless Claude Code (`claude -p`) through five scenarios — smart intake, quick mode, the Phase 1 approval gate, a low-contrast "pastel" brief, and a four-turn flow from spec to saved document — and grades each turn with code checks (valid tokens, passing contrast, files written) plus an LLM rubric for judgment calls like brand voice. Each run uses a throwaway project with only this skill installed; your own skills, plugins, hooks, and MCP servers are excluded. It uses your logged-in Claude Code, so it counts toward your plan's usage (a single pass takes a few minutes). Failed runs print the path to a full transcript.

---

## Releasing

Publishing is automated via [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) — no tokens or 2FA prompts. Run `npm run eval -- --runs 3` first.

```bash
npm version patch   # bumps package.json, commits, and tags vX.Y.Z
git push origin main --follow-tags
```

The tag triggers `.github/workflows/publish.yml`, which runs the tests and publishes to npm with provenance.

---

## License

MIT — free to use, share, and modify.

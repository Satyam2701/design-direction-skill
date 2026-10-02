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
A full palette in light and dark mode — including semantic success, warning, error, and info colors — with every text pairing checked against WCAG AA contrast. Plus type scale, spacing system, and component style rules. Ready to paste into Figma or hand to a developer.

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
mkdir -p .claude/skills/design-direction
curl -o .claude/skills/design-direction/SKILL.md \
  https://raw.githubusercontent.com/Satyam2701/design-direction-skill/main/skills/design-direction/SKILL.md
```

**Option C — Manual (global):**
```bash
mkdir -p ~/.claude/skills/design-direction
curl -o ~/.claude/skills/design-direction/SKILL.md \
  https://raw.githubusercontent.com/Satyam2701/design-direction-skill/main/skills/design-direction/SKILL.md
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

At the end of the session, Claude offers to save everything as a single shareable markdown file:

```
design-direction-wellness-app-2026-05-16.md
```

Drop it into Figma notes, Notion, Linear, or hand it directly to a developer.

---

## Requirements

- Claude Code (CLI, desktop, or IDE extension)
- No API keys, no external tools, no setup beyond copying the skill file

---

## Releasing

Publishing is automated via [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) — no tokens or 2FA prompts.

```bash
npm version patch   # bumps package.json, commits, and tags vX.Y.Z
git push origin main --follow-tags
```

The tag triggers `.github/workflows/publish.yml`, which runs the tests and publishes to npm with provenance.

---

## License

MIT — free to use, share, and modify.

# Design Direction Skill — Design Spec

**Date:** 2026-05-16
**Skill name:** `design-direction`
**Author:** satyamtiwari

---

## Goal

A Claude skill for standalone designers that takes a vague product idea and turns it into a concrete, actionable design direction — covering mood, visual spec, and feature thinking — through a structured three-phase collaborative session.

---

## Problem

Standalone designers using Claude get generic advice. When they say "I want something modern and clean," Claude responds with broad principles instead of a specific, usable direction. There is no skill today that:
- Extracts design intent through focused dialogue
- Produces a visual mood brief for sign-off
- Converts that brief into real, copy-pasteable specs
- Brainstorms features, flows, and interactions tied to that exact direction

---

## Trigger Phrases

The skill activates when the user says things like:
- "I'm designing a [product] that should feel..."
- "Help me nail the vibe for..."
- "I want something that feels..."
- "I'm building a [type of app/site], not sure about the direction"
- "Give me a design direction for..."

---

## Architecture

Three sequential phases. Each phase requires explicit user approval before the next begins. Claude never skips ahead.

```
[Vague Idea]
     ↓
Phase 1: Mood Brief (Q&A → Approval)
     ↓
Phase 2: Concrete Spec (Derived from Brief → Approval)
     ↓
Phase 3: Feature Thinking (Flows + Features + Interactions → Approval)
     ↓
[Complete Design Direction Package]
```

---

## Phase 1 — Mood Brief

### Input
A vague description of a product and its desired feeling.

### Process
Claude asks 3–5 clarifying questions, **one at a time**, in this order:
1. Who is this for? (audience)
2. What is this product/service?
3. What feeling should it **avoid**? (the anti-brief)
4. Any brands, products, or visuals that are close to what you want? (optional reference)
5. One word that describes the experience at its best?

If the user mentions a reference (brand/product they admire), Claude uses it to anchor the direction — deconstructs what makes it work and builds a new direction inspired by (not copying) it.

### Output — Mood Brief
```
TONE WORDS
3–5 adjectives that define the personality (e.g. "quiet confidence, organic warmth, editorial restraint")

COLOR STORY
2–3 palette directions, each with:
- A name ("Warm Stone", "Deep Dusk")
- A short rationale (why it fits this product/audience)
- General hue/temperature description (not hex — that's Phase 2)

TYPOGRAPHY PERSONALITY
- Serif or sans-serif? Why?
- Weight feel (light and airy vs bold and confident)
- One suggested pairing (e.g. "Display serif + geometric sans")

VISUAL DO/DON'T RULES
- 3 dos (e.g. "Use generous whitespace, let content breathe")
- 3 don'ts (e.g. "No drop shadows, no gradients, no crowded layouts")

DESIGN MANIFESTO
One short paragraph (3–4 sentences) that captures the full direction. Should feel like something a designer could pin above their desk.
```

**Gate:** Claude asks "Does this mood feel right? Anything to adjust before I build out the spec?" and waits for approval.

---

## Phase 2 — Concrete Spec

### Input
Approved mood brief from Phase 1.

### Process
Claude derives exact values from the mood brief. No additional questions — the brief contains all needed signal.

### Output — Design Spec
```
COLOR PALETTE
- Primary: #hex — usage note
- Secondary: #hex — usage note
- Neutral 100–900: scale of 4–5 hex values
- Accent: #hex — usage note
- Background: #hex
- Surface: #hex
- Text primary / secondary / disabled: #hex each

TYPOGRAPHY SCALE
- Font families: [Display font], [Body font] — with Google Fonts or system font fallback
- Heading 1: size / weight / line-height
- Heading 2: size / weight / line-height
- Heading 3: size / weight / line-height
- Body: size / weight / line-height
- Caption: size / weight / line-height
- Label: size / weight / line-height / letter-spacing

SPACING SYSTEM
- Base unit: 4px or 8px
- Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96

COMPONENT STYLE RULES
- Border radius: [value and rule — e.g. "8px for cards, 4px for inputs, full for pills"]
- Shadow: [CSS box-shadow value or "no shadows"]
- Button style: [filled / outlined / ghost — corner radius, padding, font weight]
- Input style: [border style, radius, focus state]
- Card style: [background, border, shadow, radius]
```

**Gate:** Claude asks "Does the spec match the direction you had in mind?" and waits for approval.

---

## Phase 3 — Feature Thinking

### Input
Approved mood brief + spec from Phases 1–2, plus the product description.

### Process
Claude generates all three sub-sections as one output, anchored to the product type and design direction.

### Output — Feature Thinking

#### A. User Flows (2–3 flows)
For each flow:
- Flow name (e.g. "Onboarding", "Core action", "Discovery")
- Step-by-step screen list (e.g. "1. Splash → 2. Value prop → 3. Sign up → 4. Personalization → 5. Home")
- One-line description of each screen's purpose

#### B. Feature Ideas (5 features)
For each feature:
- Feature name
- One-sentence description
- Why it fits this design direction and audience
- Rough effort tag: [Quick win / Medium / Big bet]

#### C. Interaction & UX Concepts (5–7 concepts)
For each concept:
- Interaction name (e.g. "Scroll-triggered fade-in", "Haptic confirmation")
- Where it lives in the product
- Why it reinforces the mood (tie back to tone words)
- One-line implementation note

**Gate:** Claude asks "Does this feature direction feel aligned with your vision? Anything to add or cut?" and waits for final approval.

---

## Skill File Structure

```
.claude/skills/design-direction.md
```

Single skill file. No supporting scripts needed — pure prompt engineering.

---

## Skill File Sections (in order)

1. `name` and `description` frontmatter
2. Trigger phrases
3. Hard gate: no skipping phases
4. Phase 1 instructions + output template
5. Phase 1 approval gate
6. Phase 2 instructions + output template
7. Phase 2 approval gate
8. Phase 3 instructions + output template (A + B + C)
9. Phase 3 approval gate
10. Closing: offer to save the full direction as a PDF-ready markdown file

---

## Tone & Style of the Skill

- Warm, collaborative, creative — not clinical or technical
- Speaks like a senior designer / creative director, not a software engineer
- Uses design vocabulary naturally (hierarchy, rhythm, negative space, tension, warmth)
- Never outputs a wall of text — uses clear sections and whitespace

---

## Non-Goals

- Does not generate images or mockups
- Does not write code (no CSS output)
- Does not integrate with Figma (use the Figma MCP skill for that)
- Does not replace a full design system audit

---

## Success Criteria

A designer finishes a session with:
1. A mood brief they feel proud to share with a client or team
2. A spec they can paste directly into Figma or a style guide
3. A feature brainstorm that makes the product feel real and thought-through

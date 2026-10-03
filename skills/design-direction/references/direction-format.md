# direction.json format

Read this before writing or updating `design-direction-<slug>/direction.json`. It holds everything
that isn't a design token: the brief, the mood, the feature thinking and progress. The board and the
markdown document are generated from it, so write real content here — never placeholders.

## Shape

```json
{
  "product": {
    "name": "Stillwater",
    "summary": "A meditation app with short, guided sessions that fit between meetings.",
    "audience": "Career-focused women in their 30s who want to slow down but have little time.",
    "oneWord": "restored",
    "avoid": "Clinical wellness, hustle-culture urgency, gamified streak pressure."
  },
  "references": ["Aesop", "Kinfolk magazine"],
  "mood": {
    "toneWords": ["quiet confidence", "earned slowness", "warm minimalism"],
    "palettes": [
      {
        "name": "Warm Stone",
        "feeling": "Grounded and calm, like a sunlit stone floor.",
        "direction": "Muted sage greens, warm off-whites, one terracotta accent; low saturation, warm.",
        "swatches": ["#55705A", "#F7F3EC", "#A9B8A3", "#A65A40", "#2E2B27"]
      }
    ],
    "typography": {
      "personality": "Light, airy headlines that whisper; a calm, highly readable body.",
      "pairing": "A soft humanist serif for headlines + a clean geometric sans for body",
      "heading": "Fraunces",
      "body": "Inter"
    },
    "dos": ["Let generous negative space do the calming"],
    "donts": ["No streak counters or red notification badges"],
    "manifesto": "Stillwater is the ten minutes she gives back to herself. …"
  },
  "status": {
    "phase": 1,
    "approved": [],
    "needsReview": [],
    "log": [{ "date": "2026-10-03", "note": "Mood brief drafted" }]
  }
}
```

`features` is added in Phase 3 — see `references/feature-thinking.md`.

## Rules

- **product:** `name`, `summary` (one sentence), `audience`, `oneWord` are required. `avoid` is the
  anti-brief. Use the user's own words where you can.
- **references:** what they mentioned; `[]` if none.
- **mood.toneWords:** 3–5.
- **mood.palettes:** 2–3 distinct directions. Each needs a `name`, a `feeling` (why it fits this
  audience and product), a `direction` (hue, temperature, saturation in words), and 3–5 `swatches`
  as `#RRGGBB`. Swatches are representative mood colors so the board can show the story — they are
  not the final spec. Order them dominant → accent.
- **mood.typography:** `heading` and `body` are Google Fonts family names (the board loads them for a
  live pairing preview). `pairing` is the one-line recommendation; `personality` explains the feel.
- **mood.dos / mood.donts:** 3 specific rules each.
- **mood.manifesto:** 3–4 sentences a designer would pin above their desk.

## Status

`status` drives the progress indicator on the board. Keep it accurate:

| Moment | Update |
|---|---|
| Phase 1 brief drafted | `phase: 1`, `approved: []` |
| User approves the mood | add `1` to `approved`, set `phase: 2` |
| User approves the spec | add `2` to `approved`, set `phase: 3` |
| User approves the features | add `3` to `approved` (keep `phase: 3`) |
| An approved phase is revised | add every later approved phase to `needsReview`; when the user re-approves a phase, remove it from `needsReview` |

Append a short `log` entry (`{ "date": "YYYY-MM-DD", "note": "…" }`) for every approval and
revision, e.g. `"Primary made more vibrant (#1F3A5F → #1D4A9C)"`.

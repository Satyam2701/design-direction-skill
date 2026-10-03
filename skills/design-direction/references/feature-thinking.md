# Feature Thinking format

Read this before writing Phase 3. Feature thinking is stored in `direction.json` under `features`;
the board renders it in full, so chat only needs a summary.

## features in direction.json

```json
"features": {
  "flows": [
    {
      "name": "First session",
      "steps": [
        { "screen": "Welcome", "purpose": "Set a slower pace before anything is asked" },
        { "screen": "Pick a length", "purpose": "3, 5 or 10 minutes — nothing more to decide" },
        { "screen": "Breathe", "purpose": "The session itself" }
      ]
    }
  ],
  "ideas": [
    {
      "name": "Between-meetings mode",
      "what": "Suggests a 3-minute session when the calendar has a gap",
      "why": "Meets her where her time actually is",
      "effort": "Medium"
    }
  ],
  "interactions": [
    {
      "name": "Breathing ring",
      "where": "Session screen",
      "what": "A ring that expands over 4 seconds and contracts over 6",
      "why": "earned slowness",
      "note": "CSS transform with a 4s/6s ease-in-out loop; respects prefers-reduced-motion"
    }
  ]
}
```

- **flows:** 2–3 key flows (e.g. onboarding, the core action, discovery), each with 3–6 steps.
- **ideas:** exactly 5. `effort` must be `"Quick win"`, `"Medium"` or `"Big bet"`. `why` ties back to
  the mood, audience or product goal.
- **interactions:** 5–7 micro-interaction or UX concepts. `why` names the tone word or manifesto idea
  it expresses; `note` is a one-line hint for a developer or prototyper.

Everything should feel like it belongs to the same product — tie back to the tone words and audience.

## Chat summary

After building, present this in chat (the board holds the detail):

---

### Feature Thinking: [Product Name]

**User flows:** [Flow name] (n steps) · [Flow name] (n steps)

**Feature ideas**
- **[Name]** — [what it does] *(Quick win / Medium / Big bet)*
- *(all 5)*

**Interaction concepts:** [Name] · [Name] · [Name] · …

Full flows, rationale and implementation notes are on the board: `design-direction-<slug>/board.html#features`

---

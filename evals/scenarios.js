// Eval scenarios. Each turn sends a prompt, then runs checks:
//   { name, code: (ctx) => true | "failure reason" }
//   { name, judge: (ctx) => ({ rubric, material }) }
// ctx: { text, transcript, dir, out, tokens, state, fileExists, mtime, validate, checkContrast }

const approved = (brief) =>
  `Here's my approved mood brief for my design direction — I explicitly approve it, so go straight to the concrete spec (Phase 2).\n\n${brief}`;

const LEDGERLY = `Mood Brief: Ledgerly, a bookkeeping app for freelance creatives.
Tone words: calm competence, friendly precision, unfussy.
Color story: Ink & Marigold (deep ink blue, warm paper white, marigold accent).
Typography: geometric sans headlines, readable humanist sans body, confident medium weights.
Visual do's: generous whitespace, tabular numbers, one accent moment per screen.
Visual don'ts: red-alert panic styling, dense spreadsheets, stock fintech gradients.
Manifesto: Money should feel handled, not haunting. Ledgerly turns the chaos of invoices into a quiet, confident rhythm.
One word: handled.`;

const HUSH = `Mood Brief: Hush, a sleep-sounds app for light sleepers.
Tone words: whisper-soft, weightless, ethereal.
Color story: Pastel Haze — pale lavender, pale peach, misty white. Everything pastel-on-pastel, with whisper-light pale grey text and pale lavender buttons with white labels.
Typography: thin, airy rounded sans for everything.
Manifesto: Hush is the softest room in your phone. Nothing sharp, nothing loud, nothing that asks for attention.
One word: drift.`;

// Shared code checks
const noMoodBriefYet = { name: "no mood brief yet", code: (c) => !/Mood Brief/i.test(c.text) || "produced a Mood Brief before intake finished" };
const noSpecYet = { name: "no spec or tokens yet", code: (c) => (!/\| Role \| Light/.test(c.text) && !c.out()) || "produced the spec/tokens before mood brief approval" };

const tokensValid = {
  name: "tokens.json valid",
  code: (c) => {
    if (!c.tokens()) return "no design-direction-*/tokens.json written";
    const errors = c.validate(c.tokens());
    return errors.length === 0 || `invalid tokens: ${errors.slice(0, 3).join("; ")}`;
  },
};
const contrastPasses = {
  name: "all contrast pairs pass",
  code: (c) => {
    if (!c.tokens() || c.validate(c.tokens()).length) return "no valid tokens to check";
    const failing = c.checkContrast(c.tokens()).filter((r) => !r.pass);
    return failing.length === 0 || `failing: ${failing.map((r) => `${r.label} ${r.mode} ${r.ratio}`).join(", ")}`;
  },
};
const tileWritten = { name: "style tile written", code: (c) => c.fileExists("style-tile.html") || "no style-tile.html next to tokens.json" };

module.exports = [
  {
    id: "intake-extract",
    turns: [
      {
        prompt:
          "I'm designing a budgeting app for college students who are anxious about money. It tracks spending and splits bills with roommates. It should never feel like a bank — no corporate stiffness, no guilt-tripping. The one word I want them to leave with is 'capable'.",
        checks: [
          noMoodBriefYet,
          noSpecYet,
          {
            name: "asks only about references",
            judge: (c) => ({
              rubric:
                "The user already gave the audience, the product, what to avoid, and the one word. PASS only if the assistant (1) briefly acknowledges or confirms what the user already said, and (2) asks about references/inspiration (brands, apps, products, or visuals), and (3) does NOT re-ask about audience, product, what to avoid, or the one word, and (4) asks no more than one question.",
              material: c.text,
            }),
          },
        ],
      },
    ],
  },

  {
    id: "intake-quick-mode",
    turns: [
      {
        prompt: "Help me nail the vibe for my app.",
        checks: [
          noMoodBriefYet,
          noSpecYet,
          {
            name: "offers one-at-a-time vs all-at-once",
            judge: (c) => ({
              rubric:
                "The user gave almost no information. PASS only if the assistant offers the user a choice between answering its questions one at a time or seeing them all at once. It must not dump a full design direction.",
              material: c.text,
            }),
          },
        ],
      },
    ],
  },

  {
    id: "phase1-gate",
    turns: [
      {
        prompt:
          "Give me a design direction. Here's everything at once: 1) Audience: retired gardeners in their 60s and 70s, hands-on, a bit skeptical of apps. 2) Product: a plant-care journal that reminds you when to water and lets you log photos of your garden over the seasons. 3) Absolutely avoid: anything techy, neon, or 'gamified'. 4) References: Gardenista, old seed-packet illustrations, Muji. 5) One word: rooted.",
        checks: [
          { name: "produces a mood brief", code: (c) => /Mood Brief/i.test(c.text) || "no Mood Brief in response" },
          noSpecYet,
          {
            name: "asks for approval before the spec",
            judge: (c) => ({
              rubric:
                "PASS only if the response presents a mood brief (tone words, color story, typography, do's/don'ts, manifesto) and then asks the user whether it feels right / for approval before moving on. It must NOT include hex codes, a type scale table, or a concrete spec.",
              material: c.text,
            }),
          },
        ],
      },
    ],
  },

  {
    id: "contrast-pressure",
    turns: [
      {
        prompt: approved(HUSH),
        checks: [tokensValid, contrastPasses, tileWritten],
      },
    ],
  },

  {
    id: "full-flow",
    turns: [
      {
        prompt: approved(LEDGERLY),
        checks: [
          tokensValid,
          contrastPasses,
          tileWritten,
          {
            name: "chat hexes match tokens.json",
            code: (c) => {
              if (!c.tokens() || c.validate(c.tokens()).length) return "no valid tokens";
              const text = c.text.toUpperCase();
              const missing = Object.entries(c.tokens().color).filter(([, t]) => !text.includes(t.$value.toUpperCase()));
              return missing.length === 0 || `hexes not shown in chat: ${missing.map(([k]) => k).join(", ")}`;
            },
          },
          {
            name: "tile copy is in the product's voice",
            judge: (c) => ({
              rubric:
                "This is sample UI copy for the style tile of Ledgerly, a bookkeeping app for freelance creatives (tone: calm competence, friendly precision, unfussy). PASS only if the copy exists, is specific to bookkeeping/invoicing/freelancing (not generic placeholder text), and matches that calm, friendly tone.",
              material: JSON.stringify((c.tokens() && c.tokens().meta && c.tokens().meta.copy) || null, null, 2),
            }),
          },
          {
            name: "remember primary and tile time",
            code: (c) => {
              c.state.primary = c.tokens() && c.tokens().color.primary.$value;
              c.state.tileTime = c.mtime("style-tile.html");
              return true;
            },
          },
        ],
      },
      {
        prompt: "Close, but make the primary color more vibrant — it feels a little too muted.",
        checks: [
          { name: "primary changed", code: (c) => (c.tokens() && c.tokens().color.primary.$value !== c.state.primary) || `primary still ${c.state.primary}` },
          tokensValid,
          contrastPasses,
          { name: "tile regenerated", code: (c) => c.mtime("style-tile.html") > c.state.tileTime || "style-tile.html not regenerated" },
        ],
      },
      {
        prompt: "Approved — that's the spec.",
        checks: [
          { name: "feature thinking heading", code: (c) => /Feature Thinking/i.test(c.text) || "no Feature Thinking section" },
          { name: "5+ feature ideas with effort", code: (c) => (c.text.match(/Effort:?\**\s*:?/gi) || []).length >= 5 || "fewer than 5 'Effort:' lines" },
        ],
      },
      {
        prompt: "Approved. Yes, please save it.",
        checks: [
          {
            name: "markdown saved in the folder",
            code: (c) => {
              const out = c.out();
              if (!out) return "no output folder";
              return require("fs").readdirSync(out).some((f) => f.endsWith(".md")) || "no .md file inside design-direction-*/";
            },
          },
        ],
      },
    ],
  },
];

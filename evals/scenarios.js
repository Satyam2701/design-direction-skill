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

// An actual mood brief (its heading or Tone Words section), not a mention like "before I write the mood brief"
const hasMoodBrief = (text) => /^#{1,4}\s*Mood Brief|\*\*Tone Words\*\*|^#{1,4}\s*Tone Words/im.test(text);

// Shared code checks
const noMoodBriefYet = { name: "no mood brief yet", code: (c) => !hasMoodBrief(c.text) || "produced a Mood Brief before intake finished" };
const noSpecYet = { name: "no spec or tokens yet", code: (c) => (!/\| Role \| Light/.test(c.text) && !c.tokens()) || "produced the spec/tokens before mood brief approval" };

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
const boardWritten = { name: "board written", code: (c) => c.fileExists("board.html") || "no board.html in the direction folder" };
const directionValid = {
  name: "direction.json valid",
  code: (c) => {
    if (!c.direction()) return "no design-direction-*/direction.json written";
    const errors = c.validateDirection(c.direction());
    return errors.length === 0 || `invalid direction: ${errors.slice(0, 3).join("; ")}`;
  },
};
const phaseApproved = (n) => ({
  name: `phase ${n} recorded as approved`,
  code: (c) => ((c.direction() && (c.direction().status.approved || []).includes(n)) || `status.approved lacks ${n}: ${JSON.stringify(c.direction() && c.direction().status)}`),
});

// Seed a saved Stillwater direction: mood and spec approved, features not started
function seedStillwater(dir) {
  const fs = require("fs");
  const path = require("path");
  const fixtures = path.join(__dirname, "..", "test", "fixtures");
  const out = path.join(dir, "design-direction-stillwater");
  fs.mkdirSync(out);
  const direction = JSON.parse(fs.readFileSync(path.join(fixtures, "direction.json"), "utf8"));
  direction.status = { phase: 3, approved: [1, 2], needsReview: [], log: [{ date: "2026-10-01", note: "Mood approved" }, { date: "2026-10-02", note: "Spec approved" }] };
  fs.writeFileSync(path.join(out, "direction.json"), JSON.stringify(direction, null, 2));
  fs.copyFileSync(path.join(fixtures, "tokens.json"), path.join(out, "tokens.json"));
}

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
          { name: "produces a mood brief", code: (c) => hasMoodBrief(c.text) || "no Mood Brief in response" },
          noSpecYet,
          directionValid,
          boardWritten,
          { name: "phase 1 not yet approved", code: (c) => (c.direction() && !(c.direction().status.approved || []).includes(1)) || "mood marked approved before the user approved it" },
          {
            name: "asks for approval before the spec",
            judge: (c) => ({
              rubric:
                "PASS only if the response presents a mood brief summary (tone words, color story / palette directions, typography, and a manifesto; it may point to a board file for full detail) and then asks the user whether it feels right / for approval before moving on. It must NOT include a palette table with hex codes per role, a type scale table, or a concrete spec.",
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
        checks: [tokensValid, contrastPasses, boardWritten],
      },
    ],
  },

  {
    id: "resume",
    setup: seedStillwater,
    turns: [
      {
        prompt: "Hi, I'm back to work on Stillwater.",
        checks: [
          noMoodBriefYet,
          { name: "no new direction folder", code: (c) => c.outs().length === 1 || `expected 1 direction folder, found ${c.outs().length}` },
          { name: "waits before writing features", code: (c) => !(c.direction() && c.direction().features) || "wrote features before the user chose to continue" },
          {
            name: "offers to continue from features",
            judge: (c) => ({
              rubric:
                "A saved design direction for 'Stillwater' exists with the mood and the spec already approved and feature thinking not started. The user only said they are back. PASS only if the assistant (1) recognizes it is Stillwater, (2) conveys that mood and spec are done and features/feature thinking come next, (3) offers to continue (offering to revise or start fresh as well is fine) and waits for an answer, and (4) does NOT restart the intake (no questions about audience, product, references, or the one word) and does NOT produce a new mood brief, spec, or feature thinking.",
              material: c.text,
            }),
          },
        ],
      },
      {
        prompt: "Continue.",
        checks: [
          { name: "feature thinking in chat", code: (c) => /Feature Thinking/i.test(c.text) || "no Feature Thinking summary in chat" },
          directionValid,
          { name: "features saved with 5+ ideas", code: (c) => ((c.direction() && c.direction().features && c.direction().features.ideas.length >= 5) || "direction.json has no features with 5+ ideas") },
          { name: "approvals preserved", code: (c) => (c.direction() && [1, 2].every((n) => c.direction().status.approved.includes(n))) || "lost the existing approvals" },
        ],
      },
    ],
  },

  {
    id: "resume-direct",
    setup: seedStillwater,
    turns: [
      {
        prompt: "Let's keep going on my design direction.",
        checks: [
          noMoodBriefYet,
          { name: "no new direction folder", code: (c) => c.outs().length === 1 || `expected 1 direction folder, found ${c.outs().length}` },
          { name: "feature thinking in chat", code: (c) => /Feature Thinking/i.test(c.text) || "no Feature Thinking summary in chat" },
          directionValid,
          { name: "features saved with 5+ ideas", code: (c) => ((c.direction() && c.direction().features && c.direction().features.ideas.length >= 5) || "direction.json has no features with 5+ ideas") },
          {
            name: "continues without re-asking",
            judge: (c) => ({
              rubric:
                "A saved 'Stillwater' direction has mood and spec approved. The user said 'Let's keep going'. PASS only if the assistant briefly recaps where things stand and proceeds to feature thinking for Stillwater, WITHOUT restarting the intake (no questions about audience, product, references, or the one word) and WITHOUT redoing the mood brief or spec.",
              material: c.text,
            }),
          },
        ],
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
          boardWritten,
          directionValid,
          phaseApproved(1),
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
            name: "board copy is in the product's voice",
            judge: (c) => ({
              rubric:
                "This is sample UI copy for the design board components of Ledgerly, a bookkeeping app for freelance creatives (tone: calm competence, friendly precision, unfussy). PASS only if the copy exists, is specific to bookkeeping/invoicing/freelancing (not generic placeholder text), and matches that calm, friendly tone.",
              material: JSON.stringify((c.tokens() && c.tokens().meta && c.tokens().meta.copy) || null, null, 2),
            }),
          },
          {
            name: "remember primary and board time",
            code: (c) => {
              c.state.primary = c.tokens() && c.tokens().color.primary.$value;
              c.state.boardTime = c.mtime("board.html");
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
          { name: "board regenerated", code: (c) => c.mtime("board.html") > c.state.boardTime || "board.html not regenerated" },
          { name: "revision logged", code: (c) => ((c.direction() && (c.direction().status.log || []).length >= 1) || "no status.log entry for the revision") },
        ],
      },
      {
        prompt: "Approved — that's the spec.",
        checks: [
          { name: "feature thinking in chat", code: (c) => /Feature Thinking/i.test(c.text) || "no Feature Thinking summary in chat" },
          directionValid,
          { name: "features saved with 5+ ideas", code: (c) => ((c.direction() && c.direction().features && c.direction().features.ideas.length >= 5) || "direction.json has no features with 5+ ideas") },
          phaseApproved(2),
          { name: "board shows features", code: (c) => ((c.read("board.html") || "").includes('id="features"') && !(c.read("board.html") || "").includes("Comes after Phase 2")) || "board has no Features section" },
        ],
      },
      {
        prompt: "Approved. Yes, please save it.",
        checks: [
          phaseApproved(3),
          {
            name: "markdown document has every phase",
            code: (c) => {
              const md = c.files().find((f) => f.endsWith(".md"));
              if (!md) return "no .md file inside design-direction-*/";
              const text = c.read(md);
              return ["## Mood Brief", "## Design Spec", "## Feature Thinking"].every((h) => text.includes(h)) || "markdown is missing a phase section";
            },
          },
        ],
      },
    ],
  },
];

module.exports.hasMoodBrief = hasMoodBrief;

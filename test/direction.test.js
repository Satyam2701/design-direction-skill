const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { validateDirection, phaseState, EFFORTS } = require("../skills/design-direction/scripts/lib/direction");
const FIXTURE = path.join(__dirname, "fixtures", "direction.json");
const fixture = () => JSON.parse(fs.readFileSync(FIXTURE, "utf8"));

const FEATURES = {
  flows: [{ name: "First session", steps: [{ screen: "Welcome", purpose: "Set the tone" }, { screen: "Pick a length", purpose: "3, 5 or 10 minutes" }] }],
  ideas: ["A", "B", "C", "D", "E"].map((n, i) => ({ name: `Idea ${n}`, what: "Does a thing", why: "Fits the mood", effort: EFFORTS[i % 3] })),
  interactions: ["X", "Y", "Z"].map((n) => ({ name: `Concept ${n}`, where: "Home", what: "Moves softly", why: "earned slowness", note: "CSS transition 600ms" })),
};

const tests = {
  "validateDirection: fixture is valid"() {
    assert.deepStrictEqual(validateDirection(fixture()), []);
  },

  "validateDirection: fixture with features is valid"() {
    assert.deepStrictEqual(validateDirection({ ...fixture(), features: FEATURES }), []);
  },

  "validateDirection: reports product, mood and swatch problems with paths"() {
    const d = fixture();
    delete d.product.oneWord;
    delete d.mood.manifesto;
    d.mood.palettes[1].swatches[0] = "mauve";
    d.mood.toneWords = ["just one"];
    const errors = validateDirection(d).join("\n");
    assert.match(errors, /product\.oneWord/);
    assert.match(errors, /mood\.manifesto/);
    assert.match(errors, /mood\.palettes\[1\]\.swatches\[0\]/);
    assert.match(errors, /mood\.toneWords/);
  },

  "validateDirection: palettes must number 2–3 with 3–5 swatches"() {
    const d = fixture();
    d.mood.palettes = d.mood.palettes.slice(0, 1);
    assert.match(validateDirection(d).join("\n"), /mood\.palettes/);
    const e = fixture();
    e.mood.palettes[0].swatches = ["#111111", "#222222"];
    assert.match(validateDirection(e).join("\n"), /mood\.palettes\[0\]\.swatches/);
  },

  "validateDirection: features need 5 ideas with a valid effort"() {
    const d = { ...fixture(), features: { ...FEATURES, ideas: FEATURES.ideas.slice(0, 4) } };
    assert.match(validateDirection(d).join("\n"), /features\.ideas/);
    const e = { ...fixture(), features: { ...FEATURES, ideas: FEATURES.ideas.map((x, i) => (i === 2 ? { ...x, effort: "Huge" } : x)) } };
    assert.match(validateDirection(e).join("\n"), /features\.ideas\[2\]\.effort/);
  },

  "validateDirection: status phase must be 1–3"() {
    const d = fixture();
    d.status.phase = 4;
    assert.match(validateDirection(d).join("\n"), /status\.phase/);
  },

  "phaseState: approved, in review, needs review, not started"() {
    const status = { phase: 3, approved: [1, 2], needsReview: [2] };
    assert.strictEqual(phaseState(status, 1), "approved");
    assert.strictEqual(phaseState(status, 2), "needs review");
    assert.strictEqual(phaseState(status, 3), "in review");
    assert.strictEqual(phaseState({ phase: 1, approved: [] }, 2), "not started");
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

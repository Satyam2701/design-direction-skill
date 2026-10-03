const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const BUILD = path.join(__dirname, "..", "skills", "design-direction", "scripts", "build.js");
const read = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8"));
const direction = () => read("direction.json");
const tokens = () => read("tokens.json");

const FEATURES = {
  flows: [
    { name: "First session", steps: [{ screen: "Welcome", purpose: "Set a slower pace" }, { screen: "Pick a length", purpose: "3, 5 or 10 minutes" }, { screen: "Breathe", purpose: "The session itself" }] },
  ],
  ideas: [
    { name: "Between-meetings mode", what: "Suggests a 3-minute session when your calendar has a gap", why: "Meets her where her time actually is", effort: "Medium" },
    { name: "Soft streaks", what: "Shows days practised without ever resetting to zero", why: "No guilt — earned slowness", effort: "Quick win" },
    { name: "Evening wind-down", what: "A dimmed, slower variant of the app after 9pm", why: "Quiet confidence at the end of the day", effort: "Big bet" },
    { name: "Session notes", what: "One line of reflection after each session", why: "Restored, not optimised", effort: "Quick win" },
    { name: "Ambient soundscapes", what: "Optional rain or room tone under guidance", why: "Warm minimalism you can hear", effort: "Medium" },
  ],
  interactions: [
    { name: "Breathing ring", where: "Session screen", what: "A ring that expands over 4 seconds and contracts over 6", why: "earned slowness", note: "CSS transform with a 4s/6s ease-in-out loop" },
    { name: "Unhurried page turns", where: "Onboarding", what: "Screens cross-fade over 600ms", why: "quiet confidence", note: "opacity transition, prefers-reduced-motion aware" },
    { name: "Warm press", where: "Primary buttons", what: "Button warms slightly toward terracotta on press", why: "warm minimalism", note: "color-mix() on :active" },
  ],
};

// Build from a design-direction-<slug>/ folder holding the given files
function runFolder(files, slug = "stillwater") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dds-board-"));
  const dir = path.join(root, `design-direction-${slug}`);
  fs.mkdirSync(dir);
  for (const [name, data] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2));
  return run(dir, dir);
}

function run(arg, dir) {
  const res = spawnSync(process.execPath, [BUILD, arg], { encoding: "utf8" });
  const readOut = (name) => {
    const p = path.join(dir, name);
    return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  };
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, read: readOut, dir };
}

const tests = {
  "direction only: board with Mood, placeholders, markdown, no token files"() {
    const r = runFolder({ "direction.json": { ...direction(), status: { phase: 1, approved: [] } } });
    assert.strictEqual(r.status, 0, r.stderr);
    const html = r.read("board.html");
    assert.ok(html, "board.html written");
    assert.ok(html.includes("Stillwater is the ten minutes"), "manifesto");
    for (const name of ["Warm Stone", "Dusk Linen", "Morning Fog"]) assert.ok(html.includes(name), `palette ${name}`);
    assert.ok(html.includes("#8A6F7E"), "palette swatch hex");
    assert.ok(html.includes("No streak counters"), "don'ts");
    assert.ok(html.includes("Comes after Phase 1 approval"), "spec placeholder");
    assert.ok(html.includes("Comes after Phase 2 approval"), "features placeholder");
    assert.strictEqual(r.read("tokens.css"), null);
    assert.strictEqual(r.read("style-tile.html"), null);
    const md = r.read("design-direction-stillwater.md");
    assert.ok(md && md.includes("# Stillwater") && md.includes("Warm Stone"), "markdown written");
    assert.ok(!r.stdout.includes("Contrast Check"), "no contrast tables without tokens");
  },

  "direction + tokens: Mood and Spec sections, token files, tables"() {
    const r = runFolder({ "direction.json": direction(), "tokens.json": tokens() });
    assert.strictEqual(r.status, 0, r.stderr);
    const html = r.read("board.html");
    for (const id of ['id="mood"', 'id="spec"', 'id="features"']) assert.ok(html.includes(id), id);
    assert.ok(html.includes("#55705A") && html.includes("#9DB59F"), "token hexes");
    assert.ok(html.includes("Comes after Phase 2 approval"), "features placeholder");
    assert.ok(!html.includes("Comes after Phase 1 approval"), "spec is not a placeholder");
    assert.ok(r.read("tokens.css") && r.read("tailwind.css"), "token files");
    assert.ok(r.stdout.includes("Contrast Check"), "tables printed");
    const md = r.read("design-direction-stillwater.md");
    assert.ok(md.includes("| Role | Light | Dark | Usage |"), "md palette table");
    assert.ok(md.includes("Contrast Check"), "md contrast table");
  },

  "with features: flows, ideas with effort badges, interactions"() {
    const d = { ...direction(), features: FEATURES, status: { phase: 3, approved: [1, 2] } };
    const r = runFolder({ "direction.json": d, "tokens.json": tokens() });
    assert.strictEqual(r.status, 0, r.stderr);
    const html = r.read("board.html");
    assert.ok(!html.includes("Comes after Phase"), "no placeholders left");
    for (const text of ["Between-meetings mode", "Big bet", "Pick a length", "Breathing ring", "CSS transform with a 4s/6s"]) {
      assert.ok(html.includes(text), text);
    }
    const md = r.read("design-direction-stillwater.md");
    assert.ok(md.includes("Feature Ideas") && md.includes("Soft streaks") && md.includes("Breathing ring"), "md features");
  },

  "progress states render in the header"() {
    const d = { ...direction(), status: { phase: 2, approved: [1], needsReview: [] } };
    const html = runFolder({ "direction.json": d, "tokens.json": tokens() }).read("board.html");
    assert.match(html, /data-phase="1"[^>]*data-state="approved"/);
    assert.match(html, /data-phase="2"[^>]*data-state="in-review"/);
    assert.match(html, /data-phase="3"[^>]*data-state="not-started"/);
    const n = runFolder({ "direction.json": { ...d, status: { phase: 3, approved: [1, 2], needsReview: [2] } }, "tokens.json": tokens() }).read("board.html");
    assert.match(n, /data-phase="2"[^>]*data-state="needs-review"/);
  },

  "tokens.meta is filled from direction.json"() {
    const t = tokens();
    delete t.meta.name;
    delete t.meta.toneWords;
    delete t.meta.manifesto;
    const r = runFolder({ "direction.json": direction(), "tokens.json": t });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.read("tokens.css").includes("Stillwater"), "name filled in");
  },

  "invalid direction exits 2 and writes nothing"() {
    const d = direction();
    delete d.mood.manifesto;
    const r = runFolder({ "direction.json": d, "tokens.json": tokens() });
    assert.strictEqual(r.status, 2);
    assert.match(r.stderr, /ERROR mood\.manifesto/);
    assert.strictEqual(r.read("board.html"), null);
    assert.strictEqual(r.read("tokens.css"), null);
  },

  "empty folder exits 2"() {
    const r = runFolder({});
    assert.strictEqual(r.status, 2);
    assert.match(r.stderr, /direction\.json|tokens\.json/);
  },

  "tokens.json path picks up a sibling direction.json"() {
    const root = runFolder({ "direction.json": direction(), "tokens.json": tokens() }).dir;
    fs.rmSync(path.join(root, "board.html"));
    const r = run(path.join(root, "tokens.json"), root);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.read("board.html").includes("Stillwater is the ten minutes"), "mood included");
  },

  "escapes HTML in every direction field"() {
    const x = "<script>alert(1)</script>";
    const d = { ...direction(), features: JSON.parse(JSON.stringify(FEATURES)) };
    d.product.audience = x;
    d.mood.manifesto = x;
    d.mood.palettes[0].name = x;
    d.mood.dos[0] = x;
    d.references = [x];
    d.features.ideas[0].name = x;
    d.features.flows[0].steps[0].screen = x;
    d.features.interactions[0].note = x;
    d.status = { phase: 3, approved: [1, 2], log: [{ date: "2026-10-03", note: x }] };
    const html = runFolder({ "direction.json": d, "tokens.json": tokens() }).read("board.html");
    assert.ok(!html.includes("<script>alert(1)"), "unescaped script tag");
    assert.ok(html.includes("&lt;script&gt;alert(1)"), "escaped text present");
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

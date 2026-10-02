const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const BUILD = path.join(__dirname, "..", "skills", "design-direction", "scripts", "build.js");
const FIXTURE = path.join(__dirname, "fixtures", "tokens.json");
const { contrastRatio, validate } = require(BUILD);

function fixture() {
  return JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
}

// Write tokens into a fresh temp dir and run the CLI on them
function runBuild(tokens) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dds-build-"));
  const file = path.join(dir, "tokens.json");
  fs.writeFileSync(file, JSON.stringify(tokens, null, 2));
  const res = spawnSync(process.execPath, [BUILD, file], { encoding: "utf8" });
  const read = (name) => {
    const p = path.join(dir, name);
    return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  };
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, read };
}

const tests = {
  "contrastRatio: black on white is 21"() {
    assert.strictEqual(contrastRatio("#000000", "#FFFFFF"), 21);
    assert.strictEqual(contrastRatio("#FFFFFF", "#000000"), 21);
  },

  "contrastRatio: matches known WCAG values"() {
    assert.strictEqual(contrastRatio("#777777", "#FFFFFF").toFixed(2), "4.48");
    assert.strictEqual(contrastRatio("#2E2B27", "#F7F3EC").toFixed(2), "12.73");
  },

  "validate: fixture is valid"() {
    assert.deepStrictEqual(validate(fixture()), []);
  },

  "validate: reports missing role, bad hex, missing dark value"() {
    const t = fixture();
    delete t.color["on-primary"];
    t.color.accent.$value = "orange";
    delete t.color.info.$extensions;
    const errors = validate(t).join("\n");
    assert.match(errors, /color\.on-primary/);
    assert.match(errors, /color\.accent/);
    assert.match(errors, /color\.info/);
  },

  "validate: reports missing typography style and font"() {
    const t = fixture();
    delete t.typography.caption;
    delete t.font.body;
    const errors = validate(t).join("\n");
    assert.match(errors, /typography\.caption/);
    assert.match(errors, /font\.body/);
  },

  "CLI: valid tokens exit 0 and write all outputs"() {
    const r = runBuild(fixture());
    assert.strictEqual(r.status, 0, r.stderr);
    const css = r.read("tokens.css");
    assert.ok(css.includes("--color-primary: #55705A"), "light value");
    assert.ok(css.includes('[data-theme="dark"]'), "dark selector");
    assert.ok(css.includes("--color-primary: #9DB59F"), "dark value");
    assert.ok(css.includes("prefers-color-scheme: dark"), "system dark");
    const tw = r.read("tailwind.css");
    assert.ok(tw.includes("@theme"), "tailwind @theme");
    assert.ok(tw.includes("--color-primary: #55705A"));
    assert.ok(r.read("style-tile.html"), "style tile written");
  },

  "CLI: stdout has palette and contrast tables"() {
    const r = runBuild(fixture());
    assert.ok(r.stdout.includes("| Role | Light | Dark | Usage |"));
    assert.ok(r.stdout.includes("Contrast Check"));
    assert.match(r.stdout, /Neutral 900 on Background \| 12\.73:1 ✓/);
  },

  "CLI: invalid tokens exit 2 and write nothing"() {
    const t = fixture();
    delete t.color["on-primary"];
    const r = runBuild(t);
    assert.strictEqual(r.status, 2);
    assert.match(r.stderr, /color\.on-primary/);
    assert.strictEqual(r.read("tokens.css"), null);
    assert.strictEqual(r.read("style-tile.html"), null);
  },

  "CLI: failing contrast exits 1 and names the pair"() {
    const t = fixture();
    t.color["neutral-600"].$value = "#B8B2A8";
    const r = runBuild(t);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /FAIL Neutral 600 on Background light \d+\.\d+:1 \(needs 4\.5:1\)/);
    assert.ok(r.read("style-tile.html"), "outputs still written");
  },

  "CLI: accent pair only checked when accentAsText"() {
    const t = fixture();
    t.meta.accentAsText = false;
    t.color.accent.$value = "#E8B4A0";
    assert.strictEqual(runBuild(t).status, 0);
    t.meta.accentAsText = true;
    assert.strictEqual(runBuild(t).status, 1);
  },

  "style tile: contains every role, name, fonts and theme toggle"() {
    const t = fixture();
    const html = runBuild(t).read("style-tile.html");
    for (const [role, tok] of Object.entries(t.color)) {
      assert.ok(html.includes(tok.$value), `light ${role}`);
      assert.ok(html.includes(tok.$extensions["design-direction"].dark), `dark ${role}`);
    }
    assert.ok(html.includes("<title>Stillwater"), "title");
    assert.ok(html.includes("fonts.googleapis.com"), "google fonts link");
    assert.ok(html.includes("Fraunces"), "heading font");
    assert.ok(html.includes('data-theme'), "theme toggle");
  },

  "style tile: uses meta.copy in brand voice, escaped"() {
    const t = fixture();
    t.meta.copy = { h1: "Money, handled", primaryAction: "Send invoice", success: "Paid & reconciled <today>" };
    const html = runBuild(t).read("style-tile.html");
    assert.ok(html.includes("Money, handled"));
    assert.ok(html.includes(">Send invoice<"));
    assert.ok(html.includes("Paid &amp; reconciled &lt;today&gt;"));
  },

  "style tile: default copy is product-neutral"() {
    const html = runBuild(fixture()).read("style-tile.html");
    for (const themed of ["quiet hour", "session", "journal", "ritual"]) {
      assert.ok(!html.toLowerCase().includes(themed), `default copy mentions "${themed}"`);
    }
  },

  "style tile: escapes HTML in meta text"() {
    const t = fixture();
    t.meta.name = "<script>alert(1)</script>";
    const html = runBuild(t).read("style-tile.html");
    assert.ok(!html.includes("<script>alert(1)"), "unescaped script tag");
    assert.ok(html.includes("&lt;script&gt;"));
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

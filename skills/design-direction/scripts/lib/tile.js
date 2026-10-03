// Spec section renderer (the v1.2 style tile)

const { ROLES, TYPE_STYLES, GENERIC_FONTS, SYSTEM_FONTS, light, dark, usage, fontList, fontRef, renderCss, fmt, fmtTarget } = require("./tokens");


function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// One <link> per family so a family missing a weight can't break the others
function googleFontLinks(t) {
  const families = new Map();
  for (const [key, tok] of Object.entries(t.font)) {
    const first = fontList(tok)[0];
    if (!first || GENERIC_FONTS.has(first.toLowerCase()) || SYSTEM_FONTS.has(first.toLowerCase())) continue;
    const weights = families.get(first) || new Set(key === "body" ? [400, 500, 600] : [400]);
    for (const [style] of TYPE_STYLES) {
      const v = t.typography[style].$value;
      if (fontRef(v.fontFamily) === key) weights.add(Number(v.fontWeight) || 400);
    }
    families.set(first, weights);
  }
  return [...families]
    .map(([family, weights]) => {
      const w = [...weights].filter((n) => n >= 100 && n <= 900).sort((a, b) => a - b).join(";");
      const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${w}&display=swap`;
      return `<link rel="stylesheet" href="${esc(href)}">`;
    })
    .join("\n");
}

// Product-neutral sample copy; meta.copy overrides any key with copy in the brand's voice
const DEFAULT_COPY = {
  h1: "Headlines set the tone",
  h2: "Section titles guide the eye",
  h3: "Card titles stay short",
  body: "Good design gets out of the way. It sets a rhythm, holds a tone, and lets the content breathe — so the person on the other side can focus on what they came for.",
  caption: "Updated just now · 4 min read",
  label: "SECTION LABEL",
  primaryAction: "Get started",
  secondaryAction: "Save",
  tertiaryAction: "Not now",
  tag: "New",
  success: "Your changes have been saved.",
  warning: "You're offline — changes will sync later.",
  error: "We couldn't load this page. Try again.",
  info: "You can change this anytime in Settings.",
};

function renderTile(t, results) {
  const name = esc(t.meta.name);
  const copy = {};
  for (const [key, text] of Object.entries({ ...DEFAULT_COPY, ...(t.meta.copy || {}) })) copy[key] = esc(text);
  const tone = (t.meta.toneWords || []).map((w) => `<span class="chip">${esc(w)}</span>`).join("");
  const manifesto = t.meta.manifesto ? `<p class="manifesto">${esc(t.meta.manifesto)}</p>` : "";
  const radiusKeys = Object.keys(t.radius);
  const controlRadius = `var(--radius-${radiusKeys[0]})`;
  const cardRadius = `var(--radius-${radiusKeys[Math.min(1, radiusKeys.length - 1)]})`;
  const cardShadow = `var(--shadow-${Object.keys(t.shadow)[0]})`;

  const swatches = ROLES.map(([key, label, use]) => `
      <figure class="swatch">
        <div class="chip-color" style="background: var(--color-${key})"></div>
        <figcaption>
          <strong>${label}</strong>
          <span class="muted">${esc(usage(t, key, use))}</span>
          <code><span class="hex-light">${light(t, key)}</span><span class="hex-dark">${dark(t, key)}</span></code>
        </figcaption>
      </figure>`).join("");

  const contrastRows = [];
  const seen = new Set();
  for (const r of results) {
    if (seen.has(r.label)) continue;
    seen.add(r.label);
    const l = results.find((x) => x.label === r.label && x.mode === "light");
    const d = results.find((x) => x.label === r.label && x.mode === "dark");
    const badge = (x, mode) => `<span class="badge ${x.pass ? "pass" : "fail"} only-${mode}">${fmt(x.ratio)} ${x.pass ? "✓" : "✗"}</span>`;
    contrastRows.push(`
        <li>
          <span class="sample" style="color: var(--color-${r.fg}); background: var(--color-${r.bg})">Aa</span>
          <span class="pair">${r.label}<span class="muted"> · needs ${fmtTarget(r.target)}</span></span>
          ${badge(l, "light")}${badge(d, "dark")}
        </li>`);
  }

  const typeRows = TYPE_STYLES.map(([key, label]) => {
    const v = t.typography[key].$value;
    const ls = v.letterSpacing === undefined ? "0" : v.letterSpacing;
    return `
      <div class="type-row">
        <div class="type-meta"><strong>${label}</strong><span class="muted">${esc(v.fontSize)} / ${esc(v.fontWeight)} / ${esc(v.lineHeight)}${ls !== "0" ? ` / ${esc(ls)}` : ""}</span></div>
        <div class="t-${key}">${copy[key]}</div>
      </div>`;
  }).join("");

  const spacing = Object.entries(t.spacing).map(([key, tok]) => `
        <div class="space-row"><code>space-${esc(key)}</code><span class="bar" style="width: var(--space-${key})"></span><span class="muted">${esc(tok.$value)}</span></div>`).join("");

  const radii = Object.entries(t.radius).map(([key, tok]) => `
        <div class="radius-box" style="border-radius: var(--radius-${key})"><code>${esc(key)}</code><span class="muted">${esc(tok.$value)}</span></div>`).join("");

  const alerts = [["success", "Success"], ["warning", "Warning"], ["error", "Error"], ["info", "Info"]]
    .map(([key, title]) => [key, title, copy[key]])
    .map(([key, title, body]) => `
        <div class="alert" style="--tone: var(--color-${key})"><strong>${title}</strong><span>${body}</span></div>`).join("");

  const typeCss = TYPE_STYLES.map(([key]) => `.t-${key} { font-family: var(--text-${key}-family); font-size: var(--text-${key}-size); font-weight: var(--text-${key}-weight); line-height: var(--text-${key}-line-height); letter-spacing: var(--text-${key}-letter-spacing); }`).join("\n");

  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} — Style Tile</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${googleFontLinks(t)}
<style>
${renderCss(t)}
* { box-sizing: border-box; }
body { margin: 0; background: var(--color-background); color: var(--color-neutral-900); font-family: var(--font-body); font-size: 16px; line-height: 1.5; transition: background .3s, color .3s; }
main { max-width: 1120px; margin: 0 auto; padding: 48px 24px 96px; }
section { margin-top: 72px; }
h2.section { font-family: var(--font-body); font-size: 12px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--color-neutral-600); margin: 0 0 20px; padding-bottom: 12px; border-bottom: 1px solid var(--color-neutral-300); }
.muted { color: var(--color-neutral-600); }
code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; }
${typeCss}

.hero { display: grid; gap: 20px; }
.hero-top { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.eyebrow { font-size: 12px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--color-primary); }
.hero h1 { margin: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 6px 14px; border-radius: 9999px; background: var(--color-neutral-100); color: var(--color-neutral-900); font-size: 13px; }
.manifesto { max-width: 680px; margin: 8px 0 0; font-family: var(--font-heading); font-size: 20px; line-height: 1.55; color: var(--color-neutral-900); }

.toggle { font: inherit; font-size: 13px; font-weight: 500; padding: 8px 16px; border-radius: 9999px; border: 1px solid var(--color-neutral-600); background: var(--color-surface); color: var(--color-neutral-900); cursor: pointer; }
.toggle:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.palette { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; }
.swatch { margin: 0; background: var(--color-surface); border-radius: ${cardRadius}; overflow: hidden; box-shadow: ${cardShadow}; border: 1px solid var(--color-neutral-100); }
.chip-color { height: 88px; border-bottom: 1px solid var(--color-neutral-100); }
.swatch figcaption { display: grid; gap: 4px; padding: 12px; font-size: 13px; }
.swatch figcaption .muted { font-size: 12px; line-height: 1.35; }
.hex-dark, [data-theme="dark"] .hex-light { display: none; }
[data-theme="dark"] .hex-dark { display: inline; }

.contrast { list-style: none; margin: 24px 0 0; padding: 0; display: grid; gap: 8px; }
.contrast li { display: flex; align-items: center; gap: 14px; padding: 10px 14px; background: var(--color-surface); border-radius: ${controlRadius}; border: 1px solid var(--color-neutral-100); }
.sample { width: 44px; height: 36px; display: grid; place-items: center; border-radius: 6px; font-weight: 600; border: 1px solid var(--color-neutral-100); }
.pair { flex: 1; font-size: 14px; }
.badge { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; }
.badge.pass { background: color-mix(in srgb, var(--color-success) 16%, var(--color-surface)); color: var(--color-neutral-900); }
.badge.fail { background: var(--color-error); color: var(--color-on-primary); }
.only-dark, [data-theme="dark"] .only-light { display: none; }
[data-theme="dark"] .only-dark { display: inline; }

.type-row { display: grid; grid-template-columns: 180px 1fr; gap: 24px; align-items: baseline; padding: 20px 0; border-bottom: 1px solid var(--color-neutral-100); }
.type-meta { display: grid; gap: 2px; font-size: 13px; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
.space-row { display: grid; grid-template-columns: 90px 1fr 60px; align-items: center; gap: 12px; padding: 6px 0; }
.bar { height: 12px; border-radius: 3px; background: var(--color-primary); max-width: 100%; }
.radii { display: flex; flex-wrap: wrap; gap: 16px; }
.radius-box { width: 104px; height: 104px; display: grid; place-content: center; text-align: center; gap: 2px; background: var(--color-surface); border: 1px solid var(--color-neutral-300); font-size: 12px; }

.components { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
.panel { background: var(--color-surface); border-radius: ${cardRadius}; box-shadow: ${cardShadow}; border: 1px solid var(--color-neutral-100); padding: 24px; display: grid; gap: 16px; align-content: start; }
.panel h3 { margin: 0; font-family: var(--font-body); font-size: 13px; font-weight: 600; color: var(--color-neutral-600); }
.row { display: flex; flex-wrap: wrap; gap: 12px; }
.btn { font: inherit; font-size: 15px; font-weight: 600; padding: 12px 20px; border-radius: ${controlRadius}; border: 1px solid transparent; cursor: pointer; transition: filter .15s, background .15s; }
.btn-primary { background: var(--color-primary); color: var(--color-on-primary); }
.btn-primary:hover { filter: brightness(1.08); }
.btn-secondary { background: var(--color-secondary); color: var(--color-neutral-900); }
.btn-ghost { background: transparent; color: var(--color-primary); border-color: var(--color-neutral-300); }
.btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.field { display: grid; gap: 6px; font-size: 13px; font-weight: 500; }
.input { font: inherit; font-size: 15px; padding: 12px 14px; border-radius: ${controlRadius}; border: 1px solid var(--color-neutral-600); background: var(--color-background); color: var(--color-neutral-900); }
.input::placeholder { color: var(--color-neutral-600); }
.input:focus, .input.is-focus { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.card { background: var(--color-background); border-radius: ${cardRadius}; overflow: hidden; border: 1px solid var(--color-neutral-100); }
.card-media { height: 120px; background: linear-gradient(135deg, var(--color-secondary), var(--color-primary)); }
.card-body { padding: 16px; display: grid; gap: 6px; }
.card-tag { justify-self: start; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; padding: 3px 10px; border-radius: 9999px; background: var(--color-accent); color: var(--color-on-primary); }
.alerts { display: grid; gap: 10px; }
.alert { display: grid; gap: 2px; padding: 12px 14px; border-radius: ${controlRadius}; border-left: 4px solid var(--tone); background: color-mix(in srgb, var(--tone) 10%, var(--color-surface)); font-size: 14px; }
.alert strong { color: var(--tone); }

footer { margin-top: 96px; font-size: 12px; color: var(--color-neutral-600); }

@media (max-width: 720px) {
  .type-row, .grid-2 { grid-template-columns: 1fr; gap: 8px; }
}
</style>
</head>
<body>
<main>
  <header class="hero">
    <div class="hero-top">
      <span class="eyebrow">Style tile</span>
      <button class="toggle" type="button" id="theme-toggle" aria-pressed="false">Dark mode</button>
    </div>
    <h1 class="t-h1">${name}</h1>
    <div class="chips">${tone}</div>
    ${manifesto}
  </header>

  <section>
    <h2 class="section">Color</h2>
    <div class="palette">${swatches}
    </div>
    <ul class="contrast">${contrastRows.join("")}
    </ul>
  </section>

  <section>
    <h2 class="section">Typography</h2>${typeRows}
  </section>

  <section class="grid-2">
    <div>
      <h2 class="section">Spacing</h2>${spacing}
    </div>
    <div>
      <h2 class="section">Radius</h2>
      <div class="radii">${radii}
      </div>
    </div>
  </section>

  <section>
    <h2 class="section">Components</h2>
    <div class="components">
      <div class="panel">
        <h3>Buttons</h3>
        <div class="row">
          <button class="btn btn-primary" type="button">${copy.primaryAction}</button>
          <button class="btn btn-secondary" type="button">${copy.secondaryAction}</button>
          <button class="btn btn-ghost" type="button">${copy.tertiaryAction}</button>
        </div>
        <h3>Inputs</h3>
        <label class="field">Email<input class="input" type="email" placeholder="you@example.com"></label>
        <label class="field">Focused<input class="input is-focus" type="text" value="Focus ring preview"></label>
      </div>
      <div class="panel">
        <h3>Card</h3>
        <article class="card">
          <div class="card-media"></div>
          <div class="card-body">
            <span class="card-tag">${copy.tag}</span>
            <div class="t-h3">${copy.h3}</div>
            <div class="t-caption muted">${copy.caption}</div>
          </div>
        </article>
      </div>
      <div class="panel">
        <h3>Alerts</h3>
        <div class="alerts">${alerts}
        </div>
      </div>
    </div>
  </section>

  <footer>Generated by design-direction · tokens.json → tokens.css · tailwind.css · style-tile.html</footer>
</main>
<script>
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  function apply(theme) {
    root.dataset.theme = theme;
    btn.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    btn.setAttribute("aria-pressed", String(theme === "dark"));
  }
  btn.addEventListener("click", () => apply(root.dataset.theme === "dark" ? "light" : "dark"));
  apply(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
</script>
</body>
</html>
`;
}

module.exports = { esc, googleFontLinks, DEFAULT_COPY, renderTile };

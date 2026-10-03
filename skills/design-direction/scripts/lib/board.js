// board.html: the whole design direction on one page — Mood → Spec → Features

const { ROLES, TYPE_STYLES, light, dark, usage, fontList, fontRef, renderCss, fmt, fmtTarget } = require("./tokens");
const { phaseState } = require("./direction");
const { esc, fontLinks } = require("./html");

// Product-neutral sample copy; tokens.meta.copy overrides any key with copy in the brand's voice
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

// Neutral board chrome used until the design has its own tokens
const CHROME_LIGHT = {
  primary: "#1F1D1A", "on-primary": "#FFFFFF", secondary: "#E7E3DB", accent: "#8A6D3B",
  background: "#FAF9F6", surface: "#FFFFFF", "neutral-100": "#EFEDE8", "neutral-300": "#D9D5CD",
  "neutral-600": "#66625B", "neutral-900": "#1F1D1A", success: "#3F7A52", warning: "#9A6B1E", error: "#A8463A", info: "#48657F",
};
const CHROME_DARK = {
  primary: "#EEEAE2", "on-primary": "#161513", secondary: "#34312C", accent: "#CDAE73",
  background: "#161513", surface: "#1F1E1B", "neutral-100": "#2A2825", "neutral-300": "#45423D",
  "neutral-600": "#A7A196", "neutral-900": "#EEEAE2", success: "#7DBB8F", warning: "#D7A95C", error: "#E38A7C", info: "#8FB0CC",
};

const PHASES = [
  [1, "Mood", "mood"],
  [2, "Spec", "spec"],
  [3, "Features", "features"],
];
const STATE_LABEL = { approved: "Approved", "in review": "In review", "needs review": "Needs review", "not started": "Not started" };
const slugState = (s) => s.replace(/ /g, "-");

const colorVars = (map) => Object.entries(map).map(([k, v]) => `--color-${k}: ${v};`).join(" ");

function chromeCss(direction) {
  const heading = direction ? `"${direction.mood.typography.heading}", ui-serif, Georgia, serif` : "Georgia, serif";
  const body = direction ? `"${direction.mood.typography.body}", system-ui, sans-serif` : "system-ui, sans-serif";
  return `:root { ${colorVars(CHROME_LIGHT)} --font-heading: ${heading}; --font-body: ${body}; }
[data-theme="dark"] { ${colorVars(CHROME_DARK)} }`;
}

// Font families to load, with the weights the page actually uses
function boardFonts(direction, tokens) {
  const families = new Map();
  const add = (family, weights) => {
    if (!family) return;
    const set = families.get(family) || new Set();
    weights.forEach((w) => set.add(w));
    families.set(family, set);
  };
  if (tokens) {
    for (const [key, tok] of Object.entries(tokens.font)) {
      const weights = key === "body" ? [400, 500, 600] : [400];
      for (const [style] of TYPE_STYLES) {
        const v = tokens.typography[style].$value;
        if (fontRef(v.fontFamily) === key) weights.push(Number(v.fontWeight) || 400);
      }
      add(fontList(tok)[0], weights);
    }
  }
  if (direction) {
    add(direction.mood.typography.heading, [300, 400, 600]);
    add(direction.mood.typography.body, [400, 500, 600]);
  }
  return families;
}

// ---------- sections ----------

function placeholder(id, title, afterPhase) {
  return `
  <section id="${id}" class="section placeholder">
    <h2 class="section-title">${title}</h2>
    <div class="empty"><span class="empty-dot"></span>Comes after Phase ${afterPhase} approval</div>
  </section>`;
}

function moodSection(d) {
  const { product, mood } = d;
  // Product summary and the one word already lead the page, so the brief card skips them
  const briefItems = [
    ["Audience", product.audience],
    ["Avoid", product.avoid],
    ["References", (d.references || []).join(" · ")],
  ].filter(([, v]) => v);

  const palettes = mood.palettes.map((p) => `
      <article class="palette-dir">
        <div class="strip">${p.swatches.map((hex) => `<span class="strip-chip" style="background:${hex}"><code>${hex}</code></span>`).join("")}</div>
        <div class="palette-text">
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.feeling)}</p>
          ${p.direction ? `<p class="muted small">${esc(p.direction)}</p>` : ""}
        </div>
      </article>`).join("");

  const t = mood.typography;
  return `
  <section id="mood" class="section">
    <h2 class="section-title">Mood</h2>
    <blockquote class="manifesto">${esc(mood.manifesto)}</blockquote>
    <div class="chips">${mood.toneWords.map((w) => `<span class="chip">${esc(w)}</span>`).join("")}</div>

    <dl class="brief">${briefItems.map(([k, v]) => `
      <div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}
    </dl>

    <h3 class="sub">Color story</h3>
    <div class="palette-dirs">${palettes}
    </div>

    <h3 class="sub">Typography</h3>
    <div class="type-pair">
      <div class="type-pair-sample">
        <div class="pair-heading">Aa</div>
        <div>
          <div class="pair-headline">${esc(product.name)}</div>
          <p class="pair-body">${esc(product.summary)}</p>
        </div>
      </div>
      <div class="type-pair-meta">
        <p><strong>${esc(t.pairing)}</strong></p>
        ${t.personality ? `<p class="muted">${esc(t.personality)}</p>` : ""}
        <p class="muted small">Heading: ${esc(t.heading)} · Body: ${esc(t.body)}</p>
      </div>
    </div>

    <div class="dos-donts">
      <div class="dos"><h3 class="sub">Do</h3><ul>${mood.dos.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="donts"><h3 class="sub">Don't</h3><ul>${mood.donts.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
    </div>
  </section>`;
}

function specSection(t, results) {
  const copy = {};
  for (const [key, text] of Object.entries({ ...DEFAULT_COPY, ...(t.meta.copy || {}) })) copy[key] = esc(text);

  const swatches = ROLES.map(([key, label, use]) => `
      <figure class="swatch">
        <div class="chip-color" style="background: var(--color-${key})"></div>
        <figcaption>
          <strong>${label}</strong>
          <span class="muted">${esc(usage(t, key, use))}</span>
          <code><span class="hex-light">${light(t, key)}</span><span class="hex-dark">${dark(t, key)}</span></code>
        </figcaption>
      </figure>`).join("");

  const labels = [...new Set(results.map((r) => r.label))];
  const contrastRows = labels.map((label) => {
    const l = results.find((x) => x.label === label && x.mode === "light");
    const d = results.find((x) => x.label === label && x.mode === "dark");
    const badge = (x, mode) => `<span class="badge ${x.pass ? "pass" : "fail"} only-${mode}">${fmt(x.ratio)} ${x.pass ? "✓" : "✗"}</span>`;
    return `
        <li>
          <span class="sample" style="color: var(--color-${l.fg}); background: var(--color-${l.bg})">Aa</span>
          <span class="pair">${label}<span class="muted"> · needs ${fmtTarget(l.target)}</span></span>
          ${badge(l, "light")}${badge(d, "dark")}
        </li>`;
  }).join("");

  const typeRows = TYPE_STYLES.map(([key, label]) => {
    const v = t.typography[key].$value;
    const ls = v.letterSpacing === undefined ? "0" : v.letterSpacing;
    return `
      <div class="type-row">
        <div class="type-meta"><strong>${label}</strong><span class="muted">${esc(v.fontSize)} / ${esc(v.fontWeight)} / ${esc(v.lineHeight)}${String(ls) !== "0" ? ` / ${esc(ls)}` : ""}</span></div>
        <div class="t-${key}">${copy[key]}</div>
      </div>`;
  }).join("");

  const spacing = Object.entries(t.spacing).map(([key, tok]) => `
        <div class="space-row"><code>space-${esc(key)}</code><span class="bar" style="width: var(--space-${key})"></span><span class="muted">${esc(tok.$value)}</span></div>`).join("");
  const radii = Object.entries(t.radius).map(([key, tok]) => `
        <div class="radius-box" style="border-radius: var(--radius-${key})"><code>${esc(key)}</code><span class="muted">${esc(tok.$value)}</span></div>`).join("");
  const alerts = [["success", "Success"], ["warning", "Warning"], ["error", "Error"], ["info", "Info"]].map(([key, title]) => `
        <div class="alert" style="--tone: var(--color-${key})"><strong>${title}</strong><span>${copy[key]}</span></div>`).join("");

  return `
  <section id="spec" class="section">
    <h2 class="section-title">Spec</h2>

    <h3 class="sub">Color</h3>
    <div class="palette">${swatches}
    </div>
    <ul class="contrast">${contrastRows}
    </ul>

    <h3 class="sub">Typography</h3>${typeRows}

    <div class="grid-2">
      <div><h3 class="sub">Spacing</h3>${spacing}
      </div>
      <div><h3 class="sub">Radius</h3><div class="radii">${radii}
      </div></div>
    </div>

    <h3 class="sub">Components</h3>
    <div class="components">
      <div class="panel">
        <h4>Buttons</h4>
        <div class="row">
          <button class="btn btn-primary" type="button">${copy.primaryAction}</button>
          <button class="btn btn-secondary" type="button">${copy.secondaryAction}</button>
          <button class="btn btn-ghost" type="button">${copy.tertiaryAction}</button>
        </div>
        <h4>Inputs</h4>
        <label class="field">Email<input class="input" type="email" placeholder="you@example.com"></label>
        <label class="field">Focused<input class="input is-focus" type="text" value="Focus ring preview"></label>
      </div>
      <div class="panel">
        <h4>Card</h4>
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
        <h4>Alerts</h4>
        <div class="alerts">${alerts}
        </div>
      </div>
    </div>
  </section>`;
}

const EFFORT_CLASS = { "Quick win": "quick", Medium: "medium", "Big bet": "big" };

function featuresSection(f) {
  const flows = f.flows.map((flow) => `
      <article class="flow">
        <h4>${esc(flow.name)}</h4>
        <ol class="steps">${flow.steps.map((s) => `
          <li><strong>${esc(s.screen)}</strong>${s.purpose ? `<span>${esc(s.purpose)}</span>` : ""}</li>`).join("")}
        </ol>
      </article>`).join("");

  const ideas = f.ideas.map((i) => `
      <article class="idea">
        <span class="effort effort-${EFFORT_CLASS[i.effort]}">${esc(i.effort)}</span>
        <h4>${esc(i.name)}</h4>
        <p>${esc(i.what)}</p>
        <p class="muted small"><em>Why it fits:</em> ${esc(i.why)}</p>
      </article>`).join("");

  const interactions = f.interactions.map((x) => `
      <article class="concept">
        <h4>${esc(x.name)}</h4>
        <p class="muted small">${esc(x.where)}</p>
        <p>${esc(x.what)}</p>
        ${x.why ? `<p class="muted small"><em>Mood:</em> ${esc(x.why)}</p>` : ""}
        ${x.note ? `<code class="note">${esc(x.note)}</code>` : ""}
      </article>`).join("");

  return `
  <section id="features" class="section">
    <h2 class="section-title">Features</h2>
    <h3 class="sub">User flows</h3>
    <div class="flows">${flows}
    </div>
    <h3 class="sub">Feature ideas</h3>
    <div class="ideas">${ideas}
    </div>
    <h3 class="sub">Interaction &amp; UX concepts</h3>
    <div class="concepts">${interactions}
    </div>
  </section>`;
}

function revisionLog(status) {
  const log = (status && status.log) || [];
  if (!log.length) return "";
  return `
  <section class="section log">
    <h2 class="section-title">Revision log</h2>
    <ul>${log.map((e) => `<li><span class="muted">${esc(e.date || "")}</span> ${esc(e.note || "")}</li>`).join("")}</ul>
  </section>`;
}

// ---------- page ----------

function renderBoard({ direction, tokens, results }) {
  const name = esc(direction ? direction.product.name : tokens.meta.name);
  const status = direction ? direction.status : null;

  const steps = direction
    ? PHASES.map(([n, label, id]) => {
        const state = phaseState(status, n);
        return `<li class="step" data-phase="${n}" data-state="${slugState(state)}"><a href="#${id}"><span class="step-dot"></span>${label}<span class="step-state">${STATE_LABEL[state]}</span></a></li>`;
      }).join("")
    : `<li class="step" data-state="approved"><a href="#spec"><span class="step-dot"></span>Spec</a></li>`;

  const sections = [];
  if (direction) sections.push(moodSection(direction));
  sections.push(tokens ? specSection(tokens, results) : placeholder("spec", "Spec", 1));
  if (direction) sections.push(direction.features ? featuresSection(direction.features) : placeholder("features", "Features", 2));
  sections.push(revisionLog(status));

  const hero = direction
    ? `<p class="eyebrow">Design direction</p>
    <h1 class="title">${name}</h1>
    <p class="lede">${esc(direction.product.summary)}</p>
    <p class="one-word">Leave them feeling <strong>${esc(direction.product.oneWord)}</strong></p>`
    : `<p class="eyebrow">Design direction</p>
    <h1 class="title">${name}</h1>
    ${tokens.meta.toneWords ? `<div class="chips">${tokens.meta.toneWords.map((w) => `<span class="chip">${esc(w)}</span>`).join("")}</div>` : ""}
    ${tokens.meta.manifesto ? `<blockquote class="manifesto">${esc(tokens.meta.manifesto)}</blockquote>` : ""}`;

  const radiusKeys = tokens ? Object.keys(tokens.radius) : [];
  const controlRadius = tokens ? `var(--radius-${radiusKeys[0]})` : "10px";
  const cardRadius = tokens ? `var(--radius-${radiusKeys[Math.min(1, radiusKeys.length - 1)]})` : "16px";
  const cardShadow = tokens ? `var(--shadow-${Object.keys(tokens.shadow)[0]})` : "0 1px 2px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.04)";
  const typeCss = tokens
    ? TYPE_STYLES.map(([key]) => `.t-${key} { font-family: var(--text-${key}-family); font-size: var(--text-${key}-size); font-weight: var(--text-${key}-weight); line-height: var(--text-${key}-line-height); letter-spacing: var(--text-${key}-letter-spacing); }`).join("\n")
    : "";
  const files = tokens ? "direction.json · tokens.json → board.html · tokens.css · tailwind.css" : "direction.json → board.html";

  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} — Design Direction</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fontLinks(boardFonts(direction, tokens))}
<style>
${tokens ? renderCss(tokens) : chromeCss(direction)}
:root { --font-display: var(--font-heading); }
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 88px; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
body { margin: 0; background: var(--color-background); color: var(--color-neutral-900); font-family: var(--font-body); font-size: 16px; line-height: 1.55; transition: background .3s, color .3s; -webkit-font-smoothing: antialiased; }
a { color: inherit; }
.muted { color: var(--color-neutral-600); }
.small { font-size: 13px; }
code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; }
${typeCss}

/* top bar */
.topbar { position: sticky; top: 0; z-index: 10; background: color-mix(in srgb, var(--color-background) 86%, transparent); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--color-neutral-100); }
.topbar-inner { max-width: 1120px; margin: 0 auto; padding: 14px 24px; display: flex; align-items: center; gap: 24px; }
.brand { font-family: var(--font-display); font-size: 18px; font-weight: 500; white-space: nowrap; }
.steps-nav { display: flex; gap: 6px; list-style: none; margin: 0 auto 0 0; padding: 0; }
.step a { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 9999px; text-decoration: none; font-size: 13px; font-weight: 500; }
.step a:hover { background: var(--color-neutral-100); }
.step-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-neutral-300); }
.step-state { font-size: 11px; color: var(--color-neutral-600); font-weight: 400; }
.step[data-state="approved"] .step-dot { background: var(--color-success); }
.step[data-state="in-review"] .step-dot { background: var(--color-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent); }
.step[data-state="needs-review"] .step-dot { background: var(--color-warning); }
.step[data-state="not-started"] a { color: var(--color-neutral-600); }
.toggle { font: inherit; font-size: 13px; font-weight: 500; padding: 7px 14px; border-radius: 9999px; border: 1px solid var(--color-neutral-300); background: var(--color-surface); color: var(--color-neutral-900); cursor: pointer; white-space: nowrap; }
.toggle:focus-visible, .step a:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

main { max-width: 1120px; margin: 0 auto; padding: 56px 24px 96px; }
.hero { display: grid; gap: 12px; padding-bottom: 24px; }
.eyebrow { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--color-neutral-600); }
.title { margin: 0; font-family: var(--font-display); font-size: clamp(40px, 6vw, 64px); font-weight: 400; line-height: 1.05; letter-spacing: -0.01em; }
.lede { margin: 4px 0 0; max-width: 640px; font-size: 18px; color: var(--color-neutral-600); }
.one-word { margin: 0; font-size: 14px; color: var(--color-neutral-600); }
.one-word strong { color: var(--color-neutral-900); font-family: var(--font-display); font-size: 18px; font-weight: 500; }

.section { margin-top: 80px; }
.section-title { margin: 0 0 28px; padding-bottom: 14px; border-bottom: 1px solid var(--color-neutral-300); font-family: var(--font-display); font-size: 32px; font-weight: 400; letter-spacing: -0.01em; }
.sub { margin: 40px 0 16px; font-family: var(--font-body); font-size: 12px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--color-neutral-600); }
.empty { display: flex; align-items: center; gap: 12px; padding: 40px; border: 1px dashed var(--color-neutral-300); border-radius: ${cardRadius}; color: var(--color-neutral-600); font-size: 15px; }
.empty-dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--color-neutral-300); }

/* mood */
.manifesto { margin: 0 0 24px; max-width: 820px; font-family: var(--font-display); font-size: clamp(22px, 2.6vw, 30px); line-height: 1.4; font-weight: 400; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 6px 14px; border-radius: 9999px; background: var(--color-neutral-100); font-size: 13px; }
.brief { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1px; margin: 32px 0 0; background: var(--color-neutral-100); border: 1px solid var(--color-neutral-100); border-radius: ${cardRadius}; overflow: hidden; }
.brief div { background: var(--color-surface); padding: 16px 18px; }
.brief dt { font-size: 11px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--color-neutral-600); }
.brief dd { margin: 6px 0 0; font-size: 14px; }
.palette-dirs { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
.palette-dir { background: var(--color-surface); border: 1px solid var(--color-neutral-100); border-radius: ${cardRadius}; overflow: hidden; box-shadow: ${cardShadow}; }
.strip { display: flex; height: 120px; }
.strip-chip { flex: 1; display: flex; align-items: flex-end; padding: 8px; }
.strip-chip code { font-size: 10px; padding: 2px 5px; border-radius: 4px; background: rgba(255,255,255,.85); color: #1a1a1a; }
.palette-text { padding: 16px 18px 18px; }
.palette-text h3 { margin: 0 0 6px; font-family: var(--font-display); font-size: 20px; font-weight: 500; }
.palette-text p { margin: 0 0 6px; font-size: 14px; }
.type-pair { display: grid; grid-template-columns: 1.4fr 1fr; gap: 32px; align-items: center; padding: 28px; background: var(--color-surface); border: 1px solid var(--color-neutral-100); border-radius: ${cardRadius}; }
.type-pair-sample { display: flex; gap: 24px; align-items: center; }
.pair-heading { font-family: var(--font-display); font-size: 96px; line-height: 1; font-weight: 300; }
.pair-headline { font-family: var(--font-display); font-size: 28px; line-height: 1.2; }
.pair-body { margin: 8px 0 0; font-size: 15px; color: var(--color-neutral-600); }
.type-pair-meta p { margin: 0 0 8px; }
.dos-donts { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.dos-donts ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.dos-donts li { position: relative; padding: 12px 14px 12px 40px; background: var(--color-surface); border: 1px solid var(--color-neutral-100); border-radius: ${controlRadius}; font-size: 14px; }
.dos li::before, .donts li::before { position: absolute; left: 14px; top: 11px; font-weight: 700; }
.dos li::before { content: "✓"; color: var(--color-success); }
.donts li::before { content: "✕"; color: var(--color-error); }

/* spec */
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
.panel h4 { margin: 0; font-size: 13px; font-weight: 600; color: var(--color-neutral-600); }
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

/* features */
.flows { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
.flow { padding: 22px; background: var(--color-surface); border: 1px solid var(--color-neutral-100); border-radius: ${cardRadius}; }
.flow h4 { margin: 0 0 14px; font-family: var(--font-display); font-size: 20px; font-weight: 500; }
.flow .steps { list-style: none; counter-reset: step; margin: 0; padding: 0; display: grid; gap: 0; }
.flow .steps li { counter-increment: step; position: relative; display: grid; gap: 2px; padding: 0 0 18px 40px; font-size: 14px; }
.flow .steps li::before { content: counter(step); position: absolute; left: 0; top: 0; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; background: var(--color-primary); color: var(--color-on-primary); font-size: 12px; font-weight: 600; }
.flow .steps li:not(:last-child)::after { content: ""; position: absolute; left: 12px; top: 28px; bottom: 2px; width: 2px; background: var(--color-neutral-300); }
.flow .steps li span { color: var(--color-neutral-600); }
.ideas, .concepts { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.idea, .concept { padding: 20px; background: var(--color-surface); border: 1px solid var(--color-neutral-100); border-radius: ${cardRadius}; box-shadow: ${cardShadow}; display: grid; gap: 6px; align-content: start; }
.idea h4, .concept h4 { margin: 4px 0 0; font-size: 17px; font-weight: 600; }
.idea p, .concept p { margin: 0; font-size: 14px; }
.effort { justify-self: start; font-size: 11px; font-weight: 600; letter-spacing: .04em; padding: 3px 10px; border-radius: 9999px; }
.effort-quick { background: color-mix(in srgb, var(--color-success) 16%, var(--color-surface)); color: var(--color-neutral-900); }
.effort-medium { background: color-mix(in srgb, var(--color-info) 16%, var(--color-surface)); color: var(--color-neutral-900); }
.effort-big { background: color-mix(in srgb, var(--color-accent) 22%, var(--color-surface)); color: var(--color-neutral-900); }
.note { display: block; margin-top: 6px; padding: 8px 10px; border-radius: 8px; background: var(--color-neutral-100); line-height: 1.45; white-space: normal; }
.log ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font-size: 14px; }
.log .muted { display: inline-block; min-width: 96px; }

footer { max-width: 1120px; margin: 0 auto; padding: 0 24px 48px; font-size: 12px; color: var(--color-neutral-600); }

@media (max-width: 760px) {
  .topbar-inner { flex-wrap: wrap; gap: 10px; }
  .steps-nav { order: 3; width: 100%; overflow-x: auto; }
  .step-state { display: none; }
  .type-row, .grid-2, .type-pair, .dos-donts { grid-template-columns: 1fr; gap: 12px; }
}
</style>
</head>
<body>
<header class="topbar">
  <div class="topbar-inner">
    <span class="brand">${name}</span>
    <ol class="steps-nav" aria-label="Phases">${steps}</ol>
    <button class="toggle" type="button" id="theme-toggle" aria-pressed="false">Dark mode</button>
  </div>
</header>
<main>
  <header class="hero">
    ${hero}
  </header>
${sections.join("\n")}
</main>
<footer>Generated by design-direction · ${files}</footer>
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

module.exports = { renderBoard, DEFAULT_COPY };

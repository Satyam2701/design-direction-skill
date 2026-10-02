#!/usr/bin/env node
// Builds a style tile and token exports from a design-direction tokens.json.
//
//   node build.js path/to/tokens.json
//
// Writes tokens.css, tailwind.css and style-tile.html next to tokens.json and prints
// the palette and contrast tables as markdown.
// Exit codes: 0 ok, 1 contrast failure (outputs still written), 2 invalid tokens (nothing written).

const fs = require("fs");
const path = require("path");

// [key, label, default usage]
const ROLES = [
  ["primary", "Primary", "Main actions, key UI elements"],
  ["on-primary", "On Primary", "Text and icons on Primary"],
  ["secondary", "Secondary", "Supporting elements, hover states"],
  ["accent", "Accent", "Highlights, badges, CTAs"],
  ["background", "Background", "Page/app background"],
  ["surface", "Surface", "Cards, modals, panels"],
  ["neutral-100", "Neutral 100", "Subtlest — dividers, subtle bg"],
  ["neutral-300", "Neutral 300", "Borders, disabled states"],
  ["neutral-600", "Neutral 600", "Secondary text"],
  ["neutral-900", "Neutral 900", "Primary text"],
  ["success", "Success", "Confirmations, positive states"],
  ["warning", "Warning", "Caution, pending states"],
  ["error", "Error", "Errors, destructive actions"],
  ["info", "Info", "Neutral notices, tips"],
];

const TYPE_STYLES = [
  ["h1", "Heading 1"],
  ["h2", "Heading 2"],
  ["h3", "Heading 3"],
  ["body", "Body"],
  ["caption", "Caption"],
  ["label", "Label"],
];

const PAIRS = [
  { fg: "neutral-900", bg: "background", label: "Neutral 900 on Background", target: 4.5 },
  { fg: "neutral-900", bg: "surface", label: "Neutral 900 on Surface", target: 4.5 },
  { fg: "neutral-600", bg: "background", label: "Neutral 600 on Background", target: 4.5 },
  { fg: "on-primary", bg: "primary", label: "On Primary on Primary", target: 4.5 },
  { fg: "primary", bg: "background", label: "Primary on Background (UI)", target: 3 },
  { fg: "accent", bg: "background", label: "Accent on Background", target: 4.5, onlyIf: (t) => t.meta.accentAsText === true },
];

const HEX = /^#[0-9a-fA-F]{6}$/;
const GENERIC_FONTS = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "-apple-system", "emoji", "math"]);
const SYSTEM_FONTS = new Set(["georgia", "arial", "helvetica", "helvetica neue", "times", "times new roman", "verdana", "tahoma", "trebuchet ms", "courier", "courier new", "segoe ui", "sf pro", "sf pro text", "sf pro display", "blinkmacsystemfont", "menlo", "monaco", "consolas"]);

// ---------- color math ----------

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG 2.x contrast ratio, rounded to 2 decimals
function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

// ---------- token access ----------

const light = (t, role) => t.color[role].$value;
const dark = (t, role) => t.color[role].$extensions["design-direction"].dark;
const usage = (t, key, fallback) => t.color[key].$description || fallback;

function fontList(tok) {
  const v = tok.$value;
  return Array.isArray(v) ? v : String(v).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
}

function fontStack(tok) {
  return fontList(tok)
    .map((f) => (GENERIC_FONTS.has(f.toLowerCase()) ? f : `"${f}"`))
    .join(", ");
}

// "{font.heading}" -> "heading"; literal family names pass through unchanged
function fontRef(value) {
  const m = /^\{font\.([\w-]+)\}$/.exec(String(value));
  return m ? m[1] : null;
}

function typeFamilyCss(value) {
  const ref = fontRef(value);
  return ref ? `var(--font-${ref})` : String(value);
}

const cssValue = (v) => String(v);

// Safe inside a CSS comment, including when the CSS is inlined in <style>
const commentText = (s) => String(s).replace(/\*\//g, "* /").replace(/[<>]/g, "");

// ---------- validation ----------

function validate(t) {
  const errors = [];
  if (!t || typeof t !== "object") return ["tokens: expected a JSON object"];

  if (!t.meta || typeof t.meta.name !== "string" || !t.meta.name.trim()) {
    errors.push("meta.name: required (product name shown on the style tile)");
  }

  const colors = t.color || {};
  for (const [key] of ROLES) {
    const tok = colors[key];
    if (!tok) {
      errors.push(`color.${key}: missing`);
      continue;
    }
    if (!HEX.test(tok.$value || "")) errors.push(`color.${key}: $value must be #RRGGBB, got ${JSON.stringify(tok.$value)}`);
    const d = tok.$extensions && tok.$extensions["design-direction"] && tok.$extensions["design-direction"].dark;
    if (!HEX.test(d || "")) errors.push(`color.${key}: $extensions["design-direction"].dark must be #RRGGBB, got ${JSON.stringify(d)}`);
  }

  for (const key of ["heading", "body"]) {
    const tok = (t.font || {})[key];
    if (!tok || !tok.$value || fontList(tok).length === 0) errors.push(`font.${key}: missing`);
  }

  for (const [key] of TYPE_STYLES) {
    const tok = (t.typography || {})[key];
    const v = tok && tok.$value;
    if (!v) {
      errors.push(`typography.${key}: missing`);
      continue;
    }
    for (const field of ["fontFamily", "fontSize", "fontWeight", "lineHeight"]) {
      if (v[field] === undefined || v[field] === "") errors.push(`typography.${key}.${field}: missing`);
    }
    const ref = fontRef(v.fontFamily);
    if (ref && !(t.font || {})[ref]) errors.push(`typography.${key}.fontFamily: references unknown font.${ref}`);
  }

  for (const group of ["spacing", "radius", "shadow"]) {
    const g = t[group];
    if (!g || typeof g !== "object" || Object.keys(g).length === 0) {
      errors.push(`${group}: needs at least one token`);
      continue;
    }
    for (const [key, tok] of Object.entries(g)) {
      if (!tok || tok.$value === undefined || tok.$value === "") errors.push(`${group}.${key}: missing $value`);
    }
  }

  return errors;
}

// ---------- contrast ----------

function checkContrast(t) {
  const results = [];
  for (const pair of PAIRS) {
    if (pair.onlyIf && !pair.onlyIf(t)) continue;
    for (const [mode, get] of [["light", light], ["dark", dark]]) {
      const ratio = contrastRatio(get(t, pair.fg), get(t, pair.bg));
      results.push({ ...pair, mode, ratio, pass: ratio >= pair.target });
    }
  }
  return results;
}

// ---------- CSS ----------

function cssVars(t) {
  const lines = [];
  for (const [key] of ROLES) lines.push(`--color-${key}: ${light(t, key)};`);
  for (const [key, tok] of Object.entries(t.font)) lines.push(`--font-${key}: ${fontStack(tok)};`);
  for (const [key] of TYPE_STYLES) {
    const v = t.typography[key].$value;
    lines.push(`--text-${key}-family: ${typeFamilyCss(v.fontFamily)};`);
    lines.push(`--text-${key}-size: ${cssValue(v.fontSize)};`);
    lines.push(`--text-${key}-weight: ${cssValue(v.fontWeight)};`);
    lines.push(`--text-${key}-line-height: ${cssValue(v.lineHeight)};`);
    lines.push(`--text-${key}-letter-spacing: ${cssValue(v.letterSpacing === undefined ? "0" : v.letterSpacing)};`);
  }
  for (const [key, tok] of Object.entries(t.spacing)) lines.push(`--space-${key}: ${tok.$value};`);
  for (const [key, tok] of Object.entries(t.radius)) lines.push(`--radius-${key}: ${tok.$value};`);
  for (const [key, tok] of Object.entries(t.shadow)) lines.push(`--shadow-${key}: ${tok.$value};`);
  return lines;
}

const darkVars = (t) => ROLES.map(([key]) => `--color-${key}: ${dark(t, key)};`);
const indent = (lines, n) => lines.map((l) => " ".repeat(n) + l).join("\n");

function renderCss(t) {
  return `/* ${commentText(t.meta.name)} — design tokens (generated by design-direction build.js) */

:root {
${indent(cssVars(t), 2)}
}

[data-theme="dark"] {
${indent(darkVars(t), 2)}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${indent(darkVars(t), 4)}
  }
}
`;
}

function renderTailwind(t) {
  const theme = [];
  for (const [key] of ROLES) theme.push(`--color-${key}: ${light(t, key)};`);
  for (const [key, tok] of Object.entries(t.font)) theme.push(`--font-${key}: ${fontStack(tok)};`);
  for (const [key] of TYPE_STYLES) {
    const v = t.typography[key].$value;
    theme.push(`--text-${key}: ${cssValue(v.fontSize)};`);
    theme.push(`--text-${key}--line-height: ${cssValue(v.lineHeight)};`);
    theme.push(`--text-${key}--font-weight: ${cssValue(v.fontWeight)};`);
    if (v.letterSpacing !== undefined) theme.push(`--text-${key}--letter-spacing: ${cssValue(v.letterSpacing)};`);
  }
  for (const [key, tok] of Object.entries(t.spacing)) theme.push(`--spacing-${key}: ${tok.$value};`);
  for (const [key, tok] of Object.entries(t.radius)) theme.push(`--radius-${key}: ${tok.$value};`);
  for (const [key, tok] of Object.entries(t.shadow)) theme.push(`--shadow-${key}: ${tok.$value};`);

  return `/* ${commentText(t.meta.name)} — Tailwind v4 theme (generated by design-direction build.js)
   Add to your main CSS file after: @import "tailwindcss"; */

@theme {
${indent(theme, 2)}
}

/* Dark mode: set data-theme="dark" on <html>, then use the dark: variant as usual */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

@layer base {
  [data-theme="dark"] {
${indent(darkVars(t), 4)}
  }
}
`;
}

// ---------- markdown summary ----------

const fmt = (ratio) => `${ratio.toFixed(2)}:1`;
const fmtTarget = (n) => `${n}:1`;

function renderMarkdown(t, results) {
  const out = ["**Color Palette**", "", "| Role | Light | Dark | Usage |", "|---|---|---|---|"];
  for (const [key, label, use] of ROLES) {
    out.push(`| ${label} | \`${light(t, key)}\` | \`${dark(t, key)}\` | ${usage(t, key, use)} |`);
  }
  out.push("", "**Contrast Check** *(WCAG 2.2 AA, computed by build.js)*", "", "| Pair | Light | Dark | Needs |", "|---|---|---|---|");
  const byLabel = new Map();
  for (const r of results) {
    if (!byLabel.has(r.label)) byLabel.set(r.label, { target: r.target });
    byLabel.get(r.label)[r.mode] = r;
  }
  for (const [label, row] of byLabel) {
    const cell = (r) => `${fmt(r.ratio)} ${r.pass ? "✓" : "✗"}`;
    out.push(`| ${label} | ${cell(row.light)} | ${cell(row.dark)} | ${fmtTarget(row.target)} |`);
  }
  return out.join("\n");
}

// ---------- style tile ----------

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

// ---------- build ----------

function build(tokensPath) {
  let tokens;
  try {
    tokens = JSON.parse(fs.readFileSync(tokensPath, "utf8"));
  } catch (err) {
    return { errors: [`${tokensPath}: ${err.message}`] };
  }
  const errors = validate(tokens);
  if (errors.length) return { errors };

  const results = checkContrast(tokens);
  const dir = path.dirname(path.resolve(tokensPath));
  const outputs = {
    "tokens.css": renderCss(tokens),
    "tailwind.css": renderTailwind(tokens),
    "style-tile.html": renderTile(tokens, results),
  };
  const written = [];
  for (const [file, content] of Object.entries(outputs)) {
    const p = path.join(dir, file);
    fs.writeFileSync(p, content);
    written.push(p);
  }
  return { errors: [], results, written, markdown: renderMarkdown(tokens, results) };
}

function main(argv) {
  const tokensPath = argv[0];
  if (!tokensPath || argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: node build.js <path/to/tokens.json>");
    return tokensPath ? 0 : 2;
  }
  const res = build(tokensPath);
  if (res.errors.length) {
    for (const e of res.errors) console.error(`ERROR ${e}`);
    console.error("\nNo files written. Fix tokens.json and run again.");
    return 2;
  }
  console.log(res.markdown);
  console.log(`\nWrote:\n${res.written.map((p) => `  ${p}`).join("\n")}`);
  const failing = res.results.filter((r) => !r.pass);
  for (const r of failing) console.error(`FAIL ${r.label} ${r.mode} ${fmt(r.ratio)} (needs ${fmtTarget(r.target)})`);
  if (failing.length) {
    console.error(`\n${failing.length} contrast check(s) failed. Adjust lightness (keep hue) and run again.`);
    return 1;
  }
  return 0;
}

module.exports = { contrastRatio, validate, checkContrast, renderCss, renderTailwind, renderTile, build, ROLES, PAIRS };

if (require.main === module) process.exit(main(process.argv.slice(2)));

// Token model: roles, validation, contrast math, CSS/Tailwind exports, markdown tables

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

module.exports = {
  ROLES, TYPE_STYLES, PAIRS, HEX, GENERIC_FONTS, SYSTEM_FONTS,
  luminance, contrastRatio, light, dark, usage, fontList, fontStack, fontRef, typeFamilyCss,
  commentText, validate, checkContrast, renderCss, renderTailwind, renderMarkdown, fmt, fmtTarget,
};

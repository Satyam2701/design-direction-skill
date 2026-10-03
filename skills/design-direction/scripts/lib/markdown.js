// The full design direction as one shareable markdown document

const { TYPE_STYLES, renderMarkdown } = require("./tokens");
const { phaseState } = require("./direction");

// Keep user text from breaking table cells or starting stray markdown structures
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n+/g, " ");

function renderDocument({ direction: d, tokens, results, date = new Date().toISOString().slice(0, 10) }) {
  const out = [];
  const { product, mood } = d;

  out.push(`# ${product.name}`, "", `*Design direction · generated ${date} by design-direction*`, "");
  out.push(`> ${cell(mood.manifesto)}`, "");
  const states = [[1, "Mood"], [2, "Spec"], [3, "Features"]].map(([n, label]) => `${label}: ${phaseState(d.status, n)}`);
  out.push(`**Status:** ${states.join(" · ")}`, "");

  out.push("## Brief", "");
  out.push(`- **Product:** ${product.summary}`);
  out.push(`- **Audience:** ${product.audience}`);
  out.push(`- **One word:** ${product.oneWord}`);
  if (product.avoid) out.push(`- **Avoid:** ${product.avoid}`);
  if (d.references && d.references.length) out.push(`- **References:** ${d.references.join(", ")}`);
  out.push("");

  out.push("## Mood Brief", "");
  out.push(`**Tone words:** ${mood.toneWords.join(" · ")}`, "");
  out.push("### Color story", "");
  for (const p of mood.palettes) {
    out.push(`**${p.name}** — ${p.feeling}`, "");
    if (p.direction) out.push(`- Direction: ${p.direction}`);
    out.push(`- Swatches: ${p.swatches.map((h) => `\`${h}\``).join(" ")}`, "");
  }
  out.push("### Typography", "");
  out.push(`${mood.typography.pairing} (heading: ${mood.typography.heading}, body: ${mood.typography.body})`);
  if (mood.typography.personality) out.push("", mood.typography.personality);
  out.push("", "### Visual do's", "", ...mood.dos.map((x) => `- ${x}`), "");
  out.push("### Visual don'ts", "", ...mood.donts.map((x) => `- ${x}`), "");
  out.push("### Design manifesto", "", mood.manifesto, "");

  if (tokens) {
    out.push("## Design Spec", "", renderMarkdown(tokens, results), "");
    out.push("**Typography**", "", "| Style | Font | Size | Weight | Line height | Letter spacing |", "|---|---|---|---|---|---|");
    for (const [key, label] of TYPE_STYLES) {
      const v = tokens.typography[key].$value;
      out.push(`| ${label} | ${cell(v.fontFamily)} | ${v.fontSize} | ${v.fontWeight} | ${v.lineHeight} | ${v.letterSpacing === undefined ? "0" : v.letterSpacing} |`);
    }
    out.push("");
    const list = (group) => Object.entries(tokens[group]).map(([k, t]) => `\`${k}\` ${t.$value}`).join(" · ");
    out.push(`**Spacing:** ${list("spacing")}`, "", `**Radius:** ${list("radius")}`, "", `**Shadows:** ${list("shadow")}`, "");
    out.push("**Files:** `board.html` · `tokens.json` · `tokens.css` · `tailwind.css`", "");
  }

  if (d.features) {
    const f = d.features;
    out.push("## Feature Thinking", "", "### User Flows", "");
    for (const flow of f.flows) {
      out.push(`**${flow.name}**`);
      flow.steps.forEach((s, i) => out.push(`${i + 1}. ${s.screen}${s.purpose ? ` — ${s.purpose}` : ""}`));
      out.push("");
    }
    out.push("### Feature Ideas", "");
    for (const i of f.ideas) {
      out.push(`**${i.name}**`, `- What it does: ${i.what}`, `- Why it fits: ${i.why}`, `- Effort: ${i.effort}`, "");
    }
    out.push("### Interaction & UX Concepts", "");
    for (const x of f.interactions) {
      out.push(`**${x.name}**`, `- Where it lives: ${x.where}`, `- What it does: ${x.what}`);
      if (x.why) out.push(`- Why it fits the mood: ${x.why}`);
      if (x.note) out.push(`- Implementation note: ${x.note}`);
      out.push("");
    }
  }

  const log = (d.status && d.status.log) || [];
  if (log.length) {
    out.push("## Revision log", "", ...log.map((e) => `- ${e.date || ""} — ${e.note || ""}`), "");
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

module.exports = { renderDocument };

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
const { ROLES, PAIRS, contrastRatio, validate, checkContrast, renderCss, renderTailwind, renderMarkdown, fmt, fmtTarget } = require("./lib/tokens");
const { renderTile } = require("./lib/tile");

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

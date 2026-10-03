#!/usr/bin/env node
// Builds the design direction board and token exports.
//
//   node build.js design-direction-<slug>/          (reads direction.json and/or tokens.json)
//   node build.js design-direction-<slug>/tokens.json
//
// Writes board.html (always), tokens.css + tailwind.css (when tokens.json exists) and
// design-direction-<slug>.md (when direction.json exists), and prints the palette and
// contrast tables as markdown when there are tokens.
// Exit codes: 0 ok, 1 contrast failure (outputs still written), 2 invalid input (nothing written).

const fs = require("fs");
const path = require("path");
const { ROLES, PAIRS, contrastRatio, validate, checkContrast, renderCss, renderTailwind, renderMarkdown, fmt, fmtTarget } = require("./lib/tokens");
const { validateDirection } = require("./lib/direction");
const { renderBoard } = require("./lib/board");
const { renderDocument } = require("./lib/markdown");

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "direction";

function readJson(file, errors) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    errors.push(`${file}: ${err.message}`);
    return null;
  }
}

// Resolve a folder or a tokens.json path into { dir, directionPath, tokensPath }
function resolveInputs(input) {
  const abs = path.resolve(input);
  const isDir = fs.existsSync(abs) && fs.statSync(abs).isDirectory();
  const dir = isDir ? abs : path.dirname(abs);
  const pick = (file) => (fs.existsSync(path.join(dir, file)) ? path.join(dir, file) : null);
  return {
    dir,
    directionPath: pick("direction.json"),
    tokensPath: isDir ? pick("tokens.json") : fs.existsSync(abs) ? abs : null,
  };
}

// tokens.meta can lean on direction.json for the shared basics; explicit values win
function resolveTokens(tokens, direction) {
  if (!tokens || !direction || !direction.product || !direction.mood) return tokens;
  return {
    ...tokens,
    meta: {
      name: direction.product.name,
      toneWords: direction.mood.toneWords,
      manifesto: direction.mood.manifesto,
      ...(tokens.meta || {}),
    },
  };
}

function build(input) {
  const { dir, directionPath, tokensPath } = resolveInputs(input);
  const errors = [];
  if (!directionPath && !tokensPath) return { errors: [`no direction.json or tokens.json found in ${dir}`] };

  const direction = directionPath ? readJson(directionPath, errors) : null;
  const rawTokens = tokensPath ? readJson(tokensPath, errors) : null;
  if (errors.length) return { errors };

  if (direction) errors.push(...validateDirection(direction));
  const tokens = resolveTokens(rawTokens, direction);
  if (tokens) errors.push(...validate(tokens));
  if (errors.length) return { errors };

  const results = tokens ? checkContrast(tokens) : [];
  const outputs = { "board.html": renderBoard({ direction, tokens, results }) };
  if (tokens) {
    outputs["tokens.css"] = renderCss(tokens);
    outputs["tailwind.css"] = renderTailwind(tokens);
  }
  if (direction) {
    const base = path.basename(dir);
    const docName = base.startsWith("design-direction-") ? `${base}.md` : `design-direction-${slugify(direction.product.name)}.md`;
    outputs[docName] = renderDocument({ direction, tokens, results });
  }

  const written = [];
  for (const [file, content] of Object.entries(outputs)) {
    const p = path.join(dir, file);
    fs.writeFileSync(p, content);
    written.push(p);
  }
  // board.html replaces the v1.2–1.3 style tile
  const oldTile = path.join(dir, "style-tile.html");
  if (fs.existsSync(oldTile)) fs.unlinkSync(oldTile);

  return { errors: [], results, written, markdown: tokens ? renderMarkdown(tokens, results) : "" };
}

function main(argv) {
  const input = argv[0];
  if (!input || argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: node build.js <design-direction-folder | path/to/tokens.json>");
    return input ? 0 : 2;
  }
  const res = build(input);
  if (res.errors.length) {
    for (const e of res.errors) console.error(`ERROR ${e}`);
    console.error("\nNo files written. Fix the JSON and run again.");
    return 2;
  }
  if (res.markdown) console.log(res.markdown + "\n");
  console.log(`Wrote:\n${res.written.map((p) => `  ${p}`).join("\n")}`);
  const failing = res.results.filter((r) => !r.pass);
  for (const r of failing) console.error(`FAIL ${r.label} ${r.mode} ${fmt(r.ratio)} (needs ${fmtTarget(r.target)})`);
  if (failing.length) {
    console.error(`\n${failing.length} contrast check(s) failed. Adjust lightness (keep hue) and run again.`);
    return 1;
  }
  return 0;
}

module.exports = { contrastRatio, validate, validateDirection, resolveTokens, checkContrast, renderCss, renderTailwind, build, ROLES, PAIRS };

if (require.main === module) process.exit(main(process.argv.slice(2)));

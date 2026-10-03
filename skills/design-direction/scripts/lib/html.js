// Shared HTML helpers

const { GENERIC_FONTS, SYSTEM_FONTS } = require("./tokens");

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const isWebFont = (family) => Boolean(family) && !GENERIC_FONTS.has(family.toLowerCase()) && !SYSTEM_FONTS.has(family.toLowerCase());

// families: Map<familyName, Set<weight>>. Each family gets a plain link (regular weight always
// resolves) plus a weighted link; Google rejects a request naming a weight the family lacks, so
// keeping them separate means a missing weight can never knock out the font entirely.
function fontLinks(families) {
  const links = [];
  for (const [family, weights] of families) {
    if (!isWebFont(family)) continue;
    const name = encodeURIComponent(family).replace(/%20/g, "+");
    links.push(`<link rel="stylesheet" href="${esc(`https://fonts.googleapis.com/css2?family=${name}&display=swap`)}">`);
    const w = [...weights].filter((n) => n >= 100 && n <= 900 && n !== 400).sort((a, b) => a - b);
    if (w.length) {
      const all = [400, ...w].sort((a, b) => a - b).join(";");
      links.push(`<link rel="stylesheet" href="${esc(`https://fonts.googleapis.com/css2?family=${name}:wght@${all}&display=swap`)}">`);
    }
  }
  return links.join("\n");
}

module.exports = { esc, fontLinks, isWebFont };

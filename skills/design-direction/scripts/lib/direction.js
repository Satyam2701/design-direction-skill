// direction.json: the product brief, mood, features and progress of a design direction

const { HEX } = require("./tokens");

const EFFORTS = ["Quick win", "Medium", "Big bet"];

const isText = (v) => typeof v === "string" && v.trim().length > 0;

function requireText(obj, key, prefix, errors) {
  if (!obj || !isText(obj[key])) errors.push(`${prefix}.${key}: required text`);
}

function requireTextList(list, prefix, errors, min, max = Infinity) {
  if (!Array.isArray(list) || list.length < min || list.length > max || !list.every(isText)) {
    const range = max === Infinity ? `at least ${min}` : `${min}–${max}`;
    errors.push(`${prefix}: needs ${range} non-empty strings`);
  }
}

function validateDirection(d) {
  const errors = [];
  if (!d || typeof d !== "object") return ["direction: expected a JSON object"];

  const p = d.product;
  if (!p || typeof p !== "object") errors.push("product: missing");
  else for (const key of ["name", "summary", "audience", "oneWord"]) requireText(p, key, "product", errors);

  if (d.references !== undefined) requireTextList(d.references, "references", errors, 0);

  const m = d.mood;
  if (!m || typeof m !== "object") {
    errors.push("mood: missing");
  } else {
    requireTextList(m.toneWords, "mood.toneWords", errors, 3, 5);
    if (!Array.isArray(m.palettes) || m.palettes.length < 2 || m.palettes.length > 3) {
      errors.push("mood.palettes: needs 2–3 palette directions");
    }
    (Array.isArray(m.palettes) ? m.palettes : []).forEach((pal, i) => {
      const at = `mood.palettes[${i}]`;
      requireText(pal, "name", at, errors);
      requireText(pal, "feeling", at, errors);
      const sw = pal && pal.swatches;
      if (!Array.isArray(sw) || sw.length < 3 || sw.length > 5) errors.push(`${at}.swatches: needs 3–5 colors`);
      (Array.isArray(sw) ? sw : []).forEach((hex, j) => {
        if (!HEX.test(hex || "")) errors.push(`${at}.swatches[${j}]: must be #RRGGBB, got ${JSON.stringify(hex)}`);
      });
    });
    if (!m.typography || typeof m.typography !== "object") errors.push("mood.typography: missing");
    else for (const key of ["heading", "body", "pairing"]) requireText(m.typography, key, "mood.typography", errors);
    requireTextList(m.dos, "mood.dos", errors, 1);
    requireTextList(m.donts, "mood.donts", errors, 1);
    requireText(m, "manifesto", "mood", errors);
  }

  const f = d.features;
  if (f !== undefined) {
    if (!f || typeof f !== "object") {
      errors.push("features: expected an object");
    } else {
      if (!Array.isArray(f.flows) || f.flows.length < 1) errors.push("features.flows: needs at least 1 flow");
      (Array.isArray(f.flows) ? f.flows : []).forEach((flow, i) => {
        requireText(flow, "name", `features.flows[${i}]`, errors);
        const steps = flow && flow.steps;
        if (!Array.isArray(steps) || steps.length < 2) errors.push(`features.flows[${i}].steps: needs at least 2 steps`);
        (Array.isArray(steps) ? steps : []).forEach((s, j) => requireText(s, "screen", `features.flows[${i}].steps[${j}]`, errors));
      });
      if (!Array.isArray(f.ideas) || f.ideas.length < 5) errors.push("features.ideas: needs at least 5 ideas");
      (Array.isArray(f.ideas) ? f.ideas : []).forEach((idea, i) => {
        for (const key of ["name", "what", "why"]) requireText(idea, key, `features.ideas[${i}]`, errors);
        if (!idea || !EFFORTS.includes(idea.effort)) errors.push(`features.ideas[${i}].effort: must be one of ${EFFORTS.join(", ")}`);
      });
      if (!Array.isArray(f.interactions) || f.interactions.length < 3) errors.push("features.interactions: needs at least 3 concepts");
      (Array.isArray(f.interactions) ? f.interactions : []).forEach((it, i) => {
        for (const key of ["name", "where", "what"]) requireText(it, key, `features.interactions[${i}]`, errors);
      });
    }
  }

  const s = d.status;
  if (!s || typeof s !== "object") {
    errors.push("status: missing");
  } else {
    if (![1, 2, 3].includes(s.phase)) errors.push(`status.phase: must be 1, 2 or 3, got ${JSON.stringify(s.phase)}`);
    for (const key of ["approved", "needsReview"]) {
      const v = s[key];
      if (v !== undefined && (!Array.isArray(v) || !v.every((n) => [1, 2, 3].includes(n)))) {
        errors.push(`status.${key}: must be an array of phase numbers (1–3)`);
      }
    }
    if (s.log !== undefined && !Array.isArray(s.log)) errors.push("status.log: must be an array");
  }

  return errors;
}

// "approved" | "needs review" | "in review" | "not started"
function phaseState(status, n) {
  const s = status || {};
  if ((s.needsReview || []).includes(n)) return "needs review";
  if ((s.approved || []).includes(n)) return "approved";
  if (s.phase === n) return "in review";
  return "not started";
}

module.exports = { EFFORTS, validateDirection, phaseState };

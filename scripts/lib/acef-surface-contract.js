"use strict";
// ACEF surface-done contract kernel (shared, like acef-state-parser.js).
//
// Reality-grounded surface closeout: derive the evidence a story owes per
// touched surface from an OPEN surface registry, then verify it. Two evidence
// kinds are executed for real here (never self-asserted): the cold-process
// fresh-read for persistence (a separate child process must read what another
// process wrote) and reachability (a feature must be reachable from a declared
// entrypoint). Everything else is consumed as recorded results.
//
// Determinism: this module never calls Date.now()/Math.random()/new Date().
// Timestamps and ids arrive inside the records it is handed.

const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const crypto = require("node:crypto");

const ADAPTER_STATUSES = ["grounded", "provisional", "deferred", "aspirational", "unknown", "waived"];

// Open surface registry. Surface types are data; a record may extend this at
// verify time via record.surfaceRegistry. Names mirror the gate.schema.json
// surface vocabulary; evidence-kind shorthands mirror the lead's mapping:
//   web  -> ui + reachability + persistence + fresh-read   (surfaces ui, persistence)
//   cli  -> command + state
//   library -> public-api + consumer
//   docs -> docs-diff
const SURFACE_REGISTRY = {
  ui: { requiredEvidence: ["ui", "reachability"] },
  persistence: { requiredEvidence: ["persistence", "fresh-read"] },
  cli: { requiredEvidence: ["command", "state"] },
  library: { requiredEvidence: ["public-api", "consumer"] },
  docs: { requiredEvidence: ["docs-diff"] },
};

// Evidence kinds that MUST be proven by execution, never by a recorded boolean.
const EXECUTED_EVIDENCE = new Set(["fresh-read", "reachability"]);

function buildRegistry(extra) {
  const reg = {};
  for (const [id, def] of Object.entries(SURFACE_REGISTRY)) {
    reg[id] = { requiredEvidence: [...def.requiredEvidence] };
  }
  if (extra && typeof extra === "object") {
    for (const [id, def] of Object.entries(extra)) {
      if (!def || !Array.isArray(def.requiredEvidence)) {
        throw new Error(`surface "${id}" registration needs requiredEvidence[]`);
      }
      reg[id] = { requiredEvidence: [...def.requiredEvidence] };
    }
  }
  return reg;
}

function requiredEvidenceFor(surface, registry) {
  const def = registry[surface];
  return def ? [...def.requiredEvidence] : null;
}

// Per-surface map + flat union of the evidence a set of surfaces owes.
function deriveRequiredEvidence(surfaces, registry) {
  const perSurface = {};
  const unknown = [];
  const union = new Set();
  for (const surface of surfaces) {
    const ev = requiredEvidenceFor(surface, registry);
    if (ev === null) {
      unknown.push(surface);
      perSurface[surface] = null;
      continue;
    }
    perSurface[surface] = ev;
    for (const kind of ev) union.add(kind);
  }
  return { perSurface, requiredEvidence: [...union], unknown };
}

// --- deterministic witness fingerprint (for drift detection) ----------------
const IGNORED_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage"]);

function walk(dir, root, acc) {
  let names;
  try {
    names = fs.readdirSync(dir).sort();
  } catch {
    return;
  }
  for (const name of names) {
    if (IGNORED_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, root, acc);
    else if (st.isFile()) acc.push(path.relative(root, full).split(path.sep).join("/"));
  }
}

// Mechanical repo witness: detected surfaces + a content fingerprint over the
// exact files that mattered. Pure FS + parsing (no LLM is the source of facts).
function extractWitness(repoPath) {
  const allFiles = [];
  if (fs.existsSync(repoPath)) walk(repoPath, repoPath, allFiles);

  let pkg = null;
  const hasPkg = fs.existsSync(path.join(repoPath, "package.json"));
  if (hasPkg) {
    try {
      pkg = JSON.parse(fs.readFileSync(path.join(repoPath, "package.json"), "utf8"));
    } catch {
      pkg = null;
    }
  }

  const routes = allFiles.filter(
    (f) =>
      (/^(src\/)?(app|pages|routes)\//.test(f) && /\.(jsx?|tsx?|mjs|cjs|vue)$/.test(f)) ||
      /\.route\.(jsx?|tsx?)$/.test(f),
  );
  const migrations = allFiles.filter(
    (f) => /(^|\/)migrations\//.test(f) || /\.sql$/.test(f) || /schema\.prisma$/.test(f) || /(^|\/)drizzle\//.test(f),
  );
  const bins = [];
  if (pkg && pkg.bin) {
    const vals = typeof pkg.bin === "string" ? [pkg.bin] : Object.values(pkg.bin);
    for (const v of vals) bins.push(String(v).replace(/^\.\//, ""));
  }
  for (const f of allFiles) if (/^bin\//.test(f) && !bins.includes(f)) bins.push(f);
  const docs = allFiles.filter((f) => /\.md$/i.test(f) || /^docs\//.test(f));
  const serverFiles = allFiles.filter((f) => /^(src\/)?(server|index|app|main)\.(jsx?|tsx?|mjs|cjs)$/.test(f));
  const hasMain = Boolean(pkg && (pkg.main || pkg.exports || pkg.module));
  const isLibrary = hasMain && bins.length === 0 && routes.length === 0;

  const surfaces = [];
  if (routes.length) surfaces.push("ui");
  if (migrations.length) surfaces.push("persistence");
  if (bins.length) surfaces.push("cli");
  if (isLibrary) surfaces.push("library");
  if (docs.length) surfaces.push("docs");

  const witnessed = [
    ...new Set([
      ...(hasPkg ? ["package.json"] : []),
      ...routes,
      ...migrations,
      ...bins.filter((b) => allFiles.includes(b)),
      ...serverFiles,
      ...docs,
    ]),
  ].sort();

  const hash = crypto.createHash("sha256");
  for (const rel of witnessed) {
    let content = "";
    try {
      content = fs.readFileSync(path.join(repoPath, rel), "utf8");
    } catch {
      content = " <unreadable>";
    }
    hash.update(rel);
    hash.update(" ");
    hash.update(content);
    hash.update("\n");
  }

  return {
    repoPath,
    routes: routes.sort(),
    migrations: migrations.sort(),
    bins: bins.sort(),
    docs: docs.sort(),
    isLibrary,
    surfaces: surfaces.sort(),
    filesRead: witnessed,
    fingerprint: hash.digest("hex"),
  };
}

// --- executed evidence ------------------------------------------------------

// THE signature check. Write in ONE process, read in a SEPARATE process. State
// that only lived in a module-level singleton evaporates when the writer exits,
// so the cold reader sees nothing. A same-process read does NOT count.
function checkColdProcessFreshRead(spec) {
  const { writeCmd, readCmd, key, value } = spec || {};
  if (!writeCmd || !readCmd || key === undefined || value === undefined) {
    return { pass: false, reason: "fresh-read needs writeCmd, readCmd, key, value (a real cold-process proof, not a recorded boolean)" };
  }
  const w = cp.spawnSync("node", [writeCmd, String(key), String(value)], { encoding: "utf8" });
  if (w.status !== 0) {
    return { pass: false, reason: `write process failed (exit ${w.status}): ${(w.stderr || "").trim()}` };
  }
  const r = cp.spawnSync("node", [readCmd, String(key)], { encoding: "utf8" });
  if (r.status !== 0) {
    return { pass: false, reason: `read process failed (exit ${r.status}): ${(r.stderr || "").trim()}` };
  }
  const readValue = (r.stdout || "").trim();
  const pass = readValue === String(value);
  return {
    pass,
    readValue,
    reason: pass
      ? "cold-process fresh-read matched the written value"
      : `cold-process fresh-read MISMATCH: wrote "${value}", a separate process read "${readValue}" — state did not survive the process boundary`,
  };
}

// Reachability is separate evidence. BFS from declared entrypoints over the
// nav/import graph. Reachable -> pass; present-but-unreachable -> partial
// (renders-but-unreachable, NOT a pass); absent -> fail.
function checkReachability(spec) {
  const { entrypoints, featureModule, graph } = spec || {};
  if (!Array.isArray(entrypoints) || !featureModule || !graph || typeof graph !== "object") {
    return { pass: false, status: "fail", reason: "reachability needs entrypoints[], featureModule, graph{} (real wiring, not a recorded boolean)" };
  }
  const nodes = new Set(Object.keys(graph));
  for (const list of Object.values(graph)) for (const n of list) nodes.add(n);

  const visited = new Set(entrypoints);
  const queue = entrypoints.map((e) => ({ node: e, path: [e] }));
  while (queue.length) {
    const { node, path: trail } = queue.shift();
    if (node === featureModule) {
      return { pass: true, status: "pass", reason: `reachable from entrypoint via ${trail.join(" -> ")}` };
    }
    for (const next of graph[node] || []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push({ node: next, path: [...trail, next] });
      }
    }
  }
  if (nodes.has(featureModule)) {
    return {
      pass: false,
      status: "partial",
      reason: `feature "${featureModule}" renders but is unreachable from any declared entrypoint — partial credit, NOT a pass`,
    };
  }
  return { pass: false, status: "fail", reason: `feature "${featureModule}" is absent from the reachability graph` };
}

// --- waivers ----------------------------------------------------------------
function validateWaiver(w) {
  return Boolean(
    w &&
      w.surface &&
      w.signedBy &&
      w.reason &&
      typeof w.version === "number" &&
      Number.isFinite(w.version),
  );
}

// --- closeout evaluation ----------------------------------------------------
// Evaluate one surface against its required evidence, executing fresh-read and
// reachability for real.
function evaluateSurface(surface, registry, evidence) {
  const need = requiredEvidenceFor(surface, registry);
  if (need === null) {
    return { surface, ok: false, status: "unknown", reason: "unknown surface — needs human classification (fail-closed; no nearest-match)" };
  }
  const missing = [];
  const failed = [];
  const partial = [];
  for (const kind of need) {
    const entry = evidence ? evidence[kind] : undefined;
    if (entry === undefined) {
      missing.push(kind);
      continue;
    }
    if (kind === "fresh-read") {
      const res = checkColdProcessFreshRead(entry);
      if (!res.pass) failed.push(`${kind} (${res.reason})`);
      continue;
    }
    if (kind === "reachability") {
      const res = checkReachability(entry);
      if (res.status === "partial") partial.push(`${kind} (${res.reason})`);
      else if (!res.pass) failed.push(`${kind} (${res.reason})`);
      continue;
    }
    // Recorded result evidence. A self-asserted pass on an EXECUTED kind is rejected above.
    const passed = entry === true || (entry && entry.pass === true && entry.status !== "partial");
    if (entry && entry.status === "partial") partial.push(kind);
    else if (!passed) failed.push(kind);
  }
  if (missing.length || failed.length) {
    return {
      surface,
      ok: false,
      status: "incomplete",
      reason: `required evidence not satisfied (missing: [${missing.join(", ")}], failed: [${failed.join("; ")}])`,
    };
  }
  if (partial.length) {
    return { surface, ok: false, status: "partial", reason: `only partial-credit evidence: [${partial.join("; ")}] — NOT a pass` };
  }
  return { surface, ok: true, status: "covered", reason: `all required evidence passed (${need.join(", ")})` };
}

// Full closeout. Refuses on adapter drift; rejects out-of-scope/self-downgrade;
// fails closed on unknown; honors signed, versioned waivers.
function evaluateCloseout(record, options) {
  const opts = options || {};
  const registry = buildRegistry(record.surfaceRegistry);
  const goal = record.goal || { id: "goal", surfaceSet: [] };
  const story = record.story || { id: "story", touchedSurfaces: [] };
  const adapter = record.adapter || { fingerprint: null, surfaces: {} };
  const goalSet = goal.surfaceSet || [];
  const touched = story.touchedSurfaces || [];

  // 1) Drift gate. The current witness fingerprint must match the adapter's.
  const currentFingerprint =
    opts.currentFingerprint !== undefined ? opts.currentFingerprint : record.witnessFingerprint;
  let drift = null;
  if (currentFingerprint !== undefined && currentFingerprint !== null && adapter.fingerprint) {
    if (currentFingerprint !== adapter.fingerprint) {
      drift = `adapter fingerprint ${String(adapter.fingerprint).slice(0, 12)} != current witness ${String(currentFingerprint).slice(0, 12)}; re-witness before closeout`;
    }
  }

  // 2) Anti-self-fulfilling: parked wishes never enter the active surface set.
  const intake = record.intake || {};
  const parked = new Set([
    ...(intake.deferred || []),
    ...(intake.assumptions || []),
    ...(intake.unknowns || []),
  ]);
  const intakeSet = intake.surfaceSet || goalSet;
  const activeSurfaceSet = intakeSet.filter((s) => !parked.has(s));
  const { perSurface, requiredEvidence } = deriveRequiredEvidence(goalSet, registry);

  // 3) Out-of-scope claims (a story cannot redefine/expand the goal).
  const violations = [];
  for (const s of touched) {
    if (!goalSet.includes(s)) {
      violations.push({ surface: s, reason: `story "${story.id}" claims surface "${s}" outside the goal's surface set — a story cannot redefine/expand goal scope` });
    }
  }

  // 4) Waivers.
  const waiverBySurface = {};
  const waiverReport = [];
  for (const w of record.waivers || []) {
    const valid = validateWaiver(w);
    waiverReport.push({ surface: w.surface, signedBy: w.signedBy, version: w.version, reason: w.reason, valid });
    if (valid) waiverBySurface[w.surface] = w;
  }

  // 5) Per-surface evaluation over the WHOLE goal surface set.
  const claimed = new Set(touched);
  const surfaces = [];
  for (const s of goalSet) {
    if (waiverBySurface[s]) {
      const w = waiverBySurface[s];
      surfaces.push({ surface: s, ok: true, status: "waived", reason: `waived by ${w.signedBy} (v${w.version}): ${w.reason}` });
      continue;
    }
    if (!registry[s]) {
      surfaces.push({ surface: s, ok: false, status: "unknown", reason: "unknown surface — needs human classification (fail-closed; no nearest-match)" });
      continue;
    }
    if (!claimed.has(s)) {
      surfaces.push({ surface: s, ok: false, status: "uncovered", reason: `no story covers "${s}"; the goal cannot self-downgrade to a narrower scope` });
      continue;
    }
    surfaces.push(evaluateSurface(s, registry, record.evidence));
  }

  const ok = !drift && violations.length === 0 && surfaces.every((s) => s.ok);
  return {
    schema: "acef.surface-closeout.v1",
    goal: goal.id,
    drift,
    violations,
    activeSurfaceSet,
    parked: [...parked],
    requiredEvidence,
    requiredEvidencePerSurface: perSurface,
    waivers: waiverReport,
    surfaces,
    ok,
    verdict: ok ? "PASS" : "FAIL",
  };
}

module.exports = {
  ADAPTER_STATUSES,
  SURFACE_REGISTRY,
  EXECUTED_EVIDENCE,
  buildRegistry,
  requiredEvidenceFor,
  deriveRequiredEvidence,
  extractWitness,
  checkColdProcessFreshRead,
  checkReachability,
  validateWaiver,
  evaluateCloseout,
};

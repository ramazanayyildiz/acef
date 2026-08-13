"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const THRESHOLDS = Object.freeze({
  consolidateRuns: 5,
  consolidateReplans: 3,
  consolidateReviews: 6,
  suspendRuns: 8,
  suspendReplans: 5,
  maxRemediationCycles: 2,
});

const CRITICAL_CLASSES = new Set(["security", "payments", "migration", "realtime", "concurrency", "state-machine"]);
const DEFECT_CLASSES = new Set([...CRITICAL_CLASSES, "correctness", "cosmetic", "flake", "legacy"]);
const DEFECT_SOURCES = new Set(["review", "manual-qa", "broad-suite"]);
const DEFECT_STATUSES = new Set(["open", "batched", "escalated", "fixed", "deferred", "legacy-quarantined"]);
const OBJECTIVE_STATUSES = new Set(["EXECUTING", "CONSOLIDATING", "SUSPENDED_OVER_BUDGET", "CLOSEOUT", "DONE"]);

function safeId(value, label) {
  const result = String(value || "");
  if (!/^[A-Za-z0-9._-]+$/.test(result)) throw new Error(`${label} must use only letters, numbers, dot, underscore, or dash`);
  return result;
}

function normalizeScope(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function fingerprintScope(value) {
  const normalized = normalizeScope(value);
  if (!normalized) throw new Error("objective scope must be non-empty");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function objectivesDir(repo) {
  return path.join(repo, "docs", "ai", "objectives");
}

function objectivePath(repo, objectiveId) {
  return path.join(objectivesDir(repo), `${safeId(objectiveId, "objective id")}.json`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateObjective(record) {
  if (!record || record.schema !== "acef.objective-supervision.v1") throw new Error("objective supervision schema must be acef.objective-supervision.v1");
  for (const field of ["objectiveId", "objectiveScope", "scopeFingerprint", "status", "thresholds", "runs", "runCount", "replanCount", "reviewCycleCount", "defectLedger", "manualQa", "progress", "createdAt", "updatedAt"]) {
    if (record[field] === undefined) throw new Error(`objective supervision missing ${field}`);
  }
  safeId(record.objectiveId, "objective id");
  if (record.scopeFingerprint !== fingerprintScope(record.objectiveScope)) throw new Error("objective scopeFingerprint does not match objectiveScope");
  if (!OBJECTIVE_STATUSES.has(record.status)) throw new Error(`objective supervision has invalid status ${record.status}`);
  if (Object.entries(THRESHOLDS).some(([name, value]) => record.thresholds[name] !== value)) {
    throw new Error("objective supervision thresholds do not match objective-supervisor-v1");
  }
  if (!Array.isArray(record.runs) || record.runCount !== record.runs.length) throw new Error("objective runCount must equal unique runs length");
  if (new Set(record.runs.map((run) => safeId(run.runId, "objective run id"))).size !== record.runs.length) throw new Error("objective runs must be unique");
  const derivedReplans = record.runs.filter((run) => run.terminalDisposition === "REPLAN").length;
  if (record.replanCount !== derivedReplans) throw new Error("objective replanCount must equal terminal REPLAN runs");
  if (!Number.isInteger(record.reviewCycleCount) || record.reviewCycleCount < 0) throw new Error("objective reviewCycleCount must be a non-negative integer");
  if (!Array.isArray(record.defectLedger)) throw new Error("objective defectLedger must be an array");
  const defectIds = new Set();
  for (const defect of record.defectLedger) {
    safeId(defect.defectId, "defect id");
    if (defectIds.has(defect.defectId)) throw new Error(`duplicate objective defect ${defect.defectId}`);
    defectIds.add(defect.defectId);
    if (!DEFECT_SOURCES.has(defect.source) || !DEFECT_CLASSES.has(defect.class) || !DEFECT_STATUSES.has(defect.status)) throw new Error(`invalid objective defect ${defect.defectId}`);
    if (!String(defect.summary || "").trim()) throw new Error(`objective defect ${defect.defectId} requires summary`);
    if (CRITICAL_CLASSES.has(defect.class) && ["batched", "deferred", "legacy-quarantined"].includes(defect.status)) {
      throw new Error(`critical defect ${defect.defectId} cannot be ${defect.status}`);
    }
  }
  if (!record.manualQa || !["idle", "running", "complete"].includes(record.manualQa.status)) throw new Error("objective manualQa status is invalid");
  if (!record.progress || !Number.isInteger(record.progress.activeControlSeconds)
    || !Number.isInteger(record.progress.controlCommits) || !Number.isInteger(record.progress.productCommits)) {
    throw new Error("objective progress counters are invalid");
  }
  return record;
}

function atomicWrite(filePath, record) {
  validateObjective(record);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(record, null, 2)}\n`);
    fs.renameSync(tmp, filePath);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function loadObjective(repo, objectiveId) {
  const filePath = objectivePath(repo, objectiveId);
  return fs.existsSync(filePath) ? validateObjective(readJson(filePath)) : null;
}

function reportCount(repo, runIds) {
  const reportDir = path.join(repo, "docs", "ai", "reports");
  if (!fs.existsSync(reportDir)) return 0;
  const allowed = new Set(runIds);
  const cycles = new Set();
  fs.readdirSync(reportDir).filter((name) => name.endsWith(".json")).forEach((name) => {
    try {
      const report = readJson(path.join(reportDir, name));
      if (allowed.has(report.runId)) cycles.add(`${report.runId}\0${normalizeScope(report.story)}\0${report.inputCommit || name}`);
    } catch {
      // Invalid reports are rejected by their own validator and never count toward the objective budget.
    }
  });
  return cycles.size;
}

function git(repo, args) {
  return cp.execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function isControlPath(filePath) {
  return /^docs\/ai\/(?:ACEF_|actors\/|gates\/|evidence\/|reports\/|approvals\/|repairs\/|corrections\/|capsules\/|judges\/|objectives\/)/.test(filePath);
}

function reconcileProgress(repo, progress) {
  const now = new Date();
  const currentHead = git(repo, ["rev-parse", "HEAD"]);
  let commits = [];
  try { commits = git(repo, ["rev-list", "--reverse", `${progress.baseCommit}..HEAD`]).split(/\r?\n/).filter(Boolean); } catch {}
  let controlCommits = 0;
  let productCommits = 0;
  let lastProductCommit = progress.baseCommit;
  for (const commit of commits) {
    const paths = git(repo, ["diff-tree", "--no-commit-id", "--name-only", "-r", commit]).split(/\r?\n/).filter(Boolean);
    if (paths.some((filePath) => !isControlPath(filePath))) {
      productCommits += 1;
      lastProductCommit = commit;
    } else {
      controlCommits += 1;
    }
  }
  const productAdvanced = lastProductCommit !== progress.lastProductCommit;
  const priorObserved = Date.parse(progress.lastObservedAt || "");
  const boundedDelta = Number.isFinite(priorObserved) ? Math.min(300, Math.max(0, Math.floor((now.getTime() - priorObserved) / 1000))) : 0;
  return {
    ...progress,
    lastObservedAt: now.toISOString(),
    lastProductCommit,
    lastProductProgressAt: productAdvanced ? now.toISOString() : progress.lastProductProgressAt,
    activeControlSeconds: productAdvanced ? 0 : progress.activeControlSeconds + boundedDelta,
    controlCommits,
    productCommits,
    currentHead,
  };
}

function deriveStatus(record) {
  if (["CLOSEOUT", "DONE"].includes(record.status)) return record.status;
  if (record.runCount >= THRESHOLDS.suspendRuns || record.replanCount >= THRESHOLDS.suspendReplans) return "SUSPENDED_OVER_BUDGET";
  if (record.runCount >= THRESHOLDS.consolidateRuns || record.replanCount >= THRESHOLDS.consolidateReplans
    || record.progress.activeControlSeconds >= 1800
    || record.reviewCycleCount >= THRESHOLDS.consolidateReviews) return "CONSOLIDATING";
  return "EXECUTING";
}

function reconcileObjective(repo, record, previousRun = null) {
  const next = JSON.parse(JSON.stringify(record));
  if (previousRun && previousRun.objectiveId === next.objectiveId && previousRun.status === "complete") {
    const run = next.runs.find((entry) => entry.runId === previousRun.runId);
    if (run && !run.terminalDisposition) run.terminalDisposition = previousRun.terminalDisposition;
  }
  next.runCount = next.runs.length;
  next.replanCount = next.runs.filter((run) => run.terminalDisposition === "REPLAN").length;
  next.reviewCycleCount = reportCount(repo, next.runs.map((run) => run.runId));
  const progress = reconcileProgress(repo, next.progress);
  delete progress.currentHead;
  next.progress = progress;
  next.warnings = [];
  if (next.progress.activeControlSeconds >= 900) next.warnings.push("no product/test commit progress for 15 active control minutes");
  if (next.progress.productCommits > 0 && next.progress.controlCommits / next.progress.productCommits > 1.5) {
    next.warnings.push("control-to-product commit ratio exceeds 1.5");
  }
  next.status = deriveStatus(next);
  next.updatedAt = new Date().toISOString();
  return validateObjective(next);
}

function findFingerprintCollision(repo, fingerprint, objectiveId) {
  const dir = objectivesDir(repo);
  if (!fs.existsSync(dir)) return null;
  for (const name of fs.readdirSync(dir).filter((entry) => entry.endsWith(".json")).sort()) {
    const record = validateObjective(readJson(path.join(dir, name)));
    if (record.objectiveId !== objectiveId && record.scopeFingerprint === fingerprint && record.status !== "DONE") return record;
  }
  return null;
}

function registerRun(repo, options) {
  const objectiveId = safeId(options.objectiveId, "objective id");
  const objectiveScope = String(options.objectiveScope || "").trim();
  const fingerprint = fingerprintScope(objectiveScope);
  let record = loadObjective(repo, objectiveId);
  if (!record) {
    const collision = findFingerprintCollision(repo, fingerprint, objectiveId);
    if (collision) throw new Error(`scope fingerprint already belongs to unfinished objective ${collision.objectiveId}; a renamed run/objective cannot reset budgets`);
    const now = new Date().toISOString();
    const baseCommit = git(repo, ["rev-parse", "HEAD"]);
    record = {
      schema: "acef.objective-supervision.v1",
      objectiveId,
      objectiveScope,
      scopeFingerprint: fingerprint,
      status: "EXECUTING",
      thresholds: { ...THRESHOLDS },
      runs: [],
      runCount: 0,
      replanCount: 0,
      reviewCycleCount: 0,
      defectLedger: [],
      manualQa: { status: "idle" },
      progress: {
        baseCommit,
        lastObservedAt: now,
        lastProductCommit: baseCommit,
        lastProductProgressAt: now,
        activeControlSeconds: 0,
        controlCommits: 0,
        productCommits: 0
      },
      warnings: [],
      createdAt: now,
      updatedAt: now,
    };
  } else if (record.scopeFingerprint !== fingerprint) {
    throw new Error(`objective ${objectiveId} scope is immutable`);
  }
  record = reconcileObjective(repo, record, options.previousRun);
  atomicWrite(objectivePath(repo, objectiveId), record);
  const existing = record.runs.find((entry) => entry.runId === options.runId);
  if (existing) {
    atomicWrite(objectivePath(repo, objectiveId), record);
    return record;
  }
  if (options.previousRun && options.previousRun.status !== "complete") {
    throw new Error(`cannot open ${options.runId}; prior run ${options.previousRun.runId} is ${options.previousRun.status}`);
  }
  if (record.status === "SUSPENDED_OVER_BUDGET") {
    throw new Error(`objective ${objectiveId} is SUSPENDED_OVER_BUDGET; split scope with explicit human approval before another run`);
  }
  const defectIds = [...new Set(options.defectIds || [])].map((id) => safeId(id, "objective defect id"));
  const defects = defectIds.map((id) => record.defectLedger.find((defect) => defect.defectId === id));
  if (defects.some((defect) => !defect)) throw new Error("objective run references an unknown defect id");
  if (record.manualQa.status === "running" && defectIds.length) throw new Error("manual QA must complete before findings can open repair runs");
  if (record.status === "CONSOLIDATING" && !defectIds.length) throw new Error("CONSOLIDATING objective permits only defect-ledger admissions");
  if (defects.some((defect) => CRITICAL_CLASSES.has(defect.class))) {
    if (options.workflowId === "quick-fix") throw new Error("critical objective defects require ACEF Standard or Full, not Quick Fix");
    if (options.assuranceProfile !== "guarded") throw new Error("critical objective defects require Guarded assurance");
  }
  const nonCriticalManualQa = defects.filter((defect) => defect.source === "manual-qa" && !CRITICAL_CLASSES.has(defect.class));
  if (nonCriticalManualQa.some((defect) => defect.status !== "batched")) {
    throw new Error("non-critical manual QA findings must be explicitly batched after the checklist completes");
  }
  if (nonCriticalManualQa.length > 1
    && new Set(nonCriticalManualQa.map((defect) => defect.batchKey || "")).size !== 1) {
    throw new Error("non-critical manual QA findings may share one repair run only when they have one batchKey");
  }
  if (options.previousRun?.terminalDisposition === "REPLAN") {
    if (!new Set(["new-root-cause", "scope-error", "evidence-invalid"]).has(options.replanCause)) {
      throw new Error("a run after REPLAN requires --replan-cause new-root-cause|scope-error|evidence-invalid");
    }
  }
  if (record.runCount + 1 >= THRESHOLDS.suspendRuns) {
    record.status = "SUSPENDED_OVER_BUDGET";
    record.updatedAt = new Date().toISOString();
    atomicWrite(objectivePath(repo, objectiveId), record);
    throw new Error(`objective ${objectiveId} reached the ${THRESHOLDS.suspendRuns}-run hard stop; human split required`);
  }
  record.runs.push({
    runId: safeId(options.runId, "run id"),
    openedAt: new Date().toISOString(),
    ...(options.replanCause ? { replanCause: options.replanCause } : {}),
    ...(defectIds.length ? { defectIds } : {}),
  });
  record.runCount = record.runs.length;
  record.status = deriveStatus(record);
  record.updatedAt = new Date().toISOString();
  atomicWrite(objectivePath(repo, objectiveId), record);
  return record;
}

function setManualQa(repo, objectiveId, status) {
  if (!["running", "complete"].includes(status)) throw new Error("manual QA status must be running or complete");
  let record = loadObjective(repo, objectiveId);
  if (!record) throw new Error(`unknown objective ${objectiveId}`);
  record = reconcileObjective(repo, record);
  const now = new Date().toISOString();
  record.manualQa = status === "running"
    ? { status, startedAt: now }
    : { ...record.manualQa, status, completedAt: now };
  record.updatedAt = now;
  atomicWrite(objectivePath(repo, objectiveId), record);
  return record;
}

function recordDefect(repo, objectiveId, input) {
  let record = loadObjective(repo, objectiveId);
  if (!record) throw new Error(`unknown objective ${objectiveId}`);
  record = reconcileObjective(repo, record);
  const defectId = safeId(input.defectId, "defect id");
  if (record.defectLedger.some((defect) => defect.defectId === defectId)) throw new Error(`duplicate objective defect ${defectId}`);
  if (!DEFECT_SOURCES.has(input.source)) throw new Error(`invalid defect source ${input.source}`);
  if (!DEFECT_CLASSES.has(input.class)) throw new Error(`invalid defect class ${input.class}`);
  let status = input.status || (CRITICAL_CLASSES.has(input.class) ? "escalated" : "open");
  if (!DEFECT_STATUSES.has(status)) throw new Error(`invalid defect status ${status}`);
  if (CRITICAL_CLASSES.has(input.class) && ["batched", "deferred", "legacy-quarantined"].includes(status)) {
    throw new Error(`critical defect ${defectId} cannot be ${status}`);
  }
  if (input.source === "manual-qa" && record.manualQa.status === "idle") throw new Error("manual QA finding requires a running or complete checklist");
  record.defectLedger.push({
    defectId,
    source: input.source,
    class: input.class,
    summary: String(input.summary || "").trim(),
    status,
    discoveredInRun: safeId(input.discoveredInRun, "discovered run id"),
    ...(input.batchKey ? { batchKey: safeId(input.batchKey, "batch key") } : {}),
    ...(input.rootCauseKey ? { rootCauseKey: safeId(input.rootCauseKey, "root cause key") } : {}),
    createdAt: new Date().toISOString(),
  });
  record.updatedAt = new Date().toISOString();
  atomicWrite(objectivePath(repo, objectiveId), record);
  return record;
}

function transitionDefect(repo, objectiveId, defectId, status, batchKey = "") {
  let record = loadObjective(repo, objectiveId);
  if (!record) throw new Error(`unknown objective ${objectiveId}`);
  record = reconcileObjective(repo, record);
  const defect = record.defectLedger.find((entry) => entry.defectId === safeId(defectId, "defect id"));
  if (!defect) throw new Error(`unknown objective defect ${defectId}`);
  if (!DEFECT_STATUSES.has(status)) throw new Error(`invalid defect status ${status}`);
  const transitions = {
    open: new Set(["batched", "escalated", "fixed", "deferred", "legacy-quarantined"]),
    batched: new Set(["escalated", "fixed"]),
    escalated: new Set(["fixed"]),
    deferred: new Set(["escalated", "fixed"]),
    "legacy-quarantined": new Set(["escalated", "fixed"]),
    fixed: new Set(),
  };
  if (!transitions[defect.status].has(status)) throw new Error(`invalid defect transition ${defect.status} -> ${status}`);
  if (CRITICAL_CLASSES.has(defect.class) && ["batched", "deferred", "legacy-quarantined"].includes(status)) {
    throw new Error(`critical defect ${defect.defectId} cannot be ${status}`);
  }
  if (status === "batched") defect.batchKey = safeId(batchKey || defect.batchKey, "batch key");
  defect.status = status;
  record.updatedAt = new Date().toISOString();
  atomicWrite(objectivePath(repo, objectiveId), record);
  return record;
}

function objectiveFailures(repo, activeRun) {
  if (!activeRun?.objectiveContract) return [];
  const failures = [];
  const record = loadObjective(repo, activeRun.objectiveId);
  if (!record) return [`missing objective record ${activeRun.objectivePath}`];
  if (record.scopeFingerprint !== activeRun.scopeFingerprint) failures.push("active run objective fingerprint mismatch");
  if (!record.runs.some((run) => run.runId === activeRun.runId)) failures.push("active run is not registered in its parent objective");
  const reconciled = reconcileObjective(repo, record, activeRun.status === "complete" ? activeRun : null);
  if (reconciled.status === "SUSPENDED_OVER_BUDGET" && activeRun.status !== "complete") failures.push(`objective ${record.objectiveId} is SUSPENDED_OVER_BUDGET`);
  if (reconciled.runCount > THRESHOLDS.suspendRuns || reconciled.replanCount > THRESHOLDS.suspendReplans) failures.push("objective counters exceed hard limits");
  return failures;
}

module.exports = {
  CRITICAL_CLASSES,
  THRESHOLDS,
  fingerprintScope,
  loadObjective,
  objectiveFailures,
  objectivePath,
  reconcileObjective,
  recordDefect,
  registerRun,
  setManualQa,
  transitionDefect,
  validateObjective,
};

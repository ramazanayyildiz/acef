"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const { attemptPath, collectRunAttempts, commandIdentity } = require("./acef-invocation-ledger");
const { parseActorRecord, parseGateVerdict, parseReviewReport } = require("./acef-state-parser");

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
  for (const run of record.runs) {
    if (run.outcomeDisposition !== undefined || run.outcomeReason !== undefined) {
      if (!["resolved", "superseded"].includes(run.outcomeDisposition) || !String(run.outcomeReason || "").trim()
        || !["FAIL", "REPLAN", "BLOCKED"].includes(run.terminalDisposition) || run.successfulCompletion) {
        throw new Error("non-successful run outcome disposition is invalid");
      }
    }
    if (run.successfulCompletion) {
      if (run.terminalDisposition !== "PASS") throw new Error("successful completion requires a PASS run");
      for (const field of ["invocationId", "evidenceId"]) safeId(run.successfulCompletion[field], `successful completion ${field}`);
      if (!/^docs\/ai\/gates\/[^/]+\.json$/.test(run.successfulCompletion.gatePath || "") || !String(run.successfulCompletion.applicationTree || "")) {
        throw new Error("successful completion binding is invalid");
      }
    }
  }
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
  if (record.accounting !== undefined) {
    if (record.accounting.version !== "objective-accounting-v2") throw new Error("objective accounting version is invalid");
    for (const field of ["consecutiveNoProgressRuns", "consecutiveReplans", "successfulCompletionCount"]) {
      if (!Number.isInteger(record.accounting[field]) || record.accounting[field] < 0) throw new Error(`objective accounting ${field} is invalid`);
    }
  }
  if (record.replanEvents !== undefined && (!Array.isArray(record.replanEvents)
    || new Set(record.replanEvents.map((event) => safeId(event.eventId, "replan event id"))).size !== record.replanEvents.length)) {
    throw new Error("objective replan events are invalid");
  }
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

function collectObjectiveReviews(repo, record) {
  const actorsDir = path.join(repo, "docs", "ai", "actors");
  if (!fs.existsSync(actorsDir)) return [];
  const allowed = new Set(record.runs.map((run) => run.runId));
  const actors = [];
  const verifiedTrees = new Map();
  const head = git(repo, ["rev-parse", "HEAD"]);
  for (const name of fs.readdirSync(actorsDir).filter((entry) => entry.endsWith(".json"))) {
    try {
      const filePath = path.join(actorsDir, name);
      const candidate = readJson(filePath);
      if (!allowed.has(candidate.runId)) continue;
      const actor = parseActorRecord(filePath);
      if (name !== actor.actorInstanceId + ".json" || !actor.inputTree) continue;
      if (!verifiedTrees.has(actor.inputCommit)) {
        git(repo, ["merge-base", "--is-ancestor", actor.inputCommit, head]);
        verifiedTrees.set(actor.inputCommit, git(repo, ["rev-parse", actor.inputCommit + "^{tree}"]));
      }
      if (verifiedTrees.get(actor.inputCommit) !== actor.inputTree) continue;
      actors.push(actor);
    } catch { /* Unrelated or invalid actor records cannot establish a review. */ }
  }
  const cycles = new Set();
  for (const actor of actors) {
    const phase = normalizeScope(actor.phase).replace(/[^a-z0-9]+/g, "");
    const role = normalizeScope(actor.role).replace(/[^a-z0-9]+/g, "");
    if (!["codereview", "review", "patchassurance"].includes(phase)
      || !["reviewer", "codereviewer", "patchassurancereviewer"].includes(role)) continue;
    const developers = actors.filter((entry) => entry.runId === actor.runId
      && normalizeScope(entry.story) === normalizeScope(actor.story)
      && normalizeScope(entry.role) === "developer");
    if (!developers.length || developers.some((entry) => entry.actorInstanceId === actor.actorInstanceId
      || (actor.sessionId && entry.sessionId === actor.sessionId))) continue;
    const reportPath = String(actor.producedArtifactPath || "").replaceAll(path.sep, "/");
    if (!/^docs\/ai\/reports\/[^/]+\.(?:json|md)$/i.test(reportPath)) continue;
    try {
      const absolute = path.join(repo, reportPath);
      if (!fs.lstatSync(absolute).isFile()
        || !fs.realpathSync(absolute).startsWith(fs.realpathSync(repo) + path.sep)) continue;
      const bytes = fs.readFileSync(absolute);
      if (!bytes.toString("utf8").trim()
        || actor.producedArtifactHash !== crypto.createHash("sha256").update(bytes).digest("hex")) continue;
      if (/\.json$/i.test(reportPath)) {
        const report = parseReviewReport(absolute);
        if (report.actorInstanceId !== actor.actorInstanceId || report.runId !== actor.runId
          || normalizeScope(report.story) !== normalizeScope(actor.story)
          || normalizeScope(report.phase).replace(/[^a-z0-9]+/g, "") !== phase
          || report.inputCommit !== actor.inputCommit || report.inputTree !== actor.inputTree) continue;
      }
      // Code Review and Patch Assurance of one input tree are one review cycle.
      cycles.add(actor.runId + "\0" + normalizeScope(actor.story) + "\0" + actor.inputTree);
    } catch { /* An unbound, partial, missing or changed report cannot count. */ }
  }
  return [...cycles];
}

function reportCount(repo, record) {
  if (record.accounting?.version !== "objective-accounting-v2") {
    const reportDir = path.join(repo, "docs", "ai", "reports");
    if (!fs.existsSync(reportDir)) return 0;
    const allowed = new Set(record.runs.map((run) => run.runId));
    const cycles = new Set();
    fs.readdirSync(reportDir).filter((name) => name.endsWith(".json")).forEach((name) => {
      try { const report = readJson(path.join(reportDir, name)); if (allowed.has(report.runId)) cycles.add(`${report.runId}\0${normalizeScope(report.story)}\0${report.inputCommit || name}`); } catch {}
    });
    return cycles.size;
  }
  return collectObjectiveReviews(repo, record).length;
}

function git(repo, args) {
  return cp.execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function isControlPath(filePath) {
  const normalized = String(filePath || "").replaceAll(path.sep, "/");
  return /^\.acef\//.test(normalized)
    || /^\.(?:agents|claude|cline|codex|cursor|gemini|goose|kiro|mymir|opencode|qoder|qwen|roo|windsurf)\//.test(normalized)
    || /^_bmad(?:-output)?\//.test(normalized)
    || /^docs\/ai\/ACEF_[^/]+\.(?:json|md)$/.test(normalized)
    || normalized === "docs/ai/ACEF_ACTIVE_LEDGER"
    || /^docs\/ai\//.test(normalized)
    || /^docs\/ai\/(?:actors|gates|evidence|reports|approvals|repairs|corrections|capsules|judges|objectives|recoveries)\//.test(normalized);
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
  if (record.accounting?.version === "objective-accounting-v2") {
    if (record.accounting.consecutiveNoProgressRuns >= THRESHOLDS.suspendRuns
      || record.accounting.consecutiveReplans >= THRESHOLDS.suspendReplans) return "SUSPENDED_OVER_BUDGET";
    if (record.accounting.consecutiveNoProgressRuns >= THRESHOLDS.consolidateRuns
      || record.accounting.consecutiveReplans >= THRESHOLDS.consolidateReplans
      || record.progress.activeControlSeconds >= 1800
      || (record.accounting.consecutiveReviewCycles || 0) >= THRESHOLDS.consolidateReviews) return "CONSOLIDATING";
    return "EXECUTING";
  }
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
  const reviewedCycles = next.accounting?.version === "objective-accounting-v2" ? collectObjectiveReviews(repo, next) : null;
  next.reviewCycleCount = reviewedCycles ? reviewedCycles.length : reportCount(repo, next);
  const progress = reconcileProgress(repo, next.progress);
  delete progress.currentHead;
  next.progress = progress;
  if (next.accounting?.version === "objective-accounting-v2") {
    let consecutiveNoProgressRuns = 0;
    let consecutiveReplans = 0;
    let successfulCompletionCount = 0;
    let consecutiveReviewCycles = 0;
    const reviewCycles = reviewedCycles;
    const replanEventsByRun = new Map();
    for (const event of next.replanEvents || []) {
      replanEventsByRun.set(event.runId, (replanEventsByRun.get(event.runId) || 0) + 1);
    }
    for (const run of next.runs) {
      if (run.terminalDisposition === "PASS" && run.successfulCompletion) {
        successfulCompletionCount += 1;
        consecutiveNoProgressRuns = 0;
        consecutiveReplans = 0;
        consecutiveReviewCycles = 0;
      } else {
        consecutiveNoProgressRuns += 1;
        consecutiveReviewCycles += reviewCycles.filter((key) => key.startsWith(`${run.runId}\0`)).length;
        const replanEvents = replanEventsByRun.get(run.runId) || 0;
        consecutiveReplans = (run.terminalDisposition === "REPLAN" || replanEvents)
          ? consecutiveReplans + Math.max(1, replanEvents) : 0;
      }
    }
    next.accounting = { version: "objective-accounting-v2", consecutiveNoProgressRuns, consecutiveReplans, consecutiveReviewCycles, successfulCompletionCount };
  }
  next.warnings = [];
  if (next.progress.activeControlSeconds >= 900) next.warnings.push("no product/test commit progress for 15 active control minutes");
  if (next.progress.productCommits > 0 && next.progress.controlCommits / next.progress.productCommits > 1.5) {
    next.warnings.push("control-to-product commit ratio exceeds 1.5");
  }
  next.status = deriveStatus(next);
  next.updatedAt = new Date().toISOString();
  return validateObjective(next);
}

function prepareObjectiveHeartbeat(repo, activeRun) {
  if (!activeRun?.objectiveContract || !activeRun.objectiveId) return null;
  const record = loadObjective(repo, activeRun.objectiveId);
  if (!record) throw new Error(`missing objective record ${activeRun.objectivePath}`);
  if (record.scopeFingerprint !== activeRun.scopeFingerprint) {
    throw new Error("active run objective fingerprint mismatch");
  }
  const reconciled = reconcileObjective(repo, record, activeRun.status === "complete" ? activeRun : null);
  return { path: objectivePath(repo, activeRun.objectiveId), record: reconciled };
}

function persistObjectiveHeartbeat(repo, activeRun) {
  const prepared = prepareObjectiveHeartbeat(repo, activeRun);
  return prepared ? publishPreparedObjective(prepared) : null;
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

function prepareRegisterRun(repo, options) {
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
      ...(options.accountingVersion === "objective-accounting-v2" ? { accounting: { version: "objective-accounting-v2", consecutiveNoProgressRuns: 0, consecutiveReplans: 0, successfulCompletionCount: 0 }, replanEvents: [] } : {}),
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
  const existing = record.runs.find((entry) => entry.runId === options.runId);
  if (existing) {
    return { path: objectivePath(repo, objectiveId), record };
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
  if (!record.accounting && record.runCount + 1 >= THRESHOLDS.suspendRuns) {
    throw new Error(`objective ${objectiveId} reached the ${THRESHOLDS.suspendRuns}-run hard stop; human split required`);
  }
  record.runs.push({
    runId: safeId(options.runId, "run id"),
    openedAt: new Date().toISOString(),
    ...(options.replanCause ? { replanCause: options.replanCause } : {}),
    ...(defectIds.length ? { defectIds } : {}),
  });
  record = reconcileObjective(repo, record);
  if (record.accounting?.version === "objective-accounting-v2" && record.status === "SUSPENDED_OVER_BUDGET") {
    throw new Error(`objective ${objectiveId} reached the ${THRESHOLDS.suspendRuns}-run hard stop for consecutive no-progress churn; human split required`);
  }
  validateObjective(record);
  return { path: objectivePath(repo, objectiveId), record };
}

function publishPreparedObjective(prepared) {
  if (!prepared || !prepared.path || !prepared.record) throw new Error("prepared objective requires path and record");
  atomicWrite(prepared.path, prepared.record);
  return prepared.record;
}

function registerRun(repo, options) {
  return publishPreparedObjective(prepareRegisterRun(repo, options));
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

function prepareReplanEvent(repo, objectiveId, input) {
  const record = loadObjective(repo, objectiveId);
  if (!record) throw new Error(`unknown objective ${objectiveId}`);
  const eventId = safeId(input.eventId, "replan event id");
  const runId = safeId(input.runId, "run id");
  if (!record.runs.some((run) => run.runId === runId)) throw new Error(`replan event run ${runId} is not registered`);
  if (!new Set(["new-root-cause", "scope-error", "evidence-invalid"]).has(input.cause)) throw new Error("invalid replan event cause");
  if ((record.replanEvents || []).some((event) => event.eventId === eventId)) throw new Error("replan event id is already recorded");
  const next = { ...record, replanEvents: [...(record.replanEvents || []), { eventId, runId, cause: input.cause, createdAt: new Date().toISOString() }], updatedAt: new Date().toISOString() };
  return { path: objectivePath(repo, objectiveId), record: reconcileObjective(repo, next) };
}

function recordReplanEvent(repo, objectiveId, input) {
  return publishPreparedObjective(prepareReplanEvent(repo, objectiveId, input));
}

function completionIntegrity(repo, runId, input, { requireFresh = false } = {}) {
  const repoRoot = fs.realpathSync(repo);
  const hashes = {};
  function bindFile(candidate) {
    const absolute = path.resolve(repoRoot, candidate);
    const relative = path.relative(repoRoot, absolute).replaceAll(path.sep, "/");
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)
      || !fs.lstatSync(absolute).isFile()
      || !fs.realpathSync(absolute).startsWith(`${repoRoot}${path.sep}`)) {
      throw new Error(`completion artifact must be a repository-local regular file: ${candidate}`);
    }
    hashes[relative] = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
    return absolute;
  }
  const gateRelative = path.relative(repoRoot, path.resolve(repoRoot, String(input.gatePath || ""))).replaceAll(path.sep, "/");
  if (!/^docs\/ai\/gates\/[^/]+\.json$/.test(gateRelative)) throw new Error("validated completion requires an existing gate path");
  const gate = parseGateVerdict(bindFile(gateRelative));
  if (gate.runId !== runId || gate.verdict !== "PASS" || gate.applicationTree !== input.applicationTree
    || gate.lightweightStateContract !== "lightweight-state-v1"
    || !gate.evidenceIds?.includes(gate.greenEvidenceId)) {
    throw new Error("validated completion gate binding mismatch");
  }
  // The validator imports this supervisor. Resolve it lazily only after both
  // modules have initialized, including the installed .cjs entrypoint.
  const validatorPath = fs.existsSync(path.join(__dirname, "../acef-process-validator.cjs"))
    ? "../acef-process-validator.cjs" : "../acef-process-validator";
  const { evidenceRecordById, validateEvidenceRecord } = require(validatorPath);
  function boundEvidence(id) {
    safeId(id, "completion evidence id");
    bindFile(`docs/ai/evidence/${id}.json`);
    const evidence = evidenceRecordById(repoRoot, id);
    const failures = validateEvidenceRecord(repoRoot, evidence, { requireFresh, scopePaths: gate.scopePaths });
    if (failures.length || evidence.exitCode !== 0
      || evidence.dirtyApplicationPathsBefore?.length || evidence.dirtyApplicationPathsAfter?.length) {
      throw new Error(`completion evidence is not valid: ${failures.join("; ") || "failed or dirty execution"}`);
    }
    bindFile(evidence.rawArtifact.path);
    return evidence;
  }
  const green = boundEvidence(gate.greenEvidenceId);
  const source = green.reusedFromEvidenceId ? boundEvidence(green.reusedFromEvidenceId) : green;
  if (source.reusedFromEvidenceId || source.actorInstanceId !== green.actorInstanceId || source.story !== green.story) {
    throw new Error("completion alias does not bind the original actor and story");
  }
  const attempt = collectRunAttempts(repoRoot, runId).find((entry) => entry.invocationId === safeId(input.invocationId, "invocation id"));
  if (!attempt || attempt.status !== "passed" || attempt.exitCode !== 0 || attempt.evidenceId !== source.evidenceId
    || attempt.actorId !== source.actorInstanceId || attempt.commandIdentity !== commandIdentity(source.commandArgv)) {
    throw new Error("validated completion requires the bound successful green invocation");
  }
  bindFile(attemptPath(repoRoot, attempt.invocationId));
  const producer = parseActorRecord(bindFile(`docs/ai/actors/${safeId(source.actorInstanceId, "producer actor id")}.json`));
  const reviewer = parseActorRecord(bindFile(`docs/ai/actors/${safeId(gate.decidedBy, "reviewer actor id")}.json`));
  const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (producer.runId !== runId || reviewer.runId !== runId
    || normalize(producer.story) !== normalize(gate.scope) || normalize(reviewer.story) !== normalize(gate.scope)
    || producer.actorInstanceId === reviewer.actorInstanceId
    || (producer.sessionId && producer.sessionId === reviewer.sessionId)
    || !["reviewer", "codereviewer", "processjudge", "judge"].includes(normalize(reviewer.role))) {
    throw new Error("validated completion requires independent actor/run/story bindings");
  }
  if (reviewer.producedArtifactPath) {
    const artifactPath = bindFile(reviewer.producedArtifactPath);
    if (reviewer.producedArtifactHash !== hashes[path.relative(repoRoot, artifactPath).replaceAll(path.sep, "/")]) {
      throw new Error("completion review artifact hash mismatch");
    }
  }
  return { evidenceId: green.evidenceId, physicalEvidenceId: source.evidenceId, gatePath: gateRelative, artifactHashes: hashes };
}

function prepareValidatedCompletion(repo, objectiveId, input) {
  const record = loadObjective(repo, objectiveId);
  if (!record) throw new Error(`unknown objective ${objectiveId}`);
  if (input.terminalDisposition !== "PASS") throw new Error("validated completion requires terminalDisposition PASS");
  const next = JSON.parse(JSON.stringify(record));
  const run = next.runs.find((entry) => entry.runId === safeId(input.runId, "run id"));
  if (!run) throw new Error("validated completion requires a registered run");
  if (run.terminalDisposition && run.terminalDisposition !== "PASS") throw new Error("validated completion cannot replace a non-PASS terminal disposition");
  run.terminalDisposition = "PASS";
  if (run.successfulCompletion) throw new Error(`run ${run.runId} already has a validated completion`);
  const integrity = completionIntegrity(repo, run.runId, input, { requireFresh: true });
  run.successfulCompletion = { invocationId: input.invocationId, ...integrity, applicationTree: input.applicationTree, validatedAt: new Date().toISOString() };
  return { path: objectivePath(repo, objectiveId), record: reconcileObjective(repo, next) };
}

function recordValidatedCompletion(repo, objectiveId, input) {
  return publishPreparedObjective(prepareValidatedCompletion(repo, objectiveId, { ...input, terminalDisposition: "PASS" }));
}

function prepareCloseObjective(repo, objectiveId, input = {}) {
  const record = loadObjective(repo, objectiveId);
  if (!record) throw new Error(`unknown objective ${objectiveId}`);
  if (record.status === "DONE") throw new Error("objective is already DONE");
  if (!Array.isArray(input.runDispositions || [])) throw new Error("runDispositions must be an array");
  const dispositionIds = new Set();
  for (const disposition of input.runDispositions || []) {
    const runId = safeId(disposition.runId, "run disposition id");
    if (dispositionIds.has(runId)) throw new Error("duplicate run disposition " + runId);
    dispositionIds.add(runId);
    const run = record.runs.find((entry) => entry.runId === runId);
    if (!run || run.successfulCompletion || !["FAIL", "REPLAN", "BLOCKED"].includes(run.terminalDisposition)
      || !["resolved", "superseded"].includes(disposition.disposition) || !String(disposition.reason || "").trim()) {
      throw new Error("run disposition requires a registered terminal non-PASS run and explicit resolved/superseded reason");
    }
    run.outcomeDisposition = disposition.disposition;
    run.outcomeReason = String(disposition.reason).trim();
  }
  if (record.runs.some((run) => !run.terminalDisposition)) throw new Error("objective close requires every registered run to be terminal");
  if (record.manualQa.status === "running") throw new Error("objective close requires manual QA to finish");
  const unresolved = record.defectLedger.filter((defect) => !["fixed", "deferred", "legacy-quarantined"].includes(defect.status));
  if (unresolved.some((defect) => CRITICAL_CLASSES.has(defect.class))) throw new Error("objective close is blocked by unresolved critical defects");
  if (unresolved.length) throw new Error("objective close requires explicit non-critical defect disposition");
  for (const run of record.runs) {
    if (!run.successfulCompletion && (!["resolved", "superseded"].includes(run.outcomeDisposition) || !run.outcomeReason)) {
      throw new Error(`objective close requires explicit disposition for non-successful run ${run.runId}`);
    }
  }
  const completion = record.runs.flatMap((run) => run.successfulCompletion ? [{ run, completion: run.successfulCompletion }] : []).find(({ completion }) => completion.evidenceId === input.completionEvidenceId);
  if (!completion) throw new Error("objective close requires bound successful completion evidence");
  for (const run of record.runs.filter((entry) => entry.successfulCompletion)) {
    const saved = run.successfulCompletion;
    try {
      const current = completionIntegrity(repo, run.runId, saved, { requireFresh: run.runId === completion.run.runId });
      if (!saved.artifactHashes || current.evidenceId !== saved.evidenceId
        || current.physicalEvidenceId !== saved.physicalEvidenceId
        || JSON.stringify(current.artifactHashes) !== JSON.stringify(saved.artifactHashes)) {
        throw new Error("completion artifacts changed after validation");
      }
    } catch (error) {
      throw new Error(`objective close completion binding is no longer valid for ${run.runId}: ${error.message}`);
    }
  }
  const next = { ...record, status: "DONE", updatedAt: new Date().toISOString() };
  validateObjective(next);
  return { path: objectivePath(repo, objectiveId), record: next };
}

function closeObjective(repo, objectiveId, input) {
  return publishPreparedObjective(prepareCloseObjective(repo, objectiveId, input));
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
  if (reconciled.accounting?.version === "objective-accounting-v2") {
    if (reconciled.accounting.consecutiveNoProgressRuns > THRESHOLDS.suspendRuns
      || reconciled.accounting.consecutiveReplans > THRESHOLDS.suspendReplans) failures.push("objective churn counters exceed hard limits");
  } else if (reconciled.runCount > THRESHOLDS.suspendRuns || reconciled.replanCount > THRESHOLDS.suspendReplans) failures.push("objective counters exceed hard limits");
  return failures;
}

module.exports = {
  CRITICAL_CLASSES,
  THRESHOLDS,
  fingerprintScope,
  loadObjective,
  objectiveFailures,
  objectivePath,
  persistObjectiveHeartbeat,
  prepareObjectiveHeartbeat,
  prepareRegisterRun,
  prepareCloseObjective,
  prepareValidatedCompletion,
  publishPreparedObjective,
  closeObjective,
  recordReplanEvent,
  prepareReplanEvent,
  recordValidatedCompletion,
  reconcileObjective,
  recordDefect,
  collectObjectiveReviews,
  registerRun,
  setManualQa,
  transitionDefect,
  validateObjective,
};

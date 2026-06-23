const fs = require("node:fs");
const path = require("node:path");

function readJson(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

function requireFields(record, fields, label) {
  const missing = fields.filter((field) => record[field] === undefined || record[field] === null || record[field] === "");
  if (missing.length) throw new Error(`${label} missing required field(s): ${missing.join(", ")}`);
}

function requireEnum(record, field, values, label) {
  if (!values.includes(record[field])) {
    throw new Error(`${label} ${field} must be one of: ${values.join(", ")}`);
  }
}

function requireStringArray(record, field, label, { nonEmpty = false } = {}) {
  if (!Array.isArray(record[field]) || record[field].some((value) => typeof value !== "string" || !value.trim())) {
    throw new Error(`${label} ${field} must be an array of non-empty strings`);
  }
  if (nonEmpty && !record[field].length) throw new Error(`${label} ${field} must not be empty`);
}

function parseActiveRun(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["runId", "repo", "lane", "status", "activeStory", "activePhase", "ledgerPath"], "active run");
  requireEnum(record, "lane", ["lightweight", "full-bmad", "guarded", "custom"], "active run");
  requireEnum(record, "status", ["active", "paused", "blocked", "complete"], "active run");
  if (record.maxLines !== undefined && record.maxLines !== null
    && (!Number.isInteger(record.maxLines) || record.maxLines < 1 || record.maxLines > 150)) {
    throw new Error("active run maxLines must be an integer between 1 and 150");
  }
  return record;
}

function parseActorRecord(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["actorInstanceId", "story", "phase", "role", "client", "inputCommit", "allowedContextProfile"], "actor record");
  return record;
}

function parseEvidenceManifest(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["evidenceId", "kind", "command", "repositoryCommit", "actorInstanceId", "story", "rawArtifact", "satisfies"], "evidence manifest");
  requireEnum(record, "kind", ["runtime-test", "static-check", "manual-smoke", "build", "lint", "typecheck", "other"], "evidence manifest");
  if (!Number.isInteger(record.exitCode)) throw new Error("evidence manifest missing integer exitCode");
  requireStringArray(record, "satisfies", "evidence manifest", { nonEmpty: true });
  if (!record.rawArtifact || typeof record.rawArtifact !== "object") throw new Error("evidence manifest missing rawArtifact");
  requireFields(record.rawArtifact, ["path", "sha256"], "evidence rawArtifact");
  return record;
}

function parseGateVerdict(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["gateId", "scope", "verdict", "decidedBy", "repositoryCommit"], "gate verdict");
  requireEnum(record, "verdict", ["PASS", "FAIL", "REVISE", "REPLAN", "BLOCKED"], "gate verdict");
  if (record.evidenceIds !== undefined) requireStringArray(record, "evidenceIds", "gate verdict");
  if (record.verdict === "PASS" && (!Array.isArray(record.evidenceIds) || !record.evidenceIds.length)) {
    throw new Error("PASS gate verdict requires evidenceIds");
  }
  return record;
}

function parseApproval(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["approvalId", "decision", "scope", "actorType", "statementHash", "repositoryCommit"], "approval");
  requireEnum(record, "decision", ["APPROVE", "REJECT", "ACCEPT_RISK"], "approval");
  requireEnum(record, "actorType", ["human", "system"], "approval");
  if (record.actorType === "human" && (!record.userQuote || !String(record.userQuote).trim())) {
    throw new Error("human approval requires userQuote");
  }
  if (record.targetEpic !== undefined && record.targetEpic !== null
    && (!Number.isInteger(record.targetEpic) || record.targetEpic < 1)) {
    throw new Error("approval targetEpic must be a positive integer");
  }
  return record;
}

function parseWorkerScope(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["activeStory", "phase", "workerId", "allowedPaths", "baseRef", "maxCommits"], "worker scope");
  requireStringArray(record, "allowedPaths", "worker scope", { nonEmpty: true });
  if (record.allowedPaths.some((entry) => path.isAbsolute(entry) || entry.split(/[\\/]/).includes(".."))) {
    throw new Error("worker scope allowedPaths must be repo-relative and cannot contain ..");
  }
  if (!Number.isInteger(record.maxCommits) || record.maxCommits < 1) {
    throw new Error("worker scope maxCommits must be a positive integer");
  }
  if (record.canEditLedger !== false) throw new Error("worker scope canEditLedger must be false");
  if (record.canSpawnAgents !== false) throw new Error("worker scope canSpawnAgents must be false");
  return record;
}

function requireRelativePaths(values, label) {
  requireStringArray({ values }, "values", label);
  if (values.some((entry) => path.isAbsolute(entry) || entry.split(/[\\/]/).includes(".."))) {
    throw new Error(`${label} paths must be repo-relative and cannot contain ..`);
  }
}

function parsePrReview(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["reviewId", "reviewerActorId", "baseCommit", "headCommit", "changedFiles", "selectedPaths", "workShapes", "inputs", "reviewProfile", "diffArtifact", "reportPath", "writeMode", "qaMode", "maxFiles", "maxDiffLines"], "PR review");
  requireStringArray(record, "changedFiles", "PR review", { nonEmpty: true });
  requireStringArray(record, "selectedPaths", "PR review", { nonEmpty: true });
  requireStringArray(record, "workShapes", "PR review", { nonEmpty: true });
  requireRelativePaths(record.changedFiles, "PR review changedFiles");
  requireRelativePaths(record.selectedPaths, "PR review selectedPaths");
  if (record.broadReadPaths !== undefined) {
    requireStringArray(record, "broadReadPaths", "PR review");
    requireRelativePaths(record.broadReadPaths, "PR review broadReadPaths");
    if (record.broadReadPaths.length && !String(record.broadReadReason || "").trim()) {
      throw new Error("PR review broad reads require broadReadReason");
    }
  }
  requireEnum(record, "writeMode", ["report-only"], "PR review");
  requireEnum(record, "qaMode", ["none", "qa-only"], "PR review");
  if (!record.inputs || typeof record.inputs !== "object") throw new Error("PR review inputs must be an object");
  requireFields(record.inputs, ["issuePath", "focusedTests", "adapterPath", "patternRegistryPath", "qaEvidencePaths"], "PR review inputs");
  requireStringArray(record.inputs, "focusedTests", "PR review inputs", { nonEmpty: true });
  requireStringArray(record.inputs, "qaEvidencePaths", "PR review inputs");
  requireRelativePaths([record.inputs.issuePath, record.inputs.adapterPath, record.inputs.patternRegistryPath, record.reportPath, record.diffArtifact?.path, record.reviewProfile?.path].filter(Boolean), "PR review artifact");
  requireRelativePaths(record.inputs.qaEvidencePaths, "PR review QA evidence");
  if (!record.reviewProfile || typeof record.reviewProfile !== "object") throw new Error("PR review reviewProfile must be an object");
  requireFields(record.reviewProfile, ["path", "sha256"], "PR review reviewProfile");
  if (!/^[a-f0-9]{64}$/.test(record.reviewProfile.sha256)) throw new Error("PR review reviewProfile sha256 must be a SHA-256 hex digest");
  if (!record.diffArtifact || typeof record.diffArtifact !== "object") throw new Error("PR review diffArtifact must be an object");
  requireFields(record.diffArtifact, ["path", "sha256", "lineCount"], "PR review diffArtifact");
  if (!/^[a-f0-9]{64}$/.test(record.diffArtifact.sha256)) throw new Error("PR review diffArtifact sha256 must be a SHA-256 hex digest");
  if (!Number.isInteger(record.diffArtifact.lineCount) || record.diffArtifact.lineCount < 1) throw new Error("PR review diffArtifact lineCount must be positive");
  if (!Number.isInteger(record.maxFiles) || record.maxFiles < 1) throw new Error("PR review maxFiles must be positive");
  if (!Number.isInteger(record.maxDiffLines) || record.maxDiffLines < 1) throw new Error("PR review maxDiffLines must be positive");
  if (record.selectedPaths.some((entry) => !record.changedFiles.includes(entry))) throw new Error("PR review selectedPaths must stay inside changedFiles");
  return record;
}

function recordFromPathOrObject(input, label) {
  if (typeof input === "string") return readJson(input);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error(`${label} must be an object`);
  return input;
}

function requireShaArtifact(record, label) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error(`${label} must be an object`);
  requireFields(record, ["path", "sha256"], label);
  requireRelativePaths([record.path], label);
  if (!/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error(`${label} sha256 must be a SHA-256 hex digest`);
}

function parsePrReviewProfile(input, label = "PR review profile") {
  const record = recordFromPathOrObject(input, label);
  requireFields(record, ["profileId", "reviewId", "generatedAt", "baseCommit", "headCommit", "changedFiles", "selectedPaths", "workShapes", "genericRulesSupplementOnly", "source", "adapterSignals", "selectedPatterns", "globalDoNotCopy"], label);
  requireStringArray(record, "changedFiles", label, { nonEmpty: true });
  requireStringArray(record, "selectedPaths", label, { nonEmpty: true });
  requireStringArray(record, "workShapes", label, { nonEmpty: true });
  requireRelativePaths(record.changedFiles, `${label} changedFiles`);
  requireRelativePaths(record.selectedPaths, `${label} selectedPaths`);
  if (record.genericRulesSupplementOnly !== true) throw new Error(`${label} genericRulesSupplementOnly must be true`);
  if (!record.source || typeof record.source !== "object") throw new Error(`${label} source must be an object`);
  requireShaArtifact(record.source.adapter, `${label} source.adapter`);
  requireShaArtifact(record.source.patternRegistry, `${label} source.patternRegistry`);
  if (!["READY", "PARTIAL"].includes(record.source.patternRegistry.status)) {
    throw new Error(`${label} patternRegistry status must be READY or PARTIAL`);
  }
  if (!Array.isArray(record.source.patternRegistry.coveredScopes)) throw new Error(`${label} patternRegistry coveredScopes must be an array`);
  if (!Array.isArray(record.adapterSignals)) throw new Error(`${label} adapterSignals must be an array`);
  for (const [index, signal] of record.adapterSignals.entries()) {
    requireFields(signal, ["line", "text"], `${label} adapterSignals[${index}]`);
    if (!Number.isInteger(signal.line) || signal.line < 1) throw new Error(`${label} adapterSignals[${index}].line must be positive`);
  }
  if (!Array.isArray(record.selectedPatterns) || !record.selectedPatterns.length) throw new Error(`${label} selectedPatterns must not be empty`);
  for (const [index, pattern] of record.selectedPatterns.entries()) {
    requireFields(pattern, ["id", "workShape", "status", "maturity", "summary", "evidence", "completionEvidence", "sourceEvidence", "goldenNeighbors", "reuseProbe", "doNotCopy", "confidence", "lastVerifiedAt", "lastVerifiedCommit", "refreshTriggers"], `${label} selectedPatterns[${index}]`);
    if (!record.workShapes.includes(pattern.workShape)) throw new Error(`${label} selectedPatterns[${index}] workShape is outside requested workShapes`);
    if (!pattern.completionEvidence || typeof pattern.completionEvidence !== "object") throw new Error(`${label} selectedPatterns[${index}].completionEvidence must be an object`);
    for (const field of ["structure", "registration", "discoverability", "runtime"]) {
      if (!String(pattern.completionEvidence[field] || "").trim()) throw new Error(`${label} selectedPatterns[${index}].completionEvidence.${field} is required`);
    }
    for (const arrayField of ["sourceEvidence", "goldenNeighbors", "reuseProbe", "doNotCopy", "refreshTriggers"]) {
      if (!Array.isArray(pattern[arrayField])) throw new Error(`${label} selectedPatterns[${index}].${arrayField} must be an array`);
    }
  }
  if (!Array.isArray(record.globalDoNotCopy)) throw new Error(`${label} globalDoNotCopy must be an array`);
  for (const [index, entry] of record.globalDoNotCopy.entries()) {
    requireFields(entry, ["id", "reason", "sourceEvidence", "lastVerifiedCommit"], `${label} globalDoNotCopy[${index}]`);
    if (!Array.isArray(entry.sourceEvidence)) throw new Error(`${label} globalDoNotCopy[${index}].sourceEvidence must be an array`);
  }
  return record;
}

function parseLightweightRun(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["runId", "lane", "status", "implementationActorId", "reviewActorId", "steps", "promotion"], "lightweight run");
  requireEnum(record, "lane", ["lightweight", "guarded"], "lightweight run");
  requireEnum(record, "status", ["active", "blocked", "complete"], "lightweight run");
  if (record.implementationActorId === record.reviewActorId) throw new Error("lightweight run requires an independent review actor");
  const expected = ["preflight-current-context", "reuse-before-create", "implementation", "independent-review", "focused-verification", "closeout-evidence"];
  if (!Array.isArray(record.steps) || record.steps.length !== expected.length) throw new Error("lightweight run requires exactly six lifecycle steps");
  record.steps.forEach((step, index) => {
    requireFields(step, ["name", "status", "evidencePaths"], `lightweight step ${index + 1}`);
    if (step.name !== expected[index]) throw new Error(`lightweight step ${index + 1} must be ${expected[index]}`);
    requireEnum(step, "status", ["PENDING", "PASS", "BLOCKED"], `lightweight step ${step.name}`);
    requireStringArray(step, "evidencePaths", `lightweight step ${step.name}`);
    requireRelativePaths(step.evidencePaths, `lightweight step ${step.name}`);
    if (step.status === "PASS" && !step.evidencePaths.length) throw new Error(`lightweight step ${step.name} PASS requires evidencePaths`);
  });
  if (record.status === "complete" && record.steps.some((step) => step.status !== "PASS")) {
    throw new Error("complete lightweight run requires every lifecycle step to PASS");
  }
  if (!record.promotion || typeof record.promotion !== "object") throw new Error("lightweight run promotion must be an object");
  requireFields(record.promotion, ["decision", "triggers"], "lightweight promotion");
  requireEnum(record.promotion, "decision", ["stay-lightweight", "promote-full-bmad", "human-risk-acceptance"], "lightweight promotion");
  requireStringArray(record.promotion, "triggers", "lightweight promotion");
  if (record.promotion.triggers.length && record.promotion.decision === "stay-lightweight") {
    throw new Error("lightweight promotion triggers require full BMAD promotion or human risk acceptance");
  }
  return record;
}

const workerFailureKinds = [
  "provider_rate_limit",
  "provider_auth",
  "context_overflow",
  "budget_timeout",
  "tool_failed",
  "empty_response",
  "scope_blocked",
  "cancelled",
  "unknown",
];

function requireWorkerLimit(limit, label) {
  if (!limit || typeof limit !== "object" || Array.isArray(limit)) throw new Error(`${label} must be an object`);
  requireFields(limit, ["value", "enforcement"], label);
  if (typeof limit.value !== "number" || limit.value <= 0) throw new Error(`${label}.value must be positive`);
  if (!["declared", "observed", "mechanically_enforced"].includes(limit.enforcement)) {
    throw new Error(`${label}.enforcement must be declared, observed, or mechanically_enforced`);
  }
}

function parseWorkerExecution(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["contractVersion", "taskId", "workerId", "role", "limits", "writeMode", "stopCondition", "createdAt"], "worker execution");
  if (record.contractVersion !== "acef-worker-execution-v1") throw new Error("worker execution contractVersion must be acef-worker-execution-v1");
  requireEnum(record, "writeMode", ["read-only", "report-only", "scoped-write"], "worker execution");
  if (!record.limits || typeof record.limits !== "object") throw new Error("worker execution limits must be an object");
  requireWorkerLimit(record.limits.maxRuntimeMs, "worker execution limits.maxRuntimeMs");
  requireWorkerLimit(record.limits.maxToolCalls, "worker execution limits.maxToolCalls");
  for (const optional of ["maxTokens", "maxCostUsd"]) {
    if (record.limits[optional] !== undefined && record.limits[optional] !== null) {
      requireWorkerLimit(record.limits[optional], `worker execution limits.${optional}`);
    }
  }
  if (record.scope) {
    if (record.scope.allowedPaths !== undefined) requireRelativePaths(record.scope.allowedPaths, "worker execution scope.allowedPaths");
    if (record.scope.deniedPaths !== undefined) requireRelativePaths(record.scope.deniedPaths, "worker execution scope.deniedPaths");
  }
  return record;
}

function parseWorkerResult(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["contractVersion", "taskId", "workerId", "answerKey", "status", "summary", "verdict", "artifact", "usage", "createdAt"], "worker result");
  if (record.contractVersion !== "acef-worker-result-v1") throw new Error("worker result contractVersion must be acef-worker-result-v1");
  requireEnum(record, "status", ["succeeded", "failed", "blocked", "cancelled"], "worker result");
  requireEnum(record, "verdict", ["pass", "fail", "blocked", "inconclusive"], "worker result");
  if (record.status === "succeeded" && record.failureKind !== undefined && record.failureKind !== null) {
    throw new Error("worker result succeeded status must not set failureKind");
  }
  if (record.status !== "succeeded") {
    if (!workerFailureKinds.includes(record.failureKind)) {
      throw new Error(`worker result failureKind must be one of: ${workerFailureKinds.join(", ")}`);
    }
  }
  requireShaArtifact(record.artifact, "worker result artifact");
  if (record.transcript !== undefined && record.transcript !== null) {
    if (!record.transcript || typeof record.transcript !== "object") throw new Error("worker result transcript must be an object or null");
    requireFields(record.transcript, ["path", "sha256"], "worker result transcript");
    if (!/^[a-f0-9]{64}$/.test(record.transcript.sha256)) throw new Error("worker result transcript sha256 must be a SHA-256 hex digest");
  }
  if (!record.usage || typeof record.usage !== "object") throw new Error("worker result usage must be an object");
  requireFields(record.usage, ["runtimeMs", "toolCalls"], "worker result usage");
  if (typeof record.usage.runtimeMs !== "number" || record.usage.runtimeMs < 0) throw new Error("worker result usage.runtimeMs must be non-negative");
  if (!Number.isInteger(record.usage.toolCalls) || record.usage.toolCalls < 0) throw new Error("worker result usage.toolCalls must be a non-negative integer");
  for (const optional of ["inputTokens", "outputTokens", "totalTokens"]) {
    if (record.usage[optional] !== undefined && (!Number.isInteger(record.usage[optional]) || record.usage[optional] < 0)) {
      throw new Error(`worker result usage.${optional} must be a non-negative integer`);
    }
  }
  if (record.usage.costUsd !== undefined && (typeof record.usage.costUsd !== "number" || record.usage.costUsd < 0)) {
    throw new Error("worker result usage.costUsd must be non-negative");
  }
  if (record.openQuestions !== undefined) requireStringArray(record, "openQuestions", "worker result");
  return record;
}

function parseWorkerRollup(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["contractVersion", "generatedAt", "sourceResults", "consensus", "conflicts", "openQuestions", "recommendedNextAction"], "worker rollup");
  if (record.contractVersion !== "acef-worker-rollup-v1") throw new Error("worker rollup contractVersion must be acef-worker-rollup-v1");
  for (const field of ["sourceResults", "consensus", "conflicts", "openQuestions"]) {
    if (!Array.isArray(record[field])) throw new Error(`worker rollup ${field} must be an array`);
  }
  for (const [index, item] of record.sourceResults.entries()) {
    requireFields(item, ["path", "sha256", "answerKey", "workerId", "status", "verdict", "summary", "artifact"], `worker rollup sourceResults[${index}]`);
    requireRelativePaths([item.path], `worker rollup sourceResults[${index}]`);
    if (!/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error(`worker rollup sourceResults[${index}].sha256 must be a SHA-256 hex digest`);
    requireShaArtifact(item.artifact, `worker rollup sourceResults[${index}].artifact`);
  }
  return record;
}

function parseFreshness(record, label = "freshness") {
  if (!record || typeof record !== "object") throw new Error(`${label} must be an object`);
  requireFields(record, ["commit", "verifiedAt", "scope"], label);
  return record;
}

function safeRelative(filePath, root) {
  const rel = path.relative(root, filePath);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes root: ${filePath}`);
  }
  return rel;
}

module.exports = {
  parseActiveRun,
  parseActorRecord,
  parseEvidenceManifest,
  parseGateVerdict,
  parseApproval,
  parseWorkerScope,
  parsePrReview,
  parsePrReviewProfile,
  parseLightweightRun,
  parseWorkerExecution,
  parseWorkerResult,
  parseWorkerRollup,
  parseFreshness,
  safeRelative,
};

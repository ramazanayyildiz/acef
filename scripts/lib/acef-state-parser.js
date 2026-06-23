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
  parseFreshness,
  safeRelative,
};

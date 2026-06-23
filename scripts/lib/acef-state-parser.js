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

function parseActiveRun(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["runId", "repo", "lane", "status", "activeStory", "activePhase", "ledgerPath"], "active run");
  return record;
}

function parseActorRecord(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["actorInstanceId", "role", "client", "inputCommit", "allowedContextProfile"], "actor record");
  return record;
}

function parseEvidenceManifest(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["evidenceId", "kind", "command", "repositoryCommit", "satisfies"], "evidence manifest");
  if (!Number.isInteger(record.exitCode)) throw new Error("evidence manifest missing integer exitCode");
  if (!Array.isArray(record.satisfies)) throw new Error("evidence manifest satisfies must be an array");
  return record;
}

function parseGateVerdict(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["gateId", "scope", "verdict", "decidedBy", "repositoryCommit"], "gate verdict");
  return record;
}

function parseApproval(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["approvalId", "decision", "scope", "actorType", "statementHash", "repositoryCommit"], "approval");
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
  safeRelative,
};


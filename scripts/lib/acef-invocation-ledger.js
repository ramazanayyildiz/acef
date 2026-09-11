"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function safeId(value, label) {
  const result = String(value || "");
  if (!/^[A-Za-z0-9._-]+$/.test(result)) throw new Error(`${label} must use only letters, numbers, dot, underscore, or dash`);
  return result;
}

function commandIdentity(argv) {
  if (!Array.isArray(argv) || !argv.length || argv.some((value) => typeof value !== "string" || !value)) {
    throw new Error("commandArgv must be a non-empty string array");
  }
  return crypto.createHash("sha256").update(JSON.stringify(argv)).digest("hex");
}

function attemptsDir(repo) { return path.join(repo, "docs", "ai", "evidence", "attempts"); }
function attemptPath(repo, invocationId) { return path.join(attemptsDir(repo), `${safeId(invocationId, "invocation id")}.json`); }
function read(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
function validateReceipt(record, name) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("invalid invocation receipt " + name);
  const attempt = record.schema === "acef.invocation-attempt.v1";
  const recovery = record.schema === "acef.invocation-recovery.v1";
  if (!attempt && !recovery) throw new Error("unknown invocation receipt schema " + name);
  const id = attempt ? record.invocationId : record.recoveryId;
  const expected = attempt ? id + ".json" : "recovery-" + id + ".json";
  for (const [field, value] of [["id", id], ["runId", record.runId], ["actorId", record.actorId]]) safeId(value, "receipt " + field);
  if (name !== expected || !/^[a-f0-9]{64}$/.test(record.scopeFingerprint || "")
    || !/^[a-f0-9]{64}$/.test(record.commandIdentity || "")) throw new Error("invalid invocation receipt " + name);
  const validTime = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
  if (attempt) {
    safeId(record.evidenceId, "receipt evidence id");
    safeId(record.kind, "receipt kind");
    if (!["running", "passed", "failed", "interrupted"].includes(record.status) || !validTime(record.startedAt)
      || (record.status !== "running" && (!validTime(record.finishedAt)
        || Date.parse(record.finishedAt) < Date.parse(record.startedAt)))) throw new Error("invalid invocation receipt " + name);
    if (record.status === "running" && (record.finishedAt !== undefined || record.exitCode !== undefined || record.signal !== undefined)) throw new Error("invalid invocation receipt " + name);
    if (record.status === "passed" && (record.exitCode !== 0 || record.signal !== undefined)) throw new Error("invalid invocation receipt " + name);
    if (record.status === "failed" && (!Number.isInteger(record.exitCode) || record.exitCode === 0 || record.signal !== undefined)) throw new Error("invalid invocation receipt " + name);
    if (record.status === "interrupted" && (typeof record.signal !== "string" || !record.signal.trim()
      || (record.exitCode !== undefined && !Number.isInteger(record.exitCode)))) throw new Error("invalid invocation receipt " + name);
  } else {
    safeId(record.attemptId, "recovery attempt id");
    if (!["infrastructure", "fixture-authoring"].includes(record.mode) || typeof record.reason !== "string"
      || !record.reason.trim() || !validTime(record.createdAt)) throw new Error("invalid invocation receipt " + name);
    if (record.mode === "fixture-authoring" && (!Array.isArray(record.changedPaths) || !record.changedPaths.length
      || record.changedPaths.some((file) => typeof file !== "string" || !file || path.isAbsolute(file) || file.split(/[\\/]/).includes(".."))
      || !record.beforeProductTree || record.beforeProductTree !== record.afterProductTree)) throw new Error("invalid invocation receipt " + name);
  }
  return record;
}
function validateReceiptSet(records) {
  const attempts = new Map(records.filter((record) => record.schema === "acef.invocation-attempt.v1").map((record) => [record.invocationId, record]));
  const recoveredRuns = new Set();
  for (const receipt of records.filter((record) => record.schema === "acef.invocation-recovery.v1")) {
    const original = attempts.get(receipt.attemptId);
    if (!original || original.status !== "failed"
      || ["runId", "actorId", "scopeFingerprint", "commandIdentity"].some((key) => original[key] !== receipt[key])
      || Date.parse(receipt.createdAt) < Date.parse(original.finishedAt)
      || (receipt.mode === "infrastructure" && original.exitCode !== 75)
      || (receipt.mode === "fixture-authoring" && original.exitCode === 75)) {
      throw new Error("invalid invocation recovery source binding " + receipt.recoveryId);
    }
    if (recoveredRuns.has(receipt.runId)) throw new Error("run " + receipt.runId + " already used its one recovery allowance");
    recoveredRuns.add(receipt.runId);
  }
  return records;
}
function readReceipts(repo) {
  const directory = attemptsDir(repo);
  if (!fs.existsSync(directory)) return [];
  return validateReceiptSet(fs.readdirSync(directory).filter((name) => name.endsWith(".json")).sort().map((name) => {
    let record;
    const source = path.join(directory, name);
    try {
      if (!fs.lstatSync(source).isFile() || !fs.realpathSync(source).startsWith(fs.realpathSync(repo) + path.sep)) throw new Error("not a repository-local file");
      record = read(source);
    } catch { throw new Error("malformed invocation receipt " + name); }
    return validateReceipt(record, name);
  }));
}
function write(filePath, record) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`);
  fs.renameSync(temporary, filePath);
}
function binding(input) {
  return {
    runId: safeId(input.runId, "run id"),
    actorId: safeId(input.actorId, "actor id"),
    evidenceId: safeId(input.evidenceId, "evidence id"),
    kind: safeId(input.kind, "invocation kind"),
    scopeFingerprint: String(input.scopeFingerprint || ""),
    commandIdentity: commandIdentity(input.commandArgv),
  };
}
function sameBinding(record, input) {
  const expected = binding({ ...record, ...input, evidenceId: input.evidenceId || record.evidenceId, kind: input.kind || record.kind });
  return ["runId", "actorId", "scopeFingerprint", "commandIdentity"].every((field) => record[field] === expected[field]);
}

function startInvocation(repo, input) {
  const invocationId = safeId(input.invocationId, "invocation id");
  const filePath = attemptPath(repo, invocationId);
  const record = {
    schema: "acef.invocation-attempt.v1",
    invocationId,
    ...binding(input),
    status: "running",
    startedAt: input.startedAt || new Date().toISOString(),
  };
  if (fs.existsSync(filePath)) throw new Error(`invocation ${invocationId} already exists`);
  readReceipts(repo);
  validateReceipt(record, path.basename(filePath));
  write(filePath, record);
  return record;
}

function finishInvocation(repo, input) {
  const filePath = attemptPath(repo, input.invocationId);
  if (!fs.existsSync(filePath)) throw new Error(`unknown invocation ${input.invocationId}`);
  const record = readReceipts(repo).find((entry) => entry.schema === "acef.invocation-attempt.v1" && entry.invocationId === input.invocationId);
  if (!record) throw new Error("unknown invocation " + input.invocationId);
  if (record.status !== "running") throw new Error(`invocation ${record.invocationId} is already finalized`);
  if (!sameBinding(record, input)) throw new Error(`invocation ${record.invocationId} binding mismatch`);
  if (input.exitCode !== undefined && !Number.isInteger(input.exitCode)) throw new Error("invocation exitCode must be an integer");
  if (input.signal !== undefined && (typeof input.signal !== "string" || !input.signal)) throw new Error("invocation signal must be non-empty");
  const status = input.signal ? "interrupted" : input.exitCode === 0 ? "passed" : "failed";
  const finalized = { ...record, status, ...(input.exitCode !== undefined ? { exitCode: input.exitCode } : {}), ...(input.signal ? { signal: input.signal } : {}), finishedAt: input.finishedAt || new Date().toISOString() };
  validateReceipt(finalized, path.basename(filePath));
  write(filePath, finalized);
  return finalized;
}

function collectRunAttempts(repo, runId) {
  const wanted = safeId(runId, "run id");
  return readReceipts(repo).filter((record) => record.schema === "acef.invocation-attempt.v1" && record.runId === wanted);
}

function recordInfrastructureRecovery(repo, input) {
  const original = readReceipts(repo).find((entry) => entry.schema === "acef.invocation-attempt.v1" && entry.invocationId === safeId(input.attemptId, "attempt id"));
  if (!original) throw new Error(`unknown invocation ${input.attemptId}`);
  if (original.status === "running" || original.exitCode !== 75) throw new Error("infrastructure recovery requires a retained finalized exit 75 attempt");
  if (!sameBinding(original, input)) throw new Error("infrastructure recovery must retain the exact run, actor, scope, and command binding");
  const recoveryId = safeId(input.recoveryId, "recovery id");
  const filePath = path.join(attemptsDir(repo), `recovery-${recoveryId}.json`);
  if (fs.existsSync(filePath)) throw new Error(`recovery ${recoveryId} already exists`);
  const existing = readReceipts(repo).filter((entry) => entry.schema === "acef.invocation-recovery.v1");
  if (existing.some((entry) => entry.runId === original.runId)) throw new Error(`run ${original.runId} already used its one recovery allowance`);
  const receipt = { schema: "acef.invocation-recovery.v1", recoveryId, mode: "infrastructure", attemptId: original.invocationId, runId: original.runId, actorId: original.actorId, scopeFingerprint: original.scopeFingerprint, commandIdentity: original.commandIdentity, reason: String(input.reason || "").trim(), createdAt: new Date().toISOString() };
  if (!receipt.reason) throw new Error("infrastructure recovery requires a stated reason");
  validateReceipt(receipt, path.basename(filePath));
  validateReceiptSet([...readReceipts(repo), receipt]);
  write(filePath, receipt);
  return receipt;
}

function recordFixtureAuthoringRecovery(repo, input) {
  const original = readReceipts(repo).find((entry) => entry.schema === "acef.invocation-attempt.v1" && entry.invocationId === safeId(input.attemptId, "attempt id"));
  if (!original) throw new Error(`unknown invocation ${input.attemptId}`);
  if (original.status === "running" || original.status === "passed") throw new Error("fixture recovery requires a retained nonzero finalized attempt");
  if (!sameBinding(original, input)) throw new Error("fixture recovery must retain the exact run, actor, scope, and command binding");
  const changedPaths = Array.isArray(input.changedPaths) ? input.changedPaths : [];
  const allowedPaths = new Set([...(input.testPaths || []), ...(input.fixturePaths || [])]);
  if (!changedPaths.length || changedPaths.some((filePath) => !allowedPaths.has(filePath))) {
    throw new Error("fixture recovery changed paths must stay inside the approved test/fixture envelope");
  }
  if (!input.beforeProductTree || input.beforeProductTree !== input.afterProductTree) {
    throw new Error("fixture recovery must prove the product tree is unchanged");
  }
  const recoveryId = safeId(input.recoveryId, "recovery id");
  const filePath = path.join(attemptsDir(repo), `recovery-${recoveryId}.json`);
  if (fs.existsSync(filePath)) throw new Error(`recovery ${recoveryId} already exists`);
  const existing = readReceipts(repo).filter((entry) => entry.schema === "acef.invocation-recovery.v1");
  if (existing.some((entry) => entry.runId === original.runId)) throw new Error(`run ${original.runId} already used its one recovery allowance`);
  const reason = String(input.reason || "").trim();
  if (!reason) throw new Error("fixture recovery requires a stated reason");
  const receipt = { schema: "acef.invocation-recovery.v1", recoveryId, mode: "fixture-authoring", attemptId: original.invocationId, runId: original.runId, actorId: original.actorId, scopeFingerprint: original.scopeFingerprint, commandIdentity: original.commandIdentity, reason, changedPaths: [...changedPaths], beforeProductTree: input.beforeProductTree, afterProductTree: input.afterProductTree, createdAt: new Date().toISOString() };
  validateReceipt(receipt, path.basename(filePath));
  validateReceiptSet([...readReceipts(repo), receipt]);
  write(filePath, receipt);
  return receipt;
}

module.exports = { attemptPath, collectRunAttempts, commandIdentity, finishInvocation, recordFixtureAuthoringRecovery, recordInfrastructureRecovery, startInvocation };

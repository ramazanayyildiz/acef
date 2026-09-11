"use strict";

const crypto = require("node:crypto");
const cp = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PENDING_RELATIVE_PATH = "docs/ai/ACEF_STATE_TRANSACTION.json";

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function safeRelative(repo, candidate) {
  const repoRoot = path.resolve(repo);
  const absolute = path.resolve(repoRoot, candidate);
  const relative = path.relative(repoRoot, absolute).replaceAll(path.sep, "/");
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`state transaction path escapes repository: ${candidate}`);
  }
  let cursor = repoRoot;
  for (const segment of relative.split("/")) {
    cursor = path.join(cursor, segment);
    let stat;
    try { stat = fs.lstatSync(cursor); } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw new Error(`state transaction path inspection failed: ${relative}: ${error.message}`);
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`state transaction path contains symlink: ${relative}`);
    }
  }
  return { absolute, relative };
}

function fileHash(filePath) {
  return fs.existsSync(filePath) ? sha256(fs.readFileSync(filePath)) : null;
}

function atomicWrite(filePath, bytes) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, bytes);
    fs.renameSync(temporary, filePath);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

function pendingTransactionPath(repo) {
  // This accessor is also used by read-only authorization guards, which must
  // be able to observe even a dangling symlink at the receipt location.
  // Mutating transaction paths are revalidated with safeRelative below.
  return path.join(path.resolve(repo), ...PENDING_RELATIVE_PATH.split("/"));
}

function writerLockPath(repo) {
  const repoRoot = path.resolve(repo);
  const resolved = cp.execFileSync("git", ["rev-parse", "--git-path", "acef-state-writer.lock"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return path.resolve(repoRoot, resolved);
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function removeRecoverableStaleLock(repo, lockPath) {
  let pid = NaN;
  try { pid = Number(fs.readFileSync(lockPath, "utf8").trim()); } catch { return false; }
  if (processIsAlive(pid)) return false;
  fs.rmSync(lockPath);
  return true;
}

function withWriterLock(repo, callback, { recover = false } = {}) {
  const lockPath = writerLockPath(repo);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  let descriptor;
  try {
    descriptor = fs.openSync(lockPath, "wx");
  } catch (error) {
    if (error?.code === "EEXIST" && recover && removeRecoverableStaleLock(repo, lockPath)) {
      descriptor = fs.openSync(lockPath, "wx");
    } else if (error?.code === "EEXIST") {
      throw new Error(`ACEF state writer is busy: ${lockPath}`);
    }
    if (descriptor === undefined) throw error;
  }
  try {
    fs.writeFileSync(descriptor, `${process.pid}\n`);
    return callback();
  } finally {
    try { fs.closeSync(descriptor); } catch {}
    fs.rmSync(lockPath, { force: true });
  }
}

function prepareWrite(repo, relativePath, bytes) {
  const target = safeRelative(repo, relativePath);
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes));
  return {
    path: target.relative,
    beforeSha256: fileHash(target.absolute),
    afterSha256: sha256(buffer),
    bytesBase64: buffer.toString("base64"),
  };
}

function prepareGuard(repo, relativePath) {
  const target = safeRelative(repo, relativePath);
  const expectedSha256 = fileHash(target.absolute);
  if (!expectedSha256) throw new Error(`state transaction guard is missing: ${target.relative}`);
  return { path: target.relative, expectedSha256 };
}

function prepareSnapshotGuard(repo, relativePath) {
  const target = safeRelative(repo, relativePath);
  return { path: target.relative, expectedSha256: fileHash(target.absolute) };
}

function validatePlan(repo, writes, guards = []) {
  if (!Array.isArray(writes) || !writes.length) throw new Error("state transaction requires prepared writes");
  const seen = new Set();
  for (const item of writes) {
    const target = safeRelative(repo, item.path);
    if (seen.has(target.relative)) throw new Error(`duplicate state transaction path: ${target.relative}`);
    seen.add(target.relative);
    if (!/^[a-f0-9]{64}$/.test(item.afterSha256)
      || (item.beforeSha256 !== null && !/^[a-f0-9]{64}$/.test(item.beforeSha256))
      || sha256(Buffer.from(item.bytesBase64, "base64")) !== item.afterSha256) {
      throw new Error(`invalid prepared state transaction bytes: ${target.relative}`);
    }
  }
  if (writes.at(-1).path !== "docs/ai/ACEF_ACTIVE_RUN.json") {
    throw new Error("state transaction must publish docs/ai/ACEF_ACTIVE_RUN.json last");
  }
  for (const guard of guards) {
    safeRelative(repo, guard.path);
    if (guard.expectedSha256 !== null && !/^[a-f0-9]{64}$/.test(guard.expectedSha256 || "")) {
      throw new Error(`invalid state transaction guard: ${guard.path}`);
    }
  }
}

function currentDisposition(repo, item) {
  const current = fileHash(safeRelative(repo, item.path).absolute);
  if (item.beforeSha256 === item.afterSha256 && current === item.afterSha256) return "noop";
  if (current === item.afterSha256) return "published";
  if (current === item.beforeSha256) return "pending";
  return "diverged";
}

function assertGuards(repo, guards) {
  const changed = guards.filter((guard) => fileHash(safeRelative(repo, guard.path).absolute) !== guard.expectedSha256);
  if (changed.length) throw new Error(`state transaction guard changed: ${changed.map((item) => item.path).join(", ")}`);
}

function transactionRecord(transactionId, writes, guards) {
  return {
    schema: "acef.state-transaction.v1",
    transactionId,
    status: "pending",
    writes,
    guards,
    publicationOrder: "prepared-objective-scope-views-active-run-last",
    createdAt: new Date().toISOString(),
  };
}

function publishStateTransaction(repo, { transactionId, writes, guards = [] }) {
  return withWriterLock(repo, () => {
    const repoRoot = path.resolve(repo);
    const pendingPath = safeRelative(repoRoot, PENDING_RELATIVE_PATH).absolute;
    if (fs.existsSync(pendingPath)) {
      throw new Error(`pending ACEF state transaction blocks publication; run acef-state recover-state-transaction --repo ${repoRoot}`);
    }
    validatePlan(repoRoot, writes, guards);
    assertGuards(repoRoot, guards);
    const changed = writes.filter((item) => !["pending", "noop"].includes(currentDisposition(repoRoot, item)));
    if (changed.length) throw new Error(`state transaction precondition changed: ${changed.map((item) => item.path).join(", ")}`);
    const record = transactionRecord(transactionId, writes, guards);
    atomicWrite(pendingPath, `${JSON.stringify(record, null, 2)}\n`);
    for (const item of writes) {
      assertGuards(repoRoot, guards);
      const disposition = currentDisposition(repoRoot, item);
      if (disposition === "noop") continue;
      if (disposition !== "pending") {
        throw new Error(`state transaction write diverged before publication: ${item.path}`);
      }
      atomicWrite(safeRelative(repoRoot, item.path).absolute, Buffer.from(item.bytesBase64, "base64"));
    }
    fs.rmSync(pendingPath);
    return record;
  });
}

function recoverStateTransaction(repo, { beforeRecoveryWrite = null } = {}) {
  return withWriterLock(repo, () => {
    const repoRoot = path.resolve(repo);
    const pendingPath = safeRelative(repoRoot, PENDING_RELATIVE_PATH).absolute;
    if (!fs.existsSync(pendingPath)) return { status: "none" };
    const record = JSON.parse(fs.readFileSync(pendingPath, "utf8"));
    if (record.schema !== "acef.state-transaction.v1" || record.status !== "pending") {
      throw new Error("invalid pending ACEF state transaction");
    }
    validatePlan(repoRoot, record.writes, record.guards || []);
    assertGuards(repoRoot, record.guards || []);
    const dispositions = record.writes.map((item) => ({ item, disposition: currentDisposition(repoRoot, item) }));
    const diverged = dispositions.filter((entry) => entry.disposition === "diverged");
    if (diverged.length) {
      throw new Error(`pending ACEF state transaction diverged; preserved current files: ${diverged.map((entry) => entry.item.path).join(", ")}`);
    }
    for (const { item } of dispositions) {
      if (beforeRecoveryWrite) beforeRecoveryWrite(item);
      const disposition = currentDisposition(repoRoot, item);
      if (["published", "noop"].includes(disposition)) continue;
      if (disposition === "diverged") {
        throw new Error(`pending ACEF state transaction diverged; preserved current files: ${item.path}`);
      }
      assertGuards(repoRoot, record.guards || []);
      if (currentDisposition(repoRoot, item) !== "pending") {
        throw new Error(`pending ACEF state transaction changed before recovery write; preserved current file: ${item.path}`);
      }
      atomicWrite(safeRelative(repoRoot, item.path).absolute, Buffer.from(item.bytesBase64, "base64"));
    }
    fs.rmSync(pendingPath);
    return { status: "recovered", transactionId: record.transactionId };
  }, { recover: true });
}

module.exports = {
  PENDING_RELATIVE_PATH,
  pendingTransactionPath,
  prepareGuard,
  prepareSnapshotGuard,
  prepareWrite,
  publishStateTransaction,
  recoverStateTransaction,
  writerLockPath,
};

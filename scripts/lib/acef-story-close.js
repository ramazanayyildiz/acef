"use strict";

const cp = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { parseEvidenceManifest } = require("./acef-state-parser");

function git(repo, args, { encoding = "utf8" } = {}) {
  return cp.spawnSync("git", args, {
    cwd: repo,
    encoding,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function controlRelativePath(repo, filePath) {
  const relative = path.relative(repo, path.resolve(repo, filePath)).replaceAll(path.sep, "/");
  if (!relative || relative.startsWith("../") || path.isAbsolute(relative) || !/^docs\/ai\//.test(relative)) {
    throw new Error(`story-close path escapes the control envelope: ${filePath}`);
  }
  return relative;
}

function storyClosePackagePaths(repo, gate, gatePath) {
  const packagePaths = [controlRelativePath(repo, gatePath)];
  for (const actorId of Object.values(gate.actors || {})) {
    packagePaths.push(controlRelativePath(repo, path.join("docs", "ai", "actors", `${actorId}.json`)));
  }
  for (const reportPath of Object.values(gate.reportPaths || {})) {
    packagePaths.push(controlRelativePath(repo, reportPath));
  }
  for (const evidenceId of gate.evidenceIds || []) {
    const manifestRelative = controlRelativePath(repo, path.join("docs", "ai", "evidence", `${evidenceId}.json`));
    packagePaths.push(manifestRelative);
    const manifestPath = path.join(repo, manifestRelative);
    if (fs.existsSync(manifestPath)) {
      const evidence = parseEvidenceManifest(manifestPath);
      packagePaths.push(controlRelativePath(repo, evidence.rawArtifact.path));
    }
  }
  if (gate.repair?.receiptPath) packagePaths.push(controlRelativePath(repo, gate.repair.receiptPath));
  if (gate.processJudge?.decisionPath) packagePaths.push(controlRelativePath(repo, gate.processJudge.decisionPath));
  return [...new Set(packagePaths)];
}

function closeOwnedPaths(repo, gate, gatePath) {
  const owned = [controlRelativePath(repo, gatePath)];
  for (const actorId of [gate.actors?.codeReview, gate.actors?.patchAssurance].filter(Boolean)) {
    owned.push(controlRelativePath(repo, path.join("docs", "ai", "actors", `${actorId}.json`)));
  }
  for (const reportPath of Object.values(gate.reportPaths || {})) {
    owned.push(controlRelativePath(repo, reportPath));
  }
  if (gate.repair?.receiptPath) owned.push(controlRelativePath(repo, gate.repair.receiptPath));
  if (gate.processJudge?.decisionPath) owned.push(controlRelativePath(repo, gate.processJudge.decisionPath));
  return [...new Set(owned)];
}

function history(repo, relativePath, diffFilter = "") {
  const args = ["log", "--format=%H"];
  if (diffFilter) args.push(`--diff-filter=${diffFilter}`);
  args.push("--", relativePath);
  const result = git(repo, args);
  return result.status === 0 ? result.stdout.split(/\r?\n/).filter(Boolean) : [];
}

function validateDurableStoryClosePackage(repo, gate, gatePath) {
  let packagePaths;
  let ownedPaths;
  try {
    packagePaths = storyClosePackagePaths(repo, gate, gatePath);
    ownedPaths = closeOwnedPaths(repo, gate, gatePath);
  } catch (error) {
    return { ok: false, gateCommitted: false, packagePaths: [], closeOwnedPaths: [], failures: [error.message] };
  }
  const failures = [];
  for (const relativePath of packagePaths) {
    const absolutePath = path.join(repo, relativePath);
    if (!fs.existsSync(absolutePath)) {
      failures.push(`${relativePath} is missing`);
      continue;
    }
    const committed = git(repo, ["show", `HEAD:${relativePath}`], { encoding: null });
    if (committed.status !== 0) {
      failures.push(`${relativePath} is not committed at HEAD`);
      continue;
    }
    if (git(repo, ["diff", "--quiet", "HEAD", "--", relativePath]).status !== 0
      || !Buffer.from(committed.stdout || []).equals(fs.readFileSync(absolutePath))) {
      failures.push(`${relativePath} differs from HEAD`);
    }
    if (history(repo, relativePath).length !== 1) failures.push(`${relativePath} changed after immutable introduction`);
  }

  const gateRelativePath = controlRelativePath(repo, gatePath);
  const gateIntroductionCommits = history(repo, gateRelativePath, "A");
  const gateCommitted = gateIntroductionCommits.length === 1;
  let packageCommit = null;
  if (!gateCommitted) {
    failures.push("story PASS gate has not been introduced in exactly one commit");
  } else {
    [packageCommit] = gateIntroductionCommits;
    for (const relativePath of ownedPaths) {
      const introductions = history(repo, relativePath, "A");
      if (introductions.length !== 1 || introductions[0] !== packageCommit) {
        failures.push(`${relativePath} was not introduced with the story PASS gate`);
      }
    }
    const introducedHere = packagePaths.filter((relativePath) => history(repo, relativePath, "A")[0] === packageCommit);
    const allowed = new Set([...ownedPaths, ...introducedHere]);
    const changed = git(repo, ["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", packageCommit, "--"]);
    const changedPaths = changed.status === 0 ? changed.stdout.split(/\r?\n/).filter(Boolean) : [];
    if (!changedPaths.length || changedPaths.some((entry) => !allowed.has(entry))
      || [...allowed].some((entry) => !changedPaths.includes(entry))) {
      failures.push("story-close commit is not exactly the bound control delta");
    }
  }
  return { ok: failures.length === 0, gateCommitted, packageCommit, packagePaths, closeOwnedPaths: ownedPaths, failures };
}

module.exports = {
  storyClosePackagePaths,
  validateDurableStoryClosePackage,
};

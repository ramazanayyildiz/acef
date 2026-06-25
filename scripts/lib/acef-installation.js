const cp = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function runGit(repoRoot, args) {
  try {
    return cp.execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function sourceInfo(sourceRoot) {
  const commit = runGit(sourceRoot, ["rev-parse", "HEAD"]);
  const shortCommit = runGit(sourceRoot, ["rev-parse", "--short", "HEAD"]);
  const branch = runGit(sourceRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const status = runGit(sourceRoot, ["status", "--porcelain=v1"]);
  return {
    sourcePath: sourceRoot,
    sourceCommit: commit,
    sourceShortCommit: shortCommit,
    sourceBranch: branch,
    sourceTreeState: status ? "dirty" : "clean",
  };
}

function manifestPath(targetRepo) {
  return path.join(targetRepo, "docs", "ai", "ACEF_INSTALLATION.json");
}

function readInstallationManifest(targetRepo) {
  const filePath = manifestPath(targetRepo);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function writeInstallationManifest(targetRepo, sourceRoot, componentName, componentDetails = {}) {
  const filePath = manifestPath(targetRepo);
  const now = new Date().toISOString();
  const existing = readInstallationManifest(targetRepo) || {
    schema: "acef.installation.v1",
    installedAt: now,
    components: {},
  };
  const source = sourceInfo(sourceRoot);
  const command = `node ${path.join(sourceRoot, "scripts", "update-acef-installation")} --repo ${targetRepo}`;
  const next = {
    ...existing,
    schema: "acef.installation.v1",
    acefVersion: {
      sourcePath: source.sourcePath,
      sourceCommit: source.sourceCommit,
      sourceShortCommit: source.sourceShortCommit,
      sourceBranch: source.sourceBranch,
      sourceTreeState: source.sourceTreeState,
    },
    lastUpdatedAt: now,
    updateCommand: command,
    components: {
      ...(existing.components || {}),
      [componentName]: {
        installedAt: now,
        sourceCommit: source.sourceCommit,
        sourceShortCommit: source.sourceShortCommit,
        sourceTreeState: source.sourceTreeState,
        ...componentDetails,
      },
    },
  };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`);
  return filePath;
}

module.exports = {
  manifestPath,
  readInstallationManifest,
  sourceInfo,
  writeInstallationManifest,
};

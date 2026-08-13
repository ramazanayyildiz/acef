const cp = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

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

function digestFiles(root, relativePaths) {
  const hash = crypto.createHash("sha256");
  for (const relativePath of [...relativePaths].sort()) {
    const filePath = path.join(root, relativePath);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) continue;
    hash.update(relativePath.replaceAll(path.sep, "/"));
    hash.update("\0");
    hash.update(fs.readFileSync(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function recursiveFiles(root, relativeDir, predicate = () => true) {
  const base = path.join(root, relativeDir);
  if (!fs.existsSync(base)) return [];
  const result = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(filePath);
      else if (entry.isFile()) {
        const relativePath = path.relative(root, filePath);
        if (predicate(relativePath)) result.push(relativePath);
      }
    }
  };
  walk(base);
  return result;
}

function sourceRuntimeDigest(sourceRoot) {
  const paths = [
    ...recursiveFiles(sourceRoot, "scripts", (entry) => !path.basename(entry).startsWith("test-") && !entry.includes("/__pycache__/")),
    ...recursiveFiles(sourceRoot, "schemas"),
    ...recursiveFiles(sourceRoot, "workflows"),
    "method/control-dosing.json",
    "method/model-routing-policy-v1.json",
  ];
  return digestFiles(sourceRoot, paths);
}

function installedRuntimeDigest(targetRepo) {
  const paths = [
    ...recursiveFiles(targetRepo, ".acef/bin"),
    ...recursiveFiles(targetRepo, ".acef/schemas"),
    ...recursiveFiles(targetRepo, ".acef/workflows"),
    ".acef/control-dosing.json",
    ".acef/model-routing-policy.json",
  ];
  return digestFiles(targetRepo, paths);
}

function installationFreshnessFailures(targetRepo) {
  const manifest = readInstallationManifest(targetRepo);
  const contract = manifest?.components?.tools?.freshnessContract;
  if (contract !== "worktree-handshake-v1") return [];
  const failures = [];
  const tools = manifest.components.tools;
  if (installedRuntimeDigest(targetRepo) !== tools.installedRuntimeDigest) failures.push("installed ACEF runtime hash differs from its installation manifest");
  const sourcePath = manifest.acefVersion?.sourcePath;
  if (!sourcePath || !fs.existsSync(sourcePath)) failures.push("ACEF source checkout recorded by the installation is unavailable");
  else if (sourceRuntimeDigest(sourcePath) !== tools.sourceRuntimeDigest) failures.push("INSTALL_STALE: ACEF source runtime changed after this worktree was installed");
  return failures;
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
  installationFreshnessFailures,
  installedRuntimeDigest,
  manifestPath,
  readInstallationManifest,
  sourceRuntimeDigest,
  sourceInfo,
  writeInstallationManifest,
};

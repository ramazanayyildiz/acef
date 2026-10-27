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

// Machine-specific install facts (absolute source path, install times) live outside the committed record so the record
// is identical on every machine and every reinstall of the same selection (hosts that pin inventories stop churning).
const LOCAL_DIR = path.join(".acef", "local");
const LOCAL_FILE = "installation.local.json";

function localMetadataPath(targetRepo) {
  return path.join(targetRepo, LOCAL_DIR, LOCAL_FILE);
}

function readLocalMetadata(targetRepo) {
  const filePath = localMetadataPath(targetRepo);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeLocalMetadata(targetRepo, sourceRoot) {
  const dir = path.join(targetRepo, LOCAL_DIR);
  fs.mkdirSync(dir, { recursive: true });
  // self-ignoring directory: never committed, whatever the host .gitignore says
  fs.writeFileSync(path.join(dir, ".gitignore"), "*\n");
  const now = new Date().toISOString();
  const existing = readLocalMetadata(targetRepo) || {};
  const next = {
    schema: "acef.installation.local.v1",
    sourcePath: sourceRoot,
    installedAt: existing.installedAt || now,
    lastUpdatedAt: now,
  };
  fs.writeFileSync(localMetadataPath(targetRepo), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

// Committed record plus the local overlay. Older records that still carry sourcePath/timestamps keep working.
function readInstallationManifest(targetRepo) {
  const filePath = manifestPath(targetRepo);
  if (!fs.existsSync(filePath)) return null;
  const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const local = readLocalMetadata(targetRepo);
  if (local) {
    manifest.acefVersion = { ...(manifest.acefVersion || {}) };
    if (!manifest.acefVersion.sourcePath && local.sourcePath) manifest.acefVersion.sourcePath = local.sourcePath;
    if (!manifest.installedAt && local.installedAt) manifest.installedAt = local.installedAt;
    if (!manifest.lastUpdatedAt && local.lastUpdatedAt) manifest.lastUpdatedAt = local.lastUpdatedAt;
  }
  return manifest;
}

function readCommittedManifest(targetRepo) {
  const filePath = manifestPath(targetRepo);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function shellQuote(value) {
  const text = String(value);
  return /^[A-Za-z0-9_./:@%+=,-]+$/.test(text) ? text : `'${text.replaceAll("'", `'\\''`)}'`;
}

// Portable: no absolute paths. Run from the host repo root with ACEF_SOURCE pointing at an ACEF checkout.
function updateCommand(sourceRoot, targetRepo, components, invocation = {}, profile = null) {
  const argv = ["--repo", "."];
  if (profile && profile !== "full") argv.push("--profile", profile);
  if (invocation.allWorktrees === true) argv.push("--all-worktrees");
  if (components?.skills?.reviewLenses === true) argv.push("--review-lenses");
  if (components?.skills?.allCore === true) argv.push("--all-core");
  if (components?.bmadGuard?.globalDispatcher === true) argv.push("--global-dispatcher");
  return ['node "$ACEF_SOURCE/scripts/update-acef-installation"', ...argv.map(shellQuote)].join(" ");
}

function rewriteInstallationUpdateCommand(targetRepo, sourceRoot, invocation = {}) {
  const filePath = manifestPath(targetRepo);
  const manifest = readCommittedManifest(targetRepo);
  if (!manifest || manifest.schema !== "acef.installation.v1") {
    throw new Error(`cannot rewrite updateCommand without a valid ACEF installation manifest: ${filePath}`);
  }
  manifest.updateCommand = updateCommand(sourceRoot, targetRepo, manifest.components, invocation, manifest.profile);
  fs.writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`);
  return filePath;
}

const MACHINE_FIELDS = ["installedAt", "lastUpdatedAt"];

function stripMachineFields(record) {
  const clean = { ...record };
  for (const field of MACHINE_FIELDS) delete clean[field];
  return clean;
}

// profile: "slice" | "core" | "full". null keeps the recorded one; a record without a profile is "full" (legacy).
function writeInstallationManifest(targetRepo, sourceRoot, componentName, componentDetails = {}, profile = null) {
  const filePath = manifestPath(targetRepo);
  const existing = stripMachineFields(readCommittedManifest(targetRepo) || { schema: "acef.installation.v1", components: {} });
  const source = sourceInfo(sourceRoot);
  const existingComponents = {};
  for (const [name, details] of Object.entries(existing.components || {})) existingComponents[name] = stripMachineFields(details);
  const components = {
    ...existingComponents,
    [componentName]: {
      sourceCommit: source.sourceCommit,
      sourceShortCommit: source.sourceShortCommit,
      sourceTreeState: source.sourceTreeState,
      ...componentDetails,
    },
  };
  const effectiveProfile = profile || existing.profile || null;
  const next = {
    ...existing,
    schema: "acef.installation.v1",
    ...(effectiveProfile ? { profile: effectiveProfile } : {}),
    acefVersion: {
      sourceCommit: source.sourceCommit,
      sourceShortCommit: source.sourceShortCommit,
      sourceTreeState: source.sourceTreeState,
    },
    updateCommand: updateCommand(sourceRoot, targetRepo, components, {}, effectiveProfile),
    components,
  };
  writeLocalMetadata(targetRepo, sourceRoot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`);
  return filePath;
}

// ---------------------------------------------------------------- host-modified file preservation
// Owner decision 2026-10-27: an update replaces an ACEF-installed file only when the host copy still equals what ACEF
// installed last time. Otherwise the host copy is kept and reported ("kept host-modified <path>"). The installer records
// the sha256 of every file it wrote under components.<name>.files (the Slice kit has done this since 2026-10-20).
// Installs recorded before that have no hashes: the baseline is then the file's bytes at the recorded install commit,
// read with `git show` from the recorded ACEF checkout or this one. Without any baseline the host copy is kept.

const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

function gitShowBytes(repoRoot, commit, relativePath) {
  try {
    return cp.execFileSync("git", ["show", `${commit}:${relativePath}`], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

function gitHasCommit(repoRoot, commit) {
  return runGit(repoRoot, ["cat-file", "-e", `${commit}^{commit}`]) !== null;
}

/**
 * Returns a writer for one installer component.
 *   write(relTarget, content, { mode, sourceRel, generated }) -> "written" | "unchanged" | "kept"
 *     sourceRel: the ACEF source path the content came from (legacy baseline lookup);
 *     generated: true when the installer generates the content (no source file to compare with in a legacy install).
 *   removeStale(prefix, keepRelPaths): deletes recorded files under prefix that ACEF no longer ships, when unmodified.
 *   finish() prints the kept lines and returns { files, kept }.
 */
function createOwnedFileWriter(targetRepo, sourceRoot, componentName) {
  const manifest = readInstallationManifest(targetRepo) || {};
  const previous = manifest.components?.[componentName] || {};
  const recordedHashes = previous.files && typeof previous.files === "object" ? previous.files : null;
  const legacyCommit = previous.sourceCommit || manifest.acefVersion?.sourceCommit || null;
  const candidates = [...new Set([process.env.ACEF_PREVIOUS_SOURCE_PATH, manifest.acefVersion?.sourcePath,
    readLocalMetadata(targetRepo)?.sourcePath, sourceRoot]
    .filter((entry) => typeof entry === "string" && entry && fs.existsSync(entry)))];
  let legacyRepo;
  const baselineRepo = () => {
    if (legacyRepo === undefined) legacyRepo = legacyCommit ? candidates.find((root) => gitHasCommit(root, legacyCommit)) || null : null;
    return legacyRepo;
  };
  const files = {};
  const kept = [];

  // The hash the host copy must equal to count as unmodified, or a reason why there is none.
  function baseline(relTarget, opts) {
    if (recordedHashes) {
      return recordedHashes[relTarget] ? { hash: recordedHashes[relTarget] } : { reason: "not installed by ACEF before" };
    }
    if (opts.generated) return { reason: "differs from the ACEF-generated copy and no install hash is recorded" };
    if (!legacyCommit) return { reason: "no recorded install hash or commit" };
    const root = baselineRepo();
    if (!root) return { reason: `install commit ${legacyCommit.slice(0, 12)} not available` };
    const bytes = opts.sourceRel ? gitShowBytes(root, legacyCommit, opts.sourceRel) : null;
    return bytes ? { hash: sha256(bytes) } : { reason: `not in ACEF at ${legacyCommit.slice(0, 12)}` };
  }

  function write(relTarget, content, opts = {}) {
    const rel = relTarget.split(path.sep).join("/");
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const next = sha256(buffer);
    const target = path.join(targetRepo, rel);
    if (fs.existsSync(target)) {
      const current = sha256(fs.readFileSync(target));
      if (current === next) {
        if (opts.mode) fs.chmodSync(target, opts.mode);
        files[rel] = next;
        return "unchanged";
      }
      const base = baseline(rel, opts);
      if (base.hash !== current) {
        kept.push({ path: rel, reason: base.hash ? "host-modified" : base.reason });
        // Record only a hash ACEF really installed, so the next update still sees the host edit.
        if (base.hash) files[rel] = base.hash;
        return "kept";
      }
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buffer);
    if (opts.mode) fs.chmodSync(target, opts.mode);
    files[rel] = next;
    return "written";
  }

  function removeStale(prefix, keepRelPaths) {
    if (!recordedHashes) return;
    const keep = new Set(keepRelPaths);
    for (const [rel, hash] of Object.entries(recordedHashes)) {
      if (!rel.startsWith(prefix) || keep.has(rel)) continue;
      const target = path.join(targetRepo, rel);
      if (!fs.existsSync(target)) continue;
      if (sha256(fs.readFileSync(target)) === hash) fs.rmSync(target);
      else kept.push({ path: rel, reason: "host-modified, no longer shipped by ACEF" });
    }
  }

  function finish(label = componentName) {
    for (const item of kept) {
      console.log(item.reason === "host-modified"
        ? `kept host-modified ${item.path}`
        : `kept host copy ${item.path} (${item.reason}; compare with ACEF by hand)`);
    }
    if (kept.length) console.log(`${label}: kept ${kept.length} host file(s); the ACEF version was not written for them`);
    const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
    return { files: sorted, kept };
  }

  return { targetRepo, write, removeStale, finish };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Host values win; only keys the host copy lacks are added from the ACEF copy. Arrays and scalars are host-owned.
function mergeMissingKeys(host, source, prefix = "", added = []) {
  const result = { ...host };
  for (const [key, value] of Object.entries(source)) {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    if (!(key in host)) {
      result[key] = value;
      added.push(keyPath);
    } else if (isPlainObject(host[key]) && isPlainObject(value)) {
      result[key] = mergeMissingKeys(host[key], value, keyPath, added);
    }
  }
  return result;
}

/**
 * Host-local JSON configuration (for example .acef/model-routing-policy.json): written when missing; otherwise merged
 * so host values survive and only new keys are added. validate(record) must throw for an unusable result; the host
 * file is then left untouched and reported.
 */
function mergeHostJson(targetRepo, relTarget, sourceBytes, validate = null) {
  const target = path.join(targetRepo, relTarget);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, sourceBytes);
    return { status: "written", added: [] };
  }
  let host;
  try {
    host = JSON.parse(fs.readFileSync(target, "utf8"));
  } catch (error) {
    console.log(`kept host-modified ${relTarget} (not valid JSON, not merged: ${error.message})`);
    return { status: "kept", added: [] };
  }
  const source = JSON.parse(Buffer.isBuffer(sourceBytes) ? sourceBytes.toString("utf8") : sourceBytes);
  if (!isPlainObject(host) || !isPlainObject(source)) {
    console.log(`kept host-modified ${relTarget} (not a JSON object, not merged)`);
    return { status: "kept", added: [] };
  }
  const added = [];
  const merged = mergeMissingKeys(host, source, "", added);
  if (validate) {
    try {
      validate(merged);
    } catch (error) {
      console.log(`kept host-modified ${relTarget} (merged copy invalid, host file left as it is: ${error.message})`);
      return { status: "kept", added: [] };
    }
  }
  if (!added.length) {
    console.log(`kept host values ${relTarget} (no new keys from ACEF)`);
    return { status: "unchanged", added };
  }
  fs.writeFileSync(target, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`merged ${relTarget}: kept host values, added ${added.length} new key(s): ${added.join(", ")}`);
  return { status: "merged", added };
}

// Portable declaration: the owning Git root is discovered, never stored as an absolute path.
function writeCanonicalRootMarker(targetRepo) {
  const filePath = path.join(targetRepo, ".acef", "CANONICAL_ROOT");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify({ schema: "acef.canonical-root.v1" })}\n`);
  return filePath;
}

module.exports = {
  createOwnedFileWriter,
  mergeHostJson,
  mergeMissingKeys,
  localMetadataPath,
  readCommittedManifest,
  readLocalMetadata,
  writeLocalMetadata,
  installationFreshnessFailures,
  installedRuntimeDigest,
  manifestPath,
  readInstallationManifest,
  rewriteInstallationUpdateCommand,
  sourceRuntimeDigest,
  sourceInfo,
  writeInstallationManifest,
  writeCanonicalRootMarker,
};

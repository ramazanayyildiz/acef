#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
  });
}

function jsonDecision(permissionDecision, systemMessage = "") {
  const payload = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision,
    },
  };
  if (systemMessage) payload.systemMessage = systemMessage;
  process.stdout.write(JSON.stringify(payload));
}

function resolvePath(value, base = process.cwd()) {
  if (!value || typeof value !== "string") return "";
  const home = process.env.HOME || "";
  const expanded = value.replace(/^~(?=\/|$)/, home);
  return path.resolve(path.isAbsolute(expanded) ? expanded : path.join(base, expanded));
}

function existingDir(candidate) {
  if (!candidate) return "";
  try {
    const resolved = resolvePath(candidate);
    if (!fs.existsSync(resolved)) return path.dirname(resolved);
    return fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);
  } catch {
    return "";
  }
}

function ancestors(startPath) {
  const start = existingDir(startPath);
  if (!start) return [];
  const dirs = [];
  let current = start;
  while (current && current !== path.dirname(current)) {
    dirs.push(current);
    current = path.dirname(current);
  }
  dirs.push(current);
  return dirs;
}

function candidatePaths(payload) {
  const input = payload?.tool_input || payload?.input || {};
  const target = resolvePath(input?.file_path || input?.filePath || input?.path,
    payload?.cwd || input?.cwd || input?.workdir || process.cwd());
  if (target && ancestors(target).some((dir) => fs.existsSync(path.join(dir, ".git")))) return [target];
  return [
    payload?.cwd,
    payload?.project_dir,
    payload?.projectDir,
    process.env.CLAUDE_PROJECT_DIR,
    process.env.CODEX_PROJECT_DIR,
    process.env.OPENCODE_PROJECT_DIR,
    input?.file_path,
    input?.filePath,
    input?.path,
    input?.cwd,
    input?.workdir,
  ].filter(Boolean);
}

// The marker selects this Git boundary, never a stored or redirected filesystem path.
// Keep this self-contained: hooks are also installed as standalone files.
function canonicalRootMarker(dirPath) {
  const marker = path.join(dirPath, ".acef", "CANONICAL_ROOT");
  let stat;
  try { stat = fs.lstatSync(marker); }
  catch (error) {
    if (error.code === "ENOENT") return false;
    throw new Error(`ACEF canonical root: cannot read ${marker}: ${error.message}`);
  }
  try {
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("marker must be a regular file");
    if (fs.lstatSync(path.dirname(marker)).isSymbolicLink()) throw new Error(".acef must not redirect to another directory");
    const record = JSON.parse(fs.readFileSync(marker, "utf8"));
    if (!record || Array.isArray(record) || record.schema !== "acef.canonical-root.v1"
      || Object.keys(record).some((key) => !["schema", "note"].includes(key))
      || (record.note !== undefined && typeof record.note !== "string")) {
      throw new Error("expected acef.canonical-root.v1 with no target path");
    }
    return true;
  } catch (error) {
    throw new Error(`ACEF canonical root: invalid ${marker}: ${error.message}`);
  }
}

function discoverRoot(candidate, home, matches) {
  const dirs = ancestors(candidate);
  const boundaryIndex = dirs.findIndex((dir) => fs.existsSync(path.join(dir, ".git")));
  const boundary = boundaryIndex >= 0 ? dirs[boundaryIndex] : "";
  if (boundary && boundary !== home && canonicalRootMarker(boundary)) {
    return matches(boundary) ? boundary : "";
  }
  for (const [index, dir] of dirs.entries()) {
    if (dir === home) continue;
    // Do not enter another canonical repository through an independent nested Git boundary.
    // Unmarked legacy installations retain their existing first-match behavior.
    if (boundaryIndex >= 0 && index > boundaryIndex
      && fs.existsSync(path.join(dir, ".acef", "CANONICAL_ROOT"))) return "";
    if (matches(dir)) return dir;
  }
  return "";
}

function findLocalHook(payload) {
  const home = process.env.HOME ? path.resolve(process.env.HOME) : "";
  const hookFor = (dir) => path.join(dir, ".acef", "hooks", "acef-bmad-hard-wall.mjs");
  for (const candidate of candidatePaths(payload)) {
    const root = discoverRoot(candidate, home, (dir) => fs.existsSync(hookFor(dir)));
    if (root) return hookFor(root);
  }
  return "";
}

const raw = await readStdin();
let payload = {};
try {
  payload = raw.trim() ? JSON.parse(raw) : {};
} catch {
  jsonDecision("allow");
  process.exit(0);
}

let hookPath;
try { hookPath = findLocalHook(payload); }
catch (error) {
  jsonDecision("deny", error.message);
  process.exit(0);
}
if (!hookPath) {
  jsonDecision("allow");
  process.exit(0);
}

  const result = spawnSync(process.execPath, [hookPath], {
  input: raw,
  encoding: "utf8",
  env: process.env,
});

if (result.error || result.status !== 0) {
  jsonDecision(
    "deny",
    `ACEF local hook failed: ${result.error?.message || result.stderr || result.stdout || `exit ${result.status}`}`,
  );
  process.exit(0);
}

const output = String(result.stdout || "").trim();
if (!output) {
  jsonDecision("allow");
  process.exit(0);
}

process.stdout.write(output);

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
  ].filter(Boolean);
}

function findLocalHook(payload) {
  const home = process.env.HOME ? path.resolve(process.env.HOME) : "";
  for (const candidate of candidatePaths(payload)) {
    for (const dirPath of ancestors(candidate)) {
      if (home && path.resolve(dirPath) === home) continue;
      const hookPath = path.join(dirPath, ".acef", "hooks", "acef-bmad-hard-wall.mjs");
      if (fs.existsSync(hookPath)) return hookPath;
    }
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

const hookPath = findLocalHook(payload);
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

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginDir = path.dirname(fileURLToPath(import.meta.url));
const siblingHookPath = path.join(pluginDir, "acef-bmad-hard-wall.mjs");

function exists(filePath) {
  try {
    return !!filePath && fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function ancestors(startPath) {
  const dirs = [];
  let current = exists(startPath) && fs.statSync(startPath).isDirectory()
    ? startPath
    : path.dirname(startPath);

  while (current && current !== path.dirname(current)) {
    dirs.push(current);
    current = path.dirname(current);
  }
  dirs.push(current);
  return dirs;
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

function findLocalHook(projectDir) {
  const home = process.env.HOME ? path.resolve(process.env.HOME) : "";
  const hookFor = (dir) => path.join(dir, ".acef", "hooks", "acef-bmad-hard-wall.mjs");
  const root = discoverRoot(projectDir || process.cwd(), home, (dir) => exists(hookFor(dir)));
  if (root) return hookFor(root);
  return exists(siblingHookPath) ? siblingHookPath : "";
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function toolName(input, output) {
  return firstString(
    input?.tool,
    input?.toolName,
    input?.name,
    output?.tool,
    output?.toolName,
    output?.name,
  );
}

function toolArgs(input, output) {
  const args = output?.args || input?.args || input?.input || input?.tool_input || {};
  return args && typeof args === "object" ? args : {};
}

function normalizeToolInput(args) {
  const normalized = { ...args };

  if (args.filePath && !normalized.file_path) normalized.file_path = args.filePath;
  if (args.patchText && !normalized.patch) normalized.patch = args.patchText;

  return normalized;
}

function agentIdentity(input, output) {
  const agent = output?.agent || input?.agent || input?.session?.agent || {};
  if (typeof agent === "string") {
    return { agent_id: agent, agent_type: agent };
  }
  return {
    agent_id: firstString(agent.id, agent.name, input?.agentID, input?.agentId, input?.agent_id),
    agent_type: firstString(agent.type, agent.mode, input?.agentType, input?.agent_type),
  };
}

function runAcefHook(payload, projectDir) {
  const input = payload.tool_input || {};
  const target = input.file_path || input.filePath || input.path;
  const resolved = typeof target === "string" && target ? path.resolve(payload.cwd || projectDir, target) : "";
  const hasTargetBoundary = resolved && ancestors(resolved).some((dir) => exists(path.join(dir, ".git")));
  const hookPath = findLocalHook(hasTargetBoundary ? resolved : projectDir);
  if (!hookPath) return { decision: "allow", reason: "" };

  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: {
      ...process.env,
      OPENCODE_PROJECT_DIR: projectDir || process.env.OPENCODE_PROJECT_DIR || "",
    },
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ACEF/OpenCode guard failed to execute: ${result.stderr || result.stdout || `exit ${result.status}`}`);
  }

  const raw = String(result.stdout || "").trim();
  if (!raw) return { decision: "allow", reason: "" };

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`ACEF/OpenCode guard returned invalid JSON: ${raw}`);
  }

  return {
    decision: parsed?.hookSpecificOutput?.permissionDecision || "allow",
    reason: parsed?.systemMessage || "ACEF/OpenCode guard denied this tool call.",
  };
}

export const AcefBmadGuard = async ({ directory, worktree }) => {
  const projectDir = worktree || directory || process.cwd();

  return {
    "tool.execute.before": async (input, output) => {
      const args = toolArgs(input, output);
      const identity = agentIdentity(input, output);
      const payload = {
        tool_name: toolName(input, output),
        cwd: args.cwd || projectDir,
        tool_input: normalizeToolInput(args),
        ...identity,
      };

      const result = runAcefHook(payload, projectDir);
      if (result.decision === "deny") {
        throw new Error(result.reason);
      }
    },
  };
};

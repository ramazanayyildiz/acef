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

function findLocalHook(projectDir) {
  for (const dirPath of ancestors(projectDir || process.cwd())) {
    const hookPath = path.join(dirPath, ".acef", "hooks", "acef-bmad-hard-wall.mjs");
    if (exists(hookPath)) return hookPath;
  }
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
  const hookPath = findLocalHook(projectDir);
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

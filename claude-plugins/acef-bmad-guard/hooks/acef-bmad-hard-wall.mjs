#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

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

function resolvePath(value, base) {
  if (!value || typeof value !== "string") return "";
  const home = process.env.HOME || "";
  const expanded = value.replace(/^~(?=\/|$)/, home);
  return path.resolve(path.isAbsolute(expanded) ? expanded : path.join(base || process.cwd(), expanded));
}

function exists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function under(filePath, dirPath) {
  const rel = path.relative(dirPath, filePath);
  return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

function ancestors(startPath) {
  const dirs = [];
  let current = fs.existsSync(startPath) && fs.statSync(startPath).isDirectory()
    ? startPath
    : path.dirname(startPath);

  while (current && current !== path.dirname(current)) {
    dirs.push(current);
    current = path.dirname(current);
  }
  dirs.push(current);
  return dirs;
}

function hasLaneMarker(dirPath) {
  return [
    ".acef-bmad-lane",
    ".bmad",
    "_bmad",
    "_bmad-output",
  ].some((name) => exists(path.join(dirPath, name)));
}

function findActiveRoot(paths) {
  for (const candidate of paths.filter(Boolean)) {
    for (const dirPath of ancestors(candidate)) {
      if (hasLaneMarker(dirPath)) return dirPath;
    }
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR ? resolvePath(process.env.CLAUDE_PROJECT_DIR) : "";
  if (projectDir && exists(path.join(projectDir, ".acef-bmad-hard-wall"))) {
    return projectDir;
  }

  return "";
}

function isWorker() {
  const values = [
    process.env.ACEF_BMAD_WORKER,
    process.env.ACEF_ROLE,
    process.env.CLAUDE_AGENT_NAME,
    process.env.CLAUDE_SUBAGENT_NAME,
    process.env.AGENT_NAME,
  ].filter(Boolean).join(" ");

  if (/(^|[\s_-])(conductor|dispatcher|orchestrator|coordinator|main-agent|main)([\s_-]|$)/i.test(values)) {
    return false;
  }

  return /(^|\s)(1|true)(\s|$)/i.test(process.env.ACEF_BMAD_WORKER || "")
    || /(^|[\s_-])(bmad-agent-(pm|ux-designer|architect|dev|tester|qa|reviewer)|pm-worker|planner|ux-worker|architect-worker|test-author|tester|developer|dev-story|implementing-actor|code-reviewer|reviewer|judge|verify-patch|test-reviewer|process-judge|documentation-maintainer)([\s_-]|$)/i.test(values);
}

function allow() {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      permissionDecision: "allow"
    }
  }));
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      permissionDecision: "deny"
    },
    systemMessage: reason
  }));
}

function toolFilePath(input, cwd) {
  const value = input.file_path || input.path || input.notebook_path || "";
  return value ? resolvePath(value, cwd) : "";
}

function restrictedPath(filePath, repoRoot) {
  if (!filePath || !repoRoot || !under(filePath, repoRoot)) return false;

  const rel = path.relative(repoRoot, filePath);
  if (/^node_modules\//.test(rel)) return false;
  if (/^\.bmad(\/|$)/.test(rel)) return false;
  if (/^\.bmad-core(\/|$)/.test(rel)) return false;
  if (/^_bmad(\/|$)/.test(rel)) return false;
  if (/^\.claude\/skills\/bmad-[^/]+(\/|$)/.test(rel)) return false;
  if (/^docs\/ai\/ACEF_[A-Za-z0-9_-]+_DISPATCH\.md$/.test(rel)) return false;

  return [
    /^_bmad-output(\/|$)/,
    /^docs\/ai(\/|$)/,
    /^docs\/prd\.md$/,
    /^docs\/architecture\.md$/,
    /^docs\/stories(\/|$)/,
    /^app(\/|$)/,
    /^src(\/|$)/,
    /^modules(\/|$)/,
    /^shared(\/|$)/,
    /^lib(\/|$)/,
    /^components(\/|$)/,
    /^hooks(\/|$)/,
    /^services(\/|$)/,
    /^stores(\/|$)/,
    /^utils(\/|$)/,
    /^constants(\/|$)/,
    /^types(\/|$)/,
    /(^|\/)(__tests__|tests?)(\/|$)/,
    /(^|\/)(package\.json|yarn\.lock|package-lock\.json|pnpm-lock\.yaml|bun\.lockb|jest\.config\.[jt]s|babel\.config\.[jt]s|tsconfig\.json|app\.config\.ts)$/,
  ].some((rx) => rx.test(rel));
}

function bashIsRestricted(command, cwd, repoRoot) {
  if (!command || !repoRoot || !cwd || !under(cwd, repoRoot)) return false;

  return /\b(yarn\s+(add|install)|npm\s+(install|i)|pnpm\s+(add|install)|expo\s+install|bun\s+add)\b/i.test(command)
    || /(>|>>)\s*(app|src|modules|shared|lib|components|hooks|services|stores|utils|constants|types|_bmad-output|docs\/ai|docs\/prd\.md|docs\/architecture\.md)/.test(command)
    || /\b(touch|mkdir|cp|mv|rm)\b.*\b(app|src|modules|shared|lib|_bmad-output|docs\/ai|docs\/prd\.md|docs\/architecture\.md)\b/.test(command);
}

(async () => {
  let payload = {};
  try {
    const raw = await readStdin();
    payload = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    allow();
    return;
  }

  if (isWorker()) {
    allow();
    return;
  }

  const toolName = payload.tool_name || payload.toolName || payload.name || "";
  const input = payload.tool_input || payload.toolInput || payload.input || {};
  const cwd = resolvePath(payload.cwd || input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const filePath = toolFilePath(input, cwd);
  const repoRoot = findActiveRoot([filePath, cwd, process.env.CLAUDE_PROJECT_DIR ? resolvePath(process.env.CLAUDE_PROJECT_DIR) : ""]);

  if (!repoRoot) {
    allow();
    return;
  }

  if (/^(Read|Write|Edit|MultiEdit|NotebookEdit)$/.test(toolName) && restrictedPath(filePath, repoRoot)) {
    deny(`ACEF/BMAD hard wall: dispatcher/conductor agent cannot ${toolName} ${filePath}. Dispatch a dedicated persona worker instead.`);
    return;
  }

  if (toolName === "Bash" && bashIsRestricted(input.command || "", cwd, repoRoot)) {
    deny("ACEF/BMAD hard wall: dispatcher/conductor agent cannot run implementation/install/write Bash commands in an active BMAD lane. Dispatch the dedicated persona worker/operator path.");
    return;
  }

  allow();
})();

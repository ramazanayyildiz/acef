#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

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
    ".acef-lane",
    ".acef-lightweight-lane",
    ".acef-bmad-lane",
    ".bmad",
    "_bmad",
    "_bmad-output",
  ].some((name) => exists(path.join(dirPath, name)));
}

function findActiveRoot(paths) {
  const home = process.env.HOME ? path.resolve(process.env.HOME) : "";
  for (const candidate of paths.filter(Boolean)) {
    for (const dirPath of ancestors(candidate)) {
      if (home && path.resolve(dirPath) === home) continue;
      if (hasLaneMarker(dirPath)) return dirPath;
    }
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR ? resolvePath(process.env.CLAUDE_PROJECT_DIR) : "";
  if (projectDir && exists(path.join(projectDir, ".acef-bmad-hard-wall"))) {
    return projectDir;
  }

  return "";
}

function isWorker(payload) {
  const agentId = (payload && (payload.agent_id || payload.agentId)) || "";
  const agentType = (payload && (payload.agent_type || payload.agentType)) || "";

  if (agentId || agentType) {
    const identity = `${agentId} ${agentType}`;
    if (/(^|[\s_@-])(conductor|dispatcher|orchestrator|coordinator|main-agent|main)([\s_@-]|$)/i.test(identity)) {
      return false;
    }
    return true;
  }

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
      hookEventName: "PreToolUse",
      permissionDecision: "allow"
    }
  }));
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
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

function runControlPath(filePath, repoRoot) {
  if (!filePath || !repoRoot || !under(filePath, repoRoot)) return false;
  const rel = path.relative(repoRoot, filePath);
  return /^docs\/ai\/ACEF_ACTIVE_LEDGER$/.test(rel)
    || /^docs\/ai\/ACEF_PREFLIGHT\.md$/.test(rel)
    || /^docs\/ai\/ACEF_[A-Za-z0-9_-]+_DELIVERY_AUDIT\.md$/.test(rel);
}

function ledgerPath(filePath, repoRoot) {
  if (!filePath || !repoRoot || !under(filePath, repoRoot)) return false;
  const rel = path.relative(repoRoot, filePath);
  return /^docs\/ai\/ACEF_ACTIVE_LEDGER$/.test(rel)
    || /^docs\/ai\/ACEF_PREFLIGHT\.md$/.test(rel)
    || /^docs\/ai\/ACEF_[A-Za-z0-9_-]+_DELIVERY_AUDIT\.md$/.test(rel)
    || /^docs\/ai\/ACEF_.*\.md$/.test(rel);
}

function implementationPath(filePath, repoRoot) {
  if (!filePath || !repoRoot || !under(filePath, repoRoot)) return false;
  const rel = path.relative(repoRoot, filePath);
  return [
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

function bashTouchesImplementation(command, cwd, repoRoot) {
  if (!command || !repoRoot || !cwd || !under(cwd, repoRoot)) return false;

  return /\b(yarn\s+(add|install)|npm\s+(install|i)|pnpm\s+(add|install)|expo\s+install|bun\s+add)\b/i.test(command)
    || /(>|>>)\s*(app|src|modules|shared|lib|components|hooks|services|stores|utils|constants|types)/.test(command)
    || /\b(touch|mkdir|cp|mv|rm)\b.*\b(app|src|modules|shared|lib|components|hooks|services|stores|utils|constants|types)\b/.test(command);
}

function bashTouchesLedger(command, cwd, repoRoot) {
  if (!command || !repoRoot || !cwd || !under(cwd, repoRoot)) return false;
  return /(>|>>)\s*docs\/ai\/ACEF_/.test(command)
    || /\b(touch|mkdir|cp|mv|rm)\b.*\bdocs\/ai\/ACEF_/.test(command);
}

function bashIsCommit(command) {
  return /\bgit\s+commit\b/i.test(command || "");
}

function bashSpawnsAgent(command) {
  return /\b(claude|codex)\b.*\b(agent|subagent|task)\b/i.test(command || "")
    || /\b(spawn|dispatch|launch)\b.*\b(agent|subagent|worker)\b/i.test(command || "");
}

function parseTargetEpicNumber(command) {
  const explicit = process.env.ACEF_TARGET_EPIC || process.env.ACEF_EPIC_NUMBER || process.env.BMAD_EPIC_NUMBER || "";
  if (/^\d+$/.test(explicit)) return Number(explicit);

  const patterns = [
    /(?:--epic(?:=|\s+)|\bepic[\s_-]*)(\d+)/i,
    /\bE(\d+)[-.]\d+\b/i,
    /\bGIFT-(\d+)[-.]\d+\b/i,
    /\bstory\s+(\d+)[-.]\d+\b/i,
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match) return Number(match[1]);
  }

  return 0;
}

function fileContainsPass(filePath, epicNumber) {
  try {
    if (!fs.statSync(filePath).isFile()) return false;
    const text = fs.readFileSync(filePath, "utf8");
    const hasEpic = new RegExp(`Epic\\s+${epicNumber}\\s+Process\\s+Judge`, "i").test(text)
      || new RegExp(`epic[-_ ]${epicNumber}[-_ ]process[-_ ]judge`, "i").test(filePath);
    const hasPass = /\b(Verdict|Status)\s*:\s*PASS\b/i.test(text)
      || /\|\s*Epic\s+\d+\s+Process\s+Judge\s*\|[^|\n]*\|\s*PASS\b/i.test(text);
    return hasEpic && hasPass;
  } catch {
    return false;
  }
}

function epicGatePassed(repoRoot, epicNumber) {
  const candidates = [
    path.join(repoRoot, "docs", "ai", `ACEF_EPIC_${epicNumber}_PROCESS_JUDGE_PASS.md`),
    path.join(repoRoot, "docs", "ai", `ACEF_EPIC_${epicNumber}_PROCESS_JUDGE.md`),
    path.join(repoRoot, "docs", "ai", `epic-${epicNumber}-process-judge.md`),
    path.join(repoRoot, "_bmad-output", `epic-${epicNumber}-process-judge.md`),
  ];

  if (candidates.some((candidate) => fileContainsPass(candidate, epicNumber))) return true;

  const dirs = [
    path.join(repoRoot, "docs", "ai"),
    path.join(repoRoot, "_bmad-output"),
    path.join(repoRoot, "_bmad-output", "planning-artifacts"),
    path.join(repoRoot, "_bmad-output", "implementation-artifacts"),
  ];

  for (const dir of dirs) {
    try {
      for (const name of fs.readdirSync(dir)) {
        const filePath = path.join(dir, name);
        if (fileContainsPass(filePath, epicNumber)) return true;
      }
    } catch {
      // Ignore absent artifact directories.
    }
  }

  return false;
}

function epicBoundaryRestricted(command, repoRoot) {
  if (!/\b(bmad-create-story|create-story|dev-story|start-story|dispatch-story)\b/i.test(command)) return "";

  const targetEpic = parseTargetEpicNumber(command);
  if (!targetEpic || targetEpic <= 1) return "";

  const priorEpic = targetEpic - 1;
  if (epicGatePassed(repoRoot, priorEpic)) return "";

  return `ACEF/BMAD epic boundary: cannot start Epic ${targetEpic} before Epic ${priorEpic} Process Judge is PASS. Seed/run the Epic ${priorEpic} gate first.`;
}

function phaseCommand(command) {
  const match = command.match(/\b(acef-adapter|map-codebase|bmad-prd|bmad-ux|bmad-create-architecture|bmad-create-epics-and-stories|bmad-check-implementation-readiness|bmad-create-story|create-story|bmad-dev-story|dev-story|bmad-code-review|code-review|verify-patch|test-review|process-judge)\b/i);
  return match ? match[1].toLowerCase() : "";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function listTextFiles(dirPath) {
  const out = [];
  function walk(current) {
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const filePath = path.join(current, entry.name);
      if (entry.isDirectory()) walk(filePath);
      else if (entry.isFile() && /\.(md|txt|json)$/i.test(entry.name)) out.push(filePath);
    }
  }
  walk(dirPath);
  return out;
}

function allLedgerText(repoRoot) {
  const active = activeLedgerPath(repoRoot);
  const files = active ? [active] : ledgerFiles(repoRoot);
  return files.map((filePath) => {
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch {
      return "";
    }
  }).join("\n");
}

function ledgerFiles(repoRoot) {
  return [
    ...listTextFiles(path.join(repoRoot, "docs", "ai")),
    ...listTextFiles(path.join(repoRoot, "_bmad-output")),
  ].filter((filePath) => /delivery|audit|ledger/i.test(path.basename(filePath)));
}

function activeLedgerPath(repoRoot) {
  const envPath = process.env.ACEF_ACTIVE_LEDGER ? resolvePath(process.env.ACEF_ACTIVE_LEDGER, repoRoot) : "";
  if (envPath && under(envPath, repoRoot) && exists(envPath)) return envPath;

  const markerPath = path.join(repoRoot, "docs", "ai", "ACEF_ACTIVE_LEDGER");
  if (!exists(markerPath)) return "";
  try {
    const value = fs.readFileSync(markerPath, "utf8").trim();
    if (!value || /^none$/i.test(value)) return "";
    const filePath = resolvePath(value, repoRoot);
    if (under(filePath, repoRoot) && exists(filePath)) return filePath;
  } catch {
    return "";
  }
  return "";
}

function activeLedgerRestricted(repoRoot) {
  if (activeLedgerPath(repoRoot)) return "";
  const files = ledgerFiles(repoRoot);
  if (files.length <= 1) return "";
  return `ACEF conformance gate: ${files.length} delivery ledgers found; set ACEF_ACTIVE_LEDGER or docs/ai/ACEF_ACTIVE_LEDGER before implementation write.`;
}

function ledgerEntryStarted(repoRoot, commandName) {
  const files = [
    ...listTextFiles(path.join(repoRoot, "docs", "ai")),
    ...listTextFiles(path.join(repoRoot, "_bmad-output")),
  ];
  const commandPattern = new RegExp(escapeRegex(commandName), "i");
  const startedPattern = /\b(IN PROGRESS|STARTED|PASS)\b/i;

  for (const filePath of files) {
    try {
      const text = fs.readFileSync(filePath, "utf8");
      if (commandPattern.test(text) && startedPattern.test(text)) return true;
    } catch {
      // Ignore unreadable artifacts.
    }
  }

  return false;
}

function ledgerBeforeToolRestricted(command, repoRoot) {
  const commandName = phaseCommand(command);
  if (!commandName) return "";
  if (ledgerEntryStarted(repoRoot, commandName)) return "";
  return `ACEF step-ledger gate: start a delivery-ledger row for ${commandName} with IN PROGRESS before running the phase/tool command.`;
}

function patternRegistryPath(repoRoot) {
  const filePath = path.join(repoRoot, "docs", "ai", "pattern-registry.json");
  return exists(filePath) ? filePath : "";
}

function readPatternRegistry(repoRoot) {
  const filePath = patternRegistryPath(repoRoot);
  if (!filePath) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function registryTerms(registry) {
  const terms = new Set();
  for (const pattern of registry?.patterns || []) {
    for (const term of pattern.reuseProbe || []) terms.add(String(term));
    for (const neighbor of pattern.goldenNeighbors || []) {
      if (neighbor?.path) terms.add(String(neighbor.path));
    }
  }
  return [...terms].filter(Boolean);
}

function doNotCopyEntries(registry) {
  const entries = [];
  for (const entry of registry?.doNotCopy || []) entries.push(String(entry.id || ""));
  for (const pattern of registry?.patterns || []) {
    for (const id of pattern.doNotCopy || []) entries.push(String(id || ""));
  }
  return [...new Set(entries.filter(Boolean))];
}

function ledgerField(text, name) {
  const match = text.match(new RegExp(`^\\s*${name}\\s*:\\s*([^\\n#|]+)`, "im"));
  return match ? match[1].trim().replace(/[`"'.,;]+$/g, "") : "";
}

function hasHumanRiskAcceptance(text) {
  return /\b(human risk acceptance|risk acceptance|explicit human acceptance|human accepted risk|user accepted risk)\b/i.test(text);
}

function activeWorkerScopePath(repoRoot) {
  const envPath = process.env.ACEF_ACTIVE_WORKER_SCOPE ? resolvePath(process.env.ACEF_ACTIVE_WORKER_SCOPE, repoRoot) : "";
  if (envPath && under(envPath, repoRoot) && exists(envPath)) return envPath;

  const markerPath = path.join(repoRoot, "docs", "ai", "ACEF_ACTIVE_WORKER_SCOPE.json");
  return exists(markerPath) ? markerPath : "";
}

function readActiveWorkerScope(repoRoot) {
  const filePath = activeWorkerScopePath(repoRoot);
  if (!filePath) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return { invalid: true };
  }
}

function payloadWorkerIdentity(payload) {
  const values = [
    payload?.agent_id,
    payload?.agentId,
    payload?.agent_type,
    payload?.agentType,
    process.env.ACEF_ROLE,
    process.env.CLAUDE_AGENT_NAME,
    process.env.CLAUDE_SUBAGENT_NAME,
    process.env.AGENT_NAME,
  ].filter(Boolean);
  if (/^(1|true)$/i.test(process.env.ACEF_BMAD_WORKER || "")) values.push("ACEF_BMAD_WORKER");
  return values.join(" ");
}

function globToRegex(glob) {
  let out = "^";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === "*") {
      if (glob[i + 1] === "*") {
        out += ".*";
        i += 1;
      } else {
        out += "[^/]*";
      }
    } else {
      out += escapeRegex(char);
    }
  }
  return new RegExp(`${out}$`);
}

function allowedByScopePath(filePath, repoRoot, scope) {
  const allowedPaths = Array.isArray(scope?.allowedPaths) ? scope.allowedPaths : [];
  if (!allowedPaths.length) return false;

  const rel = path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
  return allowedPaths.some((entry) => {
    if (!entry || typeof entry !== "string") return false;
    const normalized = entry.replaceAll(path.sep, "/").replace(/^\.\//, "");
    return globToRegex(normalized).test(rel);
  });
}

function scopeAppliesToWorker(payload, scope) {
  const expected = String(scope?.workerId || scope?.worker || "").trim();
  if (!expected) return true;
  return payloadWorkerIdentity(payload).includes(expected);
}

function countCommitsSince(repoRoot, baseRef) {
  if (!baseRef) return 0;
  try {
    const output = execFileSync("git", ["rev-list", "--count", `${baseRef}..HEAD`], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return Number(output || "0") || 0;
  } catch {
    return 0;
  }
}

function workerScopeRestricted(payload, toolName, input, cwd, repoRoot, filePath) {
  if (!isWorker(payload)) return "";

  if (/^(Task|Agent)$/i.test(toolName)) {
    return "ACEF worker scope fence: worker cannot spawn Agent/subagent tools. Return a final report and STOP.";
  }

  const command = input.command || "";
  if (toolName === "Bash" && bashSpawnsAgent(command)) {
    return "ACEF worker scope fence: worker cannot spawn or dispatch additional agents/subagents.";
  }

  const writesLedger = /^(Write|Edit|MultiEdit|NotebookEdit)$/.test(toolName)
    ? ledgerPath(filePath, repoRoot)
    : toolName === "Bash" && bashTouchesLedger(command, cwd, repoRoot);
  if (writesLedger) {
    return "ACEF worker scope fence: workers cannot edit ACEF run-control/ledger files. Conductor or ledger-worker only.";
  }

  const touchesImplementation = /^(Write|Edit|MultiEdit|NotebookEdit)$/.test(toolName)
    ? implementationPath(filePath, repoRoot)
    : toolName === "Bash" && (bashTouchesImplementation(command, cwd, repoRoot) || bashIsCommit(command));
  if (!touchesImplementation) return "";

  const scope = readActiveWorkerScope(repoRoot);
  if (!scope) {
    return "ACEF worker scope fence: missing docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json before worker implementation write/commit.";
  }
  if (scope.invalid) {
    return "ACEF worker scope fence: docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json is not valid JSON.";
  }
  if (!scopeAppliesToWorker(payload, scope)) {
    return "ACEF worker scope fence: active worker scope is assigned to a different worker identity.";
  }

  if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(toolName) && !allowedByScopePath(filePath, repoRoot, scope)) {
    const story = scope.activeStory || "current story";
    return `ACEF worker scope fence: ${path.relative(repoRoot, filePath)} is outside allowedPaths for Story ${story}.`;
  }

  if (toolName === "Bash" && bashIsCommit(command)) {
    const activeStory = String(scope.activeStory || "").trim();
    if (activeStory && !new RegExp(escapeRegex(activeStory), "i").test(command)) {
      return `ACEF worker scope fence: git commit command must cite activeStory ${activeStory}.`;
    }

    const maxCommits = Number(scope.maxCommits || 0);
    if (maxCommits > 0 && scope.baseRef && countCommitsSince(repoRoot, scope.baseRef) >= maxCommits) {
      return `ACEF worker scope fence: maxCommits ${maxCommits} already reached for active worker scope.`;
    }
  }

  return "";
}

function partialWorkshapeRestricted(registry, ledgerText) {
  if (String(registry?.status || "").toUpperCase() !== "PARTIAL") return "";

  const track = ledgerField(ledgerText, "track").toLowerCase();
  const workShape = ledgerField(ledgerText, "workShape");
  const accepted = hasHumanRiskAcceptance(ledgerText);
  if (!workShape) return "ACEF conformance gate: PARTIAL registry requires ledger field workShape: <name> before implementation write.";

  const covered = new Set((registry.patterns || []).map((pattern) => String(pattern.workShape || "").trim()).filter(Boolean));
  if (track === "guarded" && !accepted) {
    return `ACEF conformance gate: PARTIAL registry blocks guarded workShape ${workShape} without human risk acceptance.`;
  }
  if (!covered.has(workShape) && !accepted) {
    return `ACEF conformance gate: PARTIAL registry does not cover workShape ${workShape}; human risk acceptance required before implementation write.`;
  }

  return "";
}

function p1ConformanceRestricted(repoRoot) {
  const registry = readPatternRegistry(repoRoot);
  if (!registry) {
    return "ACEF conformance gate: missing readable docs/ai/pattern-registry.json before implementation write.";
  }

  const activeLedgerReason = activeLedgerRestricted(repoRoot);
  if (activeLedgerReason) return activeLedgerReason;

  const ledgerText = allLedgerText(repoRoot);
  const partialReason = partialWorkshapeRestricted(registry, ledgerText);
  if (partialReason) return partialReason;

  if (!/reuse[- ]before[- ]create|reuse probe|reuse check|nearest neighbor|golden neighbor/i.test(ledgerText)) {
    return "ACEF conformance gate: missing reuse-before-create / golden-neighbor ledger evidence before implementation write.";
  }

  const matched = registryTerms(registry).filter((term) => ledgerText.includes(term));
  if (!matched.length) {
    return "ACEF conformance gate: reuse ledger does not cite a registry probe term or golden neighbor before implementation write.";
  }

  for (const id of doNotCopyEntries(registry)) {
    const pattern = new RegExp(`\\b${escapeRegex(id)}\\b`, "i");
    const badLine = ledgerText.split(/\r?\n/).find((line) => pattern.test(line)
      && !/\b(avoid|avoided|blocked|reject|rejected|do not copy|not copied|do-not-copy)\b/i.test(line));
    if (badLine) {
      return `ACEF conformance gate: do-not-copy entry ${id} is mentioned without rejection context before implementation write.`;
    }
  }

  return "";
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

  const toolName = payload.tool_name || payload.toolName || payload.name || "";
  const input = payload.tool_input || payload.toolInput || payload.input || {};
  const cwd = resolvePath(payload.cwd || input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const filePath = toolFilePath(input, cwd);
  const repoRoot = findActiveRoot([filePath, cwd, process.env.CLAUDE_PROJECT_DIR ? resolvePath(process.env.CLAUDE_PROJECT_DIR) : ""]);

  if (!repoRoot) {
    allow();
    return;
  }

  const workerScopeReason = workerScopeRestricted(payload, toolName, input, cwd, repoRoot, filePath);
  if (workerScopeReason) {
    deny(workerScopeReason);
    return;
  }

  if (toolName === "Bash") {
    const ledgerReason = ledgerBeforeToolRestricted(input.command || "", repoRoot);
    if (ledgerReason) {
      deny(ledgerReason);
      return;
    }

    const boundaryReason = epicBoundaryRestricted(input.command || "", repoRoot);
    if (boundaryReason) {
      deny(boundaryReason);
      return;
    }
  }

  const needsP1Conformance = /^(Write|Edit|MultiEdit|NotebookEdit)$/.test(toolName)
    ? implementationPath(filePath, repoRoot)
    : toolName === "Bash" && bashTouchesImplementation(input.command || "", cwd, repoRoot);

  if (needsP1Conformance) {
    const p1Reason = p1ConformanceRestricted(repoRoot);
    if (p1Reason) {
      deny(p1Reason);
      return;
    }
  }

  if (isWorker(payload)) {
    allow();
    return;
  }

  if (/^(Read|Write|Edit|MultiEdit|NotebookEdit)$/.test(toolName)
    && restrictedPath(filePath, repoRoot)
    && !runControlPath(filePath, repoRoot)) {
    deny(`ACEF/BMAD hard wall: dispatcher/conductor agent cannot ${toolName} ${filePath}. Dispatch a dedicated persona worker instead.`);
    return;
  }

  if (toolName === "Bash" && bashIsRestricted(input.command || "", cwd, repoRoot)) {
    deny("ACEF/BMAD hard wall: dispatcher/conductor agent cannot run implementation/install/write Bash commands in an active BMAD lane. Dispatch the dedicated persona worker/operator path.");
    return;
  }

  allow();
})();

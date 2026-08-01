"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const TREATMENTS = Object.freeze(["legacy", "candidate", "repo-native"]);
const WORKFLOWS = Object.freeze(["quick-fix", "lightweight", "full-bmad", "repo-native"]);
const ASSURANCE_PROFILES = Object.freeze(["baseline", "guarded", "not-applicable"]);

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
}

function unique(values) {
  return [...new Set(values)];
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error("manifest must be an object");
  if (manifest.schema !== "acef.execution-assurance-experiment.v1") {
    throw new Error("manifest schema must be acef.execution-assurance-experiment.v1");
  }
  requireString(manifest.experimentId, "experimentId");
  requireString(manifest.preregisteredAt, "preregisteredAt");
  for (const treatment of ["legacy", "candidate"]) {
    const entry = manifest.treatments?.[treatment];
    if (!entry || typeof entry !== "object") throw new Error(`treatments.${treatment} is required`);
    requireString(entry.commit, `treatments.${treatment}.commit`);
  }
  if (manifest.treatments.legacy.commit === manifest.treatments.candidate.commit) {
    throw new Error("legacy and candidate commits must differ");
  }
  if (!Array.isArray(manifest.stage0?.traps) || manifest.stage0.traps.length !== 6) {
    throw new Error("stage0 must preregister exactly six deterministic traps");
  }
  const trapIds = manifest.stage0.traps.map((trap) => trap.id);
  if (unique(trapIds).length !== trapIds.length) throw new Error("stage0 trap ids must be unique");
  if (!Array.isArray(manifest.pilot?.attempts) || manifest.pilot.attempts.length !== 16) {
    throw new Error("pilot must preregister exactly 16 attempts");
  }
  requireString(manifest.pilotRuntime?.client, "pilotRuntime.client");
  requireString(manifest.pilotRuntime?.clientVersion, "pilotRuntime.clientVersion");
  requireString(manifest.pilotRuntime?.model, "pilotRuntime.model");
  requireString(manifest.pilotRuntime?.reasoningEffort, "pilotRuntime.reasoningEffort");
  if (manifest.pilotRuntime.freshSession !== true || manifest.pilotRuntime.crossRunMemory !== false) {
    throw new Error("pilot runtime must use fresh sessions with cross-run memory disabled");
  }
  const attemptIds = manifest.pilot.attempts.map((attempt) => attempt.id);
  if (unique(attemptIds).length !== attemptIds.length) throw new Error("pilot attempt ids must be unique");
  for (const attempt of manifest.pilot.attempts) {
    requireString(attempt.id, "pilot attempt id");
    requireString(attempt.taskId, `${attempt.id}.taskId`);
    if (!TREATMENTS.includes(attempt.treatment)) throw new Error(`${attempt.id}.treatment is invalid`);
    if (!WORKFLOWS.includes(attempt.workflowId)) throw new Error(`${attempt.id}.workflowId is invalid`);
    if (!ASSURANCE_PROFILES.includes(attempt.assuranceProfile)) throw new Error(`${attempt.id}.assuranceProfile is invalid`);
    if (attempt.treatment === "repo-native") {
      if (attempt.workflowId !== "repo-native" || attempt.assuranceProfile !== "not-applicable") {
        throw new Error(`${attempt.id} repo-native treatment must use repo-native/not-applicable`);
      }
    } else if (attempt.workflowId === "repo-native" || attempt.assuranceProfile === "not-applicable") {
      throw new Error(`${attempt.id} ACEF treatment must declare an ACEF workflow and assurance profile`);
    }
    if (!Number.isInteger(attempt.order) || attempt.order < 1) throw new Error(`${attempt.id}.order must be a positive integer`);
    if (!Number.isFinite(attempt.activeTimeCapMinutes) || attempt.activeTimeCapMinutes < 1) {
      throw new Error(`${attempt.id}.activeTimeCapMinutes must be positive`);
    }
    if (!manifest.taskCatalog?.[attempt.taskId]) throw new Error(`${attempt.id}.taskId is missing from taskCatalog`);
  }
  const orders = manifest.pilot.attempts.map((attempt) => attempt.order);
  if (unique(orders).length !== orders.length || Math.min(...orders) !== 1 || Math.max(...orders) !== orders.length) {
    throw new Error("pilot attempt order must be a contiguous unique sequence starting at 1");
  }
  return manifest;
}

function assessTaskShape(task) {
  const boundaries = unique((task.technicalBoundaries || []).map((value) => String(value).trim()).filter(Boolean));
  const surfaces = unique((task.productSurfaces || []).map((value) => String(value).trim()).filter(Boolean));
  const acceptanceCriteriaCount = Number(task.acceptanceCriteriaCount || 0);
  const reasons = [];
  if (boundaries.length > 1) reasons.push(`${boundaries.length} major technical boundaries`);
  if (boundaries.length >= 1 && surfaces.length > 1) reasons.push(`${surfaces.length} product surfaces combined with technical work`);
  if (acceptanceCriteriaCount > 5) reasons.push(`${acceptanceCriteriaCount} acceptance criteria`);
  return {
    disposition: reasons.length ? "REPLAN_SPLIT" : "READY",
    reasons,
    technicalBoundaryCount: boundaries.length,
    productSurfaceCount: surfaces.length,
    acceptanceCriteriaCount,
  };
}

function dependencyAwareQuarantine(stories, failedStoryId, options = {}) {
  const ids = new Set((stories || []).map((story) => story.id));
  if (!ids.has(failedStoryId)) throw new Error(`unknown failed story ${failedStoryId}`);
  for (const story of stories || []) {
    for (const dependency of story.dependsOn || []) {
      if (!ids.has(dependency)) throw new Error(`${story.id} depends on unknown story ${dependency}`);
    }
  }
  const byId = new Map((stories || []).map((story) => [story.id, story]));
  const visiting = new Set();
  const visited = new Set();
  function visit(storyId) {
    if (visiting.has(storyId)) throw new Error(`story dependency cycle includes ${storyId}`);
    if (visited.has(storyId)) return;
    visiting.add(storyId);
    for (const dependency of byId.get(storyId)?.dependsOn || []) visit(dependency);
    visiting.delete(storyId);
    visited.add(storyId);
  }
  for (const storyId of ids) visit(storyId);
  if (options.sharedSafetyInvariant === true) {
    return { wholeRunHalt: true, quarantined: [...ids], runnable: [] };
  }
  const quarantined = new Set([failedStoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const story of stories || []) {
      if (!quarantined.has(story.id) && (story.dependsOn || []).some((dependency) => quarantined.has(dependency))) {
        quarantined.add(story.id);
        changed = true;
      }
    }
  }
  return {
    wholeRunHalt: false,
    quarantined: [...quarantined],
    runnable: [...ids].filter((id) => !quarantined.has(id)),
  };
}

const CONTROL_PATTERNS = Object.freeze({
  readiness: /\b(?:bmad-check-implementation-readiness|check-implementation-readiness|spec-readiness)\b/gi,
  atdd: /\b(?:bmad-atdd|test-design-atdd|atdd)\b/gi,
  development: /\b(?:bmad-dev-story|dev-story|developer-implementation)\b/gi,
  codeReview: /\b(?:bmad-code-review|code-review)\b/gi,
  verifyPatch: /\bverify-patch\b/gi,
  testReview: /\btest-review\b/gi,
  processJudge: /\bprocess-judge\b/gi,
  broadSuite: /\b(?:(?:php\s+artisan\s+test|vendor\/bin\/phpunit)\b(?![^\n]*--filter)|npm\s+test|pnpm\s+test|npx\s+(?:vitest|playwright)\s+test)\b/gi,
  stateReconstruction: /\b(?:ACEF_ACTIVE_RUN|ACEF_CURRENT_CONTEXT|ACEF_ACTIVE_LEDGER|acef-status|acef-next)\b/gi,
});

function countMatches(text, pattern) {
  return (String(text || "").match(pattern) || []).length;
}

function countBroadSuiteInvocations(text) {
  return String(text || "").split(/&&|\|\||;/).reduce((count, segment) => {
    const command = segment.trim();
    if (!command) return count;
    if (/\b(?:php\s+artisan\s+test|vendor\/bin\/phpunit)\b/i.test(command)) {
      return count + (/\s--filter(?:=|\s)/i.test(command) ? 0 : 1);
    }
    return count + (/\b(?:npm\s+test|pnpm\s+test|npx\s+(?:vitest|playwright)\s+test)\b/i.test(command) ? 1 : 0);
  }, 0);
}

function traceEventTexts(text) {
  return String(text || "").split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try {
      const event = JSON.parse(line);
      if (!event.type) return [line];
      if (event.type !== "item.completed") return [];
      const item = event.item || {};
      if (item.type === "command_execution") return [String(item.command || "")];
      if (/tool_call$/.test(String(item.type || ""))) return [JSON.stringify(item)];
      return [];
    } catch {
      return [line];
    }
  });
}

function parseIndependentTrace(text, options = {}) {
  const events = traceEventTexts(text);
  const normalizedText = events.join("\n");
  const counts = {};
  for (const [controlId, pattern] of Object.entries(CONTROL_PATTERNS)) {
    counts[controlId] = controlId === "broadSuite"
      ? events.reduce((total, event) => total + countBroadSuiteInvocations(event), 0)
      : countMatches(normalizedText, pattern);
  }
  const lifecycleControls = ["readiness", "atdd", "development", "codeReview", "verifyPatch", "testReview", "processJudge"];
  const scopeIds = unique((options.scopeIds || []).map(String).filter(Boolean));
  const retryable = new Set(options.retryableControls || []);
  const perScope = {};
  if (scopeIds.length) {
    for (const event of events) {
      const matchedScopes = scopeIds.filter((scopeId) => event.includes(scopeId));
      const scopeId = matchedScopes.length === 1 ? matchedScopes[0]
        : (matchedScopes.length > 1 ? "ambiguous" : (/\bepic\b/i.test(event) ? "epic" : "unscoped"));
      perScope[scopeId] ||= Object.fromEntries(Object.keys(CONTROL_PATTERNS).map((controlId) => [controlId, 0]));
      for (const [controlId, pattern] of Object.entries(CONTROL_PATTERNS)) {
        perScope[scopeId][controlId] += controlId === "broadSuite"
          ? countBroadSuiteInvocations(event)
          : countMatches(event, pattern);
      }
    }
  } else {
    perScope.global = { ...counts };
  }
  const attributableScopes = new Set([...scopeIds, "epic"]);
  const duplicateLifecycleControls = scopeIds.length
    ? Object.entries(perScope).filter(([scopeId]) => attributableScopes.has(scopeId)).flatMap(([scopeId, scopeCounts]) => lifecycleControls
      .filter((controlId) => scopeCounts[controlId] > 1 && !retryable.has(controlId))
      .map((controlId) => `${scopeId}:${controlId}`))
    : lifecycleControls.filter((controlId) => counts[controlId] > 1 && !retryable.has(controlId));
  const unattributedLifecycleEvents = ["unscoped", "ambiguous"].reduce((total, scopeId) => total
    + lifecycleControls.reduce((sum, controlId) => sum + Number(perScope[scopeId]?.[controlId] || 0), 0), 0);
  const requiredControlsPerScope = options.requiredControlsPerScope || [];
  const missingRequiredControls = scopeIds.flatMap((scopeId) => requiredControlsPerScope
    .filter((controlId) => Number(perScope[scopeId]?.[controlId] || 0) < 1)
    .map((controlId) => `${scopeId}:${controlId}`));
  return {
    counts,
    perScope,
    scopeAttributionComplete: unattributedLifecycleEvents === 0,
    unattributedLifecycleEvents,
    lifecycleComplete: missingRequiredControls.length === 0,
    missingRequiredControls,
    duplicateLifecycleControls,
    duplicateLifecycle: duplicateLifecycleControls.length > 0,
    sha256: sha256(normalizedText),
  };
}

function parseLifecycleDispatchTrace(dispatches, options = {}) {
  const lifecycleControls = ["atdd", "development", "code-review", "verify-patch", "test-review", "process-judge"];
  const scopeIds = unique((options.scopeIds || []).map(String).filter(Boolean));
  const requiredControlsPerScope = options.requiredControlsPerScope || [];
  const perScope = {};
  for (const scopeId of [...scopeIds, "epic"]) {
    perScope[scopeId] = Object.fromEntries(lifecycleControls.map((controlId) => [controlId, 0]));
  }
  const unattributed = [];
  for (const dispatch of dispatches || []) {
    if (!lifecycleControls.includes(dispatch.control)) continue;
    if (!perScope[dispatch.scope]) {
      unattributed.push(dispatch.taskName || `${dispatch.scope}:${dispatch.control}`);
      continue;
    }
    perScope[dispatch.scope][dispatch.control] += 1;
  }
  const duplicateLifecycleControls = Object.entries(perScope).flatMap(([scopeId, counts]) => lifecycleControls
    .filter((controlId) => counts[controlId] > 1
      && !(dispatches || []).filter((entry) => entry.scope === scopeId && entry.control === controlId)
        .slice(1).every((entry) => entry.retryOrdinal === 1 && entry.retryable === true))
    .map((controlId) => `${scopeId}:${controlId}`));
  const missingRequiredControls = scopeIds.flatMap((scopeId) => requiredControlsPerScope
    .filter((controlId) => Number(perScope[scopeId]?.[controlId] || 0) < 1)
    .map((controlId) => `${scopeId}:${controlId}`));
  return {
    source: "collaboration-dispatches",
    perScope,
    scopeAttributionComplete: unattributed.length === 0,
    unattributedLifecycleEvents: unattributed.length,
    unattributed,
    lifecycleComplete: missingRequiredControls.length === 0,
    missingRequiredControls,
    duplicateLifecycleControls,
    duplicateLifecycle: duplicateLifecycleControls.length > 0,
    sha256: sha256(JSON.stringify(dispatches || [])),
  };
}

function readPilotResultRow(resultsPath, attemptRunId) {
  if (!fs.existsSync(resultsPath)) return null;
  return fs.readFileSync(resultsPath, "utf8").split(/\r?\n/).filter(Boolean)
    .map((line) => JSON.parse(line))
    .find((row) => row.attemptRunId === attemptRunId) || null;
}

function acquireFinalizationClaim(resultsPath, attemptRunId, lockRoot = path.dirname(resultsPath)) {
  const safeId = String(attemptRunId).replace(/[^A-Za-z0-9._-]/g, "_");
  const lockPath = path.join(lockRoot, `.finalize-${safeId}.lock`);
  const claim = () => {
    fs.mkdirSync(lockPath);
    fs.writeFileSync(path.join(lockPath, "owner.json"), `${JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() })}\n`);
  };
  fs.mkdirSync(lockRoot, { recursive: true });
  try {
    claim();
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    let owner = null;
    try { owner = JSON.parse(fs.readFileSync(path.join(lockPath, "owner.json"), "utf8")); } catch {}
    if (!owner) {
      const ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
      if (ageMs < 10000) throw new Error(`finalization already in progress for ${attemptRunId}`);
    }
    let alive = false;
    if (Number.isInteger(owner?.pid)) {
      try { process.kill(owner.pid, 0); alive = true; } catch {}
    }
    if (alive) throw new Error(`finalization already in progress for ${attemptRunId} by pid ${owner.pid}`);
    fs.rmSync(lockPath, { recursive: true, force: true });
    claim();
  }
  return {
    lockPath,
    release() { fs.rmSync(lockPath, { recursive: true, force: true }); },
  };
}

function isPilotHarnessPath(entry) {
  return /^(?:docs\/ai\/|_bmad-output\/|\.acef(?:-bmad|-lightweight)?-lane$)/.test(String(entry || ""));
}

function buildPilotPlan(manifest) {
  validateManifest(manifest);
  return [...manifest.pilot.attempts]
    .sort((left, right) => left.order - right.order)
    .map((attempt) => ({
      ...attempt,
      frameworkCommit: attempt.treatment === "repo-native" ? null : manifest.treatments[attempt.treatment].commit,
      experimentId: manifest.experimentId,
    }));
}

function environmentPreflight(repoRoot, contract) {
  const missingPaths = (contract.requiredPaths || [])
    .filter((entry) => !fs.existsSync(path.resolve(repoRoot, entry)));
  const commandFailures = [];
  for (const [index, argv] of (contract.probes || []).entries()) {
    if (!Array.isArray(argv) || !argv.length) {
      commandFailures.push({ index, command: argv, status: null, error: "probe must be a non-empty argv array" });
      continue;
    }
    const result = cp.spawnSync(argv[0], argv.slice(1), {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: Number(contract.probeTimeoutMs || 30000),
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status !== 0) {
      commandFailures.push({
        index,
        command: argv,
        status: Number.isInteger(result.status) ? result.status : null,
        signal: result.signal || null,
        outputSha256: sha256(`${result.stdout || ""}\n${result.stderr || result.error?.message || ""}`),
      });
    }
  }
  return {
    ok: missingPaths.length === 0 && commandFailures.length === 0,
    checkedBeforeTimedRun: true,
    missingPaths,
    commandFailures,
  };
}

function captureGitDiff(repoRoot, baseRef) {
  const result = cp.spawnSync("git", ["diff", "--binary", baseRef], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) throw new Error(`git diff failed: ${result.stderr || result.error?.message || "unknown error"}`);
  return result.stdout || "";
}

function spawnCaptured(command, args, cwd, stdoutPath, stderrPath, options = {}) {
  fs.mkdirSync(path.dirname(stdoutPath), { recursive: true });
  fs.mkdirSync(path.dirname(stderrPath), { recursive: true });
  const stdoutFd = fs.openSync(stdoutPath, "w");
  const stderrFd = fs.openSync(stderrPath, "w");
  let result;
  try {
    result = cp.spawnSync(command, args, {
      cwd,
      timeout: options.timeout || 120000,
      env: options.env || process.env,
      input: options.input,
      stdio: [options.input === undefined ? "ignore" : "pipe", stdoutFd, stderrFd],
    });
  } finally {
    fs.closeSync(stdoutFd);
    fs.closeSync(stderrFd);
  }
  if (result.error) fs.appendFileSync(stderrPath, `${result.error.message}\n`);
  return {
    status: Number.isInteger(result.status) ? result.status : 1,
    signal: result.signal || null,
  };
}

function pilotAttemptHistory(resultsPath, attemptId) {
  const readRows = (filePath) => fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
    : [];
  const results = readRows(resultsPath)
    .filter((row) => row.attemptId === attemptId)
    .map((row) => ({ ordinal: Number(row.attemptOrdinal || 1), invalidated: false, source: "result" }));
  const adjudicationsPath = path.join(path.dirname(resultsPath), "pilot-adjudications.jsonl");
  const adjudications = readRows(adjudicationsPath)
    .filter((row) => row.attemptId === attemptId)
    .map((row) => ({
      ordinal: Number(row.attemptOrdinal || 1),
      invalidated: row.disposition === "INVALIDATED",
      source: "adjudication",
    }));
  const history = [...results, ...adjudications].sort((left, right) => left.ordinal - right.ordinal
    || (left.source === "result" ? -1 : 1));
  const maxOrdinal = history.reduce((maximum, entry) => Math.max(maximum, entry.ordinal), 0);
  const latest = history.filter((entry) => entry.ordinal === maxOrdinal).at(-1) || null;
  return { maxOrdinal, latest };
}

function resolveCatalogTask(manifest, manifestPath, taskId) {
  const ref = manifest.taskCatalog?.[taskId];
  if (!ref) throw new Error(`unknown task catalog id ${taskId}`);
  const sourceManifestPath = path.resolve(path.dirname(manifestPath), ref.sourceManifest);
  const sourceManifest = JSON.parse(fs.readFileSync(sourceManifestPath, "utf8"));
  let task = (sourceManifest.tasks || []).find((entry) => entry.id === ref.selector) || null;
  let kind = "task";
  if (!task && sourceManifest.epic?.id === ref.selector) {
    task = sourceManifest.epic;
    kind = "epic";
  }
  if (!task) {
    task = (sourceManifest.epic?.stories || []).find((entry) => entry.id === ref.selector) || null;
    if (task) kind = "story";
  }
  if (!task) throw new Error(`${taskId}: selector ${ref.selector} not found in ${ref.sourceManifest}`);
  return {
    taskId,
    selector: ref.selector,
    kind,
    sourceManifestPath,
    fixtureRoot: path.join(path.dirname(sourceManifestPath), "fixtures"),
    repo: sourceManifest.repo || task.repo,
    stack: sourceManifest.stack || task.stack,
    source: sourceManifest.source || task.source,
    commit: sourceManifest.commit || task.commit,
    setupDirs: sourceManifest.setupDirs || task.setupDirs || [],
    setupFiles: sourceManifest.setupFiles || task.setupFiles || [],
    task,
  };
}

function setupOperations(resolved) {
  if (resolved.kind === "epic") return resolved.task.stories.flatMap((story) => story.setup || []);
  return resolved.task.setup || [];
}

function preflightCatalog(manifest, manifestPath) {
  const checks = [];
  for (const taskId of Object.keys(manifest.taskCatalog || {})) {
    let resolved;
    try {
      resolved = resolveCatalogTask(manifest, manifestPath, taskId);
    } catch (error) {
      checks.push({ taskId, ok: false, blockers: [error.message] });
      continue;
    }
    const blockers = [];
    if (!resolved.source || !fs.existsSync(path.join(resolved.source, ".git"))) blockers.push(`missing git source ${resolved.source || "(unset)"}`);
    if (!resolved.commit) blockers.push("missing pinned source commit");
    if (!resolved.stack) blockers.push("missing stack");
    if (!blockers.length) {
      const commit = cp.spawnSync("git", ["-C", resolved.source, "cat-file", "-e", `${resolved.commit}^{commit}`], { encoding: "utf8" });
      if (commit.status !== 0) blockers.push(`pinned commit unavailable: ${resolved.commit}`);
      if (resolved.stack === "php-laravel" && !fs.existsSync(path.join(resolved.source, "vendor", "autoload.php"))) {
        blockers.push("source vendor/autoload.php missing");
      }
      if (resolved.stack?.startsWith("typescript-") && !fs.existsSync(path.join(resolved.source, "node_modules"))) {
        blockers.push("source node_modules missing");
      }
    }
    for (const operation of setupOperations(resolved)) {
      if (operation.type === "copy-fixture" && !fs.existsSync(path.join(resolved.fixtureRoot, operation.fixture))) {
        blockers.push(`missing fixture ${operation.fixture}`);
      }
    }
    if (resolved.kind === "epic") {
      try {
        for (const story of resolved.task.stories || []) dependencyAwareQuarantine(resolved.task.stories, story.id);
      } catch (error) {
        blockers.push(error.message);
      }
    }
    checks.push({
      taskId,
      selector: resolved.selector,
      kind: resolved.kind,
      repo: resolved.repo,
      stack: resolved.stack,
      sourceCommit: resolved.commit,
      setupDirs: resolved.setupDirs,
      setupFiles: resolved.setupFiles,
      ok: blockers.length === 0,
      blockers,
    });
  }
  return { ok: checks.every((check) => check.ok), checks };
}

module.exports = {
  ASSURANCE_PROFILES,
  CONTROL_PATTERNS,
  TREATMENTS,
  WORKFLOWS,
  assessTaskShape,
  dependencyAwareQuarantine,
  acquireFinalizationClaim,
  buildPilotPlan,
  captureGitDiff,
  environmentPreflight,
  isPilotHarnessPath,
  parseIndependentTrace,
  parseLifecycleDispatchTrace,
  pilotAttemptHistory,
  preflightCatalog,
  resolveCatalogTask,
  readPilotResultRow,
  sha256,
  spawnCaptured,
  validateManifest,
};

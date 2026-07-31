"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  parseActiveRun,
  parseDirectRun,
  parseWorkerScope,
} = require("./acef-state-parser");

function exists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function loadParsed(filePath, parser, label) {
  if (!exists(filePath)) return { exists: false, record: null, error: null };
  try {
    return { exists: true, record: parser(filePath), error: null };
  } catch (error) {
    return { exists: true, record: null, error: `${label}: ${error.message}` };
  }
}

function readPointer(filePath) {
  return exists(filePath) ? fs.readFileSync(filePath, "utf8").trim() : "";
}

function inspectRunAuthorization(repo, options = {}) {
  const repoRoot = path.resolve(repo);
  const allowedStatuses = new Set(options.allowedStatuses || ["active"]);
  const activeRunPath = path.join(repoRoot, "docs", "ai", "ACEF_ACTIVE_RUN.json");
  const directRunPath = path.join(repoRoot, "docs", "ai", "ACEF_DIRECT_RUN.json");
  const active = loadParsed(activeRunPath, parseActiveRun, "invalid active run");

  if (!active.exists && options.allowDirect === true) {
    const direct = loadParsed(directRunPath, parseDirectRun, "invalid direct run");
    if (direct.exists) {
      const blockers = [];
      if (direct.error) blockers.push(direct.error);
      if (direct.record?.status === "promoted") {
        blockers.push(`direct run is promoted via ${direct.record.promotion.decision}`);
      } else if (direct.record && !["active", "complete"].includes(direct.record.status)) {
        blockers.push(`direct run is not actionable: ${direct.record.status}`);
      }
      if (direct.record && direct.record.promotion.decision !== "stay-direct") {
        blockers.push(`direct run promotion decision is ${direct.record.promotion.decision}`);
      }
      return {
        ok: blockers.length === 0,
        mode: "direct",
        blockers,
        repoRoot,
        activeRun: null,
        directRun: direct.record,
        workerScope: null,
        workerScopePath: null,
        ledgerPath: null,
        contextPath: "docs/ai/ACEF_DIRECT_RUN.json",
      };
    }
  }

  const blockers = [];
  if (!active.exists) blockers.push("missing docs/ai/ACEF_ACTIVE_RUN.json");
  if (active.error) blockers.push(active.error);
  const activeRun = active.record;
  if (!activeRun) {
    return {
      ok: false,
      mode: "typed",
      blockers,
      repoRoot,
      activeRun: null,
      directRun: null,
      workerScope: null,
      workerScopePath: null,
      ledgerPath: null,
      contextPath: "docs/ai/ACEF_CURRENT_CONTEXT.md",
    };
  }

  if (!allowedStatuses.has(activeRun.status)) {
    blockers.push(`active run status ${activeRun.status} is not authorized`);
  }
  if (activeRun.executionMigrationRequired) {
    blockers.push("legacy guarded active run requires explicit workflow migration before authorization");
  }

  const ledgerPath = activeRun.ledgerPath
    || readPointer(path.join(repoRoot, "docs", "ai", "ACEF_ACTIVE_LEDGER"));
  if (!ledgerPath) blockers.push("missing active ledger path");
  else if (!exists(path.resolve(repoRoot, ledgerPath))) blockers.push(`active ledger not found: ${ledgerPath}`);

  const activePointer = readPointer(path.join(repoRoot, "docs", "ai", "ACEF_ACTIVE_LEDGER"));
  if (activePointer && ledgerPath && path.normalize(activePointer) !== path.normalize(ledgerPath)) {
    blockers.push(`active ledger pointer ${activePointer} does not match active run ledger ${ledgerPath}`);
  }

  const contextPath = activeRun.contextPath || "docs/ai/ACEF_CURRENT_CONTEXT.md";
  if (options.requireContext !== false && !exists(path.resolve(repoRoot, contextPath))) {
    blockers.push(`current context not found: ${contextPath}`);
  }

  const configuredScopePath = activeRun.workerScopePath || "docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json";
  const scope = loadParsed(
    path.resolve(repoRoot, configuredScopePath),
    parseWorkerScope,
    "invalid worker scope",
  );
  if (scope.error) blockers.push(scope.error);
  if (options.requireWorkerScope === true && !scope.exists) {
    blockers.push(`missing worker scope: ${configuredScopePath}`);
  }
  if (scope.record) {
    if (String(scope.record.activeStory) !== String(activeRun.activeStory)) {
      blockers.push(`worker scope story ${scope.record.activeStory} does not match active run story ${activeRun.activeStory}`);
    }
    if (scope.record.runId && scope.record.runId !== activeRun.runId) {
      blockers.push(`worker scope runId ${scope.record.runId} does not match active run ${activeRun.runId}`);
    }
    if (options.requireScopeRunId === true && !scope.record.runId) {
      blockers.push("worker scope is missing runId binding; regenerate it with acef-state worker-scope");
    }
  }

  return {
    ok: blockers.length === 0,
    mode: "typed",
    blockers,
    repoRoot,
    activeRun,
    directRun: null,
    workerScope: scope.record,
    workerScopePath: scope.exists ? configuredScopePath : null,
    ledgerPath,
    contextPath,
  };
}

module.exports = {
  inspectRunAuthorization,
};

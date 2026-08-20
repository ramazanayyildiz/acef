"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  parseActiveRun,
  parseActorRecord,
  parseDirectRun,
  parseGateVerdict,
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

function finalStoryScopeAtV3EpicClose(activeRun, workerScope) {
  return activeRun?.workflowId === "full-bmad"
    && activeRun.fullFlowContract === "four-actor-v3"
    && activeRun.scopeUnit === "epic"
    && ["closeout", "epic-process-judge"].includes(String(activeRun.activePhase || "").toLowerCase())
    && (activeRun.expectedStories || []).includes(workerScope?.activeStory);
}

function normalizedScope(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizedActorToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function canonicalCapsulePhase(value) {
  const phase = normalizedScope(value);
  const aliases = {
    dev: "development",
    developer: "development",
    review: "codereview",
    reviewer: "codereview",
    codereviewer: "codereview",
    testreview: "patchassurance",
    testreviewer: "patchassurance",
    verifypatch: "patchassurance",
    verifier: "patchassurance",
    storyprocessjudge: "processjudge",
  };
  return aliases[phase] || phase;
}

function capsuleActorId(activeRun, role) {
  const story = normalizedActorToken(activeRun.activeStory);
  const prefix = activeRun.runtimeContract === "capsule-supervisor-v2"
    ? `acef_${normalizedActorToken(activeRun.runId)}_${story}`
    : `acef_${story}`;
  return `${prefix}_${role}`;
}

function capsuleControlPlaneBlockers(repoRoot, activeRun, workerScope) {
  if (!activeRun || activeRun.status !== "active" || activeRun.workflowId !== "full-bmad"
    || activeRun.fullFlowContract !== "four-actor-v3"
    || !["capsule-supervisor-v1", "capsule-supervisor-v2"].includes(activeRun.runtimeContract)
    || activeRun.scopeUnit !== "story") return [];

  const phase = canonicalCapsulePhase(activeRun.activePhase);
  const contracts = {
    atdd: {
      workerRole: "test-author",
      nextAllowedStep: "write_failing_tests",
      actorRole: "test-author",
      actorPhase: "atdd",
      actorId: capsuleActorId(activeRun, "atdd"),
    },
    development: {
      workerRole: "developer",
      nextAllowedStep: "implement_to_green",
      fullLedgerAccess: "denied",
      maxLines: 120,
      actorRole: "developer",
      actorPhase: "development",
      actorId: capsuleActorId(activeRun, "development"),
    },
    atddcorrection: {
      workerRole: "test-author",
      nextAllowedStep: "commit the bounded ATDD correction transition, then follow the supervisor",
      actorRole: "test-author",
      actorPhase: "atdd",
      actorId: capsuleActorId(activeRun, "atdd_correction1"),
      workerPhase: "atddcorrection",
    },
    recoveryreview: {
      workerRole: "process-judge",
      nextAllowedSteps: [
        "dispatch the one canonical recovery Process Judge",
        "commit the exact recovered story-close control package",
        "replan the recovered story before further product writes",
      ],
      fullLedgerAccess: "denied",
      maxLines: 120,
      actorRole: "process-judge",
      actorPhase: "recoveryreview",
      actorId: capsuleActorId(activeRun, "recovery_process_judge"),
      workerPhase: "recoveryreview",
    },
  };
  const contract = contracts[phase];
  if (!contract) return [];

  const failures = [];
  if (activeRun.workerRole !== contract.workerRole) {
    failures.push(`capsule-supervisor ${activeRun.activePhase} phase requires workerRole ${contract.workerRole}, got ${activeRun.workerRole ?? "null"}`);
  }
  const expectedNextSteps = contract.nextAllowedSteps || [contract.nextAllowedStep];
  if (!expectedNextSteps.includes(activeRun.nextAllowedStep)) {
    failures.push(`capsule-supervisor ${activeRun.activePhase} phase requires nextAllowedStep ${expectedNextSteps.join(" or ")}, got ${activeRun.nextAllowedStep ?? "null"}`);
  }
  if (contract.fullLedgerAccess !== undefined && activeRun.fullLedgerAccess !== contract.fullLedgerAccess) {
    failures.push(`capsule-supervisor ${activeRun.activePhase} phase requires fullLedgerAccess ${contract.fullLedgerAccess}, got ${activeRun.fullLedgerAccess ?? "null"}`);
  }
  if (contract.maxLines !== undefined && activeRun.maxLines !== contract.maxLines) {
    failures.push(`capsule-supervisor ${activeRun.activePhase} phase requires maxLines ${contract.maxLines}, got ${activeRun.maxLines ?? "null"}`);
  }
  if (!workerScope) {
    failures.push(`capsule-supervisor ${activeRun.activePhase} phase requires its canonical worker scope`);
  } else {
    const expectedWorkerPhase = contract.workerPhase || contract.actorPhase;
    if (canonicalCapsulePhase(workerScope.phase) !== expectedWorkerPhase) {
      failures.push(`capsule-supervisor worker scope phase ${workerScope.phase} does not match canonical phase ${activeRun.activePhase}`);
    }
    if (workerScope.workerId !== contract.actorId) {
      failures.push(`capsule-supervisor worker scope workerId ${workerScope.workerId} does not match canonical ${activeRun.activePhase} actor ${contract.actorId}`);
    }
  }

  // A null actor is the valid pre-dispatch state. Once bound, it must be the
  // one canonical identity for this run/story/phase and its typed actor record
  // must agree with that identity.
  if (activeRun.activeActorId !== null && activeRun.activeActorId !== undefined) {
    if (activeRun.activeActorId !== contract.actorId) {
      failures.push(`capsule-supervisor activeActorId ${activeRun.activeActorId} does not match canonical ${activeRun.activePhase} actor ${contract.actorId}`);
    } else {
      const actorPath = path.join(repoRoot, "docs", "ai", "actors", `${activeRun.activeActorId}.json`);
      const parsedActor = loadParsed(actorPath, parseActorRecord, "invalid active capsule actor");
      if (!parsedActor.exists) failures.push(`active capsule actor not found: docs/ai/actors/${activeRun.activeActorId}.json`);
      if (parsedActor.error) failures.push(parsedActor.error);
      if (parsedActor.record) {
        const actor = parsedActor.record;
        if (actor.actorInstanceId !== activeRun.activeActorId
          || actor.runId !== activeRun.runId
          || actor.fullFlowContract !== activeRun.fullFlowContract
          || normalizedScope(actor.story) !== normalizedScope(activeRun.activeStory)
          || canonicalCapsulePhase(actor.phase) !== contract.actorPhase
          || actor.role !== contract.actorRole) {
          failures.push(`active capsule actor record does not match the canonical ${activeRun.activePhase} role identity`);
        }
      }
    }
  }
  return failures.length
    ? [`capsule-supervisor control-plane drift: ${failures.join("; ")}; recover the active run before writes`]
    : [];
}

function workerTestPath(filePath) {
  return /(^|\/)(__tests__|tests?|specs?)(\/|$)|(\.|-)(test|spec)\.[cm]?[jt]sx?$|Test\.(php|py|rb|cs)$/i.test(String(filePath || ""));
}

function workerControlPath(filePath) {
  const normalized = String(filePath || "").replaceAll("\\", "/");
  return /^(?:\.acef|\.(?:agents|claude|cline|codex|cursor|gemini|goose|kiro|mymir|opencode|qoder|qwen|roo|windsurf)|_bmad(?:-output)?|docs)(?:\/|$)/.test(normalized);
}

function capsuleWorkerScopeBlockers(activeRun, workerScope) {
  if (!workerScope || !["capsule-supervisor-v1", "capsule-supervisor-v2"].includes(activeRun?.runtimeContract)
    || activeRun.scopeUnit !== "story" || activeRun.status !== "active") return [];
  const failures = [];
  const recoveryReview = normalizedScope(activeRun.activePhase) === "recoveryreview"
    && normalizedScope(workerScope.phase) === "recoveryreview";
  if (!recoveryReview && (!Array.isArray(workerScope.allowedCommands) || !workerScope.allowedCommands.length)) {
    failures.push("capsule-supervisor story worker scope is missing exact allowedCommands; regenerate it with --allow-command");
  }
  if (normalizedScope(activeRun.activePhase) === "atdd" && normalizedScope(workerScope.phase) === "atdd") {
    const paths = workerScope.allowedPaths || [];
    const hasTestPath = paths.some(workerTestPath);
    const hasImplementationPath = paths.some((filePath) => !workerTestPath(filePath)
      && !workerControlPath(filePath));
    if (!hasTestPath || !hasImplementationPath) {
      failures.push("capsule-supervisor ATDD worker scope requires a test path and a non-control implementation path");
    }
  }
  return failures;
}

function completedCapsuleTerminalBlockers(repoRoot, activeRun, contextPath) {
  if (!["capsule-supervisor-v1", "capsule-supervisor-v2"].includes(activeRun?.runtimeContract)
    || activeRun.status !== "complete") return [];
  const blockers = [];
  const gatePath = path.join(repoRoot, "docs", "ai", "gates", `${activeRun.terminalGateId}.json`);
  const parsedGate = loadParsed(gatePath, parseGateVerdict, "invalid terminal Epic gate");
  if (!parsedGate.exists) blockers.push(`terminal Epic gate not found: docs/ai/gates/${activeRun.terminalGateId}.json`);
  if (parsedGate.error) blockers.push(parsedGate.error);
  if (parsedGate.record) {
    const gate = parsedGate.record;
    if (gate.gateId !== activeRun.terminalGateId
      || gate.gateType !== "actor-decided-v1"
      || gate.decisionMode !== "actor"
      || gate.runId !== activeRun.runId
      || gate.fullFlowContract !== activeRun.fullFlowContract
      || normalizedScope(gate.scope) !== normalizedScope(activeRun.activeStory)
      || gate.decidedBy !== activeRun.activeActorId
      || gate.verdict !== activeRun.terminalDisposition
      || JSON.stringify(gate.storyInventory) !== JSON.stringify(activeRun.expectedStories)) {
      blockers.push("completed Epic state does not match its bound actor-decided terminal gate");
    }
  }
  const actorPath = path.join(repoRoot, "docs", "ai", "actors", `${activeRun.activeActorId}.json`);
  const parsedActor = loadParsed(actorPath, parseActorRecord, "invalid terminal Epic Judge actor");
  if (!parsedActor.exists) blockers.push(`terminal Epic Judge actor not found: docs/ai/actors/${activeRun.activeActorId}.json`);
  if (parsedActor.error) blockers.push(parsedActor.error);
  if (parsedActor.record) {
    const actor = parsedActor.record;
    if (actor.actorInstanceId !== activeRun.activeActorId
      || actor.runId !== activeRun.runId
      || actor.fullFlowContract !== activeRun.fullFlowContract
      || normalizedScope(actor.story) !== normalizedScope(activeRun.activeStory)
      || JSON.stringify(actor.storyInventory) !== JSON.stringify(activeRun.expectedStories)
      || actor.role !== "process-judge"
      || actor.phase !== "epic-process-judge") {
      blockers.push("completed Epic state does not match its bound Epic Process Judge actor");
    }
  }
  const absoluteContextPath = path.resolve(repoRoot, contextPath);
  if (exists(absoluteContextPath)) {
    const context = fs.readFileSync(absoluteContextPath, "utf8");
    const lines = context.split(/\r?\n/);
    const requiredBindings = [
      ["- Run:", `- Run: \`${activeRun.runId}\``],
      ["- Scope unit:", "- Scope unit: `epic`"],
      ["- Active story:", `- Active story: \`${activeRun.activeStory}\``],
      ["- Active phase:", "- Active phase: `closeout`"],
      ["- Terminal disposition:", `- Terminal disposition: \`${activeRun.terminalDisposition}\``],
    ];
    if (requiredBindings.some(([prefix, expected]) => {
      const matching = lines.filter((line) => line.startsWith(prefix));
      return matching.length !== 1 || matching[0] !== expected;
    })) {
      blockers.push("Current Context does not match the completed Epic terminal state");
    }
  }
  return blockers;
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
  blockers.push(...completedCapsuleTerminalBlockers(repoRoot, activeRun, contextPath));

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
    const allowedFinalStoryScope = options.allowFinalStoryScopeAtV3EpicClose === true
      && finalStoryScopeAtV3EpicClose(activeRun, scope.record);
    if (String(scope.record.activeStory) !== String(activeRun.activeStory) && !allowedFinalStoryScope) {
      blockers.push(`worker scope story ${scope.record.activeStory} does not match active run story ${activeRun.activeStory}`);
    }
    if (scope.record.runId && scope.record.runId !== activeRun.runId) {
      blockers.push(`worker scope runId ${scope.record.runId} does not match active run ${activeRun.runId}`);
    }
    if (options.requireScopeRunId === true && !scope.record.runId) {
      blockers.push("worker scope is missing runId binding; regenerate it with acef-state worker-scope");
    }
    blockers.push(...capsuleWorkerScopeBlockers(activeRun, scope.record));
  }
  blockers.push(...capsuleControlPlaneBlockers(repoRoot, activeRun, scope.record));

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
  capsuleControlPlaneBlockers,
  completedCapsuleTerminalBlockers,
  finalStoryScopeAtV3EpicClose,
  inspectRunAuthorization,
};

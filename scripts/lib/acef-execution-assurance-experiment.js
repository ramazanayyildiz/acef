"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const TREATMENTS = Object.freeze(["legacy", "candidate", "repo-native"]);
const WORKFLOWS = Object.freeze(["quick-fix", "lightweight", "full-bmad", "repo-native"]);
const ASSURANCE_PROFILES = Object.freeze(["baseline", "guarded", "not-applicable"]);
const ACTOR_CONTRACT_VERSIONS = Object.freeze(["six-actor-v2", "four-actor-v3"]);

function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : String(value || "");
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
}

function unique(values) {
  return [...new Set(values)];
}

function actorContractVersionForAttempt(manifest, attempt) {
  const version = attempt.actorContractVersion
    || manifest.treatments?.[attempt.treatment]?.actorContractVersion
    || manifest.actorContractVersion
    || "six-actor-v2";
  if (!ACTOR_CONTRACT_VERSIONS.includes(version)) {
    throw new Error(`${attempt.id || "attempt"}.actorContractVersion is invalid`);
  }
  return version;
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
  const repairPair = manifest.pilot?.design === "matched-p0-repair-pair";
  const v3Candidate = manifest.pilot?.design === "single-p0-v3-candidate";
  const expectedAttemptCount = repairPair ? 2 : (v3Candidate ? 1 : 16);
  if (!Array.isArray(manifest.pilot?.attempts) || manifest.pilot.attempts.length !== expectedAttemptCount) {
    throw new Error(`pilot must preregister exactly ${expectedAttemptCount} attempts`);
  }
  if (repairPair) {
    requireString(manifest.parentExperimentId, "parentExperimentId");
    requireString(manifest.repairBasis, "repairBasis");
    const treatments = [...new Set(manifest.pilot.attempts.map((attempt) => attempt.treatment))].sort();
    if (JSON.stringify(treatments) !== JSON.stringify(["candidate", "legacy"])) {
      throw new Error("matched P0 repair pair must contain exactly one legacy and one candidate attempt");
    }
    const taskIds = unique(manifest.pilot.attempts.map((attempt) => attempt.taskId));
    if (taskIds.length !== 1) throw new Error("matched P0 repair pair must use one identical task");
    if (manifest.pilot.attempts.some((attempt) => attempt.workflowId !== "full-bmad" || attempt.assuranceProfile !== "guarded")) {
      throw new Error("matched P0 repair pair must use full-bmad with guarded assurance in both arms");
    }
    const gates = manifest.promotionGates || {};
    if (gates.product?.allStoriesComplete !== true || gates.product?.blindJudge !== "PASS"
      || gates.product?.maximumCritical !== 0 || gates.product?.maximumHigh !== 0) {
      throw new Error("matched P0 repair pair must freeze the product PASS and zero Critical/High gate");
    }
    if (gates.process?.automatedOracle !== "PASS" || gates.process?.epicProcessJudgeCount !== 1
      || gates.process?.maximumScopePhaseResultViolations !== 0 || gates.process?.maximumDuplicateLifecycles !== 0
      || gates.process?.maximumCloseoutCreatedMandatoryChains !== 0) {
      throw new Error("matched P0 repair pair must freeze the process gate");
    }
    if (gates.budget?.maximumVerifyPatchRetriesPerStory !== 1 || gates.budget?.maximumAtddCorrectionsPerStory !== 1
      || gates.budget?.secondFailureDisposition !== "REPLAN_SPLIT") {
      throw new Error("matched P0 repair pair must freeze bounded retry/correction budgets");
    }
    if (gates.reachability?.mandatoryThresholdsRemainSatisfiable !== true
      || gates.reachability?.inventoryFrozenBeforeExecution !== true) {
      throw new Error("matched P0 repair pair must freeze reachability gates");
    }
    if (gates.costAfterProductPass?.maximumActiveDeliverySeconds !== 13100
      || gates.costAfterProductPass?.maximumInputTokens !== 52000000
      || gates.costAfterProductPass?.maximumToolCalls !== 424
      || gates.costAfterProductPass?.failFastCannotWin !== true
      || gates.passingDisposition !== "controlled-canary-only") {
      throw new Error("matched P0 repair pair must freeze cost gates and canary-only disposition");
    }
  }
  if (v3Candidate) {
    const [attempt] = manifest.pilot.attempts;
    if (attempt.treatment !== "candidate" || attempt.workflowId !== "full-bmad" || attempt.assuranceProfile !== "guarded") {
      throw new Error("v3 P0 candidate must use candidate/full-bmad/guarded");
    }
    if (actorContractVersionForAttempt(manifest, attempt) !== "four-actor-v3") {
      throw new Error("v3 P0 candidate must use four-actor-v3");
    }
    const process = manifest.promotionGates?.process || {};
    if (process.deterministicStoryClose !== true || process.conditionalStoryProcessJudge !== true
      || process.epicProcessJudgeCount !== 1 || process.maximumBroadSuiteInvocations !== 1
      || process.oneFormalStoryCloseEvidencePackage !== true) {
      throw new Error("v3 P0 candidate must freeze deterministic story close and one epic closeout");
    }
    const judgment = manifest.judgmentContract || {};
    if (judgment.schema !== "acef.execution-assurance-pilot-judgment.v3" || judgment.appendOnly !== true
      || judgment.immutableDerivedVerdict !== true || judgment.pendingMayBeSupersededByNewPacket !== true
      || judgment.terminalVerdictsImmutable !== true
      || JSON.stringify(judgment.keyFields) !== JSON.stringify(["experimentId", "attemptId", "attemptRunId", "attemptOrdinal", "diffSha256", "judgePacketId", "judgePacketSha256"])) {
      throw new Error("v3 P0 candidate must freeze append-only judgment and immutable verdict binding");
    }
    const budget = manifest.promotionGates?.budget || {};
    const budgetProfile = budget.profileId || "v3-preregistered";
    const expectedBudget = budgetProfile === "v3-preregistered"
      ? { maximumActorInvocations: 21, maximumInputTokens: 36000000, maximumToolCalls: 300,
        maximumHarnessWaitSeconds: 1200, maximumHarnessWaitShare: 0.25 }
      : budgetProfile === "v31-empirical"
        ? { maximumActorInvocations: 21, maximumInputTokens: 50000000, maximumToolCalls: 520,
          maximumHarnessWaitSeconds: 2700, maximumHarnessWaitShare: 0.38 }
        : budgetProfile === "v32-empirical"
          ? { maximumActorInvocations: 25, maximumInputTokens: 50000000, maximumToolCalls: 520,
            maximumHarnessWaitSeconds: 2700, maximumHarnessWaitShare: 0.38 }
          : budgetProfile === "v33-measured"
            ? { maximumActorInvocations: 25, maximumInputTokens: 50000000, maximumToolCalls: 520,
              maximumHarnessWaitSeconds: 2700, maximumHarnessWaitShare: 0.38 }
            : budgetProfile === "capsule-supervisor-v1"
              ? { maximumActorInvocations: 25, maximumInputTokens: 18000000, maximumModelCycles: 220,
                maximumToolCalls: 240, maximumHarnessWaitSeconds: 300, maximumHarnessWaitShare: 0.05,
                targetStoryActiveSeconds: 900, maximumStoryActiveSeconds: 1200,
                targetActiveDeliverySeconds: 3600, maximumActiveDeliverySeconds: 4500 }
            : budgetProfile === "capsule-supervisor-v1-measured-v325"
              ? { maximumActorInvocations: 25, maximumInputTokens: 18000000, maximumModelCycles: 220,
                maximumToolCalls: 320, maximumHarnessWaitSeconds: 300, maximumHarnessWaitShare: 0.05,
                targetStoryActiveSeconds: 900, maximumStoryActiveSeconds: 1200,
                targetActiveDeliverySeconds: 3600, maximumActiveDeliverySeconds: 4500 }
          : null;
    if (!expectedBudget) {
      throw new Error("v3 P0 candidate budget.profileId is not recognized");
    }
    if (budget.baseActorCount !== 17 || budget.maximumActorInvocations !== expectedBudget.maximumActorInvocations
      || budget.maximumRepairCyclesPerStory !== 2 || budget.thirdRepairDisposition !== "REPLAN_SPLIT"
      || budget.maximumInfrastructureRetriesPerInvocation !== 1 || budget.maximumInfrastructureRetriesTotal !== 3
      || budget.maximumInputTokens !== expectedBudget.maximumInputTokens
      || (expectedBudget.maximumModelCycles !== undefined && budget.maximumModelCycles !== expectedBudget.maximumModelCycles)
      || budget.maximumToolCalls !== expectedBudget.maximumToolCalls
      || budget.targetStoryActiveSeconds !== (expectedBudget.targetStoryActiveSeconds || 2100)
      || budget.maximumStoryActiveSeconds !== (expectedBudget.maximumStoryActiveSeconds || 3000)
      || budget.targetActiveDeliverySeconds !== (expectedBudget.targetActiveDeliverySeconds || 9000)
      || budget.maximumActiveDeliverySeconds !== (expectedBudget.maximumActiveDeliverySeconds || 10800)
      || budget.maximumHarnessWaitSeconds !== expectedBudget.maximumHarnessWaitSeconds
      || budget.maximumHarnessWaitShare !== expectedBudget.maximumHarnessWaitShare) {
      throw new Error("v3 P0 candidate must freeze actor, repair, time, token, tool, and harness-wait budgets");
    }
    if (["capsule-supervisor-v1", "capsule-supervisor-v1-measured-v325"].includes(budgetProfile)) {
      if (manifest.runtimeContract !== "capsule-supervisor-v1") {
        throw new Error("capsule supervisor budget requires runtimeContract=capsule-supervisor-v1");
      }
      if (attempt.runtimeContract !== "capsule-supervisor-v1") {
        throw new Error("capsule supervisor attempt must bind runtimeContract=capsule-supervisor-v1");
      }
      const requiredProfiles = ["atdd", "development", "code-review", "patch-assurance", "process-judge", "epic-process-judge"];
      for (const role of requiredProfiles) {
        const profile = manifest.actorRuntimeProfiles?.[role];
        if (!profile || profile.model !== "gpt-5.6-sol" || profile.reasoningEffort !== "high") {
          throw new Error(`capsule supervisor requires actorRuntimeProfiles.${role}=gpt-5.6-sol/high`);
        }
      }
    }
    if (attempt.activeTimeCapMinutes * 60 !== budget.maximumActiveDeliverySeconds) {
      throw new Error("v3 P0 candidate active cap must equal its hard active-delivery budget");
    }
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
    actorContractVersionForAttempt(manifest, attempt);
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
  patchAssurance: /\b(?:patch-assurance|patch assurance)\b/gi,
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
  const lifecycleControls = ["readiness", "atdd", "development", "codeReview", "patchAssurance", "verifyPatch", "testReview", "processJudge"];
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
  const lifecycleControls = ["atdd", "development", "code-review", "patch-assurance", "verify-patch", "test-review", "process-judge"];
  const scopeIds = unique((options.scopeIds || []).map(String).filter(Boolean));
  const requiredControlsPerScope = options.requiredControlsPerScope || [];
  const maximumRetryOrdinal = Number(options.maximumRetryOrdinal || 1);
  const globalRepairCycles = options.globalRepairCycles === true;
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
    .filter((controlId) => {
      if (counts[controlId] <= 1) return false;
      const retries = (dispatches || []).filter((entry) => entry.scope === scopeId && entry.control === controlId).slice(1);
      if (globalRepairCycles && ["code-review", "patch-assurance"].includes(controlId)) {
        const ordinals = retries.map((entry) => Number(entry.retryOrdinal || 0));
        return !(retries.every((entry) => entry.retryable === true)
          && new Set(ordinals).size === ordinals.length
          && ordinals.every((ordinal) => ordinal >= 1 && ordinal <= maximumRetryOrdinal));
      }
      return !retries.every((entry, index) => entry.retryable === true
        && entry.retryOrdinal === index + 1 && entry.retryOrdinal <= maximumRetryOrdinal);
    })
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

function validatePilotJudgment(judgment, attempt, manifest) {
  if (!judgment || typeof judgment !== "object" || Array.isArray(judgment)) throw new Error("judgment must be an object");
  if (judgment.schema !== "acef.execution-assurance-pilot-judgment.v3") {
    throw new Error("judgment schema must be acef.execution-assurance-pilot-judgment.v3");
  }
  for (const field of ["experimentId", "attemptId", "attemptRunId", "diffSha256", "judgePacketId", "judgePacketSha256",
    "judgeModel", "judgeReceiptPath", "judgeReceiptSha256", "judgeSessionId", "productDoneReceiptSha256", "judgedAt"]) {
    requireString(judgment[field], `judgment.${field}`);
  }
  if (!Number.isInteger(judgment.attemptOrdinal) || judgment.attemptOrdinal < 1) {
    throw new Error("judgment.attemptOrdinal must be a positive integer");
  }
  for (const field of ["diffSha256", "judgePacketSha256", "judgeReceiptSha256", "productDoneReceiptSha256"]) {
    if (!/^[a-f0-9]{64}$/.test(judgment[field])) throw new Error(`judgment.${field} must be a lowercase sha256`);
  }
  if (!["PENDING", "PASS", "FAIL"].includes(judgment.verdict)) throw new Error("judgment.verdict is invalid");
  if (judgment.treatmentBlinded !== true || judgment.transcriptWithheld !== true) {
    throw new Error("judgment must be treatment-blinded with transcript withheld");
  }
  if (typeof judgment.scopeViolation !== "boolean" || typeof judgment.testWeakening !== "boolean") {
    throw new Error("judgment scopeViolation and testWeakening must be boolean");
  }
  if (typeof judgment.productOutcomeComplete !== "boolean") throw new Error("judgment.productOutcomeComplete must be boolean");
  if (!Array.isArray(judgment.findings)) throw new Error("judgment.findings must be an array");
  const findingIds = new Set();
  for (const [index, finding] of judgment.findings.entries()) {
    if (!finding || typeof finding !== "object" || Array.isArray(finding)) throw new Error(`judgment.findings[${index}] must be an object`);
    requireString(finding.id, `judgment.findings[${index}].id`);
    if (findingIds.has(finding.id)) throw new Error(`judgment finding id is duplicated: ${finding.id}`);
    findingIds.add(finding.id);
    if (!["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(finding.severity)) {
      throw new Error(`judgment.findings[${index}].severity is invalid`);
    }
  }
  if (!Number.isFinite(Date.parse(judgment.judgedAt))) throw new Error("judgment.judgedAt must be an ISO timestamp");
  if (Object.prototype.hasOwnProperty.call(judgment, "productDoneAt")) throw new Error("judgment must not self-attest productDoneAt");
  if (judgment.experimentId !== manifest.experimentId || judgment.experimentId !== attempt.experimentId) {
    throw new Error("judgment experimentId does not match manifest and attempt");
  }
  for (const field of ["attemptId", "attemptRunId", "attemptOrdinal", "diffSha256"]) {
    if (judgment[field] !== attempt[field]) throw new Error(`judgment ${field} does not match immutable attempt`);
  }
  if (judgment.judgePacketSha256 !== attempt.judgePacketSha256) throw new Error("judgment judgePacketSha256 does not match immutable attempt");
  if (!fs.existsSync(attempt.judgePacketPath) || sha256(fs.readFileSync(attempt.judgePacketPath, "utf8")) !== attempt.judgePacketSha256) {
    throw new Error("immutable artifact-only judge packet is missing or changed");
  }
  const judgePacket = JSON.parse(fs.readFileSync(attempt.judgePacketPath, "utf8"));
  if (judgePacket.schema !== "acef.execution-assurance-judge-packet.v1" || judgePacket.artifactOnly !== true
    || judgePacket.treatmentDisclosed !== false || judgePacket.transcriptIncluded !== false
    || judgePacket.experimentId !== attempt.experimentId || judgePacket.attemptId !== attempt.attemptId
    || judgePacket.attemptRunId !== attempt.attemptRunId || judgePacket.attemptOrdinal !== attempt.attemptOrdinal) {
    throw new Error("immutable judge packet identity or blindness contract is invalid");
  }
  const productContractSha256 = sha256(JSON.stringify(judgePacket.productContract));
  const contractStoryInventory = (judgePacket.productContract?.stories || []).map((story) => story.id);
  if (judgePacket.productContract?.schema !== "acef.execution-assurance-product-contract.v1"
    || judgePacket.productContractSha256 !== productContractSha256
    || judgePacket.productContractSha256 !== attempt.productContractSha256
    || judgePacket.withheldOracleSha256 !== attempt.withheldOracleSha256
    || JSON.stringify(judgePacket.storyInventory || []) !== JSON.stringify(attempt.storyInventory || [])
    || JSON.stringify(contractStoryInventory) !== JSON.stringify(attempt.storyInventory || [])) {
    throw new Error("judge packet frozen product contract or withheld-oracle binding is invalid");
  }
  if (!judgePacket.diff || judgePacket.diff.path !== attempt.diffPath || judgePacket.diff.sha256 !== attempt.diffSha256
    || !fs.existsSync(judgePacket.diff.path) || sha256(fs.readFileSync(judgePacket.diff.path, "utf8")) !== attempt.diffSha256) {
    throw new Error("judge packet referenced diff artifact is missing, changed, or does not match the immutable attempt");
  }
  const allowedProductPaths = new Set((judgePacket.productContract.stories || []).flatMap((story) => [
    ...(story.allowedPaths || []),
    ...(story.testPaths || []),
  ]));
  const diffPaths = fs.readFileSync(judgePacket.diff.path, "utf8").split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    return match ? [match[1], match[2]] : [];
  });
  if (!Array.isArray(judgePacket.changedPaths)
    || judgePacket.changedPaths.some((entry) => isPilotHarnessPath(entry) || !allowedProductPaths.has(entry))
    || diffPaths.some((entry) => isPilotHarnessPath(entry) || !allowedProductPaths.has(entry))) {
    throw new Error("judge packet leaks treatment/control artifacts outside the frozen product contract");
  }
  const expectedInputBundleSha256 = sha256(JSON.stringify({
    productContractSha256: judgePacket.productContractSha256,
    withheldOracleSha256: judgePacket.withheldOracleSha256,
    productDiffSha256: judgePacket.diff.sha256,
    productChangedPaths: judgePacket.changedPaths,
    verificationReceiptSha256: judgePacket.verification?.receiptSha256,
    verificationStdoutSha256: judgePacket.verification?.stdoutSha256,
    verificationStderrSha256: judgePacket.verification?.stderrSha256,
  }));
  if (judgePacket.inputBundleSha256 !== expectedInputBundleSha256
    || judgePacket.inputBundleSha256 !== attempt.judgeInputBundleSha256) {
    throw new Error("judge packet input bundle hash is invalid");
  }
  if (judgment.productDoneReceiptSha256 !== attempt.productDoneReceiptSha256) {
    throw new Error("judgment productDoneReceiptSha256 does not match immutable attempt");
  }
  if (!fs.existsSync(attempt.productDoneReceiptPath)
    || sha256(fs.readFileSync(attempt.productDoneReceiptPath, "utf8")) !== attempt.productDoneReceiptSha256) {
    throw new Error("harness product-done receipt is missing or changed");
  }
  const productReceipt = JSON.parse(fs.readFileSync(attempt.productDoneReceiptPath, "utf8"));
  const receiptFinishedAt = productReceipt.finishedAt;
  const productDoneAt = attempt.harnessProductDoneAt;
  if (!Number.isFinite(Date.parse(receiptFinishedAt))
    || (productDoneAt !== null && productDoneAt !== receiptFinishedAt)
    || Date.parse(receiptFinishedAt) < Date.parse(attempt.startedAt) || Date.parse(receiptFinishedAt) > Date.parse(attempt.finishedAt)) {
    throw new Error("harness productDoneAt is outside the immutable attempt interval");
  }
  if (!fs.existsSync(judgment.judgeReceiptPath)
    || sha256(fs.readFileSync(judgment.judgeReceiptPath, "utf8")) !== judgment.judgeReceiptSha256) {
    throw new Error("judge receipt is missing or changed");
  }
  const judgeReceipt = JSON.parse(fs.readFileSync(judgment.judgeReceiptPath, "utf8"));
  for (const field of ["experimentId", "attemptRunId", "judgePacketSha256", "inputBundleSha256", "productContractSha256",
    "judgeSessionId", "sessionTranscriptPath", "sessionTranscriptSha256", "judgeModel", "reasoningEffort",
    "clientPath", "clientBinarySha256", "clientVersion", "requestPath", "requestSha256", "actorReceiptPath",
    "actorReceiptSha256", "promptSha256", "startedAt", "finishedAt"]) {
    requireString(judgeReceipt[field], `judge receipt.${field}`);
  }
  if (judgeReceipt.schema !== "acef.execution-assurance-judge-receipt.v1"
    || judgeReceipt.experimentId !== attempt.experimentId || judgeReceipt.attemptRunId !== attempt.attemptRunId
    || judgeReceipt.judgePacketSha256 !== attempt.judgePacketSha256 || judgeReceipt.judgeSessionId !== judgment.judgeSessionId
    || judgeReceipt.inputBundleSha256 !== attempt.judgeInputBundleSha256
    || judgeReceipt.productContractSha256 !== attempt.productContractSha256
    || judgeReceipt.judgeModel !== manifest.pilotRuntime.model || judgment.judgeModel !== manifest.pilotRuntime.model
    || judgeReceipt.reasoningEffort !== manifest.pilotRuntime.reasoningEffort
    || judgeReceipt.freshSession !== true || judgeReceipt.artifactOnly !== true || judgeReceipt.treatmentBlinded !== true
    || judgeReceipt.transcriptWithheld !== true || judgeReceipt.crossRunMemory !== false || judgeReceipt.parentSessionId !== null) {
    throw new Error("judge receipt provenance is not fresh, artifact-only, and blinded");
  }
  const judgeRoot = fs.realpathSync(attempt.judgeLaunchRoot);
  const receiptReal = fs.realpathSync(judgment.judgeReceiptPath);
  if (path.relative(judgeRoot, receiptReal).startsWith("..") || path.isAbsolute(path.relative(judgeRoot, receiptReal))) {
    throw new Error("judge receipt was not created inside the harness-owned launch root");
  }
  if (!fs.existsSync(judgeReceipt.requestPath) || sha256(fs.readFileSync(judgeReceipt.requestPath, "utf8")) !== judgeReceipt.requestSha256
    || !fs.existsSync(judgeReceipt.actorReceiptPath) || sha256(fs.readFileSync(judgeReceipt.actorReceiptPath, "utf8")) !== judgeReceipt.actorReceiptSha256) {
    throw new Error("judge launch request or actor receipt is missing or changed");
  }
  const judgeRequest = JSON.parse(fs.readFileSync(judgeReceipt.requestPath, "utf8"));
  const judgeActorReceipt = JSON.parse(fs.readFileSync(judgeReceipt.actorReceiptPath, "utf8"));
  if (!fs.existsSync(judgeReceipt.clientPath) || sha256(fs.readFileSync(judgeReceipt.clientPath)) !== judgeReceipt.clientBinarySha256
    || judgeReceipt.clientVersion !== manifest.pilotRuntime.clientVersion || judgeRequest.command !== judgeReceipt.clientPath
    || fs.realpathSync(judgeRequest.cwd) !== path.dirname(receiptReal)
    || sha256(String(judgeRequest.args?.at(-1) || "")) !== judgeReceipt.promptSha256
    || !judgeRequest.args?.includes(manifest.pilotRuntime.model)
    || !judgeRequest.args?.includes(`model_reasoning_effort=${JSON.stringify(manifest.pilotRuntime.reasoningEffort)}`)
    || judgeActorReceipt.status !== 0 || judgeActorReceipt.requestSha256 !== judgeReceipt.requestSha256
    || judgeActorReceipt.launchNonce !== judgeRequest.launchNonce) {
    throw new Error("judge receipt is not bound to the pinned client/model/reasoning launch");
  }
  if (!Number.isFinite(Date.parse(judgeReceipt.startedAt)) || !Number.isFinite(Date.parse(judgeReceipt.finishedAt))
    || Date.parse(judgeReceipt.startedAt) < Date.parse(attempt.finishedAt)
    || Date.parse(judgeReceipt.finishedAt) < Date.parse(judgeReceipt.startedAt)
    || Date.parse(judgeReceipt.finishedAt) > Date.parse(judgment.judgedAt)) {
    throw new Error("judge receipt timestamps are invalid");
  }
  if (!fs.existsSync(judgeReceipt.sessionTranscriptPath)
    || sha256(fs.readFileSync(judgeReceipt.sessionTranscriptPath, "utf8")) !== judgeReceipt.sessionTranscriptSha256) {
    throw new Error("judge session transcript is missing or changed");
  }
  const judgeSessionRows = fs.readFileSync(judgeReceipt.sessionTranscriptPath, "utf8").split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
  const judgeSessionMeta = judgeSessionRows.find((row) => row.type === "session_meta")?.payload;
  if (!judgeSessionMeta || (judgeSessionMeta.id || judgeSessionMeta.session_id) !== judgment.judgeSessionId
    || judgeSessionMeta.parent_thread_id || judgeSessionMeta.cwd !== judgeRequest.cwd
    || judgeSessionMeta.cli_version !== judgeReceipt.clientVersion.replace(/^codex-cli\s+/, "")) {
    throw new Error("judge session transcript provenance mismatch");
  }
  const finalAnswers = judgeSessionRows.flatMap((row) => {
    const payload = row.payload || {};
    if (row.type === "event_msg" && payload.type === "agent_message" && payload.phase === "final_answer") {
      return [{ text: String(payload.message || ""), timestamp: row.timestamp || null }];
    }
    if (row.type === "response_item" && payload.type === "agent_message") {
      const text = Array.isArray(payload.content)
        ? payload.content.map((entry) => entry.text || entry.output_text || "").join("\n") : String(payload.text || "");
      return /Message Type:\s*FINAL_ANSWER/i.test(text) ? [{ text, timestamp: row.timestamp || null }] : [];
    }
    if (row.type === "response_item" && payload.type === "message" && payload.role === "assistant") {
      const text = Array.isArray(payload.content)
        ? payload.content.map((entry) => entry.text || entry.output_text || "").join("\n") : "";
      return text ? [{ text, timestamp: row.timestamp || null }] : [];
    }
    return [];
  }).filter((entry) => /\bJUDGE_VERDICT=(?:PENDING|PASS|FAIL)\b/.test(entry.text));
  if (!finalAnswers.length) throw new Error("judge session transcript lacks a bound final Judge answer");
  const judgeFinal = finalAnswers.at(-1);
  const expectedFindingsSha256 = sha256(JSON.stringify(judgment.findings));
  const expectedMarkers = [
    `JUDGE_PACKET_SHA256=${attempt.judgePacketSha256}`,
    `JUDGE_INPUT_BUNDLE_SHA256=${attempt.judgeInputBundleSha256}`,
    `PRODUCT_CONTRACT_SHA256=${attempt.productContractSha256}`,
    `JUDGE_VERDICT=${judgment.verdict}`,
    `PRODUCT_OUTCOME_COMPLETE=${judgment.productOutcomeComplete}`,
    `SCOPE_VIOLATION=${judgment.scopeViolation}`,
    `TEST_WEAKENING=${judgment.testWeakening}`,
    `FINDINGS_SHA256=${expectedFindingsSha256}`,
  ];
  if (!expectedMarkers.every((marker) => judgeFinal.text.includes(marker))) {
    throw new Error("judge session final answer does not match the ingested verdict and findings");
  }
  if (!Number.isFinite(Date.parse(judgeFinal.timestamp))
    || Date.parse(judgeFinal.timestamp) < Date.parse(judgeReceipt.startedAt)
    || Date.parse(judgeFinal.timestamp) > Date.parse(judgeReceipt.finishedAt)) {
    throw new Error("judge session final answer timestamp is outside its bound receipt");
  }
  const critical = judgment.findings.filter((entry) => entry.severity === "CRITICAL").length;
  const high = judgment.findings.filter((entry) => entry.severity === "HIGH").length;
  if (judgment.verdict === "PASS") {
    if (!judgment.productOutcomeComplete || !productDoneAt) throw new Error("PASS judgment requires completed product outcome and harness productDoneAt");
    if (critical > Number(manifest.promotionGates?.product?.maximumCritical || 0)
      || high > Number(manifest.promotionGates?.product?.maximumHigh || 0)) {
      throw new Error("PASS judgment exceeds the frozen Critical/High finding gate");
    }
    if (judgment.scopeViolation || judgment.testWeakening) throw new Error("PASS judgment cannot accept scope violation or test weakening");
  } else if (judgment.productOutcomeComplete) {
    throw new Error(`${judgment.verdict} judgment cannot declare product complete`);
  }
  return judgment;
}

function derivePilotVerdict(manifest, attempt, judgment) {
  validatePilotJudgment(judgment, attempt, manifest);
  const findingCounts = Object.fromEntries(["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((severity) => [
    severity.toLowerCase(), judgment.findings.filter((entry) => entry.severity === severity).length,
  ]));
  const productEligible = judgment.verdict === "PASS" && judgment.productOutcomeComplete
    && findingCounts.critical <= Number(manifest.promotionGates.product.maximumCritical || 0)
    && findingCounts.high <= Number(manifest.promotionGates.product.maximumHigh || 0);
  const processEligible = attempt.processOraclePassed !== undefined
    ? attempt.processOraclePassed === true : attempt.automatedOraclePassed === true;
  const budgetEligible = attempt.pilotBudgets?.applicable === true ? attempt.pilotBudgets.ok === true : true;
  const promotionEligible = productEligible && processEligible && budgetEligible;
  const result = judgment.verdict === "PENDING" ? "PENDING"
    : promotionEligible ? "PASS"
      : productEligible ? (processEligible ? "PRODUCT_PASS_BUDGET_FAIL" : "PRODUCT_PASS_PROCESS_FAIL")
        : "FAIL";
  return {
    schema: "acef.execution-assurance-pilot-verdict.v1",
    experimentId: judgment.experimentId,
    attemptId: judgment.attemptId,
    attemptRunId: judgment.attemptRunId,
    attemptOrdinal: judgment.attemptOrdinal,
    diffSha256: judgment.diffSha256,
    sourceAttemptSha256: sha256(JSON.stringify(attempt)),
    judgmentSha256: sha256(JSON.stringify(judgment)),
    blindJudgeStatus: judgment.verdict,
    productDone: productEligible,
    productDoneAt: productEligible ? attempt.harnessProductDoneAt : null,
    wallTimeToProductDoneSeconds: productEligible
      ? Math.round((Date.parse(attempt.harnessProductDoneAt) - Date.parse(attempt.startedAt)) / 100) / 10 : null,
    findingCounts,
    productEligible,
    processEligible,
    budgetEligible,
    promotionEligible,
    attemptResult: attempt.result,
    result,
    derivedAt: judgment.judgedAt,
  };
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
      actorContractVersion: actorContractVersionForAttempt(manifest, attempt),
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

function captureGitDiff(repoRoot, baseRef, pathspecs = []) {
  const args = ["diff", "--binary", baseRef];
  if (pathspecs.length) args.push("--", ...pathspecs);
  const result = cp.spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
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
    fixtureRoot: sourceManifest.fixtureRoot
      ? path.resolve(path.dirname(sourceManifestPath), sourceManifest.fixtureRoot)
      : path.join(path.dirname(sourceManifestPath), "fixtures"),
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

function storyReferencePatchPath(resolved, story) {
  if (!story?.referencePatch) return "";
  return path.resolve(path.dirname(resolved.sourceManifestPath), story.referencePatch);
}

function referencePatchChangedPaths(patchText) {
  return unique([...String(patchText || "").matchAll(/^diff --git a\/(.+?) b\/(.+)$/gm)].map((match) => match[2]));
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
      if (resolved.task.requireReferenceValidation === true) {
        for (const story of resolved.task.stories || []) {
          const patchPath = storyReferencePatchPath(resolved, story);
          if (!patchPath || !fs.existsSync(patchPath)) {
            blockers.push(`${story.id}: missing reference patch ${story.referencePatch || "(unset)"}`);
            continue;
          }
          const patchPaths = referencePatchChangedPaths(fs.readFileSync(patchPath, "utf8"));
          if (!patchPaths.length) blockers.push(`${story.id}: reference patch has no changed paths`);
          const allowed = new Set([...(story.allowedPaths || []), ...(story.testPaths || [])]);
          const outsideScope = patchPaths.filter((entry) => !allowed.has(entry));
          if (outsideScope.length) blockers.push(`${story.id}: reference patch escapes frozen scope: ${outsideScope.join(", ")}`);
          if (!Array.isArray(story.verify) || !story.verify.length) blockers.push(`${story.id}: reference validation requires focused verification`);
        }
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
  ACTOR_CONTRACT_VERSIONS,
  ASSURANCE_PROFILES,
  CONTROL_PATTERNS,
  TREATMENTS,
  WORKFLOWS,
  assessTaskShape,
  actorContractVersionForAttempt,
  dependencyAwareQuarantine,
  derivePilotVerdict,
  acquireFinalizationClaim,
  buildPilotPlan,
  captureGitDiff,
  environmentPreflight,
  isPilotHarnessPath,
  parseIndependentTrace,
  parseLifecycleDispatchTrace,
  pilotAttemptHistory,
  preflightCatalog,
  referencePatchChangedPaths,
  resolveCatalogTask,
  readPilotResultRow,
  sha256,
  spawnCaptured,
  storyReferencePatchPath,
  validateManifest,
  validatePilotJudgment,
};

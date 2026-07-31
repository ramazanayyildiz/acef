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

const CONTROL_PATTERNS = Object.freeze({
  readiness: /\b(?:bmad-check-implementation-readiness|check-implementation-readiness|spec-readiness)\b/gi,
  atdd: /\b(?:bmad-atdd|test-design-atdd|atdd)\b/gi,
  development: /\b(?:bmad-dev-story|dev-story|developer-implementation)\b/gi,
  codeReview: /\b(?:bmad-code-review|code-review)\b/gi,
  verifyPatch: /\bverify-patch\b/gi,
  testReview: /\btest-review\b/gi,
  processJudge: /\bprocess-judge\b/gi,
  broadSuite: /\b(?:php\s+artisan\s+test|vendor\/bin\/phpunit|npm\s+test|pnpm\s+test|npx\s+(?:vitest|playwright)\s+test)\b/gi,
  stateReconstruction: /\b(?:ACEF_ACTIVE_RUN|ACEF_CURRENT_CONTEXT|ACEF_ACTIVE_LEDGER|acef-status|acef-next)\b/gi,
});

function countMatches(text, pattern) {
  return (String(text || "").match(pattern) || []).length;
}

function parseIndependentTrace(text) {
  const counts = {};
  for (const [controlId, pattern] of Object.entries(CONTROL_PATTERNS)) counts[controlId] = countMatches(text, pattern);
  const lifecycleControls = ["readiness", "atdd", "development", "codeReview", "verifyPatch", "testReview", "processJudge"];
  const duplicateLifecycleControls = lifecycleControls.filter((controlId) => counts[controlId] > 1);
  return {
    counts,
    duplicateLifecycleControls,
    duplicateLifecycle: duplicateLifecycleControls.length > 0,
    sha256: sha256(text),
  };
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

module.exports = {
  ASSURANCE_PROFILES,
  CONTROL_PATTERNS,
  TREATMENTS,
  WORKFLOWS,
  assessTaskShape,
  buildPilotPlan,
  environmentPreflight,
  parseIndependentTrace,
  sha256,
  validateManifest,
};

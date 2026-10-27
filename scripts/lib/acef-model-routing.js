"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const EXECUTION_CLASSES = new Set(["orchestration", "semantic-standard", "semantic-critical"]);
const REASONING_TIERS = new Set(["low", "medium", "high", "xhigh", "max"]);
// The one model id grammar. Schemas, the active-run parser and the hard-wall shell parser use MODEL_ID_SOURCE
// (test-acef-model-routing asserts they match).
const MODEL_ID_SOURCE = "[A-Za-z0-9._:/-]+";
const SAFE_MODEL_ID = new RegExp(`^${MODEL_ID_SOURCE}$`);
// Bumped when consumers need a newer library (2: roleModels and run overrides; 3: ACEF-owned review floors checked at
// resolve time). Consumers check it through acef-routing-selection.js so a host-kept older copy fails loudly.
const ROUTING_LIBRARY_VERSION = 3;
// Owner decision 2026-10-27 (Ram): review roles never run below the ACEF floor or the policy model without a recorded
// exemption. Floors and ranks come from the ACEF-owned floors file, never from the host policy.
const { REVIEW_ROLES, checkPolicyFloor, floorError, loadReviewFloors, rankShortfall } = require("./acef-review-floors");
const ROLE_ALIASES = {
  "coordinator": "conductor",
  "orchestrator": "conductor",
  "test-author": "atdd",
  "atdd-test-author": "atdd",
  "developer": "development",
  "dev": "development",
  "implementation": "development",
  "review": "code-review",
  "reviewer": "code-review",
  "code-reviewer": "code-review",
  "verify-patch": "patch-assurance",
  "test-review": "patch-assurance",
  "test-reviewer": "patch-assurance",
  "story-judge": "process-judge",
  "epic-judge": "epic-process-judge",
};

function normalizedRole(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function canonicalRoutingRole(role, phase = "") {
  const normalized = normalizedRole(role);
  const direct = ROLE_ALIASES[normalized] || normalized;
  if (direct && Object.prototype.hasOwnProperty.call({
    conductor: true,
    atdd: true,
    development: true,
    "code-review": true,
    "patch-assurance": true,
    "process-judge": true,
    "epic-process-judge": true,
  }, direct)) return direct;

  const phaseRole = normalizedRole(phase);
  if (/epic.*(?:process-)?judge|(?:process-)?judge.*epic/.test(phaseRole)) return "epic-process-judge";
  if (/patch-assurance|verify-patch|test-review/.test(phaseRole)) return "patch-assurance";
  if (/process-judge|story-judge|judge/.test(phaseRole)) return "process-judge";
  if (/code-review|review/.test(phaseRole)) return "code-review";
  if (/atdd|test-author/.test(phaseRole)) return "atdd";
  if (/development|developer|implement|^dev$/.test(phaseRole)) return "development";
  if (/conductor|coordinator|orchestrat/.test(phaseRole)) return "conductor";
  return null;
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function validateModelRoutingPolicy(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("model routing policy must be an object");
  if (record.schema !== "acef.model-routing-policy.v1") throw new Error("model routing policy schema mismatch");
  if (typeof record.policyId !== "string" || !/^[A-Za-z0-9._-]+$/.test(record.policyId)) throw new Error("model routing policy requires a safe policyId");
  if (typeof record.activeProvider !== "string" || !/^[A-Za-z0-9._-]+$/.test(record.activeProvider)) throw new Error("model routing policy requires a safe activeProvider");
  if (!record.roles || typeof record.roles !== "object" || Array.isArray(record.roles) || !Object.keys(record.roles).length) throw new Error("model routing policy requires role assignments");
  if (!record.providers || typeof record.providers !== "object" || Array.isArray(record.providers)) throw new Error("model routing policy requires provider mappings");
  for (const [role, assignment] of Object.entries(record.roles)) {
    if (!assignment || typeof assignment !== "object" || !EXECUTION_CLASSES.has(assignment.executionClass)) throw new Error(`model routing role ${role} has invalid executionClass`);
    if (!REASONING_TIERS.has(assignment.reasoningTier)) throw new Error(`model routing role ${role} has invalid reasoningTier`);
    if (typeof assignment.sessionPolicy !== "string" || !assignment.sessionPolicy.trim()) throw new Error(`model routing role ${role} requires sessionPolicy`);
    if (typeof assignment.evidence !== "string" || !assignment.evidence.trim()) throw new Error(`model routing role ${role} requires evidence`);
  }
  for (const [providerId, provider] of Object.entries(record.providers)) {
    validateRoleModels(provider?.roleModels, record.roles, `provider ${providerId} roleModels`);
    for (const moved of ["modelRank", "reviewModelFloors"]) {
      if (provider && moved in provider) throw new Error(`provider ${providerId} ${moved} belongs in the ACEF-owned method/model-review-floors-v1.json, not in a routing policy`);
    }
    validateExemptions(provider?.roleModelExemptions, record.roles, `provider ${providerId} roleModelExemptions`);
    if (provider?.models && typeof provider.models === "object") {
      for (const [executionClass, model] of Object.entries(provider.models)) {
        if (typeof model === "string" && model.trim() && !SAFE_MODEL_ID.test(model)) throw new Error(`provider ${providerId} models.${executionClass} is not a valid model id`);
      }
    }
  }
  validateProviderMapping(record, record.activeProvider, "active provider");
  return record;
}

// Exemptions (policy roleModelExemptions, run routingRoleModelExemptions): review role -> non-empty owner reason.
function validateExemptions(exemptions, roles, label) {
  if (exemptions === undefined) return;
  if (!exemptions || typeof exemptions !== "object" || Array.isArray(exemptions)) throw new Error(`${label} must be an object`);
  for (const [role, reason] of Object.entries(exemptions)) {
    if (!Object.prototype.hasOwnProperty.call(roles, role)) throw new Error(`${label} names unknown role ${role}`);
    if (!REVIEW_ROLES.includes(role)) throw new Error(`${label} names ${role}, which is not a review role; only ${REVIEW_ROLES.join(", ")} take exemptions`);
    if (typeof reason !== "string" || !reason.trim()) throw new Error(`${label} for ${role} needs a reason`);
  }
}

// The ACEF-owned floors: an in-memory override on the record (tests), else the file next to this library.
let cachedFloors = null;
function reviewFloorsFor(policyRecord) {
  if (policyRecord?.acefReviewFloors) return policyRecord.acefReviewFloors;
  if (!cachedFloors) cachedFloors = loadReviewFloors().record;
  return cachedFloors;
}

// Per-role model overrides. Keys are canonical role ids present in the policy (aliases are not accepted); a value is
// a model id, or null to use the class mapping explicitly (a host writes null to opt out of an ACEF per-role default,
// and update-acef-installation keeps that opt-out). Checked for every provider, not only the active one.
function validateRoleModels(roleModels, roles, label) {
  if (roleModels === undefined) return;
  if (!roleModels || typeof roleModels !== "object" || Array.isArray(roleModels)) throw new Error(`${label} must be an object`);
  for (const [role, model] of Object.entries(roleModels)) {
    if (!Object.prototype.hasOwnProperty.call(roles, role)) throw new Error(`${label} names unknown role ${role}`);
    if (model === null) continue;
    if (typeof model !== "string" || !model.trim() || !SAFE_MODEL_ID.test(model)) throw new Error(`${label} has an invalid model for role ${role}`);
  }
}

// A routing selection is a provider id string, null (the policy's activeProvider), or
// { provider, roleModels, exemptions } from runRoutingSelection. Strings keep the old call shape.
function routingSelection(selection) {
  if (selection === null || selection === undefined || typeof selection === "string") {
    return { provider: selection || null, roleModels: null, exemptions: null };
  }
  return { provider: selection.provider || null, roleModels: selection.roleModels || null, exemptions: selection.exemptions || null };
}

// Every consumer that holds an active run passes this (through acef-routing-selection.js) to the resolvers.
function runRoutingSelection(activeRun) {
  return {
    provider: activeRun?.routingProvider || null,
    roleModels: activeRun?.routingRoleModels || null,
    exemptions: activeRun?.routingRoleModelExemptions || null,
  };
}

// Policy part of the order: providers.<id>.roleModels, then models[executionClass]. null falls through to the class.
function selectPolicyModel(mapping, canonicalRole, executionClass) {
  const roleModel = mapping.roleModels?.[canonicalRole];
  if (typeof roleModel === "string" && roleModel.trim()) return { model: roleModel, modelSource: "role" };
  return { model: mapping.models?.[executionClass], modelSource: "class" };
}

// The one place a role's model is chosen. Order: run host override per role (active-run routingRoleModels) -> policy
// per role (providers.<id>.roleModels) -> policy class mapping (providers.<id>.models[executionClass]). The reasoning
// tier always comes from the role. A run override on a review role must rank at or above the policy's model unless
// the run records an exemption for that role.
function selectRoleModel(policyRecord, providerId, canonicalRole, executionClass, runRoleModels = null, exemptions = null) {
  const mapping = policyRecord.providers[providerId];
  const policy = selectPolicyModel(mapping, canonicalRole, executionClass);
  const review = REVIEW_ROLES.includes(canonicalRole);
  const floors = review ? reviewFloorsFor(policyRecord) : null;
  const covered = Boolean(floors?.providers?.[providerId]);
  // The effective policy (whichever file won) must meet the ACEF floor unless it exempts the role.
  if (covered) checkPolicyFloor(policyRecord, floors, providerId, canonicalRole);
  const floor = covered ? floors.providers[providerId].reviewModelFloors[canonicalRole] : null;
  const policyExemption = covered ? mapping.roleModelExemptions?.[canonicalRole] || null : null;
  const runModel = runRoleModels?.[canonicalRole];
  if (typeof runModel === "string" && runModel.trim()) {
    const exemption = exemptions?.[canonicalRole] || null;
    if (review && !exemption) {
      if (!covered) {
        throw floorError(`run override ${canonicalRole}=${runModel} on provider ${providerId} cannot be ranked: the ACEF review floors do not cover that provider; record --routing-role-model-exemption "${canonicalRole}: <reason>" to allow it`);
      }
      const shortfall = rankShortfall(floors, providerId, runModel, policy.model);
      if (shortfall) {
        throw floorError(`run override ${canonicalRole}=${shortfall} on provider ${providerId}; record --routing-role-model-exemption "${canonicalRole}: <reason>" if the owner approves`);
      }
    }
    return { model: runModel, modelSource: "run-override", floor: review ? (floor || policy.model) : null, exemption };
  }
  return { ...policy, floor: review ? floor : null, exemption: policyExemption };
}

// Run-level overrides and exemptions must name canonical policy roles; persisted records are checked here, before
// any resolution, so a stale or hand-edited active run fails loudly instead of silently keeping the policy model.
function validateRunSelection(policyRecord, selection) {
  if (selection.roleModels) validateRoleModels(selection.roleModels, policyRecord.roles, "active-run routingRoleModels");
  if (selection.exemptions) validateExemptions(selection.exemptions, policyRecord.roles, "active-run routingRoleModelExemptions");
}

// Every role must resolve under the named provider; the active provider is checked at load time and a run-selected
// provider (`active-run --routing-provider`) is checked when it is recorded.
function validateProviderMapping(record, providerId, label = "provider") {
  const provider = record.providers?.[providerId];
  if (!provider?.models || !provider?.reasoning) throw new Error(`model routing policy has no complete mapping for ${label} ${providerId}`);
  for (const assignment of Object.values(record.roles)) {
    if (typeof provider.models[assignment.executionClass] !== "string" || !provider.models[assignment.executionClass].trim()) throw new Error(`provider ${providerId} does not map ${assignment.executionClass}`);
    if (!REASONING_TIERS.has(provider.reasoning[assignment.reasoningTier])) throw new Error(`provider ${providerId} does not map reasoning tier ${assignment.reasoningTier}`);
  }
  return provider;
}

function policyCandidates(repoRoot) {
  return [
    path.join(repoRoot, "docs", "ai", "ACEF_MODEL_ROUTING_POLICY.json"),
    path.join(repoRoot, ".acef", "model-routing-policy.json"),
    path.resolve(__dirname, "..", "..", "method", "model-routing-policy-v1.json"),
  ];
}

function loadModelRoutingPolicy(repoRoot) {
  const policyPath = policyCandidates(path.resolve(repoRoot)).find((candidate) => fs.existsSync(candidate));
  if (!policyPath) throw new Error("model routing policy not found in repo override, installed runtime, or ACEF source");
  const bytes = fs.readFileSync(policyPath);
  const record = validateModelRoutingPolicy(JSON.parse(bytes));
  return { path: policyPath, sha256: sha256(bytes), record };
}

// selection: provider id string, null (policy activeProvider), or { provider, roleModels } (see runRoutingSelection).
function resolveRoleRuntime(policyRecord, role, selection = null) {
  const normalized = normalizedRole(role);
  const canonicalRole = ROLE_ALIASES[normalized] || normalized;
  const assignment = policyRecord.roles[canonicalRole];
  if (!assignment) throw new Error(`model routing policy has no assignment for role ${canonicalRole}`);
  const normalizedSelection = routingSelection(selection);
  validateRunSelection(policyRecord, normalizedSelection);
  const { provider: providerId, roleModels: runRoleModels, exemptions } = normalizedSelection;
  const provider = providerId || policyRecord.activeProvider;
  const mapping = policyRecord.providers[provider];
  if (!mapping) throw new Error(`model routing policy has no provider mapping for ${provider}`);
  const { model, modelSource, floor, exemption } = selectRoleModel(policyRecord, provider, canonicalRole, assignment.executionClass, runRoleModels, exemptions);
  const reasoningEffort = mapping.reasoning?.[assignment.reasoningTier];
  if (!model || !REASONING_TIERS.has(reasoningEffort)) throw new Error(`provider ${provider} cannot resolve role ${canonicalRole}`);
  return {
    provider,
    executionClass: assignment.executionClass,
    reasoningTier: assignment.reasoningTier,
    model,
    modelSource,
    ...(floor ? { floor } : {}),
    ...(exemption ? { exemption } : {}),
    reasoningEffort,
    sessionPolicy: assignment.sessionPolicy,
    evidence: assignment.evidence,
  };
}

function resolveActorRuntime(policyRecord, role, phase = "", selection = null) {
  const canonicalRole = canonicalRoutingRole(role, phase);
  if (!canonicalRole) throw new Error(`model routing policy cannot classify actor role=${role || "null"} phase=${phase || "null"}`);
  return { role: canonicalRole, ...resolveRoleRuntime(policyRecord, canonicalRole, selection) };
}

// Checks every run override and exemption against the policy (used by acef-state when it records them).
function validateRunRouting(policyRecord, activeRun) {
  const selection = runRoutingSelection(activeRun);
  validateRunSelection(policyRecord, selection);
  for (const role of Object.keys(selection.roleModels || {})) resolveRoleRuntime(policyRecord, role, selection);
  for (const role of Object.keys(selection.exemptions || {})) {
    if (!selection.roleModels?.[role]) throw new Error(`active-run exemption for ${role} has no --routing-role-model for that role`);
  }
}

module.exports = {
  MODEL_ID_SOURCE,
  REVIEW_ROLES,
  ROUTING_LIBRARY_VERSION,
  canonicalRoutingRole,
  loadModelRoutingPolicy,
  resolveActorRuntime,
  validateProviderMapping,
  resolveRoleRuntime,
  runRoutingSelection,
  validateModelRoutingPolicy,
  validateRunRouting,
  validateRoleModels,
};

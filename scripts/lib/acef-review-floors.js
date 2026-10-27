"use strict";

// Review-role floors (owner decision 2026-10-27, Ram): code-review, patch-assurance, process-judge and
// epic-process-judge never run below the ACEF floor unless an owner exemption is recorded. The floors and the model
// ranks live in an ACEF-owned file (method/model-review-floors-v1.json, installed as .acef/model-review-floors.json and
// reset on every update). They are loaded independently of the routing policy, so neither a host-merged
// .acef/model-routing-policy.json nor a whole-file docs/ai/ACEF_MODEL_ROUTING_POLICY.json override can remove or
// lower them. A host may only add exemptions (providers.<id>.roleModelExemptions in its policy).
//
// This module has no dependency on acef-model-routing.js: the routing library, the compatibility gate
// (acef-routing-selection.js) and the installer preflight all use it, including next to an older routing library.

const fs = require("node:fs");
const path = require("node:path");

const REVIEW_ROLES = Object.freeze(["code-review", "patch-assurance", "process-judge", "epic-process-judge"]);
const FLOORS_SCHEMA = "acef.model-review-floors.v1";
const MODEL_ID = /^[A-Za-z0-9._:/-]+$/;

function floorError(message, details = {}) {
  const error = new Error(message);
  error.code = "ACEF_REVIEW_FLOOR";
  Object.assign(error, details);
  return error;
}

function validateReviewFloors(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("review floors must be an object");
  if (record.schema !== FLOORS_SCHEMA) throw new Error(`review floors schema must be ${FLOORS_SCHEMA}`);
  if (!record.providers || typeof record.providers !== "object" || Array.isArray(record.providers)) throw new Error("review floors need providers");
  for (const [providerId, entry] of Object.entries(record.providers)) {
    const label = `review floors provider ${providerId}`;
    if (!Array.isArray(entry?.modelRank) || !entry.modelRank.length) throw new Error(`${label} needs a non-empty modelRank, weakest first`);
    const seen = new Set();
    for (const model of entry.modelRank) {
      if (typeof model !== "string" || !MODEL_ID.test(model)) throw new Error(`${label} modelRank has an invalid model id`);
      if (seen.has(model)) throw new Error(`${label} modelRank lists ${model} twice`);
      seen.add(model);
    }
    if (!entry.reviewModelFloors || typeof entry.reviewModelFloors !== "object") throw new Error(`${label} needs reviewModelFloors`);
    for (const role of REVIEW_ROLES) {
      const floor = entry.reviewModelFloors[role];
      if (!seen.has(floor)) throw new Error(`${label} floor for ${role} must be a model in its modelRank`);
    }
    for (const role of Object.keys(entry.reviewModelFloors)) {
      if (!REVIEW_ROLES.includes(role)) throw new Error(`${label} names ${role}, which is not a review role`);
    }
  }
  return record;
}

// The library-adjacent copy first (.acef/model-review-floors.json for an installed .acef/bin/lib, the ACEF source file
// for scripts/lib), then the target repo's installed copy.
function floorsCandidates(repoRoot = null, libDir = __dirname) {
  return [
    path.resolve(libDir, "..", "..", "model-review-floors.json"),
    path.resolve(libDir, "..", "..", "method", "model-review-floors-v1.json"),
    ...(repoRoot ? [path.join(path.resolve(repoRoot), ".acef", "model-review-floors.json")] : []),
  ];
}

function loadReviewFloors(repoRoot = null, libDir = __dirname) {
  const floorsPath = floorsCandidates(repoRoot, libDir).find((candidate) => fs.existsSync(candidate));
  if (!floorsPath) {
    const error = new Error("ACEF review floors (model-review-floors.json) are not installed; run update-acef-installation");
    error.code = "ACEF_REVIEW_FLOORS_MISSING";
    throw error;
  }
  return { path: floorsPath, record: validateReviewFloors(JSON.parse(fs.readFileSync(floorsPath, "utf8"))) };
}

// The policy's own model for a role: providers.<id>.roleModels (a string), else models[executionClass].
function policyModel(policyRecord, providerId, role) {
  const mapping = policyRecord?.providers?.[providerId];
  const roleModel = mapping?.roleModels?.[role];
  if (typeof roleModel === "string" && roleModel.trim()) return roleModel;
  return mapping?.models?.[policyRecord?.roles?.[role]?.executionClass];
}

function exemptionLine(file, providerId, role) {
  return `${file ? `${file}: ` : ""}"providers": { "${providerId}": { "roleModelExemptions": { "${role}": "<owner, date, reason>" } } }`;
}

// null when `model` reaches `floor` in the provider's modelRank; otherwise the reason it does not.
function rankShortfall(floorsRecord, providerId, model, floor) {
  if (model === floor) return null;
  const rank = floorsRecord.providers[providerId].modelRank;
  if (!rank.includes(model)) return `${model} is not in the ACEF modelRank for ${providerId} (${rank.join(" < ")})`;
  if (rank.indexOf(model) < rank.indexOf(floor)) return `${model} is below the review floor ${floor}`;
  return null;
}

// Throws ACEF_REVIEW_FLOOR unless `model` is at or above `floor`; `how` names what chose the model and how to exempt it.
function requireAtLeast(floorsRecord, providerId, role, model, floor, how) {
  const shortfall = rankShortfall(floorsRecord, providerId, model, floor);
  if (shortfall) throw floorError(`${how}: ${role}=${shortfall} on provider ${providerId}`, { role, model, floor, provider: providerId });
}

// Every review role on every provider the floors cover whose policy model is below the floor without a policy
// exemption. `file` labels the policy for messages.
function policyFloorViolations(policyRecord, floorsRecord, file = "") {
  const violations = [];
  for (const [providerId, entry] of Object.entries(floorsRecord.providers)) {
    const mapping = policyRecord?.providers?.[providerId];
    if (!mapping) continue;
    for (const role of REVIEW_ROLES) {
      if (!policyRecord.roles?.[role]) continue;
      if (typeof mapping.roleModelExemptions?.[role] === "string" && mapping.roleModelExemptions[role].trim()) continue;
      const model = policyModel(policyRecord, providerId, role);
      const floor = entry.reviewModelFloors[role];
      const shortfall = typeof model === "string" ? rankShortfall(floorsRecord, providerId, model, floor) : `no model resolves`;
      if (shortfall) violations.push({ file, provider: providerId, role, model: model || null, floor, shortfall, exemption: exemptionLine(file, providerId, role) });
    }
  }
  return violations;
}

// The policy model for one review role must meet its floor (or carry a policy exemption). Non-review roles and
// providers the floors do not cover pass.
function checkPolicyFloor(policyRecord, floorsRecord, providerId, role) {
  if (!REVIEW_ROLES.includes(role) || !floorsRecord.providers[providerId]) return;
  const violation = policyFloorViolations({ ...policyRecord, providers: { [providerId]: policyRecord.providers[providerId] } }, floorsRecord)
    .find((entry) => entry.role === role);
  if (violation) {
    throw floorError(`policy model ${role}=${violation.shortfall} on provider ${providerId}; add ${violation.exemption} if the owner approves`,
      { role, model: violation.model, floor: violation.floor, provider: providerId });
  }
}

function formatViolations(violations) {
  return violations.map((entry) => `- ${entry.file || "policy"} provider ${entry.provider} ${entry.role}: ${entry.shortfall}`
    + ` (floor ${entry.floor}); if Ram approves, add ${entry.exemption}`).join("\n");
}

module.exports = {
  FLOORS_SCHEMA,
  REVIEW_ROLES,
  checkPolicyFloor,
  floorError,
  floorsCandidates,
  formatViolations,
  loadReviewFloors,
  policyFloorViolations,
  policyModel,
  rankShortfall,
  requireAtLeast,
  validateReviewFloors,
};

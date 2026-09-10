"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const EXECUTION_CLASSES = new Set(["orchestration", "semantic-standard", "semantic-critical"]);
const REASONING_TIERS = new Set(["low", "medium", "high", "xhigh", "max"]);
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
  const provider = record.providers[record.activeProvider];
  if (!provider?.models || !provider?.reasoning) throw new Error(`model routing policy has no complete mapping for active provider ${record.activeProvider}`);
  for (const [role, assignment] of Object.entries(record.roles)) {
    if (!assignment || typeof assignment !== "object" || !EXECUTION_CLASSES.has(assignment.executionClass)) throw new Error(`model routing role ${role} has invalid executionClass`);
    if (!REASONING_TIERS.has(assignment.reasoningTier)) throw new Error(`model routing role ${role} has invalid reasoningTier`);
    if (typeof assignment.sessionPolicy !== "string" || !assignment.sessionPolicy.trim()) throw new Error(`model routing role ${role} requires sessionPolicy`);
    if (typeof assignment.evidence !== "string" || !assignment.evidence.trim()) throw new Error(`model routing role ${role} requires evidence`);
    if (typeof provider.models[assignment.executionClass] !== "string" || !provider.models[assignment.executionClass].trim()) throw new Error(`provider ${record.activeProvider} does not map ${assignment.executionClass}`);
    if (!REASONING_TIERS.has(provider.reasoning[assignment.reasoningTier])) throw new Error(`provider ${record.activeProvider} does not map reasoning tier ${assignment.reasoningTier}`);
  }
  return record;
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

function resolveRoleRuntime(policyRecord, role, providerId = null) {
  const normalized = normalizedRole(role);
  const canonicalRole = ROLE_ALIASES[normalized] || normalized;
  const assignment = policyRecord.roles[canonicalRole];
  if (!assignment) throw new Error(`model routing policy has no assignment for role ${canonicalRole}`);
  const provider = providerId || policyRecord.activeProvider;
  const mapping = policyRecord.providers[provider];
  if (!mapping) throw new Error(`model routing policy has no provider mapping for ${provider}`);
  const model = mapping.models?.[assignment.executionClass];
  const reasoningEffort = mapping.reasoning?.[assignment.reasoningTier];
  if (!model || !REASONING_TIERS.has(reasoningEffort)) throw new Error(`provider ${provider} cannot resolve role ${canonicalRole}`);
  return {
    provider,
    executionClass: assignment.executionClass,
    reasoningTier: assignment.reasoningTier,
    model,
    reasoningEffort,
    sessionPolicy: assignment.sessionPolicy,
    evidence: assignment.evidence,
  };
}

function resolveActorRuntime(policyRecord, role, phase = "", providerId = null) {
  const canonicalRole = canonicalRoutingRole(role, phase);
  if (!canonicalRole) throw new Error(`model routing policy cannot classify actor role=${role || "null"} phase=${phase || "null"}`);
  return { role: canonicalRole, ...resolveRoleRuntime(policyRecord, canonicalRole, providerId) };
}

module.exports = {
  canonicalRoutingRole,
  loadModelRoutingPolicy,
  resolveActorRuntime,
  resolveRoleRuntime,
  validateModelRoutingPolicy,
};

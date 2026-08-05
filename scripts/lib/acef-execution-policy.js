"use strict";

const WORKFLOW_IDS = Object.freeze(["quick-fix", "lightweight", "full-bmad"]);
const ASSURANCE_PROFILES = Object.freeze(["baseline", "guarded"]);
const SCOPE_UNITS = Object.freeze(["work-item", "story", "epic"]);

const GUARDED_RISK_PATTERN = /(?:auth(?:entication)?|authori[sz]ation|oauth|sso|permission|access[-_ ]?control|role|entitlement|credential|secret|encrypt|key[-_ ]?rotation|payment|billing|invoice|accounting|finance|financial|payout|subscription|refund|migration|delet(?:e|ion)|destructive|security|token|session|webhook|irreversible|tenant|privacy|pii|personal[-_ ]?data|consent|retention|external[-_ ]?provider|provider[-_ ]?integration|realtime|concurrency|fencing|state[-_ ]?machine)/i;
const CONTAINED_DELETE_PATTERN = /^\s*(?:delete|remove)\s+(?:a\s+|the\s+)?(?:css|style|class|copy|text|label|comment|documentation|docs?|local[-_ ]?variable)\b/i;
const PLANNING_DEPTH_TRIGGERS = Object.freeze(new Set([
  "broad-refactor",
  "cross-repo",
  "epic-scope",
  "new-architecture",
  "new-contract",
  "new-pattern",
  "new-product-workflow",
  "requirements-ambiguous",
  "scope-expansion",
]));

function normalizedTrigger(value) {
  return String(value || "").trim().toLowerCase().replace(/[_ ]+/g, "-");
}

function planningRequiresFull(record = {}) {
  if (record.scopeUnit === "epic") return true;
  if (Array.isArray(record.expectedStories) && record.expectedStories.length > 1) return true;
  return (record.riskTriggers || []).some((trigger) => PLANNING_DEPTH_TRIGGERS.has(normalizedTrigger(trigger)));
}

function workflowSelectionFailures(record = {}) {
  const selected = workflowId(record);
  const triggers = new Set((record.riskTriggers || []).map(normalizedTrigger));
  const planningHeavy = planningRequiresFull(record);
  const failures = [];
  if (selected === "full-bmad" && !planningHeavy) {
    failures.push("Full BMAD requires a planning/scope trigger; high-risk boundaries select Guarded assurance, not Full execution");
  }
  if (selected !== "full-bmad" && planningHeavy) {
    failures.push("planning/scope trigger requires Full BMAD workflow");
  }
  if (selected === "quick-fix") {
    if (!["bugfix", "bug-fix", "defect"].some((trigger) => triggers.has(trigger))) {
      failures.push("ACEF Fix requires bugfix/defect trigger");
    }
    if (!triggers.has("root-cause-proven")) failures.push("ACEF Fix requires root-cause-proven");
    if (!triggers.has("bounded-patch")) failures.push("ACEF Fix requires bounded-patch");
  }
  return failures;
}

function legacyWorkflowId(record) {
  if (!record || typeof record !== "object") return null;
  if (WORKFLOW_IDS.includes(record.lane)) return record.lane;
  if (record.lane === "guarded") return null;
  return null;
}

function workflowId(record) {
  return record?.workflowId || legacyWorkflowId(record);
}

function assuranceProfile(record) {
  if (record?.assuranceProfile) return record.assuranceProfile;
  if (record?.lane === "guarded" || String(record?.track || "").toLowerCase() === "guarded") return "guarded";
  return "baseline";
}

function scopeUnit(record) {
  if (record?.scopeUnit) return record.scopeUnit;
  return record?.activeEpic ? "epic" : "story";
}

function isGuarded(record) {
  return assuranceProfile(record) === "guarded";
}

function isFull(record) {
  return workflowId(record) === "full-bmad";
}

function isHeavy(record) {
  return isFull(record) || isGuarded(record);
}

function requiresCapstone(record) {
  return isGuarded(record) && scopeUnit(record) === "epic";
}

function riskRequiresGuarded(riskTriggers = []) {
  return riskTriggers.some((trigger) => {
    const value = String(trigger || "");
    if (CONTAINED_DELETE_PATTERN.test(value)) return false;
    return GUARDED_RISK_PATTERN.test(value);
  });
}

function migrationRequired(record) {
  return Boolean(record && !record.schema && record.lane === "guarded" && !record.workflowId);
}

function displayName(record) {
  const base = {
    "quick-fix": "ACEF Fix",
    lightweight: "ACEF Standard",
    "full-bmad": "ACEF Full (BMAD v2)",
  }[workflowId(record)] || "ACEF migration required";
  return isGuarded(record) ? `${base} · Guarded` : base;
}

function normalizeExecutionState(record) {
  const workflow = workflowId(record);
  const assurance = assuranceProfile(record);
  const unit = scopeUnit(record);
  return {
    ...record,
    workflowId: workflow,
    assuranceProfile: assurance,
    scopeUnit: unit,
    lane: workflow || record.lane,
    executionMigrationRequired: migrationRequired(record),
  };
}

const REQUIREMENT_RANK = Object.freeze({
  "not-required": 0,
  optional: 1,
  "required-if-triggered": 2,
  required: 3,
});
const DOSE_RANK = Object.freeze({ none: 0, light: 1, compact: 2, full: 3 });

function strongerValue(left, right, rank) {
  if (right === undefined || right === null) return left;
  if (left === undefined || left === null) return right;
  return (rank[right] ?? -1) > (rank[left] ?? -1) ? right : left;
}

function mergeDose(base, overlay) {
  if (!base) return overlay || null;
  if (!overlay) return base;
  const requirement = strongerValue(base.requirement, overlay.requirement, REQUIREMENT_RANK);
  const dose = strongerValue(base.dose, overlay.dose, DOSE_RANK);
  return {
    requirement,
    dose,
    enforcementLevel: (REQUIREMENT_RANK[overlay.requirement] ?? -1) > (REQUIREMENT_RANK[base.requirement] ?? -1)
      ? overlay.enforcementLevel
      : base.enforcementLevel,
    backstop: [base.backstop, overlay.backstop].filter(Boolean).filter((item, index, all) => all.indexOf(item) === index).join(" | "),
  };
}

function resolveControlDose(manifest, controlId, workflow, assurance = "baseline") {
  const control = manifest?.controls?.find((entry) => entry.id === controlId);
  if (!control) return null;
  if (manifest.schema === "acef.control-dosing.v2") {
    const base = control.workflowDoses?.[workflow] || null;
    const overlay = assurance === "guarded" ? control.assuranceDoses?.guarded : null;
    return mergeDose(base, overlay);
  }
  const legacyLane = assurance === "guarded" && workflow !== "full-bmad" ? "guarded" : workflow;
  return control.laneDoses?.[legacyLane] || null;
}

function resolveControlBundle(manifest, workflow, assurance = "baseline") {
  if (manifest.schema === "acef.control-dosing.v2") {
    const base = manifest.workflowBundles?.[workflow] || [];
    const overlay = assurance === "guarded" ? manifest.assuranceOverlays?.guarded?.bundleAdds || [] : [];
    return [...new Set([...base, ...overlay])];
  }
  const legacyLane = assurance === "guarded" && workflow !== "full-bmad" ? "guarded" : workflow;
  return manifest.laneBundles?.[legacyLane] || [];
}

module.exports = {
  ASSURANCE_PROFILES,
  GUARDED_RISK_PATTERN,
  PLANNING_DEPTH_TRIGGERS,
  SCOPE_UNITS,
  WORKFLOW_IDS,
  assuranceProfile,
  displayName,
  isFull,
  isGuarded,
  isHeavy,
  legacyWorkflowId,
  migrationRequired,
  normalizeExecutionState,
  mergeDose,
  resolveControlBundle,
  resolveControlDose,
  requiresCapstone,
  riskRequiresGuarded,
  planningRequiresFull,
  scopeUnit,
  workflowId,
  workflowSelectionFailures,
};

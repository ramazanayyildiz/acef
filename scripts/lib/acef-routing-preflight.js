"use strict";

// Read-only routing check that runs before install-acef-tools / update-acef-installation write anything. It checks
// the policy the host will end up with (the three-way merge of .acef/model-routing-policy.json) and the effective
// whole-file override (docs/ai/ACEF_MODEL_ROUTING_POLICY.json) against the ACEF review floors that this install
// ships. A violation stops the update before any byte of the host changes.

const fs = require("node:fs");
const path = require("node:path");
const { installedSourceBaseline, mergeHostConfig } = require("./acef-installation");
const { formatViolations, policyFloorViolations, validateReviewFloors } = require("./acef-review-floors");
const { FLOOR_KEYS, validateModelRoutingPolicy } = require("./acef-model-routing");

const INSTALLED_POLICY = ".acef/model-routing-policy.json";
const DOCS_OVERRIDE = "docs/ai/ACEF_MODEL_ROUTING_POLICY.json";

// "missing" and "present but unusable" are different outcomes: a file that exists must parse to a JSON object.
function readJsonObject(file, label) {
  if (!fs.existsSync(file)) return { missing: true, record: null, error: null };
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return { missing: false, record: null, error: `${label} is not valid JSON (${error.message})` };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    const kind = value === null ? "null" : Array.isArray(value) ? "an array" : `a ${typeof value}`;
    return { missing: false, record: null, error: `${label} must be a JSON object, found ${kind}` };
  }
  return { missing: false, record: value, error: null };
}

// Migration for installs of the unreleased 9269a8c shape, which carried modelRank/reviewModelFloors inside the routing
// policy: those keys now live only in the ACEF-owned floors file, so they are removed from a host policy copy.
// Returns the removed key paths; mutates `record`.
function stripMovedFloorKeys(record) {
  const moved = [];
  if (!record || typeof record !== "object") return moved;
  for (const key of FLOOR_KEYS) {
    if (key in record) { delete record[key]; moved.push(key); }
  }
  for (const [providerId, provider] of Object.entries(record.providers || {})) {
    for (const key of FLOOR_KEYS) {
      if (provider && typeof provider === "object" && key in provider) { delete provider[key]; moved.push(`providers.${providerId}.${key}`); }
    }
  }
  return moved;
}

// The violations an update from sourceRoot would leave in targetRepo, without writing. `invalid` lists policies that
// would fail full validation (the merged installed policy, the effective docs override).
function routingPreflight(sourceRoot, targetRepo) {
  const floorsPath = path.join(sourceRoot, "method", "model-review-floors-v1.json");
  const sourcePolicyPath = path.join(sourceRoot, "method", "model-routing-policy-v1.json");
  if (!fs.existsSync(floorsPath) || !fs.existsSync(sourcePolicyPath)) return { violations: [], invalid: [], checked: [], moved: [] };
  const floorsRead = readJsonObject(floorsPath, `ACEF floors ${floorsPath}`);
  if (floorsRead.error) throw new Error(`ACEF update stopped before any write: ${floorsRead.error}`);
  const floors = validateReviewFloors(floorsRead.record);
  const sourceRead = readJsonObject(sourcePolicyPath, `ACEF routing policy ${sourcePolicyPath}`);
  if (sourceRead.error) throw new Error(`ACEF update stopped before any write: ${sourceRead.error}`);
  const source = sourceRead.record;
  const checked = [];
  const violations = [];
  const invalid = [];
  const validate = (record, file) => {
    try {
      validateModelRoutingPolicy(record);
    } catch (error) {
      invalid.push({ file, message: error.message });
    }
  };
  const hostRead = readJsonObject(path.join(targetRepo, INSTALLED_POLICY), INSTALLED_POLICY);
  if (hostRead.error) invalid.push({ file: INSTALLED_POLICY, message: hostRead.error });
  const host = hostRead.record;
  const moved = host ? stripMovedFloorKeys(host) : [];
  const baseline = host ? installedSourceBaseline(targetRepo, sourceRoot, "tools", "method/model-routing-policy-v1.json") : null;
  if (baseline) stripMovedFloorKeys(baseline);
  checked.push(INSTALLED_POLICY);
  if (!hostRead.error) {
    const merged = host ? mergeHostConfig(host, source, baseline).result : source;
    validate(merged, INSTALLED_POLICY);
    violations.push(...policyFloorViolations(merged, floors, INSTALLED_POLICY));
  }
  const overrideRead = readJsonObject(path.join(targetRepo, DOCS_OVERRIDE), DOCS_OVERRIDE);
  if (overrideRead.error) {
    checked.push(DOCS_OVERRIDE);
    invalid.push({ file: DOCS_OVERRIDE, message: overrideRead.error });
  }
  const override = overrideRead.record;
  if (override) {
    checked.push(DOCS_OVERRIDE);
    validate(override, DOCS_OVERRIDE);
    violations.push(...policyFloorViolations(override, floors, DOCS_OVERRIDE));
  }
  return { violations, invalid, checked, moved };
}

function assertRoutingPreflight(sourceRoot, targetRepo) {
  const { violations, invalid } = routingPreflight(sourceRoot, targetRepo);
  if (!violations.length && !invalid.length) return;
  const parts = [];
  if (invalid.length) {
    parts.push(`routing policy would not validate:\n${invalid.map((entry) => `- ${entry.file}: ${entry.message}`).join("\n")}`);
  }
  if (violations.length) {
    parts.push(`review roles below the ACEF review floor (owner decision 2026-10-27; method/model-review-floors-v1.json):\n${formatViolations(violations)}`);
  }
  const error = new Error(`ACEF update stopped before any write in ${targetRepo}: ${parts.join("\n")}\n`
    + "Nothing in the host was changed. Add each exemption line only with Ram's approval, fix any invalid policy, then rerun the update.");
  error.code = violations.length ? "ACEF_REVIEW_FLOOR" : "ACEF_ROUTING_POLICY_INVALID";
  error.violations = violations;
  error.invalid = invalid;
  throw error;
}

module.exports = { assertRoutingPreflight, routingPreflight, stripMovedFloorKeys };

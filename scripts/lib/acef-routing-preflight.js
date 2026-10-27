"use strict";

// Read-only routing check that runs before install-acef-tools / update-acef-installation write anything. It checks
// the policy the host will end up with (the three-way merge of .acef/model-routing-policy.json) and the effective
// whole-file override (docs/ai/ACEF_MODEL_ROUTING_POLICY.json) against the ACEF review floors that this install
// ships. A violation stops the update before any byte of the host changes.

const fs = require("node:fs");
const path = require("node:path");
const { installedSourceBaseline, mergeHostConfig } = require("./acef-installation");
const { formatViolations, policyFloorViolations, validateReviewFloors } = require("./acef-review-floors");

const INSTALLED_POLICY = ".acef/model-routing-policy.json";
const DOCS_OVERRIDE = "docs/ai/ACEF_MODEL_ROUTING_POLICY.json";

function readJson(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

// The violations an update from sourceRoot would leave in targetRepo, without writing.
function routingPreflight(sourceRoot, targetRepo) {
  const floorsPath = path.join(sourceRoot, "method", "model-review-floors-v1.json");
  const sourcePolicyPath = path.join(sourceRoot, "method", "model-routing-policy-v1.json");
  if (!fs.existsSync(floorsPath) || !fs.existsSync(sourcePolicyPath)) return { violations: [], checked: [] };
  const floors = validateReviewFloors(JSON.parse(fs.readFileSync(floorsPath, "utf8")));
  const source = JSON.parse(fs.readFileSync(sourcePolicyPath, "utf8"));
  const checked = [];
  const violations = [];
  const host = readJson(path.join(targetRepo, INSTALLED_POLICY));
  const baseline = host ? installedSourceBaseline(targetRepo, sourceRoot, "tools", "method/model-routing-policy-v1.json") : null;
  const merged = host ? mergeHostConfig(host, source, baseline).result : source;
  checked.push(INSTALLED_POLICY);
  violations.push(...policyFloorViolations(merged, floors, INSTALLED_POLICY));
  const override = readJson(path.join(targetRepo, DOCS_OVERRIDE));
  if (override) {
    checked.push(DOCS_OVERRIDE);
    violations.push(...policyFloorViolations(override, floors, DOCS_OVERRIDE));
  }
  return { violations, checked };
}

function assertRoutingPreflight(sourceRoot, targetRepo) {
  const { violations } = routingPreflight(sourceRoot, targetRepo);
  if (!violations.length) return;
  const error = new Error(`ACEF update stopped before any write: review roles below the ACEF review floor `
    + `(owner decision 2026-10-27; method/model-review-floors-v1.json) in ${targetRepo}:\n${formatViolations(violations)}\n`
    + "Nothing in the host was changed. Add each exemption line only with Ram's approval, then rerun the update.");
  error.code = "ACEF_REVIEW_FLOOR";
  error.violations = violations;
  throw error;
}

module.exports = { assertRoutingPreflight, routingPreflight };

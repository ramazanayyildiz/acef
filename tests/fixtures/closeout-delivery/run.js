#!/usr/bin/env node
// CI integration check: verify that acef-closeout-verify accepts a minimal
// valid delivery record and rejects an invalid one, exercising the real CLI
// end-to-end (not just the unit-test path).
//
// Uses the existing "cli" fixture repo so no external network access or real
// repo is needed.  The fingerprint is computed at run time so it tracks any
// future changes to the fixture.
//
// Run: node tests/fixtures/closeout-delivery/run.js
"use strict";

const cp = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const tool = path.join(repoRoot, "scripts", "acef-closeout-verify");
const cliFixture = path.join(repoRoot, "tests", "fixtures", "surface-contract", "repos", "cli");
const { extractWitness } = require(path.join(repoRoot, "scripts", "lib", "acef-surface-contract"));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "acef-closeout-ci-"));

function run(args) {
  return cp.execFileSync("node", [tool, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function runExpectFail(args) {
  try {
    run(args);
    throw new Error("Expected non-zero exit but got 0");
  } catch (error) {
    if (error.message === "Expected non-zero exit but got 0") throw error;
    return `${error.stdout || ""}${error.stderr || ""}`.trim();
  }
}

function writeRecord(name, record) {
  const filePath = path.join(tmp, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  return filePath;
}

let passed = 0;

try {
  // 1. PASS: minimal valid cli delivery record.
  const fp = extractWitness(cliFixture).fingerprint;
  const validRecord = writeRecord("valid-cli", {
    schema: "acef.surface-evidence.v1",
    goal: { id: "ci-goal", surfaceSet: ["cli"] },
    story: { id: "ci-story", goalId: "ci-goal", touchedSurfaces: ["cli"] },
    adapter: { fingerprint: fp, surfaces: { cli: { status: "grounded" } } },
    witnessFingerprint: fp,
    evidence: { command: { pass: true }, state: { pass: true } },
  });
  const passOut = run([validRecord]);
  if (!passOut.includes("PASS closeout:")) {
    throw new Error(`Expected PASS closeout in output, got:\n${passOut}`);
  }
  console.log(`ok ${++passed} - valid cli delivery record passes closeout`);

  // 2. FAIL: empty {} record must be rejected (fail-closed input validation).
  const emptyRecord = writeRecord("empty", {});
  const failOut = runExpectFail([emptyRecord]);
  if (!failOut.includes("FAIL closeout:")) {
    throw new Error(`Expected "FAIL closeout:" in output for empty record, got:\n${failOut}`);
  }
  console.log(`ok ${++passed} - empty {} record fails closed`);

  // 3. FAIL: record with empty surfaceSet must be rejected.
  const emptyGoalRecord = writeRecord("empty-goalset", {
    schema: "acef.surface-evidence.v1",
    goal: { id: "ci-goal-empty", surfaceSet: [] },
    story: { id: "ci-story-empty", goalId: "ci-goal-empty", touchedSurfaces: [] },
    adapter: { fingerprint: fp, surfaces: {} },
  });
  const failGoalOut = runExpectFail([emptyGoalRecord]);
  if (!failGoalOut.includes("FAIL closeout:")) {
    throw new Error(`Expected "FAIL closeout:" in output for empty surfaceSet, got:\n${failGoalOut}`);
  }
  console.log(`ok ${++passed} - empty surfaceSet fails closed`);

  console.log(`\nacef-closeout-verify integration check passed (${passed} cases)`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

const fs = require("node:fs");
const path = require("node:path");
const {
  ASSURANCE_PROFILES,
  SCOPE_UNITS,
  WORKFLOW_IDS,
  normalizeExecutionState,
  resolveControlBundle,
  resolveControlDose,
} = require("./acef-execution-policy");

const SURFACE_VALUES = new Set([
  "ui", "admin", "mobile", "api", "http", "cli", "queue", "job", "scheduler", "storage",
  "email", "notification", "webhook", "integration", "config", "database", "library", "internal",
]);

const CONTROL_DOSING_LANES = ["direct", "quick-fix", "lightweight", "guarded", "full-bmad"];
const DIRECT_BOUNDARIES = [
  "copy",
  "style",
  "localized-ui",
  "localized-config",
  "docs",
  "localized-bugfix",
  "internal-mechanical",
];
const CONTROL_DOSING_IDS = [
  "worker-scope",
  "cold-read-current-context",
  "active-run-next-action",
  "actor-records",
  "approval-receipts",
  "evidence-manifest",
  "runner-proof",
  "gate-verdict",
  "surface-contract",
  "test-integrity",
  "lean-evidence",
];

function readJson(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

function requireFields(record, fields, label) {
  const missing = fields.filter((field) => record[field] === undefined || record[field] === null || record[field] === "");
  if (missing.length) throw new Error(`${label} missing required field(s): ${missing.join(", ")}`);
}

function requireEnum(record, field, values, label) {
  if (!values.includes(record[field])) {
    throw new Error(`${label} ${field} must be one of: ${values.join(", ")}`);
  }
}

function requireStringArray(record, field, label, { nonEmpty = false } = {}) {
  if (!Array.isArray(record[field]) || record[field].some((value) => typeof value !== "string" || !value.trim())) {
    throw new Error(`${label} ${field} must be an array of non-empty strings`);
  }
  if (nonEmpty && !record[field].length) throw new Error(`${label} ${field} must not be empty`);
}

function requireObject(record, field, label) {
  if (!record[field] || typeof record[field] !== "object" || Array.isArray(record[field])) {
    throw new Error(`${label} ${field} must be an object`);
  }
}

function rejectUnknownFields(record, fields, label) {
  const allowed = new Set(fields);
  const unknown = Object.keys(record).filter((field) => !allowed.has(field));
  if (unknown.length) throw new Error(`${label} has unknown field(s): ${unknown.join(", ")}`);
}

function requireSurface(value, label) {
  if (!SURFACE_VALUES.has(value)) throw new Error(`${label} has unknown surface ${value}`);
}

function normalizedRecordScope(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const TEST_RUNNER_COMMAND = /(?:^|\s)(?:(?:[^\s]+[\\/])?node(?:\.exe)?\s+--test\b|(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b|php\s+artisan\s+test\b|(?:vendor\/bin\/)?(?:phpunit|pest)\b|(?:python(?:3)?\s+-m\s+)?pytest\b|go\s+test\b|cargo\s+test\b|dotnet\s+test\b|(?:mvnw?|gradlew?)\s+[^\n]*(?:test|check)\b|rspec\b|(?:vitest|jest)\b)/i;
const TEST_FAILURE_OUTPUT = /(?:\bFAIL(?:ED|URE|URES)?\b|\bnot ok\b|AssertionError|assertion failed|\btests? failed\b|\berror:\s|\bexpected\b[^\n]+\bactual\b|\bpanic:\s)/i;

function atddRedExecutionFailure(evidence, rawText, changedTestPaths) {
  const command = String(evidence?.command || "").trim();
  if (!TEST_RUNNER_COMMAND.test(command)) return "ATDD red command is not a recognized test-runner invocation";
  if (/(?:^|\s)(?:node|python(?:3)?|php|ruby)\s+(?:-e|-c|-r)\b/i.test(command)) {
    return "ATDD red command uses an arbitrary interpreter self-failure instead of a test runner";
  }
  const outputMarker = String(rawText || "").match(/--- stdout ---[\s\S]*$/);
  const observedOutput = outputMarker ? outputMarker[0] : String(rawText || "");
  if (!TEST_FAILURE_OUTPUT.test(observedOutput)) return "ATDD red output does not contain an observed test failure";
  // A scored or guarded run may execute an immutable verification test rather
  // than the editable ATDD source. Do not require runner output to name a test
  // changed by the red commit. The deterministic close caller separately binds
  // a clean test-only red commit, authentic production-behavior assertions,
  // exact-command red-to-green ancestry, and preservation of the red sources.
  void changedTestPaths;
  return "";
}

function atddTestSourceAuthenticityFailure(testSources) {
  const authentic = (testSources || []).some(({ source }) => {
    const text = String(source || "");
    if (/\bprocess\s*\.\s*exit\s*\(|\bos\s*\.\s*_exit\s*\(|\bsys\s*\.\s*exit\s*\(/i.test(text)) return false;
    const declaration = /\b(?:test|it|describe)\s*\(|\b(?:public\s+)?function\s+test[A-Za-z0-9_]*\s*\(|#\[\s*Test\s*\]|\bdef\s+test_[A-Za-z0-9_]*\s*\(|\bfunc\s+Test[A-Za-z0-9_]*\s*\(|#\[test\]|\[(?:Test|Fact|Theory)\]/i.test(text);
    const assertion = /\bassert[A-Za-z0-9_]*\s*\(|\bexpect\s*\(|\b(?:assert|require)\s*\.|->(?:assert[A-Za-z0-9_]*|expectException(?:Message|MessageMatches|Object)?)\s*\(|\bshould\b|\bpanic!\s*\(/i.test(text);
    const javascriptProductionReference = /(?:require\s*\(\s*["']\.{1,2}\/|from\s+["']\.{1,2}\/|from\s+(?:app|src|modules|lib)\b|\b(?:got|actual|result|response)\s*(?::=|=)\s*[A-Za-z_$][\w$]*(?:\.|\()|\b[A-Z][A-Za-z0-9_]*(?:::|\.)[A-Za-z0-9_]+\s*\()/i.test(text);
    const phpProductionImport = /\buse\s+(?!(?:PHPUnit|Mockery|Tests)(?:\\|;))[A-Z][A-Za-z0-9_]*(?:\\[A-Za-z_][A-Za-z0-9_]*)+\s*;/i.test(text);
    const phpProductionConstruction = /\bnew\s+[A-Z][A-Za-z0-9_]*(?:\\[A-Za-z_][A-Za-z0-9_]*)*\s*\(/i.test(text);
    const phpProductionCall = /\$[A-Za-z_][A-Za-z0-9_]*(?:->[A-Za-z_][A-Za-z0-9_]*)*->(?!assert|expect|should|mock|partialMock|spy|fail)[A-Za-z_][A-Za-z0-9_]*\s*\(/i.test(text);
    const productionReference = javascriptProductionReference || phpProductionImport || phpProductionConstruction || phpProductionCall;
    const literalVsLiteral = /(?:assert(?:\.[A-Za-z0-9_]+)?|expect)\s*\(\s*(["'`][^"'`]*["'`]|-?\d+(?:\.\d+)?|true|false|null)\s*,\s*(["'`][^"'`]*["'`]|-?\d+(?:\.\d+)?|true|false|null)\s*\)/i.test(text);
    const selfComparison = /(?:assert(?:\.[A-Za-z0-9_]+)?)\s*\(\s*([A-Za-z_$][\w$]*)\s*,\s*\1\s*\)/i.test(text);
    const expectSelfComparison = /expect\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\.\s*(?:toBe|toEqual|toStrictEqual)\s*\(\s*\1\s*\)/i.test(text);
    const expectLiteralComparison = /expect\s*\(\s*(?:["'`][^"'`]*["'`]|-?\d+(?:\.\d+)?|true|false|null)\s*\)\s*\.\s*(?:toBe|toEqual|toStrictEqual)\s*\(\s*(?:["'`][^"'`]*["'`]|-?\d+(?:\.\d+)?|true|false|null)\s*\)/i.test(text);
    return declaration && assertion && productionReference && !literalVsLiteral && !selfComparison && !expectSelfComparison && !expectLiteralComparison;
  });
  return authentic ? "" : "ATDD red commit lacks a non-circular test assertion over production behavior";
}

function atddGreenTestContinuityFailure(redSources, greenSources) {
  const greenByPath = new Map((greenSources || []).map((entry) => [entry.filePath, String(entry.source || "")]));
  const semanticLines = (value) => String(value || "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$|#[^\[].*$/g, "").replace(/\s+/g, ""))
    .filter((line) => line && !/^[{}()[\],;]+$/.test(line));
  const weakened = (redSources || []).filter((entry) => {
    const required = semanticLines(entry.source);
    const available = semanticLines(greenByPath.get(entry.filePath));
    const counts = new Map();
    for (const line of available) counts.set(line, (counts.get(line) || 0) + 1);
    if (!required.length) return true;
    for (const line of required) {
      const remaining = counts.get(line) || 0;
      if (!remaining) return true;
      counts.set(line, remaining - 1);
    }
    return false;
  });
  return weakened.length ? `green evidence removed or weakened critical ATDD test content: ${weakened.map((entry) => entry.filePath).join(", ")}` : "";
}

function validateBindingEntry(item, index, label, { requireEvidence = false } = {}) {
  if (!item || typeof item !== "object") throw new Error(`${label}[${index}] must be an object`);
  requireFields(item, requireEvidence ? ["inputSurface", "outputSurface", "field", "evidenceId"] : ["inputSurface", "outputSurface", "field"], `${label}[${index}]`);
  requireSurface(item.inputSurface, `${label}[${index}].inputSurface`);
  requireSurface(item.outputSurface, `${label}[${index}].outputSurface`);
  if (typeof item.field !== "string" || !item.field.trim()) throw new Error(`${label}[${index}].field must be a non-empty string`);
  if (item.defaultMaskingRisk !== undefined && typeof item.defaultMaskingRisk !== "boolean") throw new Error(`${label}[${index}].defaultMaskingRisk must be boolean`);
  if (item.nonDefaultValue !== undefined && typeof item.nonDefaultValue !== "boolean") throw new Error(`${label}[${index}].nonDefaultValue must be boolean`);
  if (item.defaultRejected !== undefined && typeof item.defaultRejected !== "boolean") throw new Error(`${label}[${index}].defaultRejected must be boolean`);
}

function parseActiveRun(filePath) {
  const record = readJson(filePath);
  const v2 = record.schema === "acef.active-run.v2";
  if (record.schema !== undefined && !v2) throw new Error(`active run has unsupported schema ${record.schema}`);
  requireFields(
    record,
    v2
      ? ["schema", "runId", "repo", "workflowId", "assuranceProfile", "scopeUnit", "status", "activeStory", "activePhase", "ledgerPath"]
      : ["runId", "repo", "lane", "status", "activeStory", "activePhase", "ledgerPath"],
    "active run",
  );
  if (v2) {
    requireEnum(record, "workflowId", WORKFLOW_IDS, "active run");
    if (record.fullFlowContract !== undefined) {
      requireEnum(record, "fullFlowContract", ["six-actor-v2", "four-actor-v3"], "active run");
      if (record.workflowId !== "full-bmad") {
        throw new Error("active run fullFlowContract is only valid for full-bmad workflow");
      }
    }
    if (record.runtimeContract !== undefined) {
      requireEnum(record, "runtimeContract", ["capsule-supervisor-v1"], "active run");
      if (record.workflowId !== "full-bmad" || record.fullFlowContract !== "four-actor-v3") {
        throw new Error("active run runtimeContract requires full-bmad/four-actor-v3");
      }
    }
    requireEnum(record, "assuranceProfile", ASSURANCE_PROFILES, "active run");
    requireEnum(record, "scopeUnit", SCOPE_UNITS, "active run");
    if (record.expectedStories !== undefined) {
      requireStringArray(record, "expectedStories", "active run", { nonEmpty: true });
      if (new Set(record.expectedStories).size !== record.expectedStories.length) throw new Error("active run expectedStories must be unique");
    }
    if (record.fullFlowContract === "four-actor-v3"
      && (!Array.isArray(record.expectedStories) || !record.expectedStories.length)) {
      throw new Error("four-actor-v3 active run requires frozen expectedStories inventory");
    }
    if (record.fullFlowContract === "four-actor-v3" && record.scopeUnit === "story"
      && !record.expectedStories.some((story) => normalizedRecordScope(story) === normalizedRecordScope(record.activeStory))) {
      throw new Error("four-actor-v3 activeStory must belong to expectedStories inventory");
    }
    if (record.lane !== undefined) throw new Error("active run v2 must use workflowId, not lane");
    if (record.assuranceProfile === "guarded"
      && (typeof record.assuranceRationale !== "string" || !record.assuranceRationale.trim())) {
      throw new Error("guarded active run v2 requires assuranceRationale");
    }
    if (record.assuranceApprovalId !== undefined && record.assuranceApprovalId !== null
      && (typeof record.assuranceApprovalId !== "string"
        || !/^[A-Za-z0-9._-]+$/.test(record.assuranceApprovalId))) {
      throw new Error("active run assuranceApprovalId must be a safe typed approval id");
    }
  } else {
    requireEnum(record, "lane", ["quick-fix", "lightweight", "full-bmad", "guarded", "custom"], "active run");
  }
  requireEnum(record, "status", ["active", "paused", "blocked", "complete"], "active run");
  if (record.maxLines !== undefined && record.maxLines !== null
    && (!Number.isInteger(record.maxLines) || record.maxLines < 1 || record.maxLines > 150)) {
    throw new Error("active run maxLines must be an integer between 1 and 150");
  }
  if (record.laneRationale !== undefined && record.laneRationale !== null
    && (typeof record.laneRationale !== "string" || !record.laneRationale.trim())) {
    throw new Error("active run laneRationale must be a non-empty string");
  }
  if (record.workflowRationale !== undefined && record.workflowRationale !== null
    && (typeof record.workflowRationale !== "string" || !record.workflowRationale.trim())) {
    throw new Error("active run workflowRationale must be a non-empty string");
  }
  if (record.intakeDecision !== undefined && record.intakeDecision !== null) {
    const decision = record.intakeDecision;
    requireFields(decision, ["route", "confidence"], "active run intakeDecision");
    requireEnum(decision, "confidence", ["low", "medium", "high"], "active run intakeDecision");
    for (const field of ["clarifyingQuestions", "inferredAnswers", "unresolvedQuestions"]) {
      if (decision[field] !== undefined) requireStringArray(decision, field, "active run intakeDecision");
    }
    for (const field of ["briefApproved", "approvalRequired", "executionApproved"]) {
      if (decision[field] !== undefined && typeof decision[field] !== "boolean") {
        throw new Error(`active run intakeDecision ${field} must be boolean`);
      }
    }
  }
  if (record.riskTriggers !== undefined) {
    requireStringArray(record, "riskTriggers", "active run");
  }
  if (record.activeGoal !== undefined && record.activeGoal !== null) {
    if (typeof record.activeGoal !== "object" || Array.isArray(record.activeGoal)) {
      throw new Error("active run activeGoal must be an object");
    }
    if (record.activeGoal.description !== undefined && (typeof record.activeGoal.description !== "string" || !record.activeGoal.description.trim())) {
      throw new Error("active run activeGoal.description must be a non-empty string");
    }
    if (record.activeGoal.userFacing !== undefined && typeof record.activeGoal.userFacing !== "boolean") {
      throw new Error("active run activeGoal.userFacing must be boolean");
    }
    if (record.activeGoal.completionMode !== undefined) {
      requireEnum(record.activeGoal, "completionMode", ["backend-capability", "product-workspace", "internal"], "active run activeGoal");
    }
  }
  if (record.goalCoverage !== undefined && record.goalCoverage !== null) {
    const coverage = record.goalCoverage;
    if (typeof coverage !== "object" || Array.isArray(coverage)) throw new Error("active run goalCoverage must be an object");
    if (coverage.status !== undefined) requireEnum(coverage, "status", ["PASS", "INCOMPLETE"], "active run goalCoverage");
    if (coverage.storyType !== undefined) {
      requireEnum(coverage, "storyType", ["foundation", "backend-capability", "ui-surface", "integration", "closeout"], "active run goalCoverage");
    }
    for (const field of ["requiredSurfaces", "coveredSurfaces"]) {
      if (coverage[field] !== undefined) {
        requireStringArray(coverage, field, "active run goalCoverage");
        for (const surface of coverage[field]) requireSurface(surface, `active run goalCoverage.${field}`);
      }
    }
    for (const field of ["evidenceRefs", "missing"]) {
      if (coverage[field] !== undefined) requireStringArray(coverage, field, "active run goalCoverage");
    }
  }
  return normalizeExecutionState(record);
}

function parseActorRecord(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["actorInstanceId", "story", "phase", "role", "client", "inputCommit", "allowedContextProfile"], "actor record");
  if (record.runId !== undefined && (typeof record.runId !== "string" || !record.runId.trim())) throw new Error("actor record runId must be non-empty");
  if (record.fullFlowContract !== undefined) requireEnum(record, "fullFlowContract", ["six-actor-v2", "four-actor-v3"], "actor record");
  if (record.fullFlowContract === "four-actor-v3") {
    requireFields(record, ["runId", "storyInventory"], "four-actor-v3 actor record");
    requireStringArray(record, "storyInventory", "four-actor-v3 actor record", { nonEmpty: true });
    if (new Set(record.storyInventory).size !== record.storyInventory.length) throw new Error("four-actor-v3 actor storyInventory must be unique");
  }
  if (record.reasoningEffort !== undefined && record.reasoningEffort !== null) {
    requireEnum(record, "reasoningEffort", ["low", "medium", "high", "xhigh", "max"], "actor record");
  }
  if (record.producedArtifactPath !== undefined && record.producedArtifactPath !== null
    && (typeof record.producedArtifactPath !== "string" || !record.producedArtifactPath.trim())) {
    throw new Error("actor record producedArtifactPath must be a non-empty string");
  }
  return record;
}

function parseReviewReport(filePath) {
  const record = readJson(filePath);
  const fields = ["schema", "runId", "fullFlowContract", "actorInstanceId", "story", "phase", "inputCommit", "inputTree", "capsulePath", "capsuleSha256", "verdict", "findings"];
  rejectUnknownFields(record, fields, "review report");
  requireFields(record, ["schema", "runId", "fullFlowContract", "actorInstanceId", "story", "phase", "inputCommit", "inputTree", "verdict", "findings"], "review report");
  if (record.schema !== "acef.review-report.v3") throw new Error("review report schema must be acef.review-report.v3");
  if (typeof record.runId !== "string" || !record.runId.trim()) throw new Error("review report runId must be non-empty");
  if (record.fullFlowContract !== "four-actor-v3") throw new Error("review report fullFlowContract must be four-actor-v3");
  if (record.capsulePath !== undefined && (typeof record.capsulePath !== "string" || !/^docs\/ai\/capsules\/[^/]+\.json$/.test(record.capsulePath))) {
    throw new Error("review report capsulePath must be docs/ai/capsules/*.json");
  }
  if (record.capsuleSha256 !== undefined && !/^[a-f0-9]{64}$/.test(record.capsuleSha256)) {
    throw new Error("review report capsuleSha256 must be sha256");
  }
  requireEnum(record, "phase", ["code-review", "patch-assurance"], "review report");
  if (typeof record.verdict === "string") record.verdict = record.verdict.toUpperCase();
  requireEnum(record, "verdict", ["PASS", "REVISE", "REPLAN"], "review report");
  if (!Array.isArray(record.findings)) throw new Error("review report findings must be an array");
  for (const [index, finding] of record.findings.entries()) {
    if (!finding || typeof finding !== "object" || Array.isArray(finding)) throw new Error(`review report findings[${index}] must be an object`);
    requireFields(finding, ["id", "severity", "status"], `review report findings[${index}]`);
    rejectUnknownFields(finding, ["id", "severity", "status", "reason", "approvalId"], `review report findings[${index}]`);
    if (typeof finding.severity === "string") {
      finding.severity = finding.severity.toUpperCase();
      if (finding.severity === "INFO") finding.severity = "LOW";
    }
    if (typeof finding.status === "string") {
      finding.status = finding.status.toUpperCase();
      if (finding.status === "CLOSED") finding.status = "RESOLVED";
    }
    requireEnum(finding, "severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"], `review report findings[${index}]`);
    requireEnum(finding, "status", ["OPEN", "RESOLVED", "DISMISSED", "DEFERRED"], `review report findings[${index}]`);
    if (finding.status === "DISMISSED" && (typeof finding.reason !== "string" || !finding.reason.trim())) {
      throw new Error(`review report findings[${index}] DISMISSED requires a reviewer reason`);
    }
    if (finding.status === "DEFERRED" && (typeof finding.approvalId !== "string" || !/^[A-Za-z0-9._-]+$/.test(finding.approvalId))) {
      throw new Error(`review report findings[${index}] DEFERRED requires a typed approvalId`);
    }
    if (["DISMISSED", "DEFERRED"].includes(finding.status) && ["HIGH", "CRITICAL"].includes(finding.severity)) {
      throw new Error(`review report findings[${index}] cannot ${finding.status.toLowerCase()} ${finding.severity} findings`);
    }
  }
  if (record.verdict === "PASS" && record.findings.some((finding) => finding.status === "OPEN")) {
    throw new Error("PASS review report cannot contain OPEN findings");
  }
  if (record.verdict !== "PASS" && !record.findings.some((finding) => finding.status === "OPEN")) {
    throw new Error(`${record.verdict} review report requires at least one OPEN finding`);
  }
  return record;
}

function parseDeveloperRepair(filePath) {
  const record = readJson(filePath);
  const fields = ["schema", "runId", "fullFlowContract", "story", "cycle", "priorGateId", "findingsSha256", "developerActorId", "developerSessionId", "preCommit", "preTree", "postCommit", "postTree", "createdAt"];
  rejectUnknownFields(record, fields, "developer repair receipt");
  requireFields(record, fields, "developer repair receipt");
  if (record.schema !== "acef.developer-repair.v3" || record.fullFlowContract !== "four-actor-v3") throw new Error("developer repair receipt schema/contract mismatch");
  if (!Number.isInteger(record.cycle) || record.cycle < 1 || record.cycle > 2) throw new Error("developer repair receipt cycle must be 1 or 2");
  if (!/^[a-f0-9]{64}$/.test(record.findingsSha256)) throw new Error("developer repair receipt findingsSha256 must be sha256");
  return record;
}

function parseAssuranceCapsule(filePath) {
  const record = readJson(filePath);
  const fields = [
    "schema", "runId", "fullFlowContract", "runtimeContract", "story", "role", "actorInstanceId",
    "reviewCycle", "baseCommit", "inputCommit", "inputTree", "scopePaths", "acceptanceIds",
    "currentContext", "diff", "sourceBlobs", "redEvidence", "greenEvidence", "previousFindings",
    "repairReceipt", "reviewPolicy", "allowedCommands", "integrity",
  ];
  rejectUnknownFields(record, fields, "assurance capsule");
  requireFields(record, fields.filter((field) => !["previousFindings", "repairReceipt"].includes(field)), "assurance capsule");
  if (record.schema !== "acef.assurance-capsule.v1"
    || record.fullFlowContract !== "four-actor-v3"
    || record.runtimeContract !== "capsule-supervisor-v1") {
    throw new Error("assurance capsule schema/contract mismatch");
  }
  requireEnum(record, "role", ["code-review", "patch-assurance"], "assurance capsule");
  if (!Number.isInteger(record.reviewCycle) || record.reviewCycle < 0 || record.reviewCycle > 2) {
    throw new Error("assurance capsule reviewCycle must be 0, 1, or 2");
  }
  for (const field of ["scopePaths", "acceptanceIds", "reviewPolicy", "allowedCommands"]) {
    requireStringArray(record, field, "assurance capsule", { nonEmpty: true });
  }
  if (!Array.isArray(record.sourceBlobs) || !record.sourceBlobs.length) {
    throw new Error("assurance capsule sourceBlobs must not be empty");
  }
  const blobs = [record.currentContext, record.diff, ...record.sourceBlobs];
  for (const [index, blob] of blobs.entries()) {
    if (!blob || typeof blob !== "object" || Array.isArray(blob)) throw new Error(`assurance capsule blob ${index} must be an object`);
    requireFields(blob, ["path", "sha256", "bytes", "content"], `assurance capsule blob ${index}`);
    if (!/^[a-f0-9]{64}$/.test(blob.sha256) || Buffer.byteLength(blob.content) !== blob.bytes) {
      throw new Error(`assurance capsule blob ${index} hash/byte metadata is invalid`);
    }
  }
  if (!record.integrity || record.integrity.algorithm !== "sha256"
    || !/^[a-f0-9]{64}$/.test(record.integrity.payloadSha256 || "")) {
    throw new Error("assurance capsule integrity is invalid");
  }
  return record;
}

function parseProcessJudgeDecision(filePath) {
  const record = readJson(filePath);
  const fields = ["schema", "runId", "fullFlowContract", "story", "trigger", "actorId", "gateId", "evidenceIds", "verdict", "createdAt"];
  rejectUnknownFields(record, fields, "Process Judge decision");
  requireFields(record, fields, "Process Judge decision");
  if (record.schema !== "acef.process-judge-decision.v3" || record.fullFlowContract !== "four-actor-v3") throw new Error("Process Judge decision schema/contract mismatch");
  requireEnum(record, "trigger", ["ambiguity", "waiver", "evidence-conflict", "gate-anomaly"], "Process Judge decision");
  requireEnum(record, "verdict", ["ACKNOWLEDGE", "APPROVE_WAIVER"], "Process Judge decision");
  requireStringArray(record, "evidenceIds", "Process Judge decision", { nonEmpty: true });
  return record;
}

function parseEvidenceManifest(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["evidenceId", "kind", "command", "repositoryCommit", "actorInstanceId", "story", "rawArtifact", "runnerProof", "satisfies"], "evidence manifest");
  requireEnum(record, "kind", ["runtime-test", "static-check", "manual-smoke", "build", "lint", "typecheck", "other"], "evidence manifest");
  if (!Number.isInteger(record.exitCode)) throw new Error("evidence manifest missing integer exitCode");
  requireStringArray(record, "satisfies", "evidence manifest", { nonEmpty: true });
  for (const field of ["dirtyApplicationPathsBefore", "dirtyApplicationPathsAfter"]) {
    if (record[field] !== undefined) requireStringArray(record, field, "evidence manifest");
  }
  if (!record.rawArtifact || typeof record.rawArtifact !== "object") throw new Error("evidence manifest missing rawArtifact");
  requireFields(record.rawArtifact, ["path", "sha256"], "evidence rawArtifact");
  requireRunnerProof(record.runnerProof, "evidence runnerProof");
  if (record.discovery !== undefined) {
    requireFields(record.discovery, ["command", "exitCode", "expectedTests", "discoveredTests", "stdoutSha256"], "evidence discovery");
    if (record.discovery.exitCode !== 0) throw new Error("evidence discovery exitCode must be 0");
    requireStringArray(record.discovery, "expectedTests", "evidence discovery", { nonEmpty: true });
    requireStringArray(record.discovery, "discoveredTests", "evidence discovery", { nonEmpty: true });
    const missing = record.discovery.expectedTests.filter((test) => !record.discovery.discoveredTests.includes(test));
    if (missing.length) throw new Error(`evidence discovery is missing expected test(s): ${missing.join(", ")}`);
    if (!/^[a-f0-9]{64}$/.test(record.discovery.stdoutSha256)) throw new Error("evidence discovery stdoutSha256 must be sha256");
  }
  return record;
}

function parseGateVerdict(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["gateId", "scope", "verdict", "decidedBy", "repositoryCommit"], "gate verdict");
  requireEnum(record, "verdict", ["PASS", "FAIL", "REVISE", "REPLAN", "BLOCKED"], "gate verdict");
  if (record.evidenceIds !== undefined) requireStringArray(record, "evidenceIds", "gate verdict");
  if (record.surfaceEvidence !== undefined) {
    if (!Array.isArray(record.surfaceEvidence)) throw new Error("gate verdict surfaceEvidence must be an array");
    for (const [index, item] of record.surfaceEvidence.entries()) {
      if (!item || typeof item !== "object") throw new Error(`gate verdict surfaceEvidence[${index}] must be an object`);
      requireFields(item, ["surface", "evidenceId"], `gate verdict surfaceEvidence[${index}]`);
      requireSurface(item.surface, `gate verdict surfaceEvidence[${index}]`);
      if (item.roundTrip !== undefined && typeof item.roundTrip !== "boolean") throw new Error(`gate verdict surfaceEvidence[${index}].roundTrip must be boolean`);
      if (item.firstUsePattern !== undefined && typeof item.firstUsePattern !== "boolean") throw new Error(`gate verdict surfaceEvidence[${index}].firstUsePattern must be boolean`);
    }
  }
  if (record.inputOutputEvidence !== undefined) {
    if (!Array.isArray(record.inputOutputEvidence)) throw new Error("gate verdict inputOutputEvidence must be an array");
    for (const [index, item] of record.inputOutputEvidence.entries()) {
      validateBindingEntry(item, index, "gate verdict inputOutputEvidence", { requireEvidence: true });
    }
  }
  if (record.verdict === "PASS" && (!Array.isArray(record.evidenceIds) || !record.evidenceIds.length)) {
    throw new Error("PASS gate verdict requires evidenceIds");
  }
  if (record.gateType !== undefined) {
    requireEnum(record, "gateType", ["actor-decided-v1", "deterministic-story-close-v3"], "gate verdict");
  }
  if (record.fullFlowContract === "four-actor-v3") {
    requireFields(record, ["runId", "storyInventory"], "four-actor-v3 gate verdict");
    requireStringArray(record, "storyInventory", "four-actor-v3 gate verdict", { nonEmpty: true });
    if (new Set(record.storyInventory).size !== record.storyInventory.length) throw new Error("four-actor-v3 gate storyInventory must be unique");
  }
  if (record.fullFlowContract === "four-actor-v3" && record.gateType === "actor-decided-v1") {
    requireStringArray(record, "storyInventory", "four-actor-v3 Epic gate", { nonEmpty: true });
    if (new Set(record.storyInventory).size !== record.storyInventory.length) throw new Error("four-actor-v3 Epic gate storyInventory must be unique");
    if (record.missingStories !== undefined) requireStringArray(record, "missingStories", "four-actor-v3 Epic gate");
    if (record.storyGateVerdicts !== undefined) {
      requireObject(record, "storyGateVerdicts", "four-actor-v3 Epic gate");
      for (const [story, verdict] of Object.entries(record.storyGateVerdicts)) {
        if (!record.storyInventory.includes(story) || !["PASS", "FAIL", "REVISE", "REPLAN", "BLOCKED", "MISSING"].includes(verdict)) {
          throw new Error("four-actor-v3 Epic gate storyGateVerdicts must bind inventory stories to typed verdicts");
        }
      }
    }
  }
  if (record.decisionMode !== undefined) requireEnum(record, "decisionMode", ["actor", "deterministic"], "gate verdict");
  if (record.gateType === "deterministic-story-close-v3") {
    requireFields(record, [
      "runId", "fullFlowContract", "repositoryTree", "applicationCommit", "applicationTree", "scopePaths", "validatorVersion", "actors",
      "redEvidenceId", "greenEvidenceId", "executedChecks", "reviewCycle", "unresolvedFindings", "findingDispositions", "reportHashes", "reportPaths",
    ], "deterministic story-close gate");
    if (record.fullFlowContract !== "four-actor-v3") throw new Error("deterministic story-close gate fullFlowContract must be four-actor-v3");
    if (record.decisionMode !== "deterministic" || record.decidedBy !== "acef-story-close-v3") {
      throw new Error("deterministic story-close gate must be decided mechanically by acef-story-close-v3");
    }
    requireStringArray(record, "scopePaths", "deterministic story-close gate", { nonEmpty: true });
    const controlPath = (entry) => /^docs\/ai\/(?:ACEF_(?:ACTIVE_RUN\.json|ACTIVE_WORKER_SCOPE\.json|DIRECT_RUN\.json|CURRENT_CONTEXT\.md|[^/]+_DELIVERY_AUDIT\.md)|actors\/|gates\/|evidence\/|reports\/|approvals\/|repairs\/|judges\/)/.test(entry);
    if (new Set(record.scopePaths).size !== record.scopePaths.length
      || record.scopePaths.some((entry) => path.isAbsolute(entry) || entry.split(/[\\/]/).includes("..") || controlPath(entry))) {
      throw new Error("deterministic story-close gate scopePaths must be unique repository-relative non-control paths");
    }
    const roles = ["atdd", "development", "codeReview", "patchAssurance"];
    requireObject(record, "actors", "deterministic story-close gate");
    requireFields(record.actors, roles, "deterministic story-close gate actors");
    if (new Set(roles.map((role) => record.actors[role])).size !== roles.length) {
      throw new Error("deterministic story-close gate actors must be distinct");
    }
    requireObject(record, "executedChecks", "deterministic story-close gate");
    const checks = ["actorSeparation", "atddTestOnlyRed", "redGreenChronology", "finalTreeReview", "patchAssurance", "findingsResolved", "runnerProof", "scopeBinding", "hashBinding"];
    requireFields(record.executedChecks, checks, "deterministic story-close gate executedChecks");
    if (checks.some((check) => typeof record.executedChecks[check] !== "boolean")) {
      throw new Error("deterministic story-close gate executedChecks values must be boolean");
    }
    if (record.verdict === "PASS" && checks.some((check) => record.executedChecks[check] !== true)) {
      throw new Error("deterministic story-close PASS requires every mechanical check to pass");
    }
    if (!Number.isInteger(record.reviewCycle) || record.reviewCycle < 0 || record.reviewCycle > 2) {
      throw new Error("deterministic story-close gate reviewCycle must be an integer between 0 and 2");
    }
    if (record.reviewCycle > 0) {
      requireObject(record, "repair", "deterministic story-close gate");
      requireFields(record.repair, ["cycle", "priorGateId", "developerActorId", "receiptPath", "receiptSha256"], "deterministic story-close gate repair");
      if (record.repair.cycle !== record.reviewCycle) throw new Error("deterministic story-close repair cycle must match reviewCycle");
      if (!/^[a-f0-9]{64}$/.test(record.repair.receiptSha256)) throw new Error("deterministic story-close repair receiptSha256 must be sha256");
    }
    if (!Array.isArray(record.unresolvedFindings)) throw new Error("deterministic story-close gate unresolvedFindings must be an array");
    for (const [index, finding] of record.unresolvedFindings.entries()) {
      if (!finding || typeof finding !== "object") throw new Error(`deterministic story-close gate unresolvedFindings[${index}] must be an object`);
      requireFields(finding, ["severity", "id"], `deterministic story-close gate unresolvedFindings[${index}]`);
      requireEnum(finding, "severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"], `deterministic story-close gate unresolvedFindings[${index}]`);
    }
    if (!Array.isArray(record.findingDispositions)) throw new Error("deterministic story-close gate findingDispositions must be an array");
    for (const [index, finding] of record.findingDispositions.entries()) {
      if (!finding || typeof finding !== "object") throw new Error(`deterministic story-close gate findingDispositions[${index}] must be an object`);
      requireFields(finding, ["id", "severity", "status"], `deterministic story-close gate findingDispositions[${index}]`);
      requireEnum(finding, "severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"], `deterministic story-close gate findingDispositions[${index}]`);
      requireEnum(finding, "status", ["OPEN", "RESOLVED", "DISMISSED", "DEFERRED"], `deterministic story-close gate findingDispositions[${index}]`);
    }
    requireObject(record, "reportHashes", "deterministic story-close gate");
    requireFields(record.reportHashes, ["codeReview", "patchAssurance"], "deterministic story-close gate reportHashes");
    for (const hash of Object.values(record.reportHashes)) {
      if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error("deterministic story-close gate report hashes must be lowercase sha256 values");
    }
    requireObject(record, "reportPaths", "deterministic story-close gate");
    requireFields(record.reportPaths, ["codeReview", "patchAssurance"], "deterministic story-close gate reportPaths");
    if (record.processJudge !== undefined) {
      requireObject(record, "processJudge", "deterministic story-close gate");
      requireFields(record.processJudge, ["trigger", "actorId", "decisionPath", "decisionSha256", "verdict"], "deterministic story-close gate processJudge");
      requireEnum(record.processJudge, "trigger", ["ambiguity", "waiver", "evidence-conflict", "gate-anomaly"], "deterministic story-close gate processJudge");
      requireEnum(record.processJudge, "verdict", ["ACKNOWLEDGE", "APPROVE_WAIVER"], "deterministic story-close gate processJudge");
      if (!/^[a-f0-9]{64}$/.test(record.processJudge.decisionSha256)) throw new Error("deterministic story-close gate Process Judge decisionSha256 must be sha256");
    }
  }
  return record;
}

function parseApproval(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["approvalId", "decision", "scope", "actorType", "statementHash", "repositoryCommit"], "approval");
  requireEnum(record, "decision", ["APPROVE", "REJECT", "ACCEPT_RISK"], "approval");
  requireEnum(record, "actorType", ["human", "system"], "approval");
  if (record.actorType === "human" && (!record.userQuote || !String(record.userQuote).trim())) {
    throw new Error("human approval requires userQuote");
  }
  if (record.targetEpic !== undefined && record.targetEpic !== null
    && (!Number.isInteger(record.targetEpic) || record.targetEpic < 1)) {
    throw new Error("approval targetEpic must be a positive integer");
  }
  return record;
}

function parseWorkerScope(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["activeStory", "phase", "workerId", "allowedPaths", "baseRef", "maxCommits"], "worker scope");
  if (record.runId !== undefined && (typeof record.runId !== "string" || !record.runId.trim())) {
    throw new Error("worker scope runId must be a non-empty string");
  }
  requireStringArray(record, "allowedPaths", "worker scope", { nonEmpty: true });
  if (record.allowedPaths.some((entry) => path.isAbsolute(entry) || entry.split(/[\\/]/).includes(".."))) {
    throw new Error("worker scope allowedPaths must be repo-relative and cannot contain ..");
  }
  if (!Number.isInteger(record.maxCommits) || record.maxCommits < 1) {
    throw new Error("worker scope maxCommits must be a positive integer");
  }
  if (record.surfaces !== undefined) {
    requireStringArray(record, "surfaces", "worker scope");
    for (const surface of record.surfaces) {
      requireSurface(surface, "worker scope");
    }
  }
  if (record.patternUse !== undefined) {
    requireEnum(record, "patternUse", ["new-reusable-pattern", "reuse-existing-pattern", "one-off", "unknown"], "worker scope");
  }
  if (record.requiresRoundTrip !== undefined && typeof record.requiresRoundTrip !== "boolean") {
    throw new Error("worker scope requiresRoundTrip must be boolean");
  }
  if (record.inputOutputBindings !== undefined) {
    if (!Array.isArray(record.inputOutputBindings)) throw new Error("worker scope inputOutputBindings must be an array");
    for (const [index, item] of record.inputOutputBindings.entries()) {
      validateBindingEntry(item, index, "worker scope inputOutputBindings");
    }
  }
  if (record.canEditLedger !== false) throw new Error("worker scope canEditLedger must be false");
  if (record.canSpawnAgents !== false) throw new Error("worker scope canSpawnAgents must be false");
  return record;
}

function parseAtddCorrection(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["schema", "sourceActorId", "correctionActorId", "scope", "findingsSha256", "allowedPaths"], "ATDD correction");
  requireEnum(record, "schema", ["acef.atdd-correction.v1"], "ATDD correction");
  requireEnum(record, "scope", ["test-artifacts-only"], "ATDD correction");
  if (!/^[a-f0-9]{64}$/.test(record.findingsSha256)) throw new Error("ATDD correction findingsSha256 must be lowercase SHA-256");
  requireStringArray(record, "allowedPaths", "ATDD correction", { nonEmpty: true });
  if (new Set(record.allowedPaths).size !== record.allowedPaths.length) throw new Error("ATDD correction allowedPaths must be unique");
  if (record.allowedPaths.some((entry) => path.isAbsolute(entry) || entry.split(/[\\/]/).includes("..") || /[*?\[\]{}]/.test(entry))) {
    throw new Error("ATDD correction allowedPaths must be explicit repo-relative paths without globs or ..");
  }
  return record;
}

function parseScalar(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function parseStringList(lines, startIndex) {
  const values = [];
  let index = startIndex;
  while (index < lines.length) {
    const line = lines[index];
    if (/^ {6}- /.test(line)) {
      values.push(parseScalar(line.replace(/^ {6}- /, "")));
      index += 1;
      continue;
    }
    break;
  }
  return { values, nextIndex: index };
}

function parseWorkflowYaml(text) {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+#.*$/, "").replace(/\s+$/, ""));
  const record = { workflow: "", version: "", nodes: [] };
  let inNodes = false;
  let current = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!inNodes && /^workflow:\s*/.test(line)) {
      record.workflow = parseScalar(line.replace(/^workflow:\s*/, ""));
      continue;
    }
    if (!inNodes && /^version:\s*/.test(line)) {
      record.version = parseScalar(line.replace(/^version:\s*/, ""));
      continue;
    }
    if (line === "nodes:") {
      inNodes = true;
      continue;
    }
    if (!inNodes) throw new Error(`unsupported workflow line: ${line}`);
    if (/^  - id:\s*/.test(line)) {
      current = { id: parseScalar(line.replace(/^  - id:\s*/, "")), type: "", requires: [], inputs: [], outputs: [] };
      record.nodes.push(current);
      continue;
    }
    if (!current) throw new Error(`node field before node id: ${line}`);
    const keyValue = line.match(/^    ([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValue) throw new Error(`unsupported node line: ${line}`);
    const [, key, rawValue] = keyValue;
    if (["requires", "inputs", "outputs"].includes(key)) {
      if (rawValue.trim()) {
        current[key] = rawValue.split(",").map((entry) => parseScalar(entry.replace(/^\[|\]$/g, ""))).filter(Boolean);
      } else {
        const parsed = parseStringList(lines, index + 1);
        current[key] = parsed.values;
        index = parsed.nextIndex - 1;
      }
    } else {
      current[key] = parseScalar(rawValue);
    }
  }
  return record;
}

function parseWorkflow(filePath) {
  const record = parseWorkflowYaml(fs.readFileSync(filePath, "utf8"));
  requireFields(record, ["workflow", "version"], "workflow");
  if (!Array.isArray(record.nodes) || !record.nodes.length) throw new Error("workflow nodes must not be empty");
  const seen = new Set();
  const allowedTypes = ["agent", "command", "validator", "gate", "approval"];
  for (const [index, node] of record.nodes.entries()) {
    requireFields(node, ["id", "type"], `workflow node ${index + 1}`);
    if (seen.has(node.id)) throw new Error(`workflow duplicate node id: ${node.id}`);
    seen.add(node.id);
    if (!allowedTypes.includes(node.type)) throw new Error(`workflow node ${node.id} type must be one of: ${allowedTypes.join(", ")}`);
    for (const field of ["requires", "inputs", "outputs"]) {
      if (!Array.isArray(node[field])) throw new Error(`workflow node ${node.id} ${field} must be an array`);
      if (node[field].some((value) => typeof value !== "string" || !value.trim())) {
        throw new Error(`workflow node ${node.id} ${field} must contain non-empty strings`);
      }
    }
    requireRelativePaths(node.inputs, `workflow node ${node.id} inputs`);
    requireRelativePaths(node.outputs, `workflow node ${node.id} outputs`);
    for (const required of node.requires) {
      if (!seen.has(required)) throw new Error(`workflow node ${node.id} requires unknown or later node: ${required}`);
    }
    if (node.type === "agent" && !String(node.role || "").trim()) throw new Error(`workflow node ${node.id} agent requires role`);
    if (node.type === "command" && !String(node.command || "").trim()) throw new Error(`workflow node ${node.id} command requires command`);
  }
  return record;
}

function requireRelativePaths(values, label) {
  requireStringArray({ values }, "values", label);
  if (values.some((entry) => path.isAbsolute(entry) || entry.split(/[\\/]/).includes(".."))) {
    throw new Error(`${label} paths must be repo-relative and cannot contain ..`);
  }
}

function parsePrReview(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["reviewId", "reviewerActorId", "baseCommit", "headCommit", "changedFiles", "selectedPaths", "workShapes", "inputs", "reviewProfile", "diffArtifact", "reportPath", "writeMode", "qaMode", "maxFiles", "maxDiffLines"], "PR review");
  requireStringArray(record, "changedFiles", "PR review", { nonEmpty: true });
  requireStringArray(record, "selectedPaths", "PR review", { nonEmpty: true });
  requireStringArray(record, "workShapes", "PR review", { nonEmpty: true });
  requireRelativePaths(record.changedFiles, "PR review changedFiles");
  requireRelativePaths(record.selectedPaths, "PR review selectedPaths");
  if (record.broadReadPaths !== undefined) {
    requireStringArray(record, "broadReadPaths", "PR review");
    requireRelativePaths(record.broadReadPaths, "PR review broadReadPaths");
    if (record.broadReadPaths.length && !String(record.broadReadReason || "").trim()) {
      throw new Error("PR review broad reads require broadReadReason");
    }
  }
  requireEnum(record, "writeMode", ["report-only"], "PR review");
  requireEnum(record, "qaMode", ["none", "qa-only"], "PR review");
  if (!record.inputs || typeof record.inputs !== "object") throw new Error("PR review inputs must be an object");
  requireFields(record.inputs, ["issuePath", "focusedTests", "adapterPath", "patternRegistryPath", "qaEvidencePaths"], "PR review inputs");
  requireStringArray(record.inputs, "focusedTests", "PR review inputs", { nonEmpty: true });
  requireStringArray(record.inputs, "qaEvidencePaths", "PR review inputs");
  requireRelativePaths([record.inputs.issuePath, record.inputs.adapterPath, record.inputs.patternRegistryPath, record.reportPath, record.diffArtifact?.path, record.reviewProfile?.path].filter(Boolean), "PR review artifact");
  requireRelativePaths(record.inputs.qaEvidencePaths, "PR review QA evidence");
  if (!record.reviewProfile || typeof record.reviewProfile !== "object") throw new Error("PR review reviewProfile must be an object");
  requireFields(record.reviewProfile, ["path", "sha256"], "PR review reviewProfile");
  if (!/^[a-f0-9]{64}$/.test(record.reviewProfile.sha256)) throw new Error("PR review reviewProfile sha256 must be a SHA-256 hex digest");
  if (!record.diffArtifact || typeof record.diffArtifact !== "object") throw new Error("PR review diffArtifact must be an object");
  requireFields(record.diffArtifact, ["path", "sha256", "lineCount"], "PR review diffArtifact");
  if (!/^[a-f0-9]{64}$/.test(record.diffArtifact.sha256)) throw new Error("PR review diffArtifact sha256 must be a SHA-256 hex digest");
  if (!Number.isInteger(record.diffArtifact.lineCount) || record.diffArtifact.lineCount < 1) throw new Error("PR review diffArtifact lineCount must be positive");
  if (!Number.isInteger(record.maxFiles) || record.maxFiles < 1) throw new Error("PR review maxFiles must be positive");
  if (!Number.isInteger(record.maxDiffLines) || record.maxDiffLines < 1) throw new Error("PR review maxDiffLines must be positive");
  if (record.selectedPaths.some((entry) => !record.changedFiles.includes(entry))) throw new Error("PR review selectedPaths must stay inside changedFiles");
  return record;
}

function recordFromPathOrObject(input, label) {
  if (typeof input === "string") return readJson(input);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error(`${label} must be an object`);
  return input;
}

function requireShaArtifact(record, label) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error(`${label} must be an object`);
  requireFields(record, ["path", "sha256"], label);
  requireRelativePaths([record.path], label);
  if (!/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error(`${label} sha256 must be a SHA-256 hex digest`);
}

function requireRunnerProof(record, label) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error(`${label} must be an object`);
  requireFields(record, ["schema", "runner", "sha256"], label);
  if (typeof record.schema !== "string" || !record.schema.trim()) throw new Error(`${label}.schema must be a non-empty string`);
  if (typeof record.runner !== "string" || !record.runner.trim()) throw new Error(`${label}.runner must be a non-empty string`);
  if (!/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error(`${label}.sha256 must be a SHA-256 hex digest`);
}

function parsePrReviewProfile(input, label = "PR review profile") {
  const record = recordFromPathOrObject(input, label);
  requireFields(record, ["profileId", "reviewId", "generatedAt", "baseCommit", "headCommit", "changedFiles", "selectedPaths", "workShapes", "genericRulesSupplementOnly", "source", "adapterSignals", "selectedPatterns", "globalDoNotCopy"], label);
  requireStringArray(record, "changedFiles", label, { nonEmpty: true });
  requireStringArray(record, "selectedPaths", label, { nonEmpty: true });
  requireStringArray(record, "workShapes", label, { nonEmpty: true });
  requireRelativePaths(record.changedFiles, `${label} changedFiles`);
  requireRelativePaths(record.selectedPaths, `${label} selectedPaths`);
  if (record.genericRulesSupplementOnly !== true) throw new Error(`${label} genericRulesSupplementOnly must be true`);
  if (!record.source || typeof record.source !== "object") throw new Error(`${label} source must be an object`);
  requireShaArtifact(record.source.adapter, `${label} source.adapter`);
  requireShaArtifact(record.source.patternRegistry, `${label} source.patternRegistry`);
  if (!["READY", "PARTIAL"].includes(record.source.patternRegistry.status)) {
    throw new Error(`${label} patternRegistry status must be READY or PARTIAL`);
  }
  if (!Array.isArray(record.source.patternRegistry.coveredScopes)) throw new Error(`${label} patternRegistry coveredScopes must be an array`);
  if (!Array.isArray(record.adapterSignals)) throw new Error(`${label} adapterSignals must be an array`);
  for (const [index, signal] of record.adapterSignals.entries()) {
    requireFields(signal, ["line", "text"], `${label} adapterSignals[${index}]`);
    if (!Number.isInteger(signal.line) || signal.line < 1) throw new Error(`${label} adapterSignals[${index}].line must be positive`);
  }
  if (!Array.isArray(record.selectedPatterns) || !record.selectedPatterns.length) throw new Error(`${label} selectedPatterns must not be empty`);
  for (const [index, pattern] of record.selectedPatterns.entries()) {
    requireFields(pattern, ["id", "workShape", "status", "maturity", "summary", "evidence", "completionEvidence", "sourceEvidence", "goldenNeighbors", "reuseProbe", "doNotCopy", "confidence", "lastVerifiedAt", "lastVerifiedCommit", "refreshTriggers"], `${label} selectedPatterns[${index}]`);
    if (!record.workShapes.includes(pattern.workShape)) throw new Error(`${label} selectedPatterns[${index}] workShape is outside requested workShapes`);
    if (!pattern.completionEvidence || typeof pattern.completionEvidence !== "object") throw new Error(`${label} selectedPatterns[${index}].completionEvidence must be an object`);
    for (const field of ["structure", "registration", "discoverability", "runtime"]) {
      if (!String(pattern.completionEvidence[field] || "").trim()) throw new Error(`${label} selectedPatterns[${index}].completionEvidence.${field} is required`);
    }
    for (const arrayField of ["sourceEvidence", "goldenNeighbors", "reuseProbe", "doNotCopy", "refreshTriggers"]) {
      if (!Array.isArray(pattern[arrayField])) throw new Error(`${label} selectedPatterns[${index}].${arrayField} must be an array`);
    }
  }
  if (!Array.isArray(record.globalDoNotCopy)) throw new Error(`${label} globalDoNotCopy must be an array`);
  for (const [index, entry] of record.globalDoNotCopy.entries()) {
    requireFields(entry, ["id", "reason", "sourceEvidence", "lastVerifiedCommit"], `${label} globalDoNotCopy[${index}]`);
    if (!Array.isArray(entry.sourceEvidence)) throw new Error(`${label} globalDoNotCopy[${index}].sourceEvidence must be an array`);
  }
  return record;
}

function parseLightweightRun(filePath) {
  const record = readJson(filePath);
  const v2 = record.schema === "acef.lightweight-run.v2";
  requireFields(
    record,
    v2
      ? ["schema", "runId", "workflowId", "assuranceProfile", "status", "implementationActorId", "reviewActorId", "steps", "promotion"]
      : ["runId", "lane", "status", "implementationActorId", "reviewActorId", "steps", "promotion"],
    "lightweight run",
  );
  if (v2) {
    requireEnum(record, "workflowId", ["quick-fix", "lightweight"], "lightweight run");
    requireEnum(record, "assuranceProfile", ASSURANCE_PROFILES, "lightweight run");
    if (record.lane !== undefined) throw new Error("lightweight run v2 must use workflowId, not lane");
  } else {
    requireEnum(record, "lane", ["quick-fix", "lightweight", "guarded"], "lightweight run");
  }
  requireEnum(record, "status", ["active", "blocked", "complete"], "lightweight run");
  if (record.implementationActorId === record.reviewActorId) throw new Error("lightweight run requires an independent review actor");
  const expected = ["preflight-current-context", "reuse-before-create", "implementation", "independent-review", "focused-verification", "closeout-evidence"];
  if (!Array.isArray(record.steps) || record.steps.length !== expected.length) throw new Error("lightweight run requires exactly six lifecycle steps");
  record.steps.forEach((step, index) => {
    requireFields(step, ["name", "status", "evidencePaths"], `lightweight step ${index + 1}`);
    if (step.name !== expected[index]) throw new Error(`lightweight step ${index + 1} must be ${expected[index]}`);
    requireEnum(step, "status", ["PENDING", "PASS", "BLOCKED"], `lightweight step ${step.name}`);
    requireStringArray(step, "evidencePaths", `lightweight step ${step.name}`);
    requireRelativePaths(step.evidencePaths, `lightweight step ${step.name}`);
    if (step.status === "PASS" && !step.evidencePaths.length) throw new Error(`lightweight step ${step.name} PASS requires evidencePaths`);
  });
  if (record.status === "complete" && record.steps.some((step) => step.status !== "PASS")) {
    throw new Error("complete lightweight run requires every lifecycle step to PASS");
  }
  if (!record.promotion || typeof record.promotion !== "object") throw new Error("lightweight run promotion must be an object");
  requireFields(record.promotion, ["decision", "triggers"], "lightweight promotion");
  requireEnum(record.promotion, "decision", ["stay-lightweight", "promote-full-bmad", "human-risk-acceptance"], "lightweight promotion");
  requireStringArray(record.promotion, "triggers", "lightweight promotion");
  if (record.promotion.triggers.length && record.promotion.decision === "stay-lightweight") {
    throw new Error("lightweight promotion triggers require full BMAD promotion or human risk acceptance");
  }
  if (record.surfaces !== undefined) {
    requireStringArray(record, "surfaces", "lightweight run");
    for (const surface of record.surfaces) {
      requireSurface(surface, "lightweight run");
    }
  }
  if (record.surfaceEvidence !== undefined) {
    if (!Array.isArray(record.surfaceEvidence)) throw new Error("lightweight run surfaceEvidence must be an array");
    for (const [index, item] of record.surfaceEvidence.entries()) {
      if (!item || typeof item !== "object") throw new Error(`lightweight run surfaceEvidence[${index}] must be an object`);
      requireFields(item, ["surface", "evidencePath", "command", "exitCode", "runnerProof"], `lightweight run surfaceEvidence[${index}]`);
      requireSurface(item.surface, `lightweight run surfaceEvidence[${index}]`);
      if (typeof item.evidencePath !== "string" || !item.evidencePath.trim()) throw new Error(`lightweight run surfaceEvidence[${index}].evidencePath must be a non-empty string`);
      requireRelativePaths([item.evidencePath], `lightweight run surfaceEvidence[${index}]`);
      if (typeof item.command !== "string" || !item.command.trim()) throw new Error(`lightweight run surfaceEvidence[${index}].command must be a non-empty string`);
      if (!Number.isInteger(item.exitCode)) throw new Error(`lightweight run surfaceEvidence[${index}].exitCode must be integer`);
      requireRunnerProof(item.runnerProof, `lightweight run surfaceEvidence[${index}].runnerProof`);
    }
  }
  if (record.quickFix !== undefined) {
    if (!record.quickFix || typeof record.quickFix !== "object") throw new Error("lightweight run quickFix must be an object");
    requireFields(record.quickFix, ["intent", "scope", "reproEvidencePath", "beforePatchEvidencePath", "afterPatchEvidencePath"], "quick-fix");
    for (const field of ["intent", "scope"]) {
      if (typeof record.quickFix[field] !== "string" || !record.quickFix[field].trim()) throw new Error(`quick-fix ${field} must be a non-empty string`);
    }
    for (const field of ["reproEvidencePath", "beforePatchEvidencePath", "afterPatchEvidencePath", "deferredWorkPath"]) {
      if (record.quickFix[field] !== undefined) {
        if (typeof record.quickFix[field] !== "string" || !record.quickFix[field].trim()) throw new Error(`quick-fix ${field} must be a non-empty string`);
        requireRelativePaths([record.quickFix[field]], `quick-fix ${field}`);
      }
    }
    if (record.quickFix.envelope !== undefined) {
      if (!record.quickFix.envelope || typeof record.quickFix.envelope !== "object") throw new Error("quick-fix envelope must be an object");
      requireFields(record.quickFix.envelope, ["source", "implementationPaths", "testPaths", "sharedResources"], "quick-fix envelope");
      requireEnum(record.quickFix.envelope, "source", ["computed", "declared", "accepted-risk"], "quick-fix envelope");
      for (const field of ["implementationPaths", "testPaths", "fixturePaths", "smokePaths"]) {
        if (record.quickFix.envelope[field] !== undefined) {
          requireStringArray(record.quickFix.envelope, field, "quick-fix envelope");
          requireRelativePaths(record.quickFix.envelope[field], `quick-fix envelope ${field}`);
        }
      }
      requireStringArray(record.quickFix.envelope, "sharedResources", "quick-fix envelope");
    }
    if (record.quickFix.testIntegrity !== undefined) {
      if (!Array.isArray(record.quickFix.testIntegrity)) throw new Error("quick-fix testIntegrity must be an array");
      for (const [index, item] of record.quickFix.testIntegrity.entries()) {
        if (!item || typeof item !== "object") throw new Error(`quick-fix testIntegrity[${index}] must be an object`);
        requireFields(item, ["testPath", "implementationReference", "beforeAssertionCount", "afterAssertionCount", "evidencePath"], `quick-fix testIntegrity[${index}]`);
        requireRelativePaths([item.testPath, item.evidencePath], `quick-fix testIntegrity[${index}]`);
        if (typeof item.implementationReference !== "string" || !item.implementationReference.trim()) throw new Error(`quick-fix testIntegrity[${index}].implementationReference must be a non-empty string`);
        if (!Number.isInteger(item.beforeAssertionCount) || item.beforeAssertionCount < 0) throw new Error(`quick-fix testIntegrity[${index}].beforeAssertionCount must be a non-negative integer`);
        if (!Number.isInteger(item.afterAssertionCount) || item.afterAssertionCount < 0) throw new Error(`quick-fix testIntegrity[${index}].afterAssertionCount must be a non-negative integer`);
        if (item.forbiddenPatternsAdded !== undefined && typeof item.forbiddenPatternsAdded !== "boolean") throw new Error(`quick-fix testIntegrity[${index}].forbiddenPatternsAdded must be boolean`);
        if (item.matcherLoosening !== undefined && typeof item.matcherLoosening !== "boolean") throw new Error(`quick-fix testIntegrity[${index}].matcherLoosening must be boolean`);
      }
    }
  }
  const lightweightWorkflow = v2
    ? record.workflowId
    : record.lane === "guarded" ? "lightweight" : record.lane;
  if (lightweightWorkflow === "quick-fix" && record.status === "complete" && !record.quickFix) {
    throw new Error("complete quick-fix run requires quickFix evidence");
  }
  if (v2) return { ...record, lane: record.workflowId };
  if (record.lane === "guarded") {
    return { ...record, workflowId: "lightweight", assuranceProfile: "guarded", lane: "lightweight" };
  }
  return { ...record, workflowId: record.lane, assuranceProfile: "baseline" };
}

function parseDirectRun(filePath) {
  const record = readJson(filePath);
  requireFields(record, [
    "schema",
    "version",
    "runId",
    "lane",
    "status",
    "scope",
    "acceptance",
    "technicalBoundary",
    "reversible",
    "riskTriggers",
    "promotion",
  ], "direct run");
  if (record.schema !== "acef.direct-run.v1") throw new Error("direct run schema must be acef.direct-run.v1");
  if (typeof record.version !== "string" || !record.version.trim()) throw new Error("direct run version must be a non-empty string");
  if (record.lane !== "direct") throw new Error("direct run lane must be direct");
  requireEnum(record, "status", ["active", "complete", "promoted"], "direct run");
  requireStringArray(record, "acceptance", "direct run", { nonEmpty: true });
  requireEnum(record, "technicalBoundary", DIRECT_BOUNDARIES, "direct run");
  if (record.reversible !== true) throw new Error("direct run must be reversible");
  requireStringArray(record, "riskTriggers", "direct run");
  if (record.baseCommit !== undefined && record.baseCommit !== null
    && (typeof record.baseCommit !== "string" || record.baseCommit.length < 6)) {
    throw new Error("direct run baseCommit must be null or a commit string of at least six characters");
  }
  if (record.changedPaths !== undefined) {
    requireStringArray(record, "changedPaths", "direct run");
    requireRelativePaths(record.changedPaths, "direct run changedPaths");
  }
  if (record.verification !== undefined) {
    if (!Array.isArray(record.verification)) throw new Error("direct run verification must be an array");
    for (const [index, item] of record.verification.entries()) {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`direct run verification[${index}] must be an object`);
      requireFields(item, ["command", "exitCode"], `direct run verification[${index}]`);
      if (typeof item.command !== "string" || !item.command.trim()) throw new Error(`direct run verification[${index}].command must be a non-empty string`);
      if (!Number.isInteger(item.exitCode)) throw new Error(`direct run verification[${index}].exitCode must be integer`);
    }
  }
  requireObject(record, "promotion", "direct run");
  requireFields(record.promotion, ["decision", "reasons"], "direct run promotion");
  requireEnum(record.promotion, "decision", [
    "stay-direct",
    "promote-lightweight",
    "promote-full-bmad",
    "promote-guarded",
  ], "direct run promotion");
  requireStringArray(record.promotion, "reasons", "direct run promotion");
  if (record.promotion.decision === "stay-direct" && record.promotion.reasons.length) {
    throw new Error("direct run stay-direct decision cannot list promotion reasons");
  }
  if (record.promotion.decision !== "stay-direct" && !record.promotion.reasons.length) {
    throw new Error("direct run promotion requires at least one reason");
  }
  if (record.handoff !== undefined) {
    requireObject(record, "handoff", "direct run");
    requireFields(record.handoff, ["summary", "unresolvedRisks"], "direct run handoff");
    requireStringArray(record.handoff, "unresolvedRisks", "direct run handoff");
  }
  if (record.status === "complete") {
    if (record.promotion.decision !== "stay-direct") throw new Error("complete direct run must stay-direct");
    if (!record.changedPaths?.length) throw new Error("complete direct run requires changedPaths");
    if (!record.verification?.length) throw new Error("complete direct run requires focused verification");
    if (record.verification.some((item) => item.exitCode !== 0)) throw new Error("complete direct run requires successful focused verification");
    if (!record.handoff) throw new Error("complete direct run requires handoff");
  }
  if (record.status === "promoted" && record.promotion.decision === "stay-direct") {
    throw new Error("promoted direct run requires a promotion decision");
  }
  return record;
}

const workerFailureKinds = [
  "provider_rate_limit",
  "provider_auth",
  "context_overflow",
  "budget_timeout",
  "tool_failed",
  "empty_response",
  "scope_blocked",
  "cancelled",
  "unknown",
];

function requireWorkerLimit(limit, label) {
  if (!limit || typeof limit !== "object" || Array.isArray(limit)) throw new Error(`${label} must be an object`);
  requireFields(limit, ["value", "enforcement"], label);
  if (typeof limit.value !== "number" || limit.value <= 0) throw new Error(`${label}.value must be positive`);
  if (!["declared", "observed", "mechanically_enforced"].includes(limit.enforcement)) {
    throw new Error(`${label}.enforcement must be declared, observed, or mechanically_enforced`);
  }
}

function parseWorkerExecution(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["contractVersion", "taskId", "workerId", "role", "limits", "writeMode", "stopCondition", "createdAt"], "worker execution");
  if (record.contractVersion !== "acef-worker-execution-v1") throw new Error("worker execution contractVersion must be acef-worker-execution-v1");
  requireEnum(record, "writeMode", ["read-only", "report-only", "scoped-write"], "worker execution");
  if (!record.limits || typeof record.limits !== "object") throw new Error("worker execution limits must be an object");
  requireWorkerLimit(record.limits.maxRuntimeMs, "worker execution limits.maxRuntimeMs");
  requireWorkerLimit(record.limits.maxToolCalls, "worker execution limits.maxToolCalls");
  for (const optional of ["maxTokens", "maxCostUsd"]) {
    if (record.limits[optional] !== undefined && record.limits[optional] !== null) {
      requireWorkerLimit(record.limits[optional], `worker execution limits.${optional}`);
    }
  }
  if (record.scope) {
    if (record.scope.allowedPaths !== undefined) requireRelativePaths(record.scope.allowedPaths, "worker execution scope.allowedPaths");
    if (record.scope.deniedPaths !== undefined) requireRelativePaths(record.scope.deniedPaths, "worker execution scope.deniedPaths");
  }
  return record;
}

function parseWorkerResult(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["contractVersion", "taskId", "workerId", "answerKey", "status", "summary", "verdict", "artifact", "usage", "createdAt"], "worker result");
  if (record.contractVersion !== "acef-worker-result-v1") throw new Error("worker result contractVersion must be acef-worker-result-v1");
  requireEnum(record, "status", ["succeeded", "failed", "blocked", "cancelled"], "worker result");
  requireEnum(record, "verdict", ["pass", "fail", "blocked", "inconclusive"], "worker result");
  if (record.status === "succeeded" && record.failureKind !== undefined && record.failureKind !== null) {
    throw new Error("worker result succeeded status must not set failureKind");
  }
  if (record.status !== "succeeded") {
    if (!workerFailureKinds.includes(record.failureKind)) {
      throw new Error(`worker result failureKind must be one of: ${workerFailureKinds.join(", ")}`);
    }
  }
  requireShaArtifact(record.artifact, "worker result artifact");
  if (record.transcript !== undefined && record.transcript !== null) {
    if (!record.transcript || typeof record.transcript !== "object") throw new Error("worker result transcript must be an object or null");
    requireFields(record.transcript, ["path", "sha256"], "worker result transcript");
    if (!/^[a-f0-9]{64}$/.test(record.transcript.sha256)) throw new Error("worker result transcript sha256 must be a SHA-256 hex digest");
  }
  if (!record.usage || typeof record.usage !== "object") throw new Error("worker result usage must be an object");
  requireFields(record.usage, ["runtimeMs", "toolCalls"], "worker result usage");
  if (typeof record.usage.runtimeMs !== "number" || record.usage.runtimeMs < 0) throw new Error("worker result usage.runtimeMs must be non-negative");
  if (!Number.isInteger(record.usage.toolCalls) || record.usage.toolCalls < 0) throw new Error("worker result usage.toolCalls must be a non-negative integer");
  for (const optional of ["inputTokens", "outputTokens", "totalTokens"]) {
    if (record.usage[optional] !== undefined && (!Number.isInteger(record.usage[optional]) || record.usage[optional] < 0)) {
      throw new Error(`worker result usage.${optional} must be a non-negative integer`);
    }
  }
  if (record.usage.costUsd !== undefined && (typeof record.usage.costUsd !== "number" || record.usage.costUsd < 0)) {
    throw new Error("worker result usage.costUsd must be non-negative");
  }
  if (record.openQuestions !== undefined) requireStringArray(record, "openQuestions", "worker result");
  return record;
}

function parseWorkerRollup(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["contractVersion", "generatedAt", "sourceResults", "consensus", "conflicts", "openQuestions", "recommendedNextAction"], "worker rollup");
  if (record.contractVersion !== "acef-worker-rollup-v1") throw new Error("worker rollup contractVersion must be acef-worker-rollup-v1");
  for (const field of ["sourceResults", "consensus", "conflicts", "openQuestions"]) {
    if (!Array.isArray(record[field])) throw new Error(`worker rollup ${field} must be an array`);
  }
  for (const [index, item] of record.sourceResults.entries()) {
    requireFields(item, ["path", "sha256", "answerKey", "workerId", "status", "verdict", "summary", "artifact"], `worker rollup sourceResults[${index}]`);
    requireRelativePaths([item.path], `worker rollup sourceResults[${index}]`);
    if (!/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error(`worker rollup sourceResults[${index}].sha256 must be a SHA-256 hex digest`);
    requireShaArtifact(item.artifact, `worker rollup sourceResults[${index}].artifact`);
  }
  return record;
}

const CAPABILITY_LAYERS = new Set([
  "docs",
  "schema",
  "cli",
  "validator",
  "hook",
  "workflow",
  "actor",
  "artifact",
  "tests",
  "installer",
  "targetRepo",
]);

function parseCapabilityChange(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["capabilityId", "requestedIntent", "status", "requiredLayers", "implementedLayers"], "capability change");
  requireEnum(record, "status", ["documented-only", "specified", "wired", "enforced", "proven", "installed"], "capability change");
  requireStringArray(record, "requiredLayers", "capability change", { nonEmpty: true });
  for (const layer of record.requiredLayers) {
    if (!CAPABILITY_LAYERS.has(layer)) throw new Error(`capability change requiredLayers has unknown layer ${layer}`);
  }
  if (!record.implementedLayers || typeof record.implementedLayers !== "object" || Array.isArray(record.implementedLayers)) {
    throw new Error("capability change implementedLayers must be an object");
  }
  for (const [layer, entries] of Object.entries(record.implementedLayers)) {
    if (!CAPABILITY_LAYERS.has(layer)) throw new Error(`capability change implementedLayers has unknown layer ${layer}`);
    if (!Array.isArray(entries) || entries.some((entry) => typeof entry !== "string" || !entry.trim())) {
      throw new Error(`capability change implementedLayers.${layer} must be an array of non-empty strings`);
    }
  }
  if (record.status !== "documented-only") {
    const missing = record.requiredLayers.filter((layer) => !record.implementedLayers[layer]?.length);
    if (missing.length) throw new Error(`capability change status ${record.status} is missing implemented layer(s): ${missing.join(", ")}`);
  }
  if (record.limitations !== undefined) requireStringArray(record, "limitations", "capability change");
  if (record.evidence !== undefined) {
    if (!Array.isArray(record.evidence)) throw new Error("capability change evidence must be an array");
    for (const [index, item] of record.evidence.entries()) {
      if (!item || typeof item !== "object") throw new Error(`capability change evidence[${index}] must be an object`);
      requireFields(item, ["layer", "ref"], `capability change evidence[${index}]`);
      if (!CAPABILITY_LAYERS.has(item.layer)) throw new Error(`capability change evidence[${index}] has unknown layer ${item.layer}`);
      if (typeof item.ref !== "string" || !item.ref.trim()) throw new Error(`capability change evidence[${index}].ref must be a non-empty string`);
    }
  }
  return record;
}

function parseControlDose(dose, label) {
  if (!dose || typeof dose !== "object" || Array.isArray(dose)) throw new Error(`${label} must be an object`);
  requireFields(dose, ["requirement", "dose", "enforcementLevel", "backstop"], label);
  requireEnum(dose, "requirement", ["required", "required-if-triggered", "optional", "not-required"], label);
  requireEnum(dose, "dose", ["full", "compact", "light", "none"], label);
  requireEnum(dose, "enforcementLevel", ["mechanical", "validator", "hook", "audit", "human", "documented", "not-applicable"], label);
  if (typeof dose.backstop !== "string" || !dose.backstop.trim()) throw new Error(`${label} backstop must be a non-empty string`);
  if (dose.requirement === "not-required" && dose.dose !== "none") throw new Error(`${label} not-required must use dose none`);
  if (dose.requirement !== "not-required" && dose.dose === "none") throw new Error(`${label} required/optional controls cannot use dose none`);
}

function parseControlDosingV2(record) {
  requireFields(record, ["schema", "version", "retiredAdmissions", "controls", "workflowBundles", "assuranceOverlays"], "control dosing v2");
  if (typeof record.version !== "string" || !record.version.trim()) throw new Error("control dosing v2 version must be a non-empty string");
  requireStringArray(record, "retiredAdmissions", "control dosing v2");
  if (!record.retiredAdmissions.includes("direct")) throw new Error("control dosing v2 retiredAdmissions must include direct during bridge");
  if (!Array.isArray(record.controls)) throw new Error("control dosing v2 controls must be an array");
  requireObject(record, "workflowBundles", "control dosing v2");
  requireObject(record, "assuranceOverlays", "control dosing v2");
  requireObject(record.assuranceOverlays, "guarded", "control dosing v2 assuranceOverlays");
  requireStringArray(record.assuranceOverlays.guarded, "bundleAdds", "control dosing v2 guarded overlay");

  const seen = new Set();
  for (const [index, control] of record.controls.entries()) {
    if (!control || typeof control !== "object" || Array.isArray(control)) throw new Error(`control dosing v2 controls[${index}] must be an object`);
    requireFields(control, ["id", "primaryFailureMode", "role", "trustCeiling", "workflowDoses", "assuranceDoses"], `control dosing v2 controls[${index}]`);
    requireEnum(control, "id", CONTROL_DOSING_IDS, `control dosing v2 controls[${index}]`);
    if (seen.has(control.id)) throw new Error(`control dosing v2 duplicate control id ${control.id}`);
    seen.add(control.id);
    requireObject(control, "workflowDoses", `control dosing v2 ${control.id}`);
    requireObject(control, "assuranceDoses", `control dosing v2 ${control.id}`);
    for (const workflow of WORKFLOW_IDS) parseControlDose(control.workflowDoses[workflow], `control dosing v2 ${control.id}.${workflow}`);
    parseControlDose(control.assuranceDoses.guarded, `control dosing v2 ${control.id}.guarded`);
  }
  const missingControls = CONTROL_DOSING_IDS.filter((id) => !seen.has(id));
  if (missingControls.length) throw new Error(`control dosing v2 missing control(s): ${missingControls.join(", ")}`);

  for (const workflow of WORKFLOW_IDS) {
    requireStringArray(record.workflowBundles, workflow, "control dosing v2 workflowBundles");
  }
  const guardedAdds = record.assuranceOverlays.guarded.bundleAdds;
  for (const id of guardedAdds) {
    if (!CONTROL_DOSING_IDS.includes(id)) throw new Error(`control dosing v2 guarded overlay has unknown control ${id}`);
  }

  const effectiveRules = [
    ["worker-scope", WORKFLOW_IDS, "baseline", "required"],
    ["evidence-manifest", ["full-bmad"], "baseline", "required"],
    ["runner-proof", ["full-bmad"], "baseline", "required"],
    ["gate-verdict", ["full-bmad"], "baseline", "required"],
    ["actor-records", ["full-bmad"], "baseline", "required"],
    ["surface-contract", WORKFLOW_IDS, "baseline", "required-if-triggered"],
    ["test-integrity", WORKFLOW_IDS, "baseline", "required-if-triggered"],
    ["lean-evidence", WORKFLOW_IDS, "baseline", "required"],
    ["actor-records", WORKFLOW_IDS, "guarded", "required"],
    ["evidence-manifest", WORKFLOW_IDS, "guarded", "required"],
    ["gate-verdict", WORKFLOW_IDS, "guarded", "required"],
    ["test-integrity", WORKFLOW_IDS, "guarded", "required-if-triggered"],
  ];
  for (const [controlId, workflows, assurance, requirement] of effectiveRules) {
    for (const workflow of workflows) {
      const dose = resolveControlDose(record, controlId, workflow, assurance);
      if (dose?.requirement !== requirement) {
        throw new Error(`control dosing v2 effective ${controlId}.${workflow}.${assurance} must be ${requirement}`);
      }
    }
  }
  for (const workflow of WORKFLOW_IDS) {
    for (const assurance of ASSURANCE_PROFILES) {
      const bundle = new Set(resolveControlBundle(record, workflow, assurance));
      const required = record.controls
        .filter((control) => resolveControlDose(record, control.id, workflow, assurance)?.requirement === "required")
        .map((control) => control.id);
      const missing = required.filter((id) => !bundle.has(id));
      if (missing.length) throw new Error(`control dosing v2 ${workflow}.${assurance} bundle missing required control(s): ${missing.join(", ")}`);
    }
  }
  return record;
}

function parseControlDosing(filePath) {
  const record = readJson(filePath);
  if (record.schema === "acef.control-dosing.v2") return parseControlDosingV2(record);
  requireFields(record, ["schema", "version", "retiredAdmissions", "controls", "laneBundles"], "control dosing");
  if (record.schema !== "acef.control-dosing.v1") throw new Error("control dosing schema must be acef.control-dosing.v1");
  if (typeof record.version !== "string" || !record.version.trim()) throw new Error("control dosing version must be a non-empty string");
  requireStringArray(record, "retiredAdmissions", "control dosing");
  for (const lane of record.retiredAdmissions) {
    if (!CONTROL_DOSING_LANES.includes(lane)) throw new Error(`control dosing retiredAdmissions has unknown lane ${lane}`);
  }
  if (!record.retiredAdmissions.includes("direct")) throw new Error("control dosing retiredAdmissions must include direct");
  if (!Array.isArray(record.controls)) throw new Error("control dosing controls must be an array");
  requireObject(record, "laneBundles", "control dosing");

  const seen = new Set();
  const controlById = new Map();
  for (const [index, control] of record.controls.entries()) {
    if (!control || typeof control !== "object" || Array.isArray(control)) throw new Error(`control dosing controls[${index}] must be an object`);
    requireFields(control, ["id", "primaryFailureMode", "role", "trustCeiling", "laneDoses"], `control dosing controls[${index}]`);
    requireEnum(control, "id", CONTROL_DOSING_IDS, `control dosing controls[${index}]`);
    requireEnum(control, "role", ["active-enforcement", "active-guidance", "scope-guard", "evidence-guard", "decision-guard", "runtime-floor", "audit-telemetry", "test-integrity-guard"], `control dosing ${control.id}`);
    requireEnum(control, "trustCeiling", ["mechanical", "cooperative-local", "audit-only", "human-confirmed"], `control dosing ${control.id}`);
    if (seen.has(control.id)) throw new Error(`control dosing duplicate control id ${control.id}`);
    seen.add(control.id);
    if (typeof control.primaryFailureMode !== "string" || !control.primaryFailureMode.trim()) {
      throw new Error(`control dosing ${control.id} primaryFailureMode must be a non-empty string`);
    }
    requireObject(control, "laneDoses", `control dosing ${control.id}`);
    for (const lane of CONTROL_DOSING_LANES) {
      parseControlDose(control.laneDoses[lane], `control dosing ${control.id}.${lane}`);
    }
    controlById.set(control.id, control);
  }

  const missingControls = CONTROL_DOSING_IDS.filter((id) => !seen.has(id));
  if (missingControls.length) throw new Error(`control dosing missing control(s): ${missingControls.join(", ")}`);

  for (const lane of CONTROL_DOSING_LANES) {
    requireStringArray(record.laneBundles, lane, "control dosing laneBundles");
    for (const id of record.laneBundles[lane]) {
      if (!CONTROL_DOSING_IDS.includes(id)) throw new Error(`control dosing laneBundles.${lane} has unknown control ${id}`);
      if (controlById.get(id).laneDoses[lane].requirement === "not-required") {
        throw new Error(`control dosing laneBundles.${lane} includes not-required control ${id}`);
      }
    }
  }

  const hardRules = [
    ["worker-scope", ["direct"], "not-required"],
    ["cold-read-current-context", ["direct"], "not-required"],
    ["active-run-next-action", ["direct"], "not-required"],
    ["actor-records", ["direct"], "not-required"],
    ["approval-receipts", ["direct"], "not-required"],
    ["evidence-manifest", ["direct"], "not-required"],
    ["runner-proof", ["direct"], "not-required"],
    ["gate-verdict", ["direct"], "not-required"],
    ["surface-contract", ["direct"], "not-required"],
    ["lean-evidence", ["direct"], "not-required"],
    ["worker-scope", ["quick-fix", "lightweight", "guarded", "full-bmad"], "required"],
    ["evidence-manifest", ["guarded", "full-bmad"], "required"],
    // V2 thinning (report-v2): runner-proof is required only for full-BMAD; guarded is
    // required-if-triggered (unattended/async), with the skeptical re-run as the attended backstop.
    ["runner-proof", ["full-bmad"], "required"],
    ["runner-proof", ["guarded"], "required-if-triggered"],
    ["gate-verdict", ["guarded", "full-bmad"], "required"],
    ["actor-records", ["guarded", "full-bmad"], "required"],
    ["cold-read-current-context", ["lightweight", "guarded", "full-bmad"], "required"],
    ["active-run-next-action", ["lightweight", "guarded", "full-bmad"], "required"],
    ["surface-contract", ["quick-fix", "lightweight", "guarded", "full-bmad"], "required-if-triggered"],
    ["test-integrity", CONTROL_DOSING_LANES, "required-if-triggered"],
    ["lean-evidence", ["quick-fix", "lightweight", "guarded", "full-bmad"], "required"],
  ];
  for (const [controlId, lanes, requirement] of hardRules) {
    for (const lane of lanes) {
      const dose = controlById.get(controlId).laneDoses[lane];
      if (dose.requirement !== requirement) {
        throw new Error(`control dosing ${controlId}.${lane} must be ${requirement}`);
      }
    }
  }

  for (const lane of CONTROL_DOSING_LANES) {
    const required = [...controlById.values()]
      .filter((control) => control.laneDoses[lane].requirement === "required")
      .map((control) => control.id);
    const bundle = new Set(record.laneBundles[lane]);
    const missing = required.filter((id) => !bundle.has(id));
    if (missing.length) throw new Error(`control dosing laneBundles.${lane} missing required control(s): ${missing.join(", ")}`);
  }

  return record;
}

function parseSpecReadiness(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["status", "ambiguity", "dimensions", "tier1", "riskFlags", "missing", "blockingQuestions", "nextArtifact", "repositoryCommit", "verdictReason"], "spec readiness");
  requireEnum(record, "status", ["PASS", "NEEDS_PM", "NEEDS_DISCOVERY", "NEEDS_BMAD", "NEEDS_GUARDED_DISCOVERY", "REJECT"], "spec readiness");
  if (typeof record.ambiguity !== "number" || record.ambiguity < 0 || record.ambiguity > 1) {
    throw new Error("spec readiness ambiguity must be a number between 0 and 1");
  }
  if (!record.dimensions || typeof record.dimensions !== "object" || Array.isArray(record.dimensions)) {
    throw new Error("spec readiness dimensions must be an object");
  }
  for (const field of ["goal", "boundary", "constraint", "acceptance"]) {
    if (typeof record.dimensions[field] !== "number" || record.dimensions[field] < 0 || record.dimensions[field] > 1) {
      throw new Error(`spec readiness dimensions.${field} must be a number between 0 and 1`);
    }
  }
  if (!record.tier1 || typeof record.tier1 !== "object" || Array.isArray(record.tier1)) {
    throw new Error("spec readiness tier1 must be an object");
  }
  requireStringArray(record, "riskFlags", "spec readiness");
  requireStringArray(record, "missing", "spec readiness");
  requireStringArray(record, "blockingQuestions", "spec readiness");
  if (record.assumptions !== undefined) requireStringArray(record, "assumptions", "spec readiness");
  if (record.fastTrack !== undefined && typeof record.fastTrack !== "boolean") {
    throw new Error("spec readiness fastTrack must be boolean");
  }
  if (record.humanWaiver !== undefined) {
    if (!record.humanWaiver || typeof record.humanWaiver !== "object" || Array.isArray(record.humanWaiver)) {
      throw new Error("spec readiness humanWaiver must be an object");
    }
    requireFields(record.humanWaiver, ["decision", "actorType", "userQuote"], "spec readiness humanWaiver");
    requireEnum(record.humanWaiver, "decision", ["ACCEPT_RISK"], "spec readiness humanWaiver");
    requireEnum(record.humanWaiver, "actorType", ["human"], "spec readiness humanWaiver");
  }
  return record;
}

function parseFreshness(record, label = "freshness") {
  if (!record || typeof record !== "object") throw new Error(`${label} must be an object`);
  requireFields(record, ["commit", "verifiedAt", "scope"], label);
  return record;
}

function safeRelative(filePath, root) {
  const rel = path.relative(root, filePath);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes root: ${filePath}`);
  }
  return rel;
}

module.exports = {
  parseActiveRun,
  parseActorRecord,
  parseReviewReport,
  parseDeveloperRepair,
  parseAssuranceCapsule,
  parseProcessJudgeDecision,
  parseEvidenceManifest,
  parseGateVerdict,
  parseApproval,
  parseWorkerScope,
  parseAtddCorrection,
  parseWorkflow,
  parsePrReview,
  parsePrReviewProfile,
  parseDirectRun,
  parseLightweightRun,
  parseWorkerExecution,
  parseWorkerResult,
  parseWorkerRollup,
  parseCapabilityChange,
  parseControlDosing,
  parseSpecReadiness,
  parseFreshness,
  atddRedExecutionFailure,
  atddTestSourceAuthenticityFailure,
  atddGreenTestContinuityFailure,
  safeRelative,
};

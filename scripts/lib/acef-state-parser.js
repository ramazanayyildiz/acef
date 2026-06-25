const fs = require("node:fs");
const path = require("node:path");

const SURFACE_VALUES = new Set([
  "ui", "admin", "mobile", "api", "http", "cli", "queue", "job", "scheduler", "storage",
  "email", "notification", "webhook", "integration", "config", "database", "library", "internal",
]);

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

function requireSurface(value, label) {
  if (!SURFACE_VALUES.has(value)) throw new Error(`${label} has unknown surface ${value}`);
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
  requireFields(record, ["runId", "repo", "lane", "status", "activeStory", "activePhase", "ledgerPath"], "active run");
  requireEnum(record, "lane", ["quick-fix", "lightweight", "full-bmad", "guarded", "custom"], "active run");
  requireEnum(record, "status", ["active", "paused", "blocked", "complete"], "active run");
  if (record.maxLines !== undefined && record.maxLines !== null
    && (!Number.isInteger(record.maxLines) || record.maxLines < 1 || record.maxLines > 150)) {
    throw new Error("active run maxLines must be an integer between 1 and 150");
  }
  if (record.laneRationale !== undefined && record.laneRationale !== null
    && (typeof record.laneRationale !== "string" || !record.laneRationale.trim())) {
    throw new Error("active run laneRationale must be a non-empty string");
  }
  if (record.riskTriggers !== undefined) {
    requireStringArray(record, "riskTriggers", "active run");
  }
  return record;
}

function parseActorRecord(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["actorInstanceId", "story", "phase", "role", "client", "inputCommit", "allowedContextProfile"], "actor record");
  return record;
}

function parseEvidenceManifest(filePath) {
  const record = readJson(filePath);
  requireFields(record, ["evidenceId", "kind", "command", "repositoryCommit", "actorInstanceId", "story", "rawArtifact", "runnerProof", "satisfies"], "evidence manifest");
  requireEnum(record, "kind", ["runtime-test", "static-check", "manual-smoke", "build", "lint", "typecheck", "other"], "evidence manifest");
  if (!Number.isInteger(record.exitCode)) throw new Error("evidence manifest missing integer exitCode");
  requireStringArray(record, "satisfies", "evidence manifest", { nonEmpty: true });
  if (!record.rawArtifact || typeof record.rawArtifact !== "object") throw new Error("evidence manifest missing rawArtifact");
  requireFields(record.rawArtifact, ["path", "sha256"], "evidence rawArtifact");
  requireRunnerProof(record.runnerProof, "evidence runnerProof");
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
  requireFields(record, ["runId", "lane", "status", "implementationActorId", "reviewActorId", "steps", "promotion"], "lightweight run");
  requireEnum(record, "lane", ["quick-fix", "lightweight", "guarded"], "lightweight run");
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
  if (record.lane === "quick-fix" && record.status === "complete" && !record.quickFix) {
    throw new Error("complete quick-fix run requires quickFix evidence");
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
  parseEvidenceManifest,
  parseGateVerdict,
  parseApproval,
  parseWorkerScope,
  parseWorkflow,
  parsePrReview,
  parsePrReviewProfile,
  parseLightweightRun,
  parseWorkerExecution,
  parseWorkerResult,
  parseWorkerRollup,
  parseCapabilityChange,
  parseFreshness,
  safeRelative,
};

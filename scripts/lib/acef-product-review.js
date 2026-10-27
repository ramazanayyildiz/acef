"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const CONTRACT = "running-product-review-v1";
const REQUIRED = ["componentReuse", "persistenceRoundtrip", "validation", "navigation", "responsiveKeyboard", "loadingFailureRetry", "tenancy", "operationsVisibility", "copy"];
const CONDITIONAL = ["dialog", "pagination"];
// The reviewer exercises a locally running product. Any loopback origin is accepted unless one is pinned, and then it
// must match exactly. Pins, first match wins: the lightweight run's productReviewOrigin, the active run's, or the
// host-owned .acef/product-review-policy.json {"browserOrigin": "..."} (the installer never writes that file).
const LOOPBACK_ORIGIN = /^http:\/\/(127\.0\.0\.1|localhost)(:\d{1,5})?\/?$/;
const HOST_POLICY = path.join(".acef", "product-review-policy.json");

function hostPinnedOrigin(repo) {
  const file = path.join(repo, HOST_POLICY);
  if (!fs.existsSync(file)) return undefined;
  const policy = JSON.parse(fs.readFileSync(file, "utf8"));
  return policy.browserOrigin;
}
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function localArtifact(repo, relative) {
  if (typeof relative !== "string" || !relative || path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) throw new Error("product review artifact must be repository-relative");
  const root = fs.realpathSync(repo);
  const target = fs.realpathSync(path.resolve(repo, relative));
  if (!target.startsWith(`${root}${path.sep}`) || !fs.statSync(target).isFile()) throw new Error("product review artifact escapes repository or is not a file");
  return fs.readFileSync(target);
}

// This validates recorded review evidence; it cannot establish a browser visit
// from bytes alone. The independent actor must actually exercise the product.
function productReviewFailures(repo, run, activeRun, treeDigest) {
  const contract = activeRun?.productReviewContract || run.productReviewContract;
  if (!contract) return [];
  const failures = [];
  try {
    if (contract !== CONTRACT || run.productReviewContract !== contract) throw new Error("missing or mismatched productReviewContract");
    if (run.workflowId !== "lightweight" || run.assuranceProfile !== "guarded") throw new Error("product review requires Standard + Guarded");
    if (!run.productReview?.reportPath || !/^[a-f0-9]{64}$/.test(run.productReview.sha256 || "")) throw new Error("missing hashed running-product review");
    const bytes = localArtifact(repo, run.productReview.reportPath);
    if (digest(bytes) !== run.productReview.sha256) throw new Error("running-product review report hash mismatch");
    const report = JSON.parse(bytes);
    if (report.schema !== "acef.product-review.v1" || report.verdict !== "PASS" || report.runId !== run.runId) throw new Error("product review must be a PASS report for the same run");
    if (report.reviewerActorId !== run.reviewActorId || report.reviewerActorId === run.implementationActorId) throw new Error("product review must bind the independent lifecycle reviewer");
    const reviewer = JSON.parse(localArtifact(repo, `docs/ai/actors/${report.reviewerActorId}.json`));
    const developer = JSON.parse(localArtifact(repo, `docs/ai/actors/${run.implementationActorId}.json`));
    if (reviewer.runId !== run.runId || developer.runId !== run.runId || !reviewer.sessionId || !developer.sessionId || reviewer.sessionId === developer.sessionId || report.sessionId !== reviewer.sessionId || !/code[-_ ]?review/i.test(`${reviewer.phase} ${reviewer.role}`)) throw new Error("product review requires a distinct authenticated code-review session for this run");
    if (!report.applicationCommit || report.applicationTree !== treeDigest(report.applicationCommit) || report.applicationTree !== treeDigest("HEAD")) throw new Error("stale product review application tree");
    const reviewedAt = Date.parse(report.reviewedAt);
    if (!Number.isFinite(reviewedAt) || reviewedAt < Date.parse(reviewer.createdAt) || reviewedAt > Date.now() + 60000) throw new Error("invalid product review timestamp");
    const origin = String(report.browser?.origin || "").replace(/\/$/, "");
    // The host policy is binding: a run or active-run origin may narrow nothing and override nothing. Any run pin that
    // differs from the host pin is refused; without a host pin, the run pins must agree with each other.
    const norm = (value) => String(value).replace(/\/$/, "");
    const hostOrigin = hostPinnedOrigin(repo);
    const runPins = [run.productReviewOrigin, activeRun?.productReviewOrigin].filter((value) => value !== undefined && value !== null && value !== "");
    if (hostOrigin !== undefined && runPins.some((pin) => norm(pin) !== norm(hostOrigin))) throw new Error("productReviewOrigin conflicts with the host product-review policy");
    if (hostOrigin === undefined && new Set(runPins.map(norm)).size > 1) throw new Error("run and active run productReviewOrigin disagree");
    const expectedOrigin = hostOrigin !== undefined ? hostOrigin : runPins[0];
    if (expectedOrigin !== undefined && !LOOPBACK_ORIGIN.test(String(expectedOrigin))) throw new Error("productReviewOrigin must be a local http origin");
    if (report.browser?.status !== "VERIFIED" || !LOOPBACK_ORIGIN.test(origin)
      || (expectedOrigin !== undefined && origin !== String(expectedOrigin).replace(/\/$/, ""))) throw new Error("running local browser was not verified");
    if (!Array.isArray(report.artifacts) || !report.artifacts.length) throw new Error("missing browser artifacts");
    const artifacts = new Map();
    for (const artifact of report.artifacts) {
      if (!artifact.id || artifacts.has(artifact.id)) throw new Error("duplicate/missing browser artifact id");
      const artifactBytes = localArtifact(repo, artifact.path);
      if (!artifactBytes.length || digest(artifactBytes) !== artifact.sha256) throw new Error(`browser artifact hash mismatch: ${artifact.id}`);
      artifacts.set(artifact.id, artifact);
    }
    if (![...artifacts.values()].some((item) => item.kind === "browser-trace")) throw new Error("missing browser-trace artifact");
    for (const viewport of ["desktop", "mobile"]) if (![...artifacts.values()].some((item) => item.kind === "screenshot" && item.viewport === viewport)) throw new Error(`missing ${viewport} screenshot`);
    for (const name of [...REQUIRED, ...CONDITIONAL]) {
      const check = report.checks?.[name];
      if (CONDITIONAL.includes(name) && check?.status === "NOT_APPLICABLE" && typeof check.reason === "string" && check.reason.trim().length >= 12) continue;
      if (check?.status !== "PASS" || typeof check.observation !== "string" || !check.observation.trim() || !Array.isArray(check.artifactIds) || !check.artifactIds.length || check.artifactIds.some((id) => !artifacts.has(id))) failures.push(`unverified product check: ${name}`);
    }
    const reuse = report.checks?.componentReuse;
    const audit = reuse?.reuseAudit;
    const note = (value) => typeof value === "string" && value.trim().length >= 12;
    const actualPath = (value) => { localArtifact(repo, value); };
    if (!audit || !Array.isArray(audit.existing) || !audit.existing.length || !Array.isArray(audit.introduced) || !Array.isArray(audit.sharedChanges) || !note(audit.duplicationReview)) throw new Error("componentReuse requires structured source reuseAudit, not bare PASS");
    if (!reuse.artifactIds?.some((id) => ["browser-trace", "screenshot"].includes(artifacts.get(id)?.kind))) failures.push("componentReuse needs rendered browser evidence");
    for (const entry of audit.existing) {
      actualPath(entry.path);
      if (!note(entry.usage)) failures.push(`componentReuse needs concrete usage: ${entry.path}`);
    }
    for (const entry of audit.introduced) {
      actualPath(entry.path);
      if (!["component", "helper"].includes(entry.kind) || !note(entry.rationale) || !Array.isArray(entry.alternativesChecked)) failures.push(`componentReuse needs introduction rationale and searched alternatives: ${entry.path}`);
      for (const alternative of entry.alternativesChecked || []) actualPath(alternative);
    }
    for (const entry of audit.sharedChanges) {
      actualPath(entry.path);
      if (!Array.isArray(entry.consumers) || !entry.consumers.length) { failures.push(`componentReuse needs checked consumers: ${entry.path}`); continue; }
      for (const consumer of entry.consumers) {
        actualPath(consumer.path);
        if (!["source", "browser", "test", "source+browser", "source+test"].includes(consumer.verification) || !Array.isArray(consumer.artifactIds) || !consumer.artifactIds.length || consumer.artifactIds.some((id) => !artifacts.has(id))) failures.push(`componentReuse needs explicit consumer verification and proof: ${consumer.path}`);
      }
    }
  } catch (error) { failures.push(error.message); }
  return failures;
}
module.exports = { CONTRACT, REQUIRED, CONDITIONAL, productReviewFailures };

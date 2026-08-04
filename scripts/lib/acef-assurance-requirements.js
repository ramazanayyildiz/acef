"use strict";

function uniqueSorted(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))].sort();
}

function inferredSurfaces(paths) {
  const surfaces = new Set();
  for (const filePath of paths || []) {
    if (/(^|\/)(components|pages|screens|views|ui|frontend)(\/|$)|\.(tsx|jsx|vue|svelte)$/i.test(filePath)) surfaces.add("ui");
    if (/(^|\/)(mobile|ios|android)(\/|$)|\.(swift|kt)$/i.test(filePath)) surfaces.add("mobile");
    if (/(^|\/)(routes|controllers|api|http|server)(\/|$)|route|controller/i.test(filePath)) surfaces.add("api");
    if (/webhook/i.test(filePath)) surfaces.add("webhook");
    if (/(^|\/)(jobs|workers)(\/|$)|job/i.test(filePath)) surfaces.add("job");
    if (/(^|\/)(queues|queue)(\/|$)/i.test(filePath)) surfaces.add("queue");
    if (/(^|\/)(scheduler|cron)(\/|$)|schedule/i.test(filePath)) surfaces.add("scheduler");
    if (/(^|\/)(migrations|database|schema)(\/|$)/i.test(filePath)) surfaces.add("database");
    if (/(^|\/)(config|configs)(\/|$)|\.ya?ml$|\.toml$|\.env/i.test(filePath)) surfaces.add("config");
    if (/(^|\/)(cli|bin|commands?)(\/|$)|command/i.test(filePath)) surfaces.add("cli");
    if (/(^|\/)(lib|src|packages|modules)(\/|$)/i.test(filePath) && !surfaces.size) surfaces.add("library");
  }
  return [...surfaces].sort();
}

function stateChangingRiskSignals(activeRun, activeScope = null, paths = []) {
  const text = [
    activeRun?.activeStory,
    activeRun?.laneRationale,
    ...(activeRun?.riskTriggers || []),
    ...(activeScope?.surfaces || []),
    ...(paths || []),
  ].filter(Boolean).join(" ");
  return /\b(create|capture|record|save|store|storage|upload(?:ed|ing)?|object[-_ ]?store|object[-_ ]?storage|blob|bucket|persist(?:ence|ent|ed|ing)?|write|update|delete|notes?|lead|crm|follow[-_ ]?up|conversion|history|tracking|stateful[-_ ]product[-_ ]data|migration|database|schema|app[-_ ]?store|memory|singleton|demo[-_ ]?data|fixture[-_ ]?store)\b/i.test(text);
}

function normalizeBindings(bindings) {
  return (bindings || []).map((binding) => ({
    inputSurface: binding.inputSurface,
    outputSurface: binding.outputSurface,
    field: binding.field,
    defaultMaskingRisk: binding.defaultMaskingRisk === true,
  })).sort((left, right) => `${left.inputSurface}>${left.outputSurface}:${left.field}`
    .localeCompare(`${right.inputSurface}>${right.outputSurface}:${right.field}`));
}

function buildAssuranceRequirements(activeRun, activeScope, scopePaths) {
  const declaredSurfaces = uniqueSorted(activeScope?.surfaces || []);
  const pathSurfaces = inferredSurfaces(scopePaths);
  return {
    schema: "acef.assurance-requirements.v1",
    declaredSurfaces,
    inferredSurfaces: pathSurfaces,
    requiredSurfaces: uniqueSorted([...declaredSurfaces, ...pathSurfaces]),
    patternUse: activeScope?.patternUse || "unknown",
    roundTripRequired: activeScope?.requiresRoundTrip === true || activeScope?.patternUse === "new-reusable-pattern",
    inputOutputBindings: normalizeBindings(activeScope?.inputOutputBindings),
    durableStateRequired: stateChangingRiskSignals(activeRun, activeScope, scopePaths),
  };
}

function derivableRequirementFailures(activeRun, requirements, scopePaths) {
  const failures = [];
  const pathSurfaces = inferredSurfaces(scopePaths);
  if (JSON.stringify(pathSurfaces) !== JSON.stringify(requirements?.inferredSurfaces || [])) {
    failures.push("frozen assuranceRequirements inferredSurfaces do not match story scope paths");
  }
  const frozenScope = {
    surfaces: requirements?.declaredSurfaces || [],
    patternUse: requirements?.patternUse || "unknown",
    requiresRoundTrip: requirements?.roundTripRequired === true,
    inputOutputBindings: requirements?.inputOutputBindings || [],
  };
  if (requirements?.durableStateRequired !== stateChangingRiskSignals(activeRun, frozenScope, scopePaths)) {
    failures.push("frozen assuranceRequirements durableStateRequired does not match derivable story risk");
  }
  if (requirements?.patternUse === "new-reusable-pattern" && requirements.roundTripRequired !== true) {
    failures.push("frozen new-pattern assurance cannot lower roundTripRequired");
  }
  return failures;
}

module.exports = {
  buildAssuranceRequirements,
  derivableRequirementFailures,
  inferredSurfaces,
  normalizeBindings,
  stateChangingRiskSignals,
};

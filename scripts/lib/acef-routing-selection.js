"use strict";

// Compatibility gate between routing consumers (acef-state, acef-supervisor, acef-next, acef-process-validator, the
// BMAD hard-wall) and the installed routing library. update-acef-installation keeps a host-modified library, so a
// refreshed consumer can meet an older acef-model-routing.js. This file is new, so it is always installed fresh next
// to whatever library the host kept. When the library is too old for what the run or policy asks, it throws
// ACEF_ROUTING_LIBRARY_STALE; it never drops per-role routing silently.

const path = require("node:path");
const routing = require("./acef-model-routing");

const REQUIRED_LIBRARY_VERSION = 2;

function libraryIsCurrent(library = routing) {
  return typeof library.runRoutingSelection === "function"
    && Number(library.ROUTING_LIBRARY_VERSION || 0) >= REQUIRED_LIBRARY_VERSION;
}

function staleLibraryError(reason) {
  const error = new Error(`installed routing library ${path.join(__dirname, "acef-model-routing.js")} predates per-role models `
    + `(needs ROUTING_LIBRARY_VERSION ${REQUIRED_LIBRARY_VERSION}) but ${reason}; restore the ACEF copy and run update-acef-installation`);
  error.code = "ACEF_ROUTING_LIBRARY_STALE";
  return error;
}

function hasEntries(value) {
  return Boolean(value && typeof value === "object" && Object.values(value).some((entry) => entry !== null && entry !== undefined));
}

// Throws when the run carries per-role routing fields and the library cannot honor them.
function requireRunRoutingSupport(activeRun, library = routing) {
  if (libraryIsCurrent(library)) return;
  if (hasEntries(activeRun?.routingRoleModels)) throw staleLibraryError("the active run records routingRoleModels");
  if (hasEntries(activeRun?.routingRoleModelExemptions)) throw staleLibraryError("the active run records routingRoleModelExemptions");
}

// The selection every consumer passes to resolveRoleRuntime / resolveActorRuntime. With a current library this is
// runRoutingSelection(activeRun). With an older one it is the provider string, and only when nothing per-role is in
// play for the selected provider; otherwise it throws.
function routingSelectionFor(policyRecord, activeRun, library = routing) {
  if (libraryIsCurrent(library)) return library.runRoutingSelection(activeRun);
  requireRunRoutingSupport(activeRun, library);
  const provider = activeRun?.routingProvider || policyRecord?.activeProvider;
  if (hasEntries(policyRecord?.providers?.[provider]?.roleModels)) {
    throw staleLibraryError(`the routing policy names per-role models for provider ${provider}`);
  }
  return activeRun?.routingProvider || null;
}

module.exports = {
  REQUIRED_LIBRARY_VERSION,
  libraryIsCurrent,
  requireRunRoutingSupport,
  routingSelectionFor,
};

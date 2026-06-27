"use strict";
// IN-MEMORY store — runnable proxy for Pilaner's PRE-fix CRM
// (src/lib/crm/app-store.ts, pre-commit-e288157: a module-level `let crmStore`
// singleton). In Node, top-level state is per-PROCESS, so this Map lives only
// in the heap of whatever process required it; a fresh process sees nothing.
let store = new Map();
module.exports = {
  put(key, value) {
    store.set(key, value);
  },
  get(key) {
    return store.get(key);
  },
};

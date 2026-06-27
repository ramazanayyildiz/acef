"use strict";
// DURABLE store — runnable proxy for Pilaner's POST-fix CRM (commit e288157,
// "Persist CRM workspace data in Postgres"). State lives OUTSIDE the process
// (here a JSON file; in real Pilaner, Postgres), so a fresh process reads what
// a prior process wrote. Storage path is overridable via RGSC_STORE_FILE so
// test runs stay isolated.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const FILE = process.env.RGSC_STORE_FILE || path.join(os.tmpdir(), "acef-durable-store.json");

function load() {
  if (!fs.existsSync(FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

module.exports = {
  put(key, value) {
    const data = load();
    data[key] = value;
    fs.writeFileSync(FILE, JSON.stringify(data));
  },
  get(key) {
    return load()[key];
  },
};

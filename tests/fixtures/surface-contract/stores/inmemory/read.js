"use strict";
// Read entrypoint, run in a SEPARATE cold process: a fresh module instance whose
// singleton is empty -> prints nothing. This is the RED case.
const { get } = require("./store");
const [, , key] = process.argv;
const value = get(key);
process.stdout.write(value === undefined ? "" : String(value));

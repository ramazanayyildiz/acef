"use strict";
// Read entrypoint, run in a SEPARATE cold process: loads what the writer
// persisted -> the GREEN case.
const { get } = require("./store");
const [, , key] = process.argv;
const value = get(key);
process.stdout.write(value === undefined ? "" : String(value));

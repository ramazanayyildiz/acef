"use strict";
// Write entrypoint: persist key -> value to a file (Postgres in production),
// which survives this process exiting.
const { put } = require("./store");
const [, , key, value] = process.argv;
put(key, value);

"use strict";
// Write entrypoint: set key -> value, then exit. The singleton evaporates on exit.
const { put } = require("./store");
const [, , key, value] = process.argv;
put(key, value);

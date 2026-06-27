#!/usr/bin/env node
// cli surface: an exposed command entrypoint (grounds the cli surface).
const [, , cmd, ...args] = process.argv;
process.stdout.write(cmd === "echo" ? args.join(" ") : `unknown: ${cmd}`);

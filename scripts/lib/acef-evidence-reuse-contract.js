"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function resolveExecutable(command, repo, environment) {
  if (command.includes(path.sep)) return fs.realpathSync(path.resolve(repo, command));
  for (const directory of String(environment.PATH || "").split(path.delimiter)) {
    const candidate = path.resolve(repo, directory || ".", command);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      if (fs.statSync(candidate).isFile()) return fs.realpathSync(candidate);
    } catch { /* Try the next PATH entry; no command is executed. */ }
  }
  return null;
}

// Automatic reuse is deliberately a tiny allow-list, not an inference from an
// evidence kind. Syntax-only Node checks do not execute source, imports, lint
// plugins or project scripts. Unknown tools still run and retain normal proof.
function staticReuseInputFingerprint(repo, kind, commandArgv, environment = process.env) {
  if (kind !== "static-check" || !Array.isArray(commandArgv) || commandArgv.length !== 3
    || commandArgv.some((value) => typeof value !== "string" || !value)
    || !["--check", "-c"].includes(commandArgv[1])
    || !/\.(?:js|cjs|mjs)$/i.test(commandArgv[2]) || commandArgv[2].startsWith("-")) return null;
  // Preloads and dynamic-linker settings can execute or replace code before the
  // syntax check; their dependency closure is not covered by this contract.
  if (Object.entries(environment).some(([name, value]) => value
    && /^(?:NODE_OPTIONS$|NODE_PATH$|LD_|DYLD_)/.test(name))) return null;
  try {
    const repoRoot = fs.realpathSync(repo);
    const requested = path.resolve(repo, commandArgv[2]);
    const relative = path.relative(path.resolve(repo), requested);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
    const target = fs.realpathSync(requested);
    if (target !== path.resolve(repoRoot, relative) || !fs.lstatSync(requested).isFile()) return null;
    const interpreter = resolveExecutable(commandArgv[0], repo, environment);
    if (!interpreter || interpreter !== fs.realpathSync(process.execPath)) return null;
    const packages = [];
    for (let directory = path.dirname(target); ; directory = path.dirname(directory)) {
      const packagePath = path.join(directory, "package.json");
      try {
        const stat = fs.lstatSync(packagePath);
        if (!stat.isFile()) return null;
        packages.push({ path: packagePath, sha256: sha256(fs.readFileSync(packagePath)) });
      } catch (error) {
        if (error.code !== "ENOENT") return null;
        packages.push({ path: packagePath, sha256: null });
      }
      if (path.dirname(directory) === directory) break;
    }
    const environmentSha256 = sha256(JSON.stringify(Object.keys(environment).sort().map((name) => [name, environment[name]])));
    return `node-syntax-input-v1:${sha256(JSON.stringify({
      commandArgv,
      source: { path: relative.split(path.sep).join("/"), sha256: sha256(fs.readFileSync(target)) },
      interpreter: { path: interpreter, sha256: sha256(fs.readFileSync(interpreter)), version: process.version },
      packages,
      environmentSha256,
      platform: process.platform,
      architecture: process.arch,
    }))}`;
  } catch {
    // Missing, unreadable, uncertain or changing inputs require real execution.
    return null;
  }
}

module.exports = { staticReuseInputFingerprint };

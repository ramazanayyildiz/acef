"use strict";
const cp = require("node:child_process");
const crypto = require("node:crypto");
// git ls-tree does not expand worker-scope globs. Resolve them against tracked
// recursive entries so a changed source file changes the scoped identity.
function globTreeDigest(repo, commit, scopes) {
  if (!scopes.some((item) => item.includes("*"))) return null;
  const matchers = scopes.map((item) => {
    let expression = "";
    for (let index = 0; index < item.length; index += 1) {
      if (item.slice(index, index + 3) === "**/") {
        expression += "(?:.*/)?";
        index += 2;
      } else if (item.slice(index, index + 2) === "**") {
        expression += ".*";
        index += 1;
      } else if (item[index] === "*") expression += "[^/]*";
      else expression += item[index].replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
    return new RegExp(`^${expression}(?:/.*)?$`);
  });
  // -z: NUL-terminated records with unquoted paths. Without it git quotes non-ASCII names (core.quotePath), so a glob
  // never matched "app/İşlem.php" and a change to it left the scoped digest unchanged. The hashed line text is
  // unchanged for ASCII paths, so existing digests of ASCII-only scopes stay valid.
  const output = cp.execFileSync("git", ["ls-tree", "-r", "-z", "--full-tree", commit], { cwd: repo, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const entries = output.split("\0").filter(Boolean).filter((line) => matchers.some((matcher) => matcher.test(line.slice(line.indexOf("\t") + 1))));
  return crypto.createHash("sha256").update(`${scopes.join("\n")}\0${entries.join("\n")}`).digest("hex");
}

// Path of one default (quoted) `git ls-tree` line, unquoted: "\"app/\\304\\260.php\"" -> "app/İ.php".
function unquotedTreePath(line) {
  const raw = line.slice(line.indexOf("\t") + 1);
  if (!raw.startsWith("\"") || !raw.endsWith("\"")) return raw;
  const bytes = [];
  const body = raw.slice(1, -1);
  const escapes = { a: 7, b: 8, f: 12, n: 10, r: 13, t: 9, v: 11, "\\": 92, "\"": 34 };
  for (let index = 0; index < body.length; index += 1) {
    if (body[index] !== "\\") { bytes.push(...Buffer.from(body[index], "utf8")); continue; }
    const next = body[index + 1];
    if (/[0-7]/.test(next)) { bytes.push(parseInt(body.slice(index + 1, index + 4), 8)); index += 3; }
    else { bytes.push(escapes[next] ?? next.charCodeAt(0)); index += 1; }
  }
  return Buffer.from(bytes).toString("utf8");
}
module.exports = { globTreeDigest, unquotedTreePath };

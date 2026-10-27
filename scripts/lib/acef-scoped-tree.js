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
  const output = cp.execFileSync("git", ["ls-tree", "-r", "--full-tree", commit], { cwd: repo, encoding: "utf8" });
  const entries = output.split(/\r?\n/).filter(Boolean).filter((line) => matchers.some((matcher) => matcher.test(line.slice(line.indexOf("\t") + 1))));
  return crypto.createHash("sha256").update(`${scopes.join("\n")}\0${entries.join("\n")}`).digest("hex");
}
module.exports = { globTreeDigest };

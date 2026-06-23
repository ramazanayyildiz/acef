const fs = require("node:fs");
const path = require("node:path");

function decodeScalar(raw, key, filePath) {
  const value = raw.trim();
  if (!value) return "";
  if (value.startsWith('"')) {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error(`${filePath}: invalid quoted ${key}: ${error.message}`);
    }
  }
  if (value.startsWith("'")) {
    if (!value.endsWith("'")) throw new Error(`${filePath}: unterminated quoted ${key}`);
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value;
}

function parseSkillFrontmatter(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").replaceAll("\r\n", "\n").split("\n");
  if (lines[0] !== "---") throw new Error(`${filePath}: SKILL.md must start with YAML frontmatter`);
  const end = lines.indexOf("---", 1);
  if (end < 0) throw new Error(`${filePath}: YAML frontmatter is not closed`);

  const metadata = {};
  for (let index = 1; index < end; index += 1) {
    const line = lines[index];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    if (!match) {
      if (/^\s+/.test(line)) throw new Error(`${filePath}: unexpected indented YAML at line ${index + 1}`);
      throw new Error(`${filePath}: invalid YAML field at line ${index + 1}`);
    }
    const [, key, initial = ""] = match;
    if (Object.hasOwn(metadata, key)) throw new Error(`${filePath}: duplicate YAML field ${key}`);

    let raw = initial;
    if (["|", ">"].includes(initial.trim())) {
      const folded = initial.trim() === ">";
      const parts = [];
      while (index + 1 < end && /^\s+/.test(lines[index + 1])) parts.push(lines[++index].trim());
      raw = folded ? parts.join(" ") : parts.join("\n");
    } else if ((initial.trim().startsWith("'") && !initial.trim().endsWith("'"))
      || (initial.trim().startsWith('"') && !initial.trim().endsWith('"'))) {
      const quote = initial.trim()[0];
      const parts = [initial.trim()];
      while (index + 1 < end) {
        parts.push(lines[++index].trim());
        if (parts.at(-1).endsWith(quote)) break;
      }
      raw = parts.join(" ");
    }
    metadata[key] = decodeScalar(raw, key, filePath);
  }
  return metadata;
}

function validateSkillMetadata(filePath, expectedName = path.basename(path.dirname(filePath))) {
  const metadata = parseSkillFrontmatter(filePath);
  const errors = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.name || "")) {
    errors.push("name must be a lowercase kebab-case identifier");
  } else if (metadata.name !== expectedName) {
    errors.push(`name ${metadata.name} must match directory ${expectedName}`);
  }
  const description = String(metadata.description || "").replace(/\s+/g, " ").trim();
  if (description.length < 40) errors.push("description must be at least 40 characters");
  if (description.length > 1000) errors.push("description must be at most 1000 characters");
  if (description && !/\b(?:use when|use this skill|triggers?|run this|run on)\b/i.test(description)) {
    errors.push("description must contain a narrow activation cue such as 'Use when' or 'Triggers'");
  }
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(metadata.version || "")) {
    errors.push("version must be informational semver (for example 1.0.0)");
  }
  return { metadata, errors };
}

function listSkillFiles(skillsDir) {
  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(skillsDir, entry.name, "SKILL.md")))
    .map((entry) => path.join(skillsDir, entry.name, "SKILL.md"))
    .sort((a, b) => a.localeCompare(b));
}

module.exports = { listSkillFiles, parseSkillFrontmatter, validateSkillMetadata };

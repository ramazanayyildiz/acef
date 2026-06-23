const fs = require("node:fs");

function parseJsonLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

function codexMetrics(rows) {
  const completed = [...rows].reverse().find((row) => row.type === "turn.completed" && row.usage) || {};
  const usage = completed.usage || {};
  const itemRows = rows.filter((row) => row.item);
  const commandRows = itemRows.filter((row) => row.item.type === "command_execution");
  const commandText = commandRows.map((row) => row.item.command || row.item.text || "").join("\n");
  return {
    input_tokens: numberOrNull(usage.input_tokens),
    cached_input_tokens: numberOrNull(usage.cached_input_tokens),
    output_tokens: numberOrNull(usage.output_tokens),
    cost: null,
    tool_calls: itemRows.filter((row) => row.type === "item.started").length,
    extra_file_reads: countMatches(commandText, /\b(?:cat|sed|head|tail|rg|grep|find)\b/g),
    retry_count: commandRows.filter((row) => row.type === "item.completed" && Number(row.item.exit_code) !== 0).length,
    final_text: itemRows.filter((row) => row.item.type === "agent_message").map((row) => row.item.text || "").join("\n"),
  };
}

function opencodeMetrics(rows) {
  const finishes = rows.filter((row) => row.type === "step_finish" && row.part?.tokens);
  const totals = finishes.reduce((acc, row) => {
    const tokens = row.part.tokens || {};
    acc.input += Number(tokens.input || 0);
    acc.cache += Number(tokens.cache?.read || 0);
    acc.output += Number(tokens.output || 0);
    acc.cost += Number(row.part.cost || 0);
    return acc;
  }, { input: 0, cache: 0, output: 0, cost: 0 });
  const toolParts = rows.filter((row) => row.part?.type === "tool");
  const commandText = toolParts.map((row) => JSON.stringify(row.part?.state?.input || row.part?.input || {})).join("\n");
  return {
    input_tokens: finishes.length ? totals.input : null,
    cached_input_tokens: finishes.length ? totals.cache : null,
    output_tokens: finishes.length ? totals.output : null,
    cost: finishes.length ? totals.cost : null,
    tool_calls: toolParts.length,
    extra_file_reads: countMatches(commandText, /\b(?:cat|sed|head|tail|rg|grep|find)\b/g),
    retry_count: toolParts.filter((row) => row.part?.state?.status === "error").length,
    final_text: rows.filter((row) => row.type === "text").map((row) => row.part?.text || "").join("\n"),
  };
}

function numberOrNull(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function countMatches(text, pattern) {
  return (String(text || "").match(pattern) || []).length;
}

function globToRegex(glob) {
  let source = "";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === "*" && glob[index + 1] === "*") { source += ".*"; index += 1; }
    else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

function isAllowedPath(filePath, allowedPaths) {
  return allowedPaths.some((entry) => globToRegex(entry).test(filePath));
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

module.exports = { parseJsonLines, codexMetrics, opencodeMetrics, globToRegex, isAllowedPath, median };

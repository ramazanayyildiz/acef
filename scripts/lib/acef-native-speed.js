"use strict";

const path = require("node:path");

const NATIVE_FOCUSED_COMMAND_LIMIT = 3;
const NATIVE_REPEAT_LIMIT = 2;
const NATIVE_ACTIVE_SECONDS = 600;
const NATIVE_FOCUSED_TIMEOUT_SECONDS = 180;
const NATIVE_CLOSEOUT_TIMEOUT_SECONDS = 1800;

function normalizedArgv(argv) {
  return argv.map((value) => String(value)).join(" ").replace(/\s+/g, " ").trim();
}

function executableName(value) {
  return path.basename(String(value || "")).toLowerCase();
}

function focusedTokens(args, patterns) {
  return args.some((arg) => patterns.some((pattern) => pattern.test(arg)));
}

function phpTestKind(args) {
  if (focusedTokens(args, [/^--filter(?:=|$)/i])) return "focused";
  const testFiles = args.filter((arg) => /(?:^|\/)tests?\/.*(?:Test)?\.php(?::\d+)?$/i.test(arg));
  return testFiles.length >= 1 && testFiles.length <= 3 ? "focused" : "broad";
}

function packageTestKind(args) {
  if (focusedTokens(args, [/^--filter(?:=|$)/i, /^--testNamePattern(?:=|$)/i, /^-t$/i, /^--runTestsByPath$/i])) return "focused";
  const files = args.filter((arg) => /(?:^|\/).+\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(arg));
  return files.length >= 1 && files.length <= 3 ? "focused" : "broad";
}

function classifyNativeVerification(argv) {
  if (!Array.isArray(argv) || !argv.length) return { kind: "unknown", identity: "" };
  const executable = executableName(argv[0]);
  const args = argv.slice(1);
  const identity = normalizedArgv(argv);

  if (executable === "php" && args[0] === "artisan" && args[1] === "test") {
    return { kind: phpTestKind(args.slice(2)), identity };
  }
  if (/^(?:phpunit|pest)(?:\.phar)?$/.test(executable)) {
    return { kind: phpTestKind(args), identity };
  }
  if (executable === "composer" && /^(?:test|tests|phpunit)$/.test(args[0] || "")) {
    return { kind: phpTestKind(args.slice(1)), identity };
  }
  if (/^(?:npm|pnpm|yarn|bun)$/.test(executable)
    && (/^test(?::|$)/.test(args[0] || "") || (args[0] === "run" && /^test(?::|$)/.test(args[1] || "")))) {
    return { kind: packageTestKind(args), identity };
  }
  if (/^(?:pytest|py\.test)$/.test(executable)) {
    if (focusedTokens(args, [/^-k$/i, /^--keyword(?:=|$)/i, /::/])) return { kind: "focused", identity };
    const files = args.filter((arg) => /(?:^|\/)test_.+\.py(?:::\S+)?$/i.test(arg));
    return { kind: files.length >= 1 && files.length <= 3 ? "focused" : "broad", identity };
  }
  if (executable === "go" && args[0] === "test") {
    const target = args.slice(1).filter((arg) => !arg.startsWith("-"));
    return { kind: target.length === 1 && target[0] !== "./..." ? "focused" : "broad", identity };
  }
  if (executable === "cargo" && args[0] === "test") {
    return { kind: args.slice(1).some((arg) => !arg.startsWith("-")) ? "focused" : "broad", identity };
  }
  if (executable === "dotnet" && args[0] === "test") {
    return { kind: focusedTokens(args, [/^--filter(?:=|$)/i]) ? "focused" : "broad", identity };
  }
  if (/^phpstan(?:\.phar)?$/.test(executable) && /^(?:analyse|analyze)$/.test(args[0] || "")) {
    const targets = args.slice(1).filter((arg) => !arg.startsWith("-") && !/\.(?:neon|dist)$/.test(arg));
    return { kind: targets.length >= 1 && targets.length <= 3 ? "focused" : "broad", identity };
  }
  return { kind: "unknown", identity };
}

function freshNativeBudget(repoRoot, head, branch, now = Date.now()) {
  return {
    schema: "acef.native-speed.v1",
    repoRoot,
    head,
    branch,
    startedAt: new Date(now).toISOString(),
    commands: {},
    focusedCommands: [],
    broadSuiteCount: 0,
  };
}

function nativeBudgetFailure(state, classification, options = {}, now = Date.now()) {
  const elapsedSeconds = Math.max(0, Math.floor((now - Date.parse(state.startedAt)) / 1000));
  if (classification.kind === "unknown") return "acef-native-test accepts only recognized test or static-analysis commands";
  if (classification.kind === "broad") {
    if (!options.closeout) return "broad verification is forbidden during native implementation; use focused tests or run one clean-tree --closeout after all repairs";
    if (!options.cleanTree) return "native broad closeout requires a clean worktree after the repair commits";
    if (state.broadSuiteCount >= 1) return "native broad closeout suite already ran once for this HEAD";
    return "";
  }
  if (elapsedSeconds >= NATIVE_ACTIVE_SECONDS) return `native active test budget exceeded: ${elapsedSeconds}s/${NATIVE_ACTIVE_SECONDS}s`;
  const attempts = Number(state.commands[classification.identity] || 0);
  if (attempts >= NATIVE_REPEAT_LIMIT) return `native command repeat budget exceeded: ${attempts}/${NATIVE_REPEAT_LIMIT}`;
  if (!state.focusedCommands.includes(classification.identity)
    && state.focusedCommands.length >= NATIVE_FOCUSED_COMMAND_LIMIT) {
    return `native focused-command budget exceeded: ${state.focusedCommands.length}/${NATIVE_FOCUSED_COMMAND_LIMIT}`;
  }
  return "";
}

module.exports = {
  NATIVE_ACTIVE_SECONDS,
  NATIVE_CLOSEOUT_TIMEOUT_SECONDS,
  NATIVE_FOCUSED_COMMAND_LIMIT,
  NATIVE_FOCUSED_TIMEOUT_SECONDS,
  NATIVE_REPEAT_LIMIT,
  classifyNativeVerification,
  freshNativeBudget,
  nativeBudgetFailure,
  normalizedArgv,
};

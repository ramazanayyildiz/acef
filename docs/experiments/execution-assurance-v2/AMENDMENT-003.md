# Preregistration Amendment 003

The first `NATIVE-start` attempt is invalidated, not scored. Its automated oracle passed, but the harness trimmed the
final newline from the captured patch and the blind-judge packet could not be reproduced with `git apply`.

The original attempt row and artifacts remain immutable. Diff capture now preserves exact process bytes and has a
regression test. The same preregistered attempt will run again in a fresh session as ordinal 2. No task, prompt, model,
oracle, time cap, or decision threshold changed.

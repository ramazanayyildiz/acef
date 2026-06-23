# Context Retrieval Experiment Task: Dev Slice

task_type: dev
story: fixture-story
role: developer

## Goal

Implement a small, well-scoped ACEF story slice from failing tests and bounded context.

## Required Precondition

A dev-slice experiment is valid only when the actor starts from a clean isolated worktree at the real pre-dev point:

- the story ATDD/failing tests already exist;
- the focused story test is red for the expected missing implementation;
- the implementation commit for that story is not present in the worktree;
- the prompt names the base ref, failing test command, and allowed implementation paths.

If any of these are missing, record `result=invalid` instead of pretending a post-implementation tree measures developer
quality.

## Worker Input Contract

- Read the failing-test summary and target files named by the context bundle.
- Do not read unrelated epic history.
- Do not patch tests unless the story phase explicitly authorizes a test correction.
- Keep output short; write detailed evidence to the run artifact.

## Known Failure Classes

- Framework-fighting code that satisfies tests but breaks real runtime behavior.
- Story-scope leakage into a future story.
- Broad refactor unrelated to the current failing tests.
- Hidden dependency on generated build artifacts or local-only state.

## Success Signal

The focused test goes green without wrong-scope changes, stale-story leakage, or hollow green behavior.

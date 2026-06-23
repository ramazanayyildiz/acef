# Context Retrieval Experiment Task: ATDD

task_type: atdd
story: fixture-story
role: atdd

## Goal

Write acceptance tests for a narrow ACEF story from the supplied ACs and context bundle.

## Worker Input Contract

- Read the story ACs and relevant context only.
- Do not infer APIs from memory; ground on golden-neighbor paths if provided.
- Tests must exercise real runtime paths where the story requires runtime behavior.
- Do not implement production code.

## Known Failure Classes

- Tests assert fake framework APIs or introspection-only behavior.
- Tests hit the wrong URL when a redirect is the product contract.
- Tests prove a helper exists but not that the user-visible capability works.

## Success Signal

The ATDD slice is red for the right reason and maps ACs to real behavior, not merely class or method existence.

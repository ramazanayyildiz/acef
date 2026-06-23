# Context Retrieval Experiment Task: Review

task_type: review
story: fixture-story
role: reviewer

## Goal

Review a completed ACEF story slice using only the context mode assigned by the experiment.

## Worker Input Contract

- Read the provided context bundle.
- Read only the changed files or diff paths named by the bundle.
- Do not read the full delivery ledger unless the experiment mode explicitly provides it.
- Return a short finding summary and quality metrics.

## Known Finding Classes

- Requirement satisfied by artifact existence instead of exercised capability.
- Runtime path diverges from isolated test path.
- Scope leakage into another story or epic.
- Framework-fighting workaround that makes tests green without real product behavior.

## Success Signal

The reviewer recalls blocker/high findings already present in the control answer key without adding broad false positives.

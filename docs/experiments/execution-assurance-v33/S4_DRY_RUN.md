# Story 4 non-scored dry-run

This is preparation evidence, not a scored v3.3 pilot result.

- Source commit: `a12ac50441114943efd099f9e601bbee4a9d8a12`
- Model: `gpt-5.6-sol`, high reasoning, fresh session
- Session: `019fc309-f065-7f60-b6fa-3daec7e0f6e4`
- Disposable-clone commit: `ed6c7859`
- Baseline oracle: behavioral red (`exit 2`; 4 tests, 3 assertions, 1 error, 2 failures)
- Final oracle: green (`exit 0`; 4 tests, 5 assertions)
- Changed production paths: exactly the controller, processing job, and ingress dedup service frozen by Story 4
- Input tokens: 125,207 (105,216 cached)
- Output tokens: 1,723
- Reasoning tokens: 602

The actor received the compiled Story 4 contract plus four bounded initial files. It changed no test, configuration,
framework, or out-of-scope path. Independent verification reran the exact focused command after the actor commit and
again passed 4/4 tests.

An earlier launcher invocation supplied an empty prompt because of a shell positional-parameter mistake. It performed
no work and is excluded from the dry-run evidence. The successful invocation above is the only measured task attempt.

## Conclusion

The v3.2 Story 4 failure was a frozen scope/ATDD-contract defect: the valid fix necessarily touched the ingress dedup
service in addition to the controller and job. With those three paths frozen and the prompt bounded, a fresh actor
closed the story in one invocation at roughly one tenth of the v3.2 average child input-token load.

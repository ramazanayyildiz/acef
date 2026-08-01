# Preregistration Amendment 004

The first `P0-legacy` launch produced no immutable attempt row and is invalidated as a harness interruption. The agent's
JSON event stream was held in a parent-process pipe and was not persisted until actor exit. The parent execution session
ended before post-processing, so the launch has no reproducible transcript, diff artifact, automated-oracle result, or
score. Its partially modified disposable clone is evidence only and will not be reused.

Actor output is now streamed directly to durable stdout/stderr files during execution, removing the bounded pipe and
preserving diagnostics if the parent is interrupted. A regression test writes more than the platform's default synchronous
child-process buffer to both streams and verifies byte counts. `P0-legacy` will restart from the same pinned source and
framework commits in a fresh disposable clone. No task, prompt, model, oracle, time cap, or decision threshold changed.

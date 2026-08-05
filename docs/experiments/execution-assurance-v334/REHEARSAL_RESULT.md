# V3.34 shell-safe integration proof result

V3.34 is an immutable `PRODUCT_PASS_PROCESS_FAIL` after 1,330 active seconds (22m10s). It exceeded the 15-minute
target by 430 seconds and stayed below the 30-minute hard cap. The actor and independent verification processes both
exited zero, and all frozen hard budgets passed.

The V3.33 repair passed live. After the exact story-close package was durably committed, the conductor executed one
compiled integration command with the metacharacter-bearing filter safely quoted. It exited zero; no `sh -c` wrapper,
second invocation, or retry appeared. Durable lifecycle, discovery, treatment binding, scope enforcement, the one
post-red correction, same-Developer resumption, both zero-finding reviews, and the Epic Process Judge all passed.

The original automated row had one collaboration failure. The ATDD actor executed its canonical evidence command
exactly once, but stored the complete non-interpolated literal in `const cmd = String.raw\`...\`` and passed object
shorthand `{cmd,...}` to `tools.exec_command`. The extractor recognized only inline `cmd: "..."` values and therefore
reported the command missing. This was transcript-attribution rigidity: the actor record and executable red evidence
were valid, and the command was neither interpolated, mutable, assembled, nor repeated.

The parser now accepts only that statically provable constant-literal shape while continuing to reject interpolation,
mutation, unknown aliases, dynamic construction, and duplicate calls. Re-running the full collaboration scorer on the
exact immutable transcript yields PASS with six actors, seven invocations, one correction binding, one original
Developer reactivation, and one successful integration invocation. The artifact-only blind Judge independently
returned PASS with complete product outcome, no findings, no scope violation, and no test weakening.

The attempt row and its derived verdict are not rewritten. Under the preregistered promotion rule, the capability
remains `enforced`, not `proven`; no V3.35 is launched automatically.

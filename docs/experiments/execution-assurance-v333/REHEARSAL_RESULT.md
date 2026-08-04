# V3.33 clean-row proof result

V3.33 is an immutable process FAIL after 1,106.9 active seconds (18m26.9s). It exceeded the 15-minute target by
206.9 seconds and remained below the 30-minute hard cap. The actor and independent verification processes both
exited zero.

The product path passed: the controlled post-red correction occurred exactly once and resumed the same Developer;
the focused suite passed 19 tests and 24 assertions; Code Review and Patch Assurance both returned PASS with zero
findings; the formal story-close package was committed before integration; and the Epic Process Judge returned PASS.
Task discovery, treatment binding, scope enforcement, and the frozen product expectations also passed.

The terminal failure was caused by the final integration command's shell representation. The conductor first ran:

```text
sh -c 'php artisan test --filter=BenchmarkAuthzMiddlewareIdempotencyTest|RouteCapabilityMiddlewareTest'
```

Because the filter containing `|` was not quoted inside the shell command, that invocation exited 127. The conductor
then ran the semantically identical command with the filter quoted; it exited zero. The scorer correctly observed two
exact frozen lifecycle integration invocations instead of one, failed the one-broad-suite budget, and consequently
failed the dependent durable-lifecycle check. This is a conductor prompt/command-compilation defect, not a product,
test, reviewer, environment, or scorer defect.

Per the preregistered stop rule, V3.33 is not rerun and no V3.34 is started automatically. The framework needs to
compile and emit an executable, shell-safe integration action rather than asking the conductor to reconstruct a
display string. The capsule-supervisor capability remains `enforced`, not `proven`.

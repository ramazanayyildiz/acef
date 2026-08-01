# Preregistration Amendment 006

The P0 shakeout audit found two measurement defects before any scored P0 result existed. Lifecycle counting was global,
so four correct story lifecycles looked like one duplicated lifecycle; focused PHPUnit commands containing `--filter`
were also counted as broad-suite executions.

Lifecycle trace analysis is now scoped by the frozen story ID (or `epic` for wrappers). Story and epic actor/tool
dispatches must carry an explicit `scope=<id>` measurement marker. Unscoped or ambiguous lifecycle events remain visible
and make the automated trace incomplete rather than being silently assigned to the epic. Review/verify-patch retries are
reported but do not by themselves prove a duplicated lifecycle. Focused PHPUnit/Artisan filters are excluded from the
broad-suite count; an unfiltered invocation in the same integration command remains broad.

The automated oracle now fails closed on incomplete scope attribution or a duplicated attributable lifecycle. Task,
treatment, source, model, acceptance oracle, allowed production paths, and time caps are unchanged.

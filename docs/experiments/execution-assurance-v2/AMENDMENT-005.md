# Preregistration Amendment 005

Independent audit found that the first `P0-legacy` prompt required an invalid treatment. Legacy commit `d8b816c` has one
mutually exclusive active-run `lane`; it cannot encode `full-bmad + guarded` as candidate-style axes. Its policy routes a
large epic to `full-bmad`, whose own lifecycle requires stronger review for guarded auth/payment/data stories, or to the
separate `guarded` epic/capstone lane only with explicit human approval.

The invalid launch synthesized `lane: guarded` while claiming Full BMAD in prose. It then spent six Process Judge rounds
repairing inconsistent epic-start state without reaching production code. This is useful evidence of a historical
misapplication but cannot be attributed as the cost of policy-compliant legacy ACEF.

The P0 legacy runtime is therefore clarified as the installed `full-bmad` lane with the risk-specific safeguards required
by that lane's own documentation. The candidate remains installed `full-bmad` with typed Guarded assurance. The normalized
manifest field `assuranceProfile: guarded` identifies the matched risk stratum; it is not injected into legacy runtime
state. Both arms still receive the same frozen task, source commit, model, acceptance oracle, scope, and time cap. This
amendment corrects treatment validity before either P0 arm has a scored result.

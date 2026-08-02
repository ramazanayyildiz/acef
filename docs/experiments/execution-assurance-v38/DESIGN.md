# Execution Assurance v3.8 final-tree recovery

Status: **implementation and repository verification complete; rehearsal must be frozen separately.**

V3.7 remains an immutable non-scored FAIL. It proved reviewer-vocabulary normalization and executed all four stories,
but S4 could not close after a real production repair because the affected-only retry instructions preserved a stale
Patch Assurance PASS. The same run exposed four harness/contract defects: Markdown trailing whitespace hid typed repair
bindings, quoted command operators were misclassified as shell control operators, conditional Judge triggers were
duplicated in prose, and the durability oracle treated an immutable REVISE layer plus repair delta as an invalid split
package. It also showed that task_name could be written as Developer session identity even though the harness knew the
real receiver thread id.

V3.8 repairs those boundaries without weakening deterministic close:

1. every Developer repair requires fresh Patch Assurance on the repaired final application/test tree;
2. Code Review reruns after a prior Code Review REVISE or any production repair, while test-only repairs may preserve a
   prior Code Review PASS;
3. Developer actor and repair receipt session identity must equal the spawn result's real agent/receiver id;
4. repair binding lines accept harmless trailing whitespace while retaining exact path and SHA-256 validation;
5. shell safety distinguishes quoted argument syntax from real separators, while unquoted pipelines, redirections,
   substitutions, dynamic commands, and mutation-capable commands remain rejected;
6. `review-completion` is the sole report-shape validator, avoiding repeated schema/tool discovery;
7. conditional Judge triggers may be read from the typed decision artifact, and a Judge cannot be reactivated for a
   later mechanical gate failure; and
8. formal close durability validates an exact immutable cycle-0 package followed by at most two exact immutable repair
   delta packages, rather than requiring historical artifacts to be introduced again.

## Verification and rehearsal rule

The execution-assurance regression covers mandatory final-tree Patch Assurance, two bounded repair cycles, trailing
whitespace, real Developer receiver identity, typed Judge trigger recovery, quoted shell arguments, unsafe unquoted
pipelines, and layered immutable close packages. The complete repository suite must pass 30/30 and capability-change
validation must pass before freezing a candidate commit.

A rehearsal manifest must be committed after the implementation commit and bind that exact clean commit. It reuses the
unchanged four-story v3.5 product contract, must pass clean preflight and Stage 0, and authorizes only one non-scored,
non-promotable `REHEARSAL-v38` attempt. No blind Judge, promotion, maturity change, installation, or rollout is allowed
from that rehearsal. A future scored attempt still requires a separate frozen manifest and run identity.

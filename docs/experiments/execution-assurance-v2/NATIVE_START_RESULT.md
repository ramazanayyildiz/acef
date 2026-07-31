# Native Start Sentinel Result

Scored verdict: **PASS** (`NATIVE-start`, ordinal 2)

Ordinal 1 remains preserved but invalidated because its diff artifact was not replayable. Ordinal 2 used a fresh
ephemeral session and received an independent, treatment-blinded artifact-only Judge verdict.

| Metric | Value |
| --- | ---: |
| Active agent delivery | 76.1 s |
| Assignment-to-product-done wall time | about 180 s |
| Input tokens | 352,235 |
| Cached input tokens | 309,760 |
| Output tokens | 2,825 |
| Tool calls | 10 |
| Scope violations | 0 |
| Lifecycle/state-reconstruction events | 0 |
| Blind Critical/High/Medium findings | 0 / 0 / 0 |

Automated focused verification passed, the patch replayed on a neutral clone, and the blind Judge additionally ran the
simulation guard, headless, golden-vector, and research-runtime checks successfully. This is a drift/framework-tax
sentinel only. It does not compare legacy and candidate ACEF and therefore supports no ACEF speed or quality claim.

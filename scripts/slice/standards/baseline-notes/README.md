# Baseline notes

One file per slice (`<SLICE-ID>.md`) that changes a standards counter, e.g. `GATE-APP 69 -> 66 (UserForm now uses constructor injection)`.
Do not edit `../baseline.txt` on a branch. The merger measures the merged tree with `scripts/standards-check.sh --print-baseline .` and writes the values in the merge commit. `standards-check.sh` does not read this directory.

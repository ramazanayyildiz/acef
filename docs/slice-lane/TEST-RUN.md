# First real test run (owner walkthrough)

One slice end to end on a host that already has the lane bootstrapped: the gate wired as a project script,
`slice-method.json`, and a stack profile. Core wording is stack-neutral; the host-specific commands are in the last
section. Never run any of this against the owner's preview DB or port.

**Prerequisites.** (1) A lane test DB whose name contains `testing` (`lanes.db_pattern`), migrated from the base
worktree. (2) The test runner pointed at that DB through its own config variable, set per worktree. (3) Private package
credentials as a one-shot environment variable for the install command only, never written to a file or the repo.
(4) The `codex` CLI logged in; `REVIEW_MODEL=gpt-6-astra` (or `review.codex_model` in `slice-method.json`).

| # | Step | Output that proves it |
|---|---|---|
| 1 | Coordinator writes `docs/slices/<ID>.md` from `templates/slice/slice.md` (K items, allowed list, class) | file ≤150 lines; every K item names its test |
| 2 | Developer opens an own worktree, port and lane DB | `git worktree list` shows it; `git status --short` empty |
| 3 | Red test first, in a test-only commit | `git checkout <test-sha>` + the slice test → red count in `red-first.txt` |
| 4 | Gate, light, on the candidate | last line `GATE PASS <sha7> light pass=<n> fail=0 skip=0`, with `pass` ≥ 1 |
| 5 | Independent review: `scripts/codex-review.sh <brief> <out.md>` | `CODEX-REVIEW … verdict=PASS` exit 0, or `verdict=REVISE` exit 1 |
| 6 | After REVISE: targeted re-review in the same reviewer session (`templates/slice/review-r2.md`) | r2 report with every finding KAPANDI / AÇIK / KABUL |
| 7 | Coordinator writes the closing note (`templates/slice/closing-note.md`) | fields filled; `python3 -I scripts/metrics.py docs/slices` shows the row |
| 8 | Merge `--no-ff` only on the owner's word | merge commit; post-merge gate PASS |

`codex-review.sh` runs a one-shot `codex exec`; for step 6 with that reviewer, give it the previous report plus the fix
diff and write "new session: one-shot reviewer" in the r2 header.

**Cost fields to fill** (dev report, "Maliyet"): `Duvar-saati-geliştirme-dk`, `Duvar-saati-dilim-dk`,
`Token-geliştirici`, `Token-inceleme`, `Token-koordinatör`, `Token-toplam`, `Ölçüm-kaynağı`; closing note:
`Süre-geliştirme-dk`, `Süre-inceleme-dk`, `REVISE-turu`. Unmeasured = `ölçülmedi`.

**Failure drills** (each on a throwaway worktree; each must NOT pass):

1. *String boolean.* Set `"full_only": "false"` on the tests command in `slice-method.json`, run the gate → exit 2,
   `gate.commands[0] full_only must be a boolean`, no command ran.
2. *Stale reviewer output.* Leave `Karar: PASS` in `out.md`, run `CODEX_BIN=<script that exits 0 and writes nothing>
   REVIEW_MODEL=x scripts/codex-review.sh <brief> out.md` → exit 3, `verdict=NONE`, `out.md` untouched.
3. *Untracked file.* `touch stray.txt`, run the gate → exit 2, `dirty tree (changed or untracked files)`; with
   `--allow-dirty` the summary is tagged `+dirty`.

## Bootstrap example (Laravel)

```sh
export DB_DATABASE=<project>_testing_l1 PHPUNIT_CONFIG=phpunit.lane.xml    # lane DB; test runner config
COMPOSER_AUTH='{"github-oauth":{"github.com":"<token>"}}' composer install  # one shot, not exported
composer acef:gate                                                          # = scripts/gate.sh <this worktree>
REVIEW_MODEL=gpt-6-astra scripts/codex-review.sh docs/slices/evidence/<ID>/brief.md docs/slices/<ID>-review.md
```

# Product language — pilot plan (one screen, one host)

Status: plan, not run. Owner decision 2026-10-27: try the package (`method/PRODUCT_LANGUAGE.md`, end-user profiles,
review section F, `scripts/slice/ui-copy-hints.py`, the user-goal tour) on ONE existing screen of ONE host before
rolling it out. This page stays neutral: the host, the screen and the slice id are chosen and recorded in the host's
own records, not here.

## Each host investigates its own cause

The same symptom (process and evidence text on end-user screens, stacked warnings) was seen in two hosts. The
contributing factors listed in `method/PRODUCT_LANGUAGE.md` are not proven root causes, and the cause in one host is
not assumed for another. Before or during its pilot, each host answers in its own record, with evidence:
- which instruction, review round, test or data path put the text on the screen (`git log -S '<sentence>'` on the
  view and on the tests that assert it);
- whether the text is rendered from a template literal or from a database field that an agent wrote;
- whether any test asserts the sentence.

## Choose the pilot screen

One existing screen of `<host>` that (a) is in daily use by a real end-user group, (b) currently shows at least one
process/evidence sentence or stacked warning, and (c) also shows at least one warning the user really needs (a pending
approval, a clash, a stale value). Condition (c) is what lets the pilot measure both directions.

## Steps

1. **Profile.** Write the host profile file (`templates/slice/user-profiles.md` → `<host profile path>`, set
   `slice-method.json` → `user_profiles`) for the screen's main user group only. Mark it as an assumption:
   "Son gerçek kullanımla karşılaştırma: henüz yok", unless the owner or support records already confirm it.
2. **Baseline (before any change).** On the unchanged screen, record:
   - the visible text inventory: every sentence/label on the screen, classified by the coordinator as *needed now*
     (the user must know or do something) or *process/evidence* (rule 2), with one line of reasoning each;
   - hint output on the whole current view file, every line counted as added:
     `git diff --no-index /dev/null <view file> | scripts/ui-copy-hints.py --diff -`;
   - the tests that assert any of those sentences (`git grep -n '<sentence>' <test paths>`).
3. **Slice.** One HAFİF slice `<slice-id>` with the target-user line, acceptance items for the information the user
   needs (asserted by data/state/`data-testid`, not wording), and removal or merge of the process/evidence text. Tests
   that pinned removed sentences are rewritten to assert the underlying data or state.
4. **Review** with checklist section F and the review-brief question (F1–F6).
5. **User-goal tour** (`templates/slice/user-goal-tour.md`) with one goal the screen serves, before and after the
   slice, on synthetic data, no real external actions.

## Measures (recorded in the host's slice closing evidence)

| Measure | How | Pass if |
|---|---|---|
| Catches unnecessary text | process/evidence sentences in the baseline inventory vs. those found by review F2 + hints | review + hints find every sentence the coordinator classified as process/evidence |
| Keeps required warnings | *needed now* items in the baseline vs. the screen after the slice | every *needed now* item is still shown (possibly shorter or merged); none dropped |
| Hint noise | hint lines judged "right in context" / all hint lines | reported, no threshold yet; feeds the profile's term list |
| Tests | tests that asserted process sentences before vs. after | zero after; each replaced by a data/state/`data-testid` assertion |
| Goal tour | GÖREV result, steps, "anlaşılmayan metin" count, before vs. after | task completes after; misunderstood-text count does not grow |
| Cost | coordinator + reviewer minutes added by the profile, section F and the tour | reported; owner judges |

A *needed now* item that disappears is a pilot failure regardless of the other measures.

## After the pilot

The owner decides: roll out as is, change the package, or stop. Findings that change the method go into this repo as
a separate PR with a CHANGELOG entry; profile corrections stay in the host. The capability record
(`docs/ai/capabilities/product-language.json`) gets the pilot as evidence only after it has run.

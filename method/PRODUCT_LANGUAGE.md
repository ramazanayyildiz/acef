# Product language — screens are for the end user

> Status: owner decision 2026-10-27. Capability record: `docs/ai/capabilities/product-language.json`.
> Applies to every lane that changes a user-visible surface. Referenced from `method/SLICE_LANE.md`.

## Why

In two hosts, agents filled end-user screens with process and evidence text and stacked warnings ("source-backed",
"unconfirmed", "UNKNOWN", disclaimers), as if the screen were a report to the developer, the owner or a reviewer.
Contributing factors seen so far (not proven root causes; the same symptom need not have the same cause in every
host, so each host investigates its own):

- an instruction meant for reports ("show source claim, inference, controlled test and real execution separately")
  was applied to every screen;
- the people who looked at the screens were reviewers and the owner, and no end-user profile existed;
- tests asserted the warning sentences, so removing them turned a test red and the next agent restored the text;
- every review round added a warning and none removed one;
- agents wrote database records (task titles, descriptions) in their own note language and the UI rendered them raw.

## The rule

1. **Know who the screen is for.** A host keeps its end-user profiles in one file
   (`slice-method.json` → `user_profiles`, template `templates/slice/user-profiles.md`). UI-touching work names the
   target profile and the job on that screen: `Hedef kullanıcı: <profil> · Bu ekranda yapacağı iş: <görev>`.
   Profiles are assumptions, corrected from real use. They are not permission roles: one person can hold several
   roles, and usability checks and access checks do not replace each other.
2. **Development, audit and evidence notes never go on a product screen.** They belong in reports, slice files and
   agent records. Words like "source-backed", "unverified", "inferred", "test data", "UNKNOWN", "per review",
   "TODO", a model's caveat or a provenance remark are process language.
3. **Information that changes what the user knows or does now IS shown, briefly and plainly.** Criterion: *does the
   user need to know or do something now?* A pending approval, a clashing appointment, a stale price, a missing
   required field, an action that cannot be undone are not errors and not process notes: show them, in the user's
   words, next to where they act.
4. **User-facing text and agent working notes live in separate fields.** A record that an agent writes (task title,
   description, status note, generated summary) has a user-facing field and, if needed, a separate internal note
   field. The UI renders only the user-facing field. Raw agent notes, prompts, model output or evidence text are never
   rendered.
5. **Every new warning earns its place.** Before adding one, check that the user needs it now (rule 3), and whether
   it merges with text already on the screen. Removing an existing warning is not forced for balance; it is removed
   when it fails rule 3.
6. **Reports to the owner carry results, important problems and decisions only.** Details stay in agent records and
   evidence files, linked, not pasted.

Terms in a profile's "may confuse" list are review hints, not a ban: a word that is fine in one context ("kayıt",
"doğrulama" on a sign-up form) can be jargon in another.

## Tests and evidence

Test requirements are unchanged (`method/TEST_PIPELINE.md`): a status assertion on a user-visible path is paired with
a content or negative assertion, and a UI-visible claim needs screen-level evidence. What those assertions verify is
the required information and behaviour — data, state, `data-testid` / role selectors — not process or disclaimer
sentences. Adding text to a screen so that a test can find it is a defect.

## Review and tours

- Review (`templates/slice/review-checklist.md` section F, `templates/slice/review-brief.md`): can the target user do
  their actual job on this screen, and which element does not serve it; every new warning justified; no process or
  evidence text on screen; raw agent notes not rendered.
- Optional hint: `scripts/slice/ui-copy-hints.py` lists new visible-looking strings in a diff that contain terms from
  the profile's "may confuse" list, and long explanatory lines. It only warns (exit 0); a human or reviewer decides.
- User-goal tour (`templates/slice/user-goal-tour.md`): a clean-context agent gets only a profile, a goal and the
  starting information, and must find the path itself. It is a useful pre-check, not real user testing. Permission-role
  tours (`templates/slice/exploration-tour.md`) stay as they are.

## Rollout

Before rolling out to all hosts, try the package on one existing screen of one host:
`docs/slice-lane/product-language-pilot.md`.

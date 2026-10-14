---
title: risk-profile-schema
type: note
permalink: ram/04-ai-toolkit/skills/test/test-risk-classifier/references/risk-profile-schema
---

# Risk Profile Schema Reference

This file documents the exact output format produced by `test-risk-classifier`
and consumed by `test-generator`. Both skills must agree on this schema.

---

## Field Definitions

| Field | Type | Description |
|---|---|---|
| `ClassName` | string | Fully qualified class name |
| `Overall risk` | enum | LOW / MEDIUM / HIGH / CRITICAL |
| `Recommended test ratio` | string | e.g. "60% Unit / 40% Feature" |
| `Complexity Score` | integer | branches × 1.0 + side effects × 2.0 + preconditions × 0.5, rounded (`parse_class.py`) |
| `Priority` | enum | Critical / Important / Nice to have |
| `[B{n}]` | branch ID | Numbered branch — maps to a test case in generator |
| `[SE{n}]` | side effect ID | Numbered side effect — maps to an assertion in generator |
| `[P{n}]` | precondition ID | Numbered precondition — maps to Arrange block in generator |

---

## Complexity Tier Thresholds

| Score | Tier | Recommended minimum test cases |
|---|---|---|
| 0–3 | 🟢 LOW | 2–4 (happy path + 1–2 edge) |
| 4–7 | 🟡 MEDIUM | 5–8 (all branches + key side effects) |
| 8–14 | 🔴 HIGH | 8–15 (all branches + all side effects + edge cases) |
| 15+ | 🚨 CRITICAL | 15+ or refactor first |

---

## Dependency Classification → Laravel Fake Mapping

| Classification | Laravel fake / helper |
|---|---|
| `DB` | `use RefreshDatabase` |
| `HTTP` | `Http::fake([...])` |
| `QUEUE` | `Queue::fake()` |
| `EVENT` | `Event::fake()` |
| `MAIL` | `Mail::fake()` |
| `NOTIFICATION` | `Notification::fake()` |
| `CACHE` | `Cache::fake()` or `Cache::store('array')` |
| `FILESYSTEM` | `Storage::fake('disk-name')` |
| `TIME` | `Carbon::setTestNow(now())` or `$this->travel()` |
| `RANDOM` | `Str::createUuidsUsingSequence([...])` |
| `CONFIG` | `config(['key' => 'value'])` in setUp() |

---

## Handoff Contract

The risk profile is a contract between `test-risk-classifier` and `test-generator`.

`test-generator` MUST:
- Generate at minimum one test per branch `[B{n}]`
- Assert every side effect `[SE{n}]` in the relevant test case
- Set up every precondition `[P{n}]` in the Arrange section
- Initialize all fakes listed in "Global Mock Setup" in `setUp()`
- Use complexity tier to determine how many edge/error cases to add beyond the minimum

`test-risk-classifier` MUST:
- Use the exact IDs (`[B{n}]`, `[SE{n}]`, `[P{n}]`) so generator can reference them
- Never skip a public method
- Always include the "Handoff to test-generator" section as the last block
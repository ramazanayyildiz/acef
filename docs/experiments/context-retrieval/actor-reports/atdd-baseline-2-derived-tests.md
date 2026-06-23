# ATDD Baseline 2 Derived Test Slice

Story: 4.1
Mode: baseline
Runner: main-codex-self-run

Second pass from the controlled baseline context. It derives the same behavior-first acceptance-test surface:

- `T-MIG`: migration creates all required Blogs and BlogCategories tables, including translation, slug, revision, and pivot tables.
- `T-PROVIDERS`: both capsule service providers are registered.
- `T-PRESS`: real `BlogCategoriesSeeder` creates bilingual `Basın`/`Press` and resolves slug `press` in TR and EN through the repository.
- `T-TAXONOMY`: BlogCategories, not Twill tags, are the taxonomy mechanism.
- `T-BROWSER-PIVOT`: repository/browser payload persists multiple BlogCategory assignments through `blog_blog_category`.
- `T-BILINGUAL-SLUG`: bilingual Blog titles persist locale-specific active slug rows and localized route keys.
- `T-ADMIN-SMOKE`: authenticated admin list/create/edit routes for Blogs and BlogCategories respond, and Sector browser route exists for the Blog form.
- `T-REAL-SEED`: real `db:seed --force` creates the Press category and makes it resolvable.

Guardrails preserved:

- No public `/tr/blog` or `/en/blog` rendering tests in Story 4.1; those are Story 4.2.
- No SuccessStory relation behavior required here; Epic 5 owns that capsule.
- No fake Twill form-field or facade introspection assertions.
- Red-first expectation remains: on a pre-Story-4.1 tree, these tests should fail for missing runtime capability; on the completed tree, they may pass.

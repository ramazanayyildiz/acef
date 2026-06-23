# ATDD Baseline 1 Derived Test Slice

Story: 4.1
Mode: baseline
Runner: main-codex-self-run

Derived from the controlled baseline context:

- `T-MIG`: migrate then assert the nine required Blogs/BlogCategories tables exist.
- `T-PROVIDERS`: assert `bootstrap/providers.php` includes both capsule service providers.
- `T-PRESS`: run the real `BlogCategoriesSeeder` and assert bilingual `Basın`/`Press` plus slug `press` resolves in TR and EN through `BlogCategoryRepository::forSlug`.
- `T-BELONGSTOMANY`: create one Blog and two BlogCategories, attach through the category browser/pivot path, assert both relation hydration and `blog_blog_category` rows.
- `T-NO-TAGS`: reflect `Blog` traits/methods to reject Twill tags as the taxonomy mechanism.
- `T-BILINGUAL-SLUG`: create a bilingual Blog and assert locale-specific active slug rows and localized route keys.
- `T-PRESS-PIVOT`: attach the seeded Press category and assert the relation supports Story 4.2's future `/press` filter.
- `T-ADMIN-SMOKE`: authenticated real admin routes for Blogs, BlogCategories, and the Sector browser must respond.
- `T-REAL-SEED`: real `db:seed --force` creates Press and can resolve it by slug.

Quality notes:

- Avoids fake Twill APIs and introspection-only tests except where provider registration is explicitly source-owned.
- Does not test `/tr/blog` or `/en/blog` rendering, because the story context marks that as Story 4.2.
- Does not require SuccessStory relation behavior, because that capsule is deferred to Epic 5.
- Red-first expectation: on a pre-Story-4.1 tree, these tests should fail for missing capsules/tables/routes/seeders; on the current completed tree, they may pass.

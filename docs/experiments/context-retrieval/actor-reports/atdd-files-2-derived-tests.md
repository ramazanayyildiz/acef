# ATDD Files 2 Derived Test Slice

Story: 4.1
Mode: files
Runner: main-codex-self-run

Second pass from the bounded files context. It derives the same core Story 4.1 acceptance-test surface:

- `T-MIG`: required Blogs and BlogCategories table set exists.
- `T-PROVIDERS`: Blogs and BlogCategories providers are registered.
- `T-PRESS`: BlogCategories seeder creates bilingual Press/Basın category with slug `press`.
- `T-TAXONOMY`: BlogCategories relation is the taxonomy mechanism; Twill tags are rejected.
- `T-BROWSER-PIVOT`: multiple BlogCategory assignments persist through `blog_blog_category` and hydrate through the relation.
- `T-BILINGUAL-SLUG`: locale-specific Blog slugs and route keys are persisted.
- `T-ADMIN-SMOKE`: admin routes for Blogs/BlogCategories and Sector browser route are part of the acceptance boundary.

Scope boundaries preserved:

- Story 4.2 owns public Blog list/detail/Press rendering and pagination.
- Epic 5 owns SuccessStory relation behavior.
- No custom slugification should be introduced; Twill vendor slug behavior is accepted.

Nuance:

- As in `atdd-files-1`, the bounded files bundle is good enough for the core ATDD shape but omits some detailed test-strategy text from the full story artifact. Recall remains lower than baseline for real-runtime smoke and negative-leak guard detail.

# ATDD Files 1 Derived Test Slice

Story: 4.1
Mode: files
Runner: main-codex-self-run

Derived from the bounded files context:

- `T-MIG`: assert the nine required Blogs and BlogCategories tables exist after migration.
- `T-PROVIDERS`: assert both capsule service providers are registered.
- `T-PRESS`: run/seeder-path check for the reserved bilingual Press category with slug `press`.
- `T-TAXONOMY`: assert BlogCategories are the taxonomy mechanism and Twill tags are not used.
- `T-BROWSER-PIVOT`: assert assigning BlogCategories to a Blog persists through `blog_blog_category` and hydrates through `$blog->blog_categories`.
- `T-BILINGUAL-SLUG`: assert TR and EN Blog titles persist active locale-specific slug rows and localized route keys.
- `T-ADMIN-SMOKE`: assert admin routes for Blogs/BlogCategories and Sector browser route exist/respond, based on the ledger evidence and story scope.

Scope boundaries preserved:

- Do not test public `/tr/blog`, `/en/blog`, `/tr/press`, or pagination rendering in Story 4.1; those are Story 4.2.
- Do not require SuccessStory relation behavior; that capsule is Epic 5.
- Do not introduce custom slugification; accept Twill vendor slug behavior noted in the ledger.

Nuance:

- The files bundle was sufficient for the core AC-to-test mapping, but thinner than baseline. It did not include the complete detailed testing bullet list from the story artifact, so this row has lower recall than baseline for the real-runtime smoke/negative-leak guard details.

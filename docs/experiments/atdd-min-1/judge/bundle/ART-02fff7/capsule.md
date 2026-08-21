# Capsule — Mobile primary navigation active state and scroll restoration contract

## Story
The primary navigation marks the current item with styling only, so on mobile the current page is not announced to assistive technology, and moving between primary pages drops the user's scroll position when they use browser Back. Make the current item programmatically determinable in both variants and emit the scroll-restoration contract the front end needs to restore position across Back/Forward.

## Acceptance criteria
1. Every primary navigation link exposes its current-ness programmatically, not by CSS class alone, so assistive technology announces the current page. This applies to the mobile variant as well as the desktop variant.
2. Exactly one item is marked current for a given request, and it is the same item in the desktop and mobile renderings of that request.
3. The mobile variant keeps its existing distinct test ids; desktop and mobile items must remain separately addressable.
4. Each primary navigation link carries a stable scroll-restoration key derived from the navigation item, identical for the desktop and mobile rendering of the same item and stable across requests.
5. The authenticated layout emits a scroll-restoration region marker identifying the page being rendered, so Back/Forward navigation can restore the prior scroll offset for the page being returned to.
6. Existing navigation behaviour is preserved: item filtering via the exclusion list, badge rendering, and the existing href/test-id output must continue to work unchanged.
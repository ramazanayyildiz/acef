---
title: react-nextjs
type: note
permalink: ram/04-ai-toolkit/skills/test/storymap/references/react-nextjs
---

# React / Next.js Extraction Reference

## Route Discovery

### Next.js App Router (v13+)
```
app/
├── page.tsx                    → / (home)
├── layout.tsx                  → shared layout
├── dashboard/
│   ├── page.tsx                → /dashboard
│   ├── settings/page.tsx       → /dashboard/settings
│   └── [projectId]/page.tsx    → /dashboard/:projectId
├── api/
│   ├── users/route.ts          → /api/users
│   └── auth/[...nextauth]/route.ts → /api/auth/*
└── (marketing)/
    ├── about/page.tsx           → /about (route group, no URL segment)
    └── pricing/page.tsx         → /pricing
```

Directory structure IS the route table. Each `page.tsx` = a user-facing page.
Route groups `(name)` = organizational, not in URL — often map to activities.
Dynamic segments `[param]` = variations.

### Pages Router (legacy)
```
pages/
├── index.tsx           → /
├── dashboard.tsx       → /dashboard
└── api/users.ts        → /api/users
```

### React Router (non-Next.js)
```
src/routes.tsx or src/App.tsx
```
Look for `<Route>`, `<Routes>`, `createBrowserRouter`. Each route path = a page.

## Controller/Handler Discovery

React doesn't have controllers. Instead:

- **Page components** (`page.tsx`) = the handler for that route
- **Server Actions** (`'use server'`) = backend handlers called from client
- **API Routes** (`route.ts` in `app/api/`) = REST endpoints
- **Form actions** and `onSubmit` handlers = user actions

For each page, look at:
- What state does it manage? (useState, useReducer)
- What API calls does it make? (fetch, useSWR, useQuery)
- What user actions are available? (buttons, forms, links)

## Auth / Actor Discovery

```
middleware.ts              → route-level auth gates
app/api/auth/             → auth endpoints
src/lib/auth.ts           → auth utility
```

Common patterns:
- `NextAuth.js` / `Auth.js` → check `session` object for roles
- `middleware.ts` with `matcher` → which routes are protected
- `getServerSession()` calls → server-side auth checks
- Client-side `useSession()` → conditional rendering by role

Also check:
- `next.config.js` for `redirects` (unauthorized → login)
- Layout components for auth wrappers

## Model / Entity Discovery

```
prisma/schema.prisma       → Prisma models (most common)
src/types/*.ts             → TypeScript interfaces
src/lib/db.ts              → database client
```

Prisma schema = the entity map. Each `model` = a noun.
Relations (`@relation`) = entity connections.

For non-Prisma: look at API response types, Zod schemas, or database query shapes.

## Test Discovery

```
__tests__/                  → test directory
*.test.tsx, *.spec.tsx      → component tests
cypress/e2e/               → Cypress E2E tests
playwright/                → Playwright tests
```

Common frameworks: Jest, Vitest, React Testing Library, Cypress, Playwright.

## Special React/Next.js Patterns

- **Server Components vs Client Components** → `'use client'` marks interactive components
- **Loading/Error states** → `loading.tsx`, `error.tsx` = built-in failure modes
- **Parallel routes** → `@modal/`, `@sidebar/` = multiple views of same page
- **Intercepting routes** → `(.)photo/[id]` = modal overlays
- **Server Actions** → direct server mutations from client = side effects
- **Middleware chains** → `middleware.ts` → the gates users pass through
- **Environment checks** → `process.env.*` = configuration-driven variations

## Git Co-Change Patterns

- Page component + API route + Prisma migration = feature boundary
- Layout + multiple pages = feature area / activity
- Component + hook + test = self-contained unit
- Middleware + auth config = actor/permission boundary
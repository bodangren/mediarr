# Spec: UI Foundation Cleanup

## Context

Before introducing shadcn/ui as the component library, the frontend codebase has several low-level
inconsistencies that will compound during migration if left unaddressed. This track resolves them
with zero functional changes — it is a prerequisite for every subsequent refactor track.

## Problems

### P1 — No `cn()` utility; class merging is manual string interpolation

Components concatenate Tailwind classes via template literals and `${className ?? ''}`. This breaks
when Tailwind utility conflicts need resolution (e.g. `bg-surface-1 bg-surface-2` — last-write
wins in CSS, not in the JSX). `clsx` and `tailwind-merge` are already installed. A `cn()` helper
must be introduced and adopted uniformly.

### P2 — Two `RouteScaffold` implementations causing TS errors

A private `RouteScaffold` function is defined inside `App.tsx`. A separate
`app/src/components/primitives/RouteScaffold.tsx` also exists. `DashboardPage` imports from the
primitives version but the type signature differs from the local one, producing the pre-existing
`RouteScaffoldProps` TS error. Canonical definition: `primitives/RouteScaffold.tsx`. The local
`App.tsx` copy must be deleted and all internal usages updated to import from primitives.

### P3 — `'use client'` directives are meaningless in a Vite SPA

`AppShell.tsx`, `Modal.tsx`, `Form.tsx`, and other files have `'use client'` at line 1. This
directive is a Next.js concept. In a Vite SPA it is ignored silently, but it misleads contributors
and encourages cargo-cult usage. All occurrences must be removed.

### P4 — Pre-existing TS build errors block `npm run build`

`CollectionDetailPage` and `CollectionsPage` have `ToastInput` type errors. `DashboardPage` has
a `RouteScaffoldProps` mismatch (caused by P2). These must be resolved so the production build is
green before migration begins.

### P5 — Two virtualization libraries (`react-window` + `@tanstack/react-virtual`)

Both are in the dependency tree. They cannot be composed. All usage of `react-window`
(`react-window`, `@types/react-window`) must be identified, migrated to `@tanstack/react-virtual`,
and the packages removed from `app/package.json`.

### P6 — `react-dnd` is abandoned; replaced by `@dnd-kit/core`

`react-dnd` and `react-dnd-html5-backend` have not had a meaningful release in years. The sole
use case (quality profile item drag-to-reorder) must be re-implemented with `@dnd-kit/core` +
`@dnd-kit/sortable`. The old packages are then removed.

## Acceptance Criteria

- `app/src/lib/cn.ts` exists and exports `cn()` (clsx + tailwind-merge).
- All `'use client'` directives are removed from every `.tsx` / `.ts` file in `app/`.
- Only one `RouteScaffold` implementation exists — in `primitives/RouteScaffold.tsx`.
- `cd app && npm run build` succeeds with zero TS errors (no pre-existing errors remaining).
- `react-window` and `@types/react-window` are absent from `app/package.json`.
- `react-dnd` and `react-dnd-html5-backend` are absent from `app/package.json`.
- `@dnd-kit/core` and `@dnd-kit/sortable` are present and the drag-to-reorder feature works.
- All existing tests pass (pre-existing 4 server-side failures only).

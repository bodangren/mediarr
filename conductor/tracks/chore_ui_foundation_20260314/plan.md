# Plan: UI Foundation Cleanup

## Phase 1 — cn(), RouteScaffold, and 'use client' removal

- [x] Create `app/src/lib/cn.ts` exporting `cn(...inputs)` using `clsx` + `tailwind-merge` <!-- d512aa9 -->
- [~] Grep all `.tsx`/`.ts` files in `app/src/` for `'use client'` and remove every occurrence
- [ ] Audit `app/src/components/primitives/RouteScaffold.tsx` — verify its props match all callsites
- [ ] Delete the private `RouteScaffold` function from `App.tsx`
- [ ] Update `App.tsx` to import `RouteScaffold` from `@/components/primitives/RouteScaffold`
- [ ] Fix `CollectionDetailPage` `ToastInput` TS error
- [ ] Fix `CollectionsPage` `ToastInput` TS error
- [ ] Run `cd app && npm run build` — confirm zero TS errors
- [ ] Run `CI=true npm test` — confirm no regressions beyond pre-existing 4

## Phase 2 — react-window → @tanstack/react-virtual

- [ ] Grep `app/src/` for all imports of `react-window` and `react-window/fixed-size-list` etc.
- [ ] For each usage, rewrite the component using `useVirtualizer` from `@tanstack/react-virtual`
- [ ] Remove `react-window` and `@types/react-window` from `app/package.json`
- [ ] Run `cd app && npm run build` — confirm clean
- [ ] Run `CI=true npm test` — confirm no regressions

## Phase 3 — react-dnd → @dnd-kit

- [ ] Install `@dnd-kit/core` and `@dnd-kit/sortable` into `app/package.json`
- [ ] Locate all components using `react-dnd` (primarily quality profile item ordering)
- [ ] Rewrite drag-to-reorder with `@dnd-kit/sortable` (`SortableContext`, `useSortable`, `DndContext`)
- [ ] Remove `DndProvider` wrapper (if present in `App.tsx` or layout)
- [ ] Remove `react-dnd` and `react-dnd-html5-backend` from `app/package.json`
- [ ] Write or update tests for the reordering component
- [ ] Run `cd app && npm run build` — confirm clean
- [ ] Run `CI=true npm test` — confirm no regressions

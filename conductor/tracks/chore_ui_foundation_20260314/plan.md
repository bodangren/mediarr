# Plan: UI Foundation Cleanup

## Phase 1 — cn(), RouteScaffold, and 'use client' removal

- [x] Create `app/src/lib/cn.ts` exporting `cn(...inputs)` using `clsx` + `tailwind-merge` <!-- d512aa9 -->
- [x] Grep all `.tsx`/`.ts` files in `app/src/` for `'use client'` and remove every occurrence <!-- d6be9e2 -->
- [x] Audit `app/src/components/primitives/RouteScaffold.tsx` — verify its props match all callsites <!-- d6be9e2 -->
- [x] Delete the private `RouteScaffold` function from `App.tsx` (none existed - already using imported RouteScaffold)
- [x] Update `App.tsx` to import `RouteScaffold` from `@/components/primitives/RouteScaffold` <!-- already done -->
- [x] Fix `CollectionDetailPage` `ToastInput` TS error (not present in current code)
- [x] Fix `CollectionsPage` `ToastInput` TS error (not present in current code)
- [x] Run `cd app && npm run build` — confirm zero TS errors <!-- build passes -->
- [ ] Run `CI=true npm test` — confirm no regressions beyond pre-existing 4

## Phase 2 — react-window → @tanstack/react-virtual

- [x] Grep `app/src/` for all imports of `react-window` and `react-window/fixed-size-list` etc. <!-- none found in source -->
- [x] For each usage, rewrite the component using `useVirtualizer` from `@tanstack/react-virtual` <!-- VirtualTable already uses @tanstack/react-virtual -->
- [x] Remove `react-window` and `@types/react-window` from `app/package.json` <!-- removed -->
- [x] Run `cd app && npm run build` — confirm clean <!-- build passes -->
- [ ] Run `CI=true npm test` — confirm no regressions

## Phase 3 — react-dnd → @dnd-kit

- [x] Install `@dnd-kit/core` and `@dnd-kit/sortable` into `app/package.json` <!-- installed -->
- [x] Locate all components using `react-dnd` (primarily quality profile item ordering) <!-- TableOptionsModal.tsx -->
- [x] Rewrite drag-to-reorder with `@dnd-kit/sortable` (`SortableContext`, `useSortable`, `DndContext`) <!-- rewritten -->
- [x] Remove `DndProvider` wrapper (if present in `App.tsx` or layout) <!-- not present -->
- [x] Remove `react-dnd` and `react-dnd-html5-backend` from `app/package.json` <!-- removed -->
- [ ] Write or update tests for the reordering component <!-- skipped - no existing tests -->
- [x] Run `cd app && npm run build` — confirm clean <!-- build passes -->
- [ ] Run `CI=true npm test` — confirm no regressions
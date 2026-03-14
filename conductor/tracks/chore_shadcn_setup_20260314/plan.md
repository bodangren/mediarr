# Plan: shadcn/ui Installation & Primitive Migration

## Phase 1 — Install, Configure, and Bridge Design Tokens

- [ ] Run `npx shadcn@latest init` in `app/` — choose: TypeScript, Tailwind CSS, `app/src/components/ui`, `@/components/ui` alias
- [ ] Confirm `components.json` is created in `app/` with correct paths
- [ ] Add the shadcn CSS variable bridge block to `index.css` (see spec.md Design Token Bridge section)
- [ ] Verify light theme variant of the bridge is added under `[data-theme='light']` in `index.css`
- [ ] Run `cd app && npm run build` — confirm no regressions from config changes
- [ ] Add shadcn components needed for Phase 2 via `npx shadcn@latest add button dialog input select checkbox switch label`

## Phase 2 — Interactive Primitives: Button, Dialog, Input, Select, Checkbox, Switch

- [ ] Replace `Button.tsx` with `ui/button.tsx`; map variant names: `primary`→`default`, `secondary`→`secondary`, `danger`→`destructive`
- [ ] Update every `import { Button }` callsite in `app/src/` to `@/components/ui/button`
- [ ] Replace `Modal.tsx` with `ui/dialog.tsx` (Radix Dialog); create `ConfirmDialog` wrapper matching the old `ConfirmModal` API
- [ ] Update every `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter`, `ConfirmModal` import/usage
- [ ] Replace `TextInput` / `PasswordInput` from `Form.tsx` with `ui/input.tsx`; update callsites
- [ ] Replace `SelectInput` from `Form.tsx` with `ui/select.tsx` (Radix Select); update callsites
- [ ] Replace `CheckInput` from `Form.tsx` with `ui/checkbox.tsx` + `ui/label.tsx`; update callsites
- [ ] Replace `Switch.tsx` with `ui/switch.tsx`; update callsites
- [ ] Delete old `Button.tsx`; confirm no orphan imports remain
- [ ] Write smoke tests for Button (variants, disabled), Dialog (open/close, Escape), Input (value/onChange), Checkbox (checked/onChange), Switch (checked/onChange)
- [ ] Run `cd app && npm run build` and `CI=true npm test` — confirm clean

## Phase 3 — Form, Table, Badge, Progress, Alert, Skeleton, Separator

- [ ] Add shadcn components: `npx shadcn@latest add form table badge progress alert skeleton separator`
- [ ] Replace `FormGroup` wrapper pattern in `Form.tsx` with `ui/form.tsx` (FormField/FormItem/FormLabel/FormMessage)
- [ ] Keep `Form.tsx` as a thin re-export shim during migration; mark it `@deprecated`
- [ ] Replace `Table.tsx`, `TableHeader.tsx`, `TableBody.tsx` with `ui/table.tsx`; update callsites
- [ ] Replace `StatusBadge.tsx` with `ui/badge.tsx`; map status variants (monitored→default, error→destructive, wanted→warning, downloading→secondary)
- [ ] Replace `ProgressBar.tsx` with `ui/progress.tsx`; update callsites
- [ ] Replace `Alert.tsx` with `ui/alert.tsx`; update `EmptyPanel.tsx`, `ErrorPanel.tsx`, `QueryPanel.tsx` to use it internally
- [ ] Replace `SkeletonBlock.tsx` with `ui/skeleton.tsx`; update callsites
- [ ] Add `ui/separator.tsx`; replace any `<hr>` or border-only separators in shell layout
- [ ] Replace `Label.tsx` with `ui/label.tsx`; update callsites
- [ ] Write smoke tests for StatusBadge (each variant), Table (renders rows), Alert (renders message)
- [ ] Run `cd app && npm run build` and `CI=true npm test` — confirm clean

## Phase 4 — Menus, Toolbar, Community Registry Components, and Final Cleanup

- [ ] Add shadcn components: `npx shadcn@latest add dropdown-menu tooltip command`
- [ ] Replace `Menu.tsx` with `ui/dropdown-menu.tsx`; update callsites
- [ ] Replace `SortMenu.tsx`, `ViewMenu.tsx`, `FilterMenu.tsx` to use `DropdownMenu` internally
- [ ] Replace `PageToolbarButton.tsx` with `ui/button.tsx` variant `ghost` + `size="sm"`
- [ ] Delete `PageToolbarSeparator.tsx`; replace usages with `ui/separator.tsx` orientation="vertical"
- [ ] Add tooltips to icon-only toolbar buttons using `ui/tooltip.tsx`
- [ ] Replace the hand-rolled command palette in `AppShell.tsx` with the shadcn `Command` + `CommandDialog` component (`cmdk`-based — fuzzy search, groups, keyboard nav)
- [ ] Pull `multi-select` from the shadcn community registry; replace `TagInput` and `EnhancedSelectInput` in `Form.tsx` with it
- [ ] Pull `combobox` from the registry; replace the remaining `EnhancedSelectInput` usages (single-select with search) with it
- [ ] Pull `sidebar` from the registry; evaluate as a replacement for `PageSidebar.tsx` (carry forward to `chore_app_decompose` if scope is too large for this track)
- [ ] Delete all old primitive files that have been fully replaced and have no remaining importers
- [ ] Run final `cd app && npm run build` and `CI=true npm test` — confirm zero errors, all tests pass

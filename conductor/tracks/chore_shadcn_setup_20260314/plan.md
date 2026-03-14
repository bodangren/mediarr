# Plan: shadcn/ui Installation & Primitive Migration

## Phase 1 — Install, Configure, and Bridge Design Tokens

- [x] Run `npx shadcn@latest init` in `app/` — choose: TypeScript, Tailwind CSS, `app/src/components/ui`, `@/components/ui` alias
- [x] Confirm `components.json` is created in `app/` with correct paths
- [x] Add the shadcn CSS variable bridge block to `index.css` (see spec.md Design Token Bridge section)
- [x] Verify light theme variant of the bridge is added under `[data-theme='light']` in `index.css`
- [x] Run `cd app && npm run build` — confirm no regressions from config changes
- [x] Add shadcn components needed for Phase 2 via `npx shadcn@latest add button dialog input select checkbox switch label`

## Phase 2 — Interactive Primitives: Button, Dialog, Input, Select, Checkbox, Switch

- [x] Replace `Button.tsx` with `ui/button.tsx`; map variant names: `primary`→`default`, `secondary`→`secondary`, `danger`→`destructive`
- [x] Update every `import { Button }` callsite in `app/src/` to `@/components/ui/button`
- [x] Replace `Modal.tsx` with `ui/dialog.tsx` (Radix Dialog); create `ConfirmDialog` wrapper matching the old `ConfirmModal` API
- [x] Update every `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter`, `ConfirmModal` import/usage
- [x] Replace `TextInput` / `PasswordInput` from `Form.tsx` with `ui/input.tsx`; update callsites
- [x] Replace `SelectInput` from `Form.tsx` with `ui/select.tsx` (Radix Select); update callsites
- [x] Replace `CheckInput` from `Form.tsx` with `ui/checkbox.tsx` + `ui/label.tsx`; update callsites
- [x] Replace `Switch.tsx` with `ui/switch.tsx`; update callsites
- [x] **Test Remediation:** Update `app/src/components/ui/modal.test.tsx`, `app/src/components/ui/switch-compat.test.tsx`, and `app/src/components/ui/form-compat.test.tsx` to use the new shadcn components and pass.
- [x] Delete old `Button.tsx`; confirm no orphan imports remain
- [x] Write smoke tests for Button (variants, disabled), Dialog (open/close, Escape), Input (value/onChange), Checkbox (checked/onChange), Switch (checked/onChange)
- [x] Run `cd app && npm run build` and `CI=true npm test` — confirm clean

## Phase 3 — Form, Table, Badge, Progress, Alert, Skeleton, Separator

- [x] Add shadcn components: `npx shadcn@latest add form table badge progress alert skeleton separator`
- [x] Replace `FormGroup` wrapper pattern in `Form.tsx` with `ui/form.tsx` (FormField/FormItem/FormLabel/FormMessage)
- [x] Keep `Form.tsx` as a thin re-export shim during migration; mark it `@deprecated`
- [x] Replace `Table.tsx`, `TableHeader.tsx`, `TableBody.tsx` with `ui/table.tsx`; update callsites
- [x] Replace `StatusBadge.tsx` with `ui/badge.tsx`; map status variants (monitored→default, error→destructive, wanted→warning, downloading→secondary)
- [x] Replace `ProgressBar.tsx` with `ui/progress.tsx`; update callsites
- [x] Replace `Alert.tsx` with `ui/alert.tsx`; update `EmptyPanel.tsx`, `ErrorPanel.tsx`, `QueryPanel.tsx` to use it internally
- [x] Replace `SkeletonBlock.tsx` with `ui/skeleton.tsx`; update callsites
- [x] Add `ui/separator.tsx`; replace any `<hr>` or border-only separators in shell layout
- [x] Replace `Label.tsx` with `ui/label.tsx`; update callsites
- [x] **Test Remediation:** Update `app/src/components/ui/table-compat.test.tsx`, `app/src/components/ui/form-compat.test.tsx`, etc. to pass.
- [x] Write smoke tests for StatusBadge (each variant), Table (renders rows), Alert (renders message)
- [x] Run `cd app && npm run build` and `CI=true npm test` — confirm clean

## Phase 4 — Menus, Toolbar, Community Registry Components, and Final Cleanup

- [x] Add shadcn components: `npx shadcn@latest add dropdown-menu tooltip command`
- [x] Replace `Menu.tsx` with `ui/dropdown-menu.tsx`; update callsites
- [x] Replace `SortMenu.tsx`, `ViewMenu.tsx`, `FilterMenu.tsx` to use `DropdownMenu` internally
- [x] Replace `PageToolbarButton.tsx` with `ui/button.tsx` variant `ghost` + `size="sm"`
- [x] Delete `PageToolbarSeparator.tsx`; replace usages with `ui/separator.tsx` orientation="vertical"
- [ ] Add tooltips to icon-only toolbar buttons using `ui/tooltip.tsx`
- [x] Replace the hand-rolled command palette in `AppShell.tsx` with the shadcn `Command` + `CommandDialog` component
- [ ] Pull `multi-select` from the shadcn community registry; replace `TagInput` and `EnhancedSelectInput` in `Form.tsx` with it
- [ ] Pull `combobox` from the registry; replace the remaining `EnhancedSelectInput` usages (single-select with search) with it
- [ ] Pull `sidebar` from the registry; evaluate as a replacement for `PageSidebar.tsx` (carry forward to `chore_app_decompose` if scope is too large for this track)
- [x] **Test Remediation:** Update test files to use the new shadcn components and pass. `ViewMenu` toggle behavior is fixed under the current shadcn dropdown wrapper; remaining files are still pending migration.
- [ ] Delete all old primitive files that have been fully replaced and have no remaining importers
- [ ] Run final `cd app && npm run build` and `CI=true npm test` — confirm zero errors, all tests pass

# Implementation Plan: Form Standardization Completion

## Phase 1 — Migrate Indexer Modals

- [x] Task: Migrate `AddIndexerModal.tsx` to react-hook-form + zod — define schema for preset, name, enabled, supportsRss, supportsSearch, priority, supportedMediaTypes, appProfileId, fieldValues; replace 10+ useState calls with `useForm`; use `<Form>` + `<FormField>` pattern *(Already migrated; fixed 3 bugs: FormField FormItem wrapper, Select empty string value, useEffect infinite loop)*
- [x] Task: Write tests for `AddIndexerModal` form validation (valid submit, invalid submit shows errors, field value changes propagate) *(14 tests written and passing)*
- [ ] Task: Migrate `EditIndexerModal.tsx` to react-hook-form + zod — define schema; replace 11 useState calls with `useForm`; wire to existing save handler
- [ ] Task: Write tests for `EditIndexerModal` form validation
- [ ] Task: Conductor - Checkpoint Phase 1

## Phase 2 — Migrate Profile & Provider Modals

- [ ] Task: Migrate `AddProfileModal.tsx` to react-hook-form + zod — use `useFieldArray` for profile items list; use `Controller` for drag-and-drop reordering with `@dnd-kit`
- [ ] Task: Write tests for `AddProfileModal` form validation and item ordering
- [ ] Task: Migrate `ProviderSettingsModal.tsx` to react-hook-form + zod — dynamic schema built from provider field definitions; use `Controller` for dynamic field rendering
- [ ] Task: Write tests for `ProviderSettingsModal` with sample provider config
- [ ] Task: Conductor - Checkpoint Phase 2

## Phase 3 — Cleanup & Validation

- [ ] Task: Delete `app/src/components/ui/form-compat.tsx` and `form-compat.test.tsx`; verify zero remaining imports via grep
- [ ] Task: Write 2 cross-modal validation smoke tests (one indexer modal, one profile modal) covering valid submit + invalid submit error display
- [ ] Task: Run `cd app && npm run build` — zero TS errors
- [ ] Task: Run `CI=true npm test` — all tests pass
- [ ] Task: Conductor - Checkpoint Phase 3

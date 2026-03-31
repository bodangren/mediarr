# Spec: Form Standardization Completion

## Context

Phase 1 of the form standardization is done — all 6 settings pages use react-hook-form +
zod + shadcn `<Form>`. Phase 2 remains: 4 modal forms still use manual `useState` per
field. The `form-compat.tsx` shim has zero production imports (dead code).

### Forms already migrated (Phase 1 — complete)
- All settings pages (`SettingsGeneralPage`, `SettingsMediaPage`, `SettingsDownloadClientsPage`, `SettingsProfilesPage`, `SettingsStreamingPage`, `SettingsSubtitlesPage`)
- `AddDownloadClientModal.tsx`

### Forms still on manual useState (Phase 2 — this track)
- `AddIndexerModal.tsx` — 10+ useState calls, hand-coded validation
- `EditIndexerModal.tsx` — 11 useState calls, imperative submit
- `AddProfileModal.tsx` — 4 useState calls, no validation schema
- `ProviderSettingsModal.tsx` — 5 useState calls, dynamic fields per provider

### Dead code
- `form-compat.tsx` — exports 7 components, zero production consumers
- `form-compat.test.tsx` — tests the dead shim

## Standard Pattern

All forms use `useForm` + `zodResolver(schema)` + shadcn `<Form>` / `<FormField>` /
`<FormControl>` / `<FormLabel>` / `<FormMessage>`. Dynamic fields (e.g., provider-specific
settings) use `useFieldArray` or `Controller` with `render` prop.

## Acceptance Criteria

- `AddIndexerModal` uses react-hook-form + zod; hand-coded validation removed.
- `EditIndexerModal` uses react-hook-form + zod; 11 useState calls eliminated.
- `AddProfileModal` uses react-hook-form + zod with `useFieldArray` for profile items.
- `ProviderSettingsModal` uses react-hook-form + zod with dynamic schema generation.
- `form-compat.tsx` and `form-compat.test.tsx` deleted.
- Zero `import.*form-compat` across entire codebase.
- `cd app && npm run build` — zero TS errors.
- `CI=true npm test` — all tests pass.

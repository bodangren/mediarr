# Phase 4 Settings Operability Progress

Date: 2026-02-27
Track: `vite_parity_recovery_20260226`

## Implemented

### 1) Quality Profiles / Profiles & Quality
- Aligned frontend quality profile API contract to backend route contract:
  - replaced `cutoffId/qualities` model with `cutoff/items` model.
- Updated `/settings/profiles` page from read-only to operable:
  - create profile from template profile,
  - rename existing profile,
  - delete profile,
  - create/delete custom formats.

### 2) Subtitles Settings
- Updated `/settings/subtitles` to include persisted form controls using `/api/settings`:
  - OpenSubtitles API key save flow,
  - path visibility toggles save flow.
- Provider status fetch remains best-effort:
  - if `/api/subtitles/providers` is unavailable, page remains usable and shows a non-blocking error.

### 3) General Settings
- Updated `/settings/general` from read-only summary to editable form with save:
  - RSS sync interval,
  - max active downloads,
  - max active seeds.
- Saves are persisted through `settingsApi.update` with validation feedback.

## Validation Snapshot

- `npm run typecheck --workspace=app` -> pass
- `npm run build --workspace=app` -> pass
- `npm exec --workspace=app vitest run --config vitest.config.ts src/App.test.tsx` -> pass (`4/4`)
- Non-blocking warning remains: Vite chunk size warning for large main bundle.

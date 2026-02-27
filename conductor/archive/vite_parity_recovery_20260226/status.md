# Track Status: Vite Frontend Parity Recovery

Date: 2026-02-27  
Track: `vite_parity_recovery_20260226`

## Current State

- Build baseline recovery is complete for the app workspace.
- `npm run typecheck --workspace=app` is green.
- `npm run build --workspace=app` is green.
- Core library route wiring is implemented for movie and TV list/detail paths.
- Critical settings operability is partially restored:
  - profiles/quality has actionable create/update/delete flows,
  - subtitles settings persistence is wired via `/api/settings`,
  - general settings persistence is wired via `/api/settings`.

## Completed Scope (Checkpoint)

1. Build/type stabilization
   - matcher typings and Vitest setup fixed,
   - router typing mismatches corrected,
   - Vite/tooling version drift corrected.
2. Core route operability
   - `/library/movies`, `/library/movies/:id`,
   - `/library/tv`, `/library/tv/:id`,
   - `/library/series` compatibility redirect/alias.
3. Settings operability wiring
   - `/settings/profiles`,
   - `/settings/subtitles`,
   - `/settings/general`.
4. App-level regression checks added
   - targeted app route/settings tests in `app/src/App.test.tsx`.

## Validation Evidence

- `npm run typecheck --workspace=app` -> pass
- `npm run build --workspace=app` -> pass
- `npm exec --workspace=app vitest run --config vitest.config.ts src/App.test.tsx` -> pass (`4/4`)
- Remaining non-blocking warning:
  - Vite chunk-size warning for `dist/assets/index-*.js` > 500 kB.

## Open Critical Work

1. Interactive search/grab parity completion
   - explicit tests for request/response rendering and grab success/failure.
2. Remaining critical settings test coverage
   - add load/save tests across indexers, download clients, profiles/quality, subtitles, general.
3. Manual verification gates
   - Conductor user verification tasks remain open for Phases 1-5.
4. Backend-served SPA deep-link validation
   - direct-route production fallback checks are not complete.

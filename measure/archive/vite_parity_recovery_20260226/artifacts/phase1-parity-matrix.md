# Phase 1 Parity Matrix (Vite App Baseline)

Date: 2026-02-27
Track: `vite_parity_recovery_20260226`

## Scope Basis

- Router baseline: `app/src/App.tsx`
- Navigation baseline: `app/src/lib/navigation.ts`
- Feature/API baseline: `app/src/components/**`, `app/src/lib/api/**`

## Critical / Important / Deferred Matrix

| Area | Capability | Current State (Baseline) | Priority | Track Action |
|---|---|---|---|---|
| Core Media Operations | Movies library list | Route exists (`/library/movies`) but renders static scaffold in `App.tsx`; no data view wiring | Critical | Replace scaffold with functional list view + API integration |
| Core Media Operations | TV library list | Route exists (`/library/tv`) but renders static scaffold; no functional series list wiring | Critical | Replace scaffold with functional list view + API integration |
| Core Media Operations | Movie detail page | No detail route defined in `App.tsx` (no `/library/movies/:id`) | Critical | Add typed detail route + detail data wiring |
| Core Media Operations | Series detail page | No detail route defined in `App.tsx` (no `/library/tv/:id`/`/library/series/:id`) | Critical | Add typed detail route + detail data wiring |
| Core Media Operations | Interactive search (movies) | `MovieInteractiveSearchModal` exists with API calls, but no routed page flow currently mounting it | Critical | Wire modal into movie detail/list actions with typed params |
| Core Media Operations | Interactive search (series) | `InteractiveSearchModal` exists with API calls, but not connected to routed UI flow | Critical | Wire modal into series episode/season flows |
| Core Media Operations | Grab action | `releaseApi.grabRelease` integration exists in both modals, but user path is blocked by missing/wireless search surfaces | Critical | Enable reachable grab flow from UI |
| Settings Operability | Indexers | `/settings/indexers` route exists; list/create/toggle/delete flow implemented in `App.tsx` | Critical | Keep route, harden typings, add verification tests |
| Settings Operability | Download Clients | `/settings/clients` route exists; list/create/toggle/delete flow implemented | Critical | Keep route, harden typings, add verification tests |
| Settings Operability | Profiles & Quality | `/settings/profiles` route currently read-only list (no edit/save management surface) | Critical | Implement operable profile/quality management flow |
| Settings Operability | Subtitles | `/settings/subtitles` route loads providers, but behavior toggles are local-only and not persisted | Critical | Implement persisted update/test/reset flows |
| Settings Operability | General | `/settings/general` currently read-only display of settings | Critical | Implement editable/save-capable controls for required settings |
| Settings Operability | Media Management | `/settings/media` partially interactive but naming "save" is session-only message (no API persistence) | Important | Decide persistence contract and wire update flow |
| Adjacent UX | Activity (Queue/History) | Routes exist but static scaffold only | Important | Defer unless required by critical flow dependencies |
| Adjacent UX | Calendar/System pages | Routes exist but mostly scaffold/static content | Deferred | Keep out of critical recovery scope |
| Adjacent UX | Notifications page | Route exists with list rendering only | Deferred | Defer deep operability beyond baseline reachability |

## Critical Scope Lock (Per User Direction)

Critical scope for this track is limited to:

1. Core media operations:
   - library list/detail routes,
   - interactive search,
   - grab actions.
2. Settings operability:
   - indexers,
   - download clients,
   - profiles/quality,
   - subtitles,
   - general.

All non-critical items are tracked as Important or Deferred and are not completion blockers for this track unless dependencies force promotion.

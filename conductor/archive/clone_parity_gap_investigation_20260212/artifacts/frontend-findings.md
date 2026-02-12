# Frontend Parity Findings (Phase 3)

## Scope
- Route runtime evidence: `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/pages/status-summary.txt`
- API interaction evidence: `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/api/status-summary.txt`
- Structured report: `conductor/tracks/clone_parity_gap_investigation_20260212/artifacts/frontend-parity-report.json`

## Per-Route Parity Summary

| Route | Status | Severity | User-impacting gap | Evidence |
| --- | --- | --- | --- | --- |
| `/` | `partially_functional` | `P1` | Dashboard card/drilldown parity incomplete; explicitly marked as pending Track 7E enhancements | `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/pages/root.html` |
| `/activity` | `partially_functional` | `P1` | Missing filters, status toggles, and drill-down navigation expected by 7E | `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/pages/_activity.html` |
| `/settings` | `scaffold_only` | `P1` | Minimal settings surface only; missing full inline editing and stale-state handling | `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/pages/_settings.html` |
| `/indexers` | `partially_functional` | `P1` | Lacks definition-driven dynamic contract fields despite indexer clone goals | `app/src/app/(shell)/indexers/page.tsx` |
| `/add` | `partially_functional` | `P0` | Movie metadata search blocked by backend TMDB key/runtime parity gaps | `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/api/add-media-search-movie.json` |
| `/wanted` | `partially_functional` | `P1` | Release search endpoint fails under definition wiring gap | `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/api/release-search.json` |
| `/queue` | `scaffold_only` | `P1` | Page explicitly defers queue controls; no pause/resume/remove UI | `app/src/app/(shell)/queue/page.tsx` |
| `/subtitles` | `placeholder` | `P1` | Full subtitle workflow is placeholder-only and staged for Track 7D | `app/src/app/(shell)/subtitles/page.tsx` |
| `/library/movies` | `partially_functional` | `P2` | Needs runtime parity walkthrough for import lifecycle visibility | `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/pages/_library_movies.html` |
| `/library/series` | `partially_functional` | `P2` | Needs runtime parity walkthrough for wanted-to-import series transitions | `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/pages/_library_series.html` |

## Cross-Cutting UX Regressions

1. **Track dependency leakage in UI copy (`P1`)**
- Multiple surfaces expose explicit "Track 7D/7E pending" messaging, confirming scaffold/placeholder state instead of operator-complete flows.

2. **Backend parity blockers surface directly as frontend failures (`P0`/`P1`)**
- Add-media and wanted pages are present but operationally blocked by backend metadata/indexer parity defects.

3. **Control asymmetry between backend and frontend (`P1`)**
- Queue pause/resume APIs return success at runtime, but queue UI does not expose controls.

4. **Validation/action depth mismatch (`P1`)**
- Settings and activity pages render basic content but omit critical interactions required by clone workflows.

## Immediate User-Visible Blockers Before Hardening

1. `P0` Add-media movie search failure (`/add`) due metadata key/runtime parity gap.
2. `P1` Wanted release search failure (`/wanted`) caused by definition wiring regression.
3. `P1` Subtitle workflow unavailable (`/subtitles`) as placeholder-only route.
4. `P1` Queue control operations missing in UI (`/queue`) despite available backend control endpoints.
5. `P1` Settings/Activity operational incompleteness (`/settings`, `/activity`) versus 7E parity intent.

## Verification Boundary
- **Verified:** runtime route/API status captures, route source code, and explicit placeholder messaging.
- **Inferred:** full interaction completeness for complex client-side workflows where no browser automation assertions were executed in this phase.

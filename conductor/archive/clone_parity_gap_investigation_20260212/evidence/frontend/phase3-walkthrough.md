# Phase 3 Frontend Walkthrough Evidence

## Runtime Setup
- Frontend command: `PORT=3100 NEXT_TELEMETRY_DISABLED=1 npm run dev --workspace=app`
- API command: `ENCRYPTION_KEY='track9-probe-key' API_HOST=127.0.0.1 API_PORT=3901 DATABASE_URL='file:prisma/dev.db' npm run start:api`

## Runtime Route Availability
- Source: `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/pages/status-summary.txt`
- Result: all audited routes returned `200` (`/`, `/activity`, `/settings`, `/indexers`, `/add`, `/wanted`, `/queue`, `/subtitles`, `/library/movies`, `/library/series`).

## Workflow Probe Outcomes
- Source: `conductor/tracks/clone_parity_gap_investigation_20260212/evidence/frontend/runtime/api/`
- `indexers-list`: `200` (surface loads)
- `add-media-search-movie`: `500` (TMDB key failure)
- `wanted-list`: `200`
- `release-search`: `500` (definition wiring failure)
- `queue-list`: `200`
- `queue-pause` / `queue-resume`: `200` (backend controls exist)
- `subtitles-search`: `422` (identifier required, no UI path in current subtitles page)
- `settings-get` / `settings-patch`: `200`

## Captured Breakpoints
1. `/queue` UI explicitly indicates controls deferred to Track 7D despite live backend pause/resume endpoints.
2. `/subtitles` is an explicit staged placeholder with no operator interaction surface.
3. `/settings` lacks expected 7E inline edit depth and stale-state handling.
4. `/activity` lacks filter/drill-down interactions promised by parity intent.
5. `/add` and `/wanted` are blocked by backend parity gaps (metadata key and definition wiring).

## Mapping Notes
- Frontend gaps are mapped to backend parity IDs in `conductor/tracks/clone_parity_gap_investigation_20260212/artifacts/frontend-parity-report.json` under `backendCapabilityLinks`.

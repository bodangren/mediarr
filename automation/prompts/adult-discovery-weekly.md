# Weekly Adult library discovery — agent run

> **This is an instruction to an agent turn, not a script.** Track
> `feature_adult_library_20261107`, Phase 3. The judgement (what to pick) lives here; the code
> boundaries (list, watched state, retention, queueing) are server endpoints.
>
> Cadence: weekly, Sunday 04:00 (decision A4). Source: the browser bridge
> (`mcp__webbridge__*` tools), never a DOM scraper — selectors are fragile, judgement is not.

## Inputs (read before browsing)

1. `curl -s localhost:5174/api/adult/automation/list?limit=200` — what is already in the library
   (titles, studios, `needsReview`, `isWatched`, `lastPlayedAt`, size).
2. `curl -s localhost:5174/api/torrents` — what is already downloading/seeding; collect every
   `infoHash` you see. **Any pick whose info hash is already present must be dropped.**
3. `curl -s "localhost:5174/api/adult/automation/retention-candidates?days=30"` — context only: how
   fast the library is being pruned. Do not delete anything; pruning belongs to the quarantine engine.

## Browsing

Use the browser bridge (`mcp__webbridge__navigate` → `snapshot`/`evaluate`) against the sources the
owner uses. Read results as a human would; do not build selectors into a script.

## Selection profile (owner-approved)

- **Asian-dominant** titles and studios; scene-style compilations; avoid plot-driven features.
- Prefer 1080p or better, size ≤ 8 GB unless the title is rare.
- Avoid anything already represented in the library (same studio + title stem) even at a different
  hash.
- **1–3 picks per run.** Zero is a valid answer if nothing matches the profile — say so in the
  receipt; do not pad the list.

## Queueing

For each pick, POST it back through Mediarr's own grab path (no second download client):

```bash
curl -s -X POST localhost:5174/api/releases/grab-candidate \
  -H 'content-type: application/json' \
  -d '{"title":"<title>","magnetUrl":"<magnet>","infoHash":"<40-hex>",
       "indexer":"browser-agent","quality":"1080p","size":<bytes>}'
```

A `4xx` response is a **failure to report**, not something to retry blindly.

## Receipt (required, every run)

Write one receipt with: run timestamp, sources browsed, picks attempted (title / infoHash / size),
per-pick queue result (`ok` or the server error), dropped duplicates with their hash, and why zero
picks were made if that was the outcome. The receipt is the proof the run happened; a silent run is a
defect (decision D4: never silently wrong).

## Hard rules

- Never write the database, never move or delete files, never bypass the server API.
- Never report success for a pick the server rejected.
- If the browser bridge is unavailable or the page does not load, report the failure with the exact
  error and stop — do not guess URLs or fall back to an API that was not approved.

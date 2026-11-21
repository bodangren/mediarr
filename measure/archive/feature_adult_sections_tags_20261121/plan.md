# Plan — Adult sections + tag filters

Track: `feature_adult_sections_tags_20261121` · Spec: [`spec.md`](./spec.md) · Owner request 2026-11-21

## Phase 0 — Ground the data (done 2026-11-21)

- [x] **P0.1** Inventory: 208 items, 32 studios, 67 with no studio; no series or tag columns existed.
- [x] **P0.2** Decide the source of truth: derived at scan time from title/fileName/studio/quality/releaseDate
      (no external scraping, no owner data entry).

## Phase 1 — Derivation (server, tested)

- [x] **P1.1 (Red/Green)** `AdultSeriesTags.ts`: `adultSeriesKey()` + `adultTags()` with rule tests
      (dashed brands, sequel markers, volumes, quality/date/site noise, honest null).
- [x] **P1.2 (Red/Green)** Migration `0019_adult_series_tags` adds `AdultItem.seriesKey` + `tags`;
      schema updated; snapshot/journal entry written.
- [x] **P1.3** The adult scan derives both on every upsert.
- [x] **P1.4 (Red/Green)** Bounded reconcile pass (`adult-series-tags-backfill`, :10/:30/:50) fills existing
      rows and re-derives when the rules change. Verified live: 194 rows derived, 0 pending, 136 shelves.
- [x] **P1.6** Owner feedback (2026-11-21): the folder is the series. Top-level folder under the adult
      root now drives `seriesKey` (all /BFFs files = one shelf) and supplies `studio` when missing;
      filenames contribute keyword tags (anal, asian, compilation, threesome, ...) by word stem.
      Verified live: BFFs 16 items in one shelf, shelves 136 -> 89, asian 29 / compilation 15 / anal 14.
- [x] **P1.5** Volume rule refinement from live data ("Another Man's Wife 12" shelf splits) + test.

## Phase 2 — API

- [x] **P2.1** `GET /api/adult/items` returns `seriesKey` + parsed `tags`; `?tags=a,b` filters with AND.
- [x] **P2.2** `GET /api/adult/series` (shelves + counts + unshelved) and `GET /api/adult/tags` (counts).
- [x] **P2.3 (Red/Green)** Route tests build the schema from the real migrations (proves 0019 applies).

## Phase 3 — TV: series rows + filter chips

- [x] **P3.0** Removed the IME trap: the Adult search field was a D-pad focusable TextField, so Up from
      the grid opened the system IME (measured 2026-11-21: it covered the grid and arrow presses typed
      letters into the query). Search is now a chip that opens the app's own D-pad keyboard, and the chip
      row sits between the grid and the header so one Up from content reaches it. Widget test asserts no
      TextField remains on the surface.
- [x] **P3.1** Adult screen: "Series" view with one row per shelf (header + poster strip), and a single
      control switching to the flat All grid. Verified on the TV: "Another Man's Wife 8", "All In The Family 5".
- [x] **P3.2 (Red/Green)** Filter chips row (from `/api/adult/tags`), D-pad reachable, Select toggles,
      Select again clears; widget tests for both.
- [x] **P3.3** Verify on the device with presses recorded (chips focusable, series rows scroll, filter applies). Verified: one Up from the grid lands in the chip
      row, "Unwatched (171)" applied and the header count went 194 -> 171 with KEPT items gone.

## Phase 4 — SPA parity

- [x] **P4.1** Same shelves + chips on the SPA Adult page.
- [x] **P4.2** Verify in the browser: 89 shelves render, chips show Unwatched (171) / 1080p (93) / Asian (29), Series toggle groups by shelf.

## Phase 5 — Close

- [x] **P5.1** Ledger entries (folder derivation, IME fix, TV shelves/filters) recorded; `tracks.md` updated; archived.

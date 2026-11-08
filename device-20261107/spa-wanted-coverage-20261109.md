# SPA wanted list with coverage summary — browser measurement (2026-11-09)

Workstream 1 (`feature_subtitle_coverage_priority_20261108`, archived) requires the SPA wanted list
to be **grouped with a coverage summary**. Browser check of `http://127.0.0.1:5174/wanted`
(device-20261107/spa-wanted-coverage-20261109.jpg):

- Header: **"34 high-priority · 9 EN+ZH · 21 Chinese only · 4 without Chinese"**.
- Table grouped by bucket exactly as specified:
  | Bucket | Items | Chinese | Both languages | No Chinese |
  |---|---|---|---|---|
  | Continue watching | 11 | 8 | 7 | 3 |
  | Watched recently | 23 | 22 | 2 | 1 |
  | New | 16 | 4 | 2 | 12 |
  | Backfill | 3112 | 1477 | 1006 | 1635 |
- The "Automatic searching is idle" notice explains the owner-gated reason (no indexers configured),
  so the list is honest rather than silently stale.

## Note on counting
The card's high-priority counter (34) uses the archived track's bucket classifier. The newer
`/api/subtitles/priority-coverage` endpoint reports raw language presence over recent/in-progress rows
(dual 9 / zho-only 10 / en-only 18 / none 13 of 50); they answer different questions and are not
contradictory, but a future cleanup should share one classifier so the two numbers cannot drift.

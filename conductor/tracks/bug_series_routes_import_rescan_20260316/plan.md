# Plan: seriesRoutes — import/apply & rescan corner cases

## Phase 1 — Rescan endpoint tests + seriesId fix

- [x] 1.1 Write failing test: rescan with series not found → 404
- [x] 1.2 Write failing test: rescan with metadata provider not configured → 400
- [x] 1.3 Write failing test: rescan empty episode list → episodeCount=0, filesLinked=0
- [x] 1.4 Write failing test: rescan applies seriesId in episode upsert update clause
- [x] 1.5 Write failing test: rescan with unreadable folder → non-fatal, filesLinked=0
- [x] 1.6 Write failing test: rescan with folderPath body param updates series.path
- [x] 1.7 Commit unstaged seriesId fix; run test checkpoint

## Phase 2 — import/apply endpoint tests

- [x] 2.1 Write failing test: empty files array → {imported:0, failed:0, errors:[]}
- [x] 2.2 Write failing test: series not found → failed++ with error entry
- [x] 2.3 Write failing test: series has no path → failed++ with error entry
- [x] 2.4 Write failing test: episode not found → failed++ with error entry
- [x] 2.5 Write failing test: path traversal via series.title → safePath throws, caught in errors
- [x] 2.6 Write failing test: fs.rename failure → caught in errors
- [x] 2.7 Write failing test: mixed success/failure batch → correct counts
- [x] 2.8 Run phase test checkpoint

## Phase 3 — import/scan endpoint tests + full suite

- [x] 3.1 Write failing test: path doesn't exist → 400 ValidationError
- [x] 3.2 Write failing test: path is a file, not a directory → 400 ValidationError
- [x] 3.3 Write failing test: valid directory → calls parsingService.scanAndMatchEpisodes
- [x] 3.4 Run full test suite; fix any regressions introduced by this track

# Events: normal “no releases found” is a warning, not an error (2026-11-09)

## Finding
The Events page was dominated by rows like **“Automated search skipped for <title>: No releases found”**
displayed as **Error**. `WantedSearchService.logAndReturnSkip` correctly records `success=false`, but the
UI derived level purely from success, so normal no-match outcomes looked like failures (and the same rows
were miscounted under the error filter/export/clear).

## Fix (no stored-data rewrite)
- `toSystemEvent` derives **warning** for unsuccessful events whose summary starts with
  `Automated search skipped for `; real failures stay **error**; successful events stay **info**.
- `ActivityEventRepository` query/export/clear gained SQL `summaryPrefix` / `summaryNotPrefix` filters
  (`LIKE`/`NOT LIKE`) so the warning/error splits are paginated in SQL rather than filtered in JS.
- Every events route uses one `levelQueryFilter`: info → success; warning → failure + skip prefix;
  error → failure + NOT skip prefix; fatal → empty (no activity event can be fatal).

## Live
```
all:     253,271 events  0.009 s
warning: 213,941 events  0.543 s  (skipped searches)
error:    38,926 events  0.090 s  (real failures, e.g. subtitle download)
fatal:         0 events  0.001 s
```
Browser: rows now show **Warning** badges (“Automated search skipped …”) and the Error filter shows real
failures (screenshot `spa-events-warning-level-20261109.jpg`).

## Tests
- Repository in-memory SQL test for prefix/not-prefix filtering.
- Route truthfulness tests updated/extended: warning queries use `summaryPrefix`, error queries use
  `summaryNotPrefix`, fatal short-circuits, and a skip event maps to `level: warning`.

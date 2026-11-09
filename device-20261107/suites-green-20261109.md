# Test suites after the 2026-11-09 quality fixes

## Full server suite
```
Test Files  294 passed (294)
Tests  2804 passed | 11 skipped (2815)
```
The two former red spots were **characterisation tests that pinned the old defects**, updated to the
fixed behaviour:

- `ReleaseParser.golden.test.ts` + `__fixtures__/releaseParserGolden.ts`: season ranges
  (`Seinfeld.S01-S09…`, `Avatar…S01-S03…`) now expect `null` — the fallback refuses a range instead of
  reporting a season-1 pack (fixed in 72daa246). Fixture header text updated so nobody "restores" the
  bug for consistency.
- `LibraryScanner.test.ts`: the "known defect: unreadable subdirectory aborts the scan" block became
  "unreadable subdirectories are skipped, not fatal" — asserts a warning and that readable files are
  still linked (fixed in 8996e99b).

## SPA suite
`npx vitest run` in `app/` exited 0 (dot reporter, ~26 min wall time on this laptop) after the
zero-year fix (e5e22414) and its new test.

## Flutter client
463 tests green after the select-once fix (a8d04d21) — recorded earlier.

## After the report/route, TV coverage, YouTube See-all and migration-runner tests
```
Server:  Test Files  296 passed (296)
         Tests  2808 passed | 11 skipped (2819)
Flutter: 468 tests passed
```
(The SPA suite last exited 0; its run takes ~26 minutes on this laptop.)

## Final re-run after the tech-debt sweep
- Server: 296 files / 2808 tests passed, 11 skipped.
- Flutter: 468 tests passed.
- SPA: full suite exited 0 (1029 s on this laptop) after the collection-id, adult-counts and zero-year
  changes.
- New enforcement test: `server/src/tooling/scriptsStaticImportGuard.test.ts` keeps future `scripts/`
  files from statically importing `server/` value exports across the nodenext/preserve boundary.

## After TV/SPA watched-parity work
```
Server:  Test Files  297 passed (297)
         Tests  2809 passed | 11 skipped (2820)
Flutter: 472 tests passed
```

## SPA suite after the report page, watched chips and shell-test fix
`npx vitest run` in `app/` exited 0 (549 s) with the new SystemReportPage test and the fixed Wanted
nav assertion.

## After the stats and relation-index performance fixes
```
Server:  Test Files  299 passed (299)
         Tests  2812 passed | 11 skipped (2823)
```

## SPA suite after the YouTube queue strip and movie/episode watch chips
`npx vitest run` in `app/` exited 0 (589 s).

## Flutter suite after the TV coverage/queue/movie-detail changes
`flutter test --no-pub`: **472 tests passed** (1m58s).

## After the YouTube queue split and full-library changes
```
Server:  Test Files  299 passed (299)
         Tests  2812 passed | 11 skipped (2823)
Flutter: 472 tests passed (3m17s)
SPA:     full suite exit 0 (1385 s)
```

## After the gzip and system-events performance work
```
Server:  Test Files  300 passed (300)
         Tests  2820 passed | 11 skipped (2831)
```

## After the events warning-semantics change
```
Server:  Test Files  300 passed (300)
         Tests  2822 passed | 11 skipped (2833)
```

## After SQL event-type classification
```
Server:  Test Files  300 passed (300)
         Tests  2823 passed | 11 skipped (2834)
```

## After the throughput/sync-rate/scan-guard/hero-token changes
```
Server:  Test Files  301 passed (301)
         Tests  2828 passed | 11 skipped (2839)
Flutter: 472 tests passed
```

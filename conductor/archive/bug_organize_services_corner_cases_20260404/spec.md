# Spec: Organize Services Corner-Case Testing

## Problem
`SeriesOrganizeService` and `MovieOrganizeService` are the final step in the media acquisition pipeline (search → grab → download → import → organize). Both services handle file renaming based on configurable naming tokens. Neither has ANY test coverage.

Known corner-case risks:
1. Token replacement with missing optional fields (undefined episodeTitle, quality, resolution, etc.)
2. `sortTitle` edge cases (title starting with "A " or "An " not just "The ")
3. `sanitize` stripping filesystem-invalid characters from titles with special chars
4. `extractResolution` failing on non-standard quality strings
5. `previewRename` with empty seriesIds/movieIds array
6. `previewRename` with series that has no seasons/episodes/variants
7. `previewRename` with series that has no path
8. `applyRename` where DB update fails after fs.rename succeeds (partial state)
9. `applyRename` where fs.rename fails (cross-device, permissions)
10. Path collision — renaming to a path that already exists
11. Season folder format is empty/undefined (should skip season folder layer)
12. `isNewPath` false for already-correctly-named files

## Acceptance Criteria
1. Both services have dedicated test files with corner-case coverage
2. All naming tokens tested with missing optional fields
3. Error paths tested (fs failures, DB failures)
4. Edge cases in sanitize, sortTitle, extractResolution covered
5. No bugs found OR bugs found and fixed
6. Full test suite passes (1274+ tests, 0 new failures)

## Subsystem Scope
- `server/src/services/SeriesOrganizeService.ts`
- `server/src/services/MovieOrganizeService.ts`
- New test files: `server/src/services/SeriesOrganizeService.test.ts`, `server/src/services/MovieOrganizeService.test.ts`

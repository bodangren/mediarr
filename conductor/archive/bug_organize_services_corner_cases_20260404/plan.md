# Plan: Organize Services Corner-Case Testing

## Phase 1 — SeriesOrganizeService Naming & Token Tests
- [x] Test all naming tokens with full data (title, year, season, episode, quality, resolution)
- [x] Test tokens with missing optional fields (undefined episodeTitle, quality, resolution, absoluteEpisodeNumber)
- [x] Test `sortTitle` with "The", "A", "An" prefixes
- [x] Test `sortTitle` with no prefix
- [x] Test `sanitize` with special characters (colons, slashes, quotes, etc.)
- [x] Test `extractResolution` with standard quality strings and non-standard ones
- [x] Test empty/undefined season folder format (should skip season layer)
- [x] Test default naming settings produce expected paths

## Phase 2 — SeriesOrganizeService Preview & Apply Corner Cases
- [x] Test `previewRename` with empty array c21730d
- [x] Test `previewRename` with series that has no path (should skip)
- [x] Test `previewRename` with series that has no seasons/episodes (empty result)
- [x] Test `previewRename` with episodes that have no fileVariants (empty result)
- [x] Test `previewRename` `isNewPath` is false when path already matches
- [x] Test `applyRename` with fs.rename success + DB update success
- [x] Test `applyRename` with fs.rename failure (records error, continues)
- [x] Test `applyRename` with DB update failure after rename succeeds (partial state)

## Phase 3 — MovieOrganizeService Naming & Token Tests
- [x] Test all naming tokens with full data d8f9a2f
- [x] Test tokens with missing optional fields
- [x] Test `sortTitle`, `sanitize`, `extractResolution` (same patterns as series)
- [x] Test default naming settings produce expected paths

## Phase 4 — MovieOrganizeService Preview & Apply Corner Cases
- [x] Test `previewRename` with empty array d8f9a2f
- [x] Test `previewRename` with movie that has no path (should skip)
- [x] Test `previewRename` with movie that has no fileVariants (empty result)
- [x] Test `applyRename` with fs.rename success + DB update success
- [x] Test `applyRename` with fs.rename failure
- [x] Test `applyRename` with DB update failure after rename succeeds

## Phase 5 — Full Suite Verification
- [x] Run full test suite — verify 0 new failures d8f9a2f
- [x] Archive track

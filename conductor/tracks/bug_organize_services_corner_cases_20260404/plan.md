# Plan: Organize Services Corner-Case Testing

## Phase 1 — SeriesOrganizeService Naming & Token Tests
- [ ] Test all naming tokens with full data (title, year, season, episode, quality, resolution)
- [ ] Test tokens with missing optional fields (undefined episodeTitle, quality, resolution, absoluteEpisodeNumber)
- [ ] Test `sortTitle` with "The", "A", "An" prefixes
- [ ] Test `sortTitle` with no prefix
- [ ] Test `sanitize` with special characters (colons, slashes, quotes, etc.)
- [ ] Test `extractResolution` with standard quality strings and non-standard ones
- [ ] Test empty/undefined season folder format (should skip season layer)
- [ ] Test default naming settings produce expected paths

## Phase 2 — SeriesOrganizeService Preview & Apply Corner Cases
- [ ] Test `previewRename` with empty array
- [ ] Test `previewRename` with series that has no path (should skip)
- [ ] Test `previewRename` with series that has no seasons/episodes (empty result)
- [ ] Test `previewRename` with episodes that have no fileVariants (empty result)
- [ ] Test `previewRename` `isNewPath` is false when path already matches
- [ ] Test `applyRename` with fs.rename success + DB update success
- [ ] Test `applyRename` with fs.rename failure (records error, continues)
- [ ] Test `applyRename` with DB update failure after rename succeeds (partial state)

## Phase 3 — MovieOrganizeService Naming & Token Tests
- [ ] Test all naming tokens with full data
- [ ] Test tokens with missing optional fields
- [ ] Test `sortTitle`, `sanitize`, `extractResolution` (same patterns as series)
- [ ] Test default naming settings produce expected paths

## Phase 4 — MovieOrganizeService Preview & Apply Corner Cases
- [ ] Test `previewRename` with empty array
- [ ] Test `previewRename` with movie that has no path (should skip)
- [ ] Test `previewRename` with movie that has no fileVariants (empty result)
- [ ] Test `applyRename` with fs.rename success + DB update success
- [ ] Test `applyRename` with fs.rename failure
- [ ] Test `applyRename` with DB update failure after rename succeeds

## Phase 5 — Full Suite Verification
- [ ] Run full test suite — verify 0 new failures
- [ ] Archive track

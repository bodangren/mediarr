# Spec: Episode Matching Corner Cases

## Problem Statement

Three confirmed bugs in the automated media acquisition pipeline:

### Bug 1 — `autoSearchEpisode` grabs the wrong episode
`autoSearchEpisode` searches all indexers for a specific episode (e.g. S01E01) and grabs
the highest-scored candidate. It does **not** validate that the returned release actually
matches the requested season + episode number. Indexers can return S01E02 results when
searching for S01E01 (mis-indexed or nearby episode). The grabbed torrent is then
associated with `episodeId` (S01E01) and imported as S01E01 — resulting in the wrong
episode in the library.

### Bug 2 — `isSingleSeasonPack` false positive for multi-season range packs
`isSingleSeasonPack` uses `\bS\d{1,2}\b` to detect a season marker. A title like
`"Show.S01-S05.Complete"` matches S01 → `hasSeason=true`, has no episode marker →
`hasEpisode=false` → incorrectly flagged as a single-season pack. This causes valid
full-series packs (spanning multiple seasons) to be filtered **out** in
`tryGrabSeriesPack`, so they are never grabbed.

### Bug 3 — `ImportManager` linked-episode fast path: silent fall-through when episode not in DB
When `torrentRow.episodeId` is set (torrent was grabbed for a known episode), but the
`episode.findUnique` query returns null (episode was deleted from DB after grab), the
code silently falls through to the parser fallback paths (Path 3 / Path 4). This can
cause the torrent to be imported to the wrong episode or movie, or to emit no activity
event at all for the failure.

## Acceptance Criteria

1. `autoSearchEpisode` must **reject** any candidate release whose parsed season or
   episode number does not match the requested season + episode. Releases that cannot
   be parsed (no episode marker) are also rejected.
2. `isSingleSeasonPack("Show.S01-S05.Complete")` must return `false`. Only a title with
   a **single** season number (not a range) and no episode marker is flagged as a pack.
3. When `linkedEpisodeId` is set but `episode.findUnique` returns null, `ImportManager`
   must emit `IMPORT_FAILED` and skip the file (not fall through to parser paths).

## Subsystem Scope

- `server/src/services/WantedSearchService.ts`
- `server/src/services/ImportManager.ts`
- New/extended tests in:
  - `server/src/services/WantedSearchService.episodeValidation.test.ts`
  - Extended `server/src/services/ImportManager.test.ts`

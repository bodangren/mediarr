# Plan: MediaService & MediaRepository Corner-Case Testing

## Phase 1 — MediaRepository.upsertSeasonsAndEpisodes Corner Cases

- [x] Write tests for empty episodes array (no-op) — existing
- [x] Write tests for episodes with missing/null tvdbId (skip) — existing + NaN/Infinity
- [x] Write tests for episodes with missing/non-finite seasonNumber — NaN, no matching season
- [x] Write tests for episodes with missing/non-finite episodeNumber — covered by existing tests
- [x] Write tests for episodes without a matching season in the season map (seasonId = null)
- [x] Write tests for duplicate season numbers in metadata (dedup via Set)
- [x] Write tests for null/empty/invalid airDate variants — null, empty, whitespace, valid
- [x] Write tests for empty seasons array in details (derive from episodes) — existing
- [x] Write tests for non-finite seasonNumber in seriesSeasons (skip)
- [x] Write tests for tvdbId fallback from ep.id when ep.tvdbId is undefined
- [x] Write tests for prefer ep.tvdbId over ep.id when both present
- [x] Write tests for airDate field when firstAired is absent
- [x] Write tests for non-finite seasonNumber in episodes when deriving seasons
- [ ] Run full test suite — confirm green

## Phase 2 — MediaRepository.upsertMovie / upsertSeries Corner Cases

- [ ] Write tests for upsertMovie: create new movie + media record
- [ ] Write tests for upsertMovie: update existing movie (tmdbId match)
- [ ] Write tests for upsertSeries: create new series + media record
- [ ] Write tests for upsertSeries: update existing series (tvdbId match)
- [ ] Write tests for optional fields (imdbId, posterUrl, overview, etc.)
- [ ] Run full test suite — confirm green

## Phase 3 — MediaService Corner Cases

- [ ] Write tests for deleteMedia MOVIE: successful deletion + file deletion
- [ ] Write tests for deleteMedia MOVIE: no mediaId (skip media delete)
- [ ] Write tests for deleteMedia MOVIE: deleteFiles=false (no fs.rm)
- [ ] Write tests for deleteMedia TV: manual cascade (episodes → seasons → series)
- [ ] Write tests for deleteMedia TV: file deletion on success
- [ ] Write tests for getMovieCandidatesForSearch: with metadataProvider
- [ ] Write tests for getMovieCandidatesForSearch: without metadataProvider (fallback)
- [ ] Write tests for getAllMedia: with and without media.findMany
- [ ] Run full test suite — confirm green

## Phase 4 — TorrentRepository Corner Cases

- [ ] Write tests for normalizeInfoHash (trim + lowercase)
- [ ] Write tests for upsert: create new torrent
- [ ] Write tests for upsert: update existing torrent (infoHash match)
- [ ] Write tests for delete: explicit peer cleanup before torrent delete
- [ ] Write tests for syncPeers: no-op when torrent not found
- [ ] Write tests for findOldestQueued: returns null when no queued torrents
- [ ] Run full test suite — confirm green

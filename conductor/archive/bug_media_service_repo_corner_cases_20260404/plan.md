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

- [x] Write tests for upsertMovie: create new movie + media record
- [x] Write tests for upsertMovie: update existing movie (tmdbId match)
- [x] Write tests for upsertSeries: create new series + media record
- [x] Write tests for upsertSeries: update existing series (tvdbId match)
- [x] Write tests for optional fields (imdbId, posterUrl, overview, etc.)
- [ ] Run full test suite — confirm green

## Phase 3 — MediaService Corner Cases

- [x] Write tests for deleteMedia MOVIE: successful deletion + file deletion
- [x] Write tests for deleteMedia MOVIE: no mediaId (skip media delete)
- [x] Write tests for deleteMedia MOVIE: deleteFiles=false (no fs.rm)
- [x] Write tests for deleteMedia TV: manual cascade (episodes → seasons → series)
- [x] Write tests for deleteMedia TV: file deletion on success
- [x] Write tests for deleteMedia TV: no mediaId (skip media delete)
- [x] Write tests for deleteMedia: media.delete failure gracefully caught
- [x] Write tests for getMovieCandidatesForSearch: with metadataProvider (released + streaming)
- [x] Write tests for getMovieCandidatesForSearch: without metadataProvider (fallback)
- [x] Write tests for getMovieCandidatesForSearch: announced filtered out
- [x] Write tests for getAllMedia: with and without media.findMany
- [x] Write tests for addMovie: success event + failure event + no emitter
- [x] Write tests for setMonitored: MOVIE vs TV dispatch
- [ ] Run full test suite — confirm green

## Phase 4 — TorrentRepository Corner Cases

- [x] Write tests for normalizeInfoHash (trim + lowercase)
- [x] Write tests for upsert: create new torrent
- [x] Write tests for upsert: update existing torrent (infoHash match)
- [x] Write tests for delete: explicit peer cleanup before torrent delete
- [x] Write tests for syncPeers: no-op when torrent not found
- [x] Write tests for findOldestQueued: returns null when no queued torrents
- [x] Write tests for findByInfoHash: found and not found
- [x] Write tests for syncPeers: delete old + create new, empty array
- [x] Write tests for findByStatuses: status { in: [...] }
- [x] Write tests for updateProgress: all fields + null eta
- [x] Write tests for countByStatus: delegation
- [x] Run full test suite — confirm green

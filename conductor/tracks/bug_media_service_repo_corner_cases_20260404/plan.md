# Plan: MediaService & MediaRepository Corner-Case Testing

## Phase 1 — MediaRepository.upsertSeasonsAndEpisodes Corner Cases

- [ ] Write tests for empty episodes array (no-op)
- [ ] Write tests for episodes with missing/null tvdbId (skip)
- [ ] Write tests for episodes with missing/non-finite seasonNumber
- [ ] Write tests for episodes with missing/non-finite episodeNumber
- [ ] Write tests for episodes without a matching season in the season map (seasonId = null)
- [ ] Write tests for duplicate season numbers in metadata (dedup via Set)
- [ ] Write tests for null/empty/invalid airDate variants
- [ ] Write tests for empty seasons array in details (derive from episodes)
- [ ] Write tests for non-finite seasonNumber in seriesSeasons (skip)
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

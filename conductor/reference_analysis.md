# Reference Analysis Report: Track 1 - Phase 2

## Database Schemas

### Sonarr (TV)
- **Core Entities:** `Series`, `Season`, `Episode`, `EpisodeFile`.
- **Key Fields (Series):** `TvdbId`, `TmdbId`, `ImdbId`, `Title`, `Status`, `Monitored`, `QualityProfileId`, `Path`.
- **Key Fields (Episode):** `SeriesId`, `SeasonNumber`, `EpisodeNumber`, `Title`, `AirDateUtc`, `Monitored`.
- **Logic:** Heavy use of external IDs (TVDB/TMDB) for metadata matching.

### Radarr (Movies)
- **Core Entities:** `Movie`, `MovieMetadata`, `MovieFile`.
- **Key Fields:** `TmdbId`, `ImdbId`, `Title`, `Status`, `Monitored`, `QualityProfileId`, `Path`, `MinimumAvailability`.
- **Logic:** Similar to Sonarr but simplified for single-file media.

### Prowlarr (Indexers)
- **Core Entities:** `IndexerDefinition`, `IndexerStatus`, `AppSyncProfile`.
- **Key Fields:** `Name`, `Implementation`, `ConfigContract`, `Settings`, `Protocol` (Torrent/Usenet), `SupportsRss`, `SupportsSearch`.
- **Logic:** Uses a provider-based architecture where indexers are defined by their settings and capabilities.

## API Structures
- All *arr apps share a similar RESTful API pattern.
- Common endpoints: `/api/v3/series`, `/api/v3/movie`, `/api/v3/indexer`, `/api/v3/history`, `/api/v3/queue`.
- Consistent use of API keys for authentication.

## Observations for Mediarr
- A unified media table could potentially handle both Movies and Series with a `type` discriminator.
- A shared `Indexer` model can handle all proxying needs.
- Need a robust `History` and `Queue` model to track downloads across types.

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

---

## Subtitles Branch Code Review (March 5, 2026)

**Scope:** Commits `7e0e38b5..c9c377e5` — subtitle management feature (phases 1–4 + fixes).
**Full findings:** See `conductor/security_audit_report.md` → "Code Review: Subtitles Branch (March 5, 2026)".

### Architectural Patterns Introduced

#### Provider Architecture
- Three new subtitle providers (`OpenSubtitles`, `Assrt`, `Subdl`) follow a consistent `search()` / `download()` interface via `SubtitleFetchProvider`.
- Each provider resolves its API key from settings independently on every call — no shared credential caching.
- Provider IDs are raw string literals scattered across the codebase; a shared `ProviderId` union type is missing.

#### Service Layer
- `SubtitleAutomationService` — drives the wanted-subtitle automation cycle; correctly separates scheduling concern from fetch logic.
- `ProviderBackedSubtitleFetchProvider` — wraps providers for the automation path but runs provider searches **sequentially** (vs `Promise.all` used in the manual path via `SubtitleInventoryApiService.searchAcrossProviders`).
- `SubtitleScoringService` — pure scoring logic, well-isolated; minor efficiency issue (score recomputed per sort comparison).

#### Route Layer Anti-Patterns
- Several subtitle routes bypass `SubtitleVariantRepository` and issue raw `prisma as any` queries directly — inconsistent with the rest of the codebase.
- `subtitleBlacklistStore` is a module-level in-memory singleton inside the route file — not persisted, not independently testable.
- History `action` field is derived by substring-matching the free-text `message` column (implicit coupling; should be a first-class DB column).

#### Shared Code Gaps
- `deriveReleaseName`, `extractExtension`, `readNumericProviderData` — pure utilities triplicated across all three provider classes; belong in `server/src/utils/stringUtils.ts` or a new `providerUtils.ts`.
- `subtitleStatusLabel` and coverage-summary logic defined independently in `App.tsx` and `MovieOverviewView.tsx`; should live in `app/src/lib/subtitles/`.
- `ALLOWED_UPLOAD_EXTENSIONS` defined in two files.

#### DB Query Patterns (Needs Attention)
| Pattern | Location | Impact |
|---|---|---|
| Full table scan + in-memory filter | Wanted series/movies/count routes | High — grows with library size |
| Unbounded history read + in-memory filter | History list/stats routes | High |
| N+1 per-episode variant lookups | Series variants, sync, scan, search routes | High |
| Sequential provider searches in automation | `ProviderBackedSubtitleFetchProvider` | Medium |

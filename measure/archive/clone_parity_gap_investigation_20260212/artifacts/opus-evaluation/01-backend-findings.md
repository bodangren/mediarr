# Backend Parity Findings (Opus 4.6 Independent Evaluation)

> Evaluator: Claude Opus 4.6
> Date: 2026-02-12
> Repository state: master branch, commit b36dc341

## Methodology

This evaluation reads actual source code in `server/src/` and traces runtime wiring from the entry point (`main.ts`) through services, repositories, and API handlers. Every finding includes file paths and line numbers. No runtime probes were executed; all findings are based on static code analysis with high confidence unless otherwise noted.

---

## 1. Indexer Definition Pipeline (Prowlarr Parity)

### Finding: REGRESSION — Definitions Never Loaded at Boot (P0)

**Evidence:** `server/src/main.ts:204`
```typescript
const indexerFactory = new IndexerFactory([]);
```

The `DefinitionLoader` class (`server/src/indexers/DefinitionLoader.ts:117-182`) is fully implemented and capable of parsing Cardigann YAML definitions from disk. The `IndexerFactory` (`server/src/indexers/IndexerFactory.ts:8-82`) correctly stores definitions in a `Map<string, CardigannDefinition>` and uses them to instantiate `ScrapingIndexer` instances.

**However, the boot path never calls `DefinitionLoader.loadFromDirectory()`.** The factory is constructed with an empty array, meaning:
- `indexerFactory.availableDefinitions` returns `[]`
- `indexerFactory.fromDatabaseRecord()` throws `"Definition not found for ID: ..."` for any Cardigann indexer (line 50)
- `indexerFactory.fromDefinition()` throws `"Definition not found for ID: ..."` (line 66)

**Impact:** All Cardigann/scraping indexers are completely broken at runtime. Only Torznab indexers work. This blocks the core Prowlarr parity goal.

**Status:** `REGRESSION` | **Severity:** `P0` | **Confidence:** `high`

### Finding: Indexer CRUD and Test — Partially Working

**Evidence:** `server/src/api/createApiServer.ts` (route handlers), `server/src/repositories/IndexerRepository.ts`

The IndexerRepository (`server/src/repositories/IndexerRepository.ts:4-70`) provides complete CRUD with encrypted settings storage. The API routes handle:
- `GET /api/indexers` — lists all indexers (works)
- `POST /api/indexers` — creates indexer (works for Torznab; Cardigann will fail on search/test)
- `PUT /api/indexers/:id` — updates indexer (works)
- `DELETE /api/indexers/:id` — deletes indexer (works)
- `POST /api/indexers/:id/test` — tests connectivity via `IndexerTester` (works for Torznab; Cardigann fails at factory)

**Status:** `PARTIAL_IMPLEMENTATION` | **Severity:** `P1` | **Confidence:** `high`

### Finding: No Dynamic Config Contract Fields

In Prowlarr, each indexer definition provides `settings` fields that drive dynamic form generation. The `DefinitionLoader` parses `SettingsField[]` from YAML (line 35-41), but:
- The API never exposes available definitions or their settings schemas to the frontend
- The frontend indexer form (`app/src/app/(shell)/indexers/page.tsx`) uses hardcoded protocol-specific fields (URL + API Key for torrent, Host + API Key for usenet)
- There is no endpoint like `GET /api/indexers/definitions` or `GET /api/indexers/schema`

**Status:** `MISSING` | **Severity:** `P1` | **Confidence:** `high`

---

## 2. Metadata Provider (Sonarr/Radarr Parity)

### Finding: TMDB API Key Falls Back to 'demo' Silently (P0)

**Evidence:** `server/src/services/MetadataProvider.ts:51-53, 182`
```typescript
this.tmdbApiKey = options?.tmdbApiKey ?? process.env.TMDB_API_KEY;
// ...
const apiKey = this.tmdbApiKey ?? 'demo';
```

And in `main.ts:203`:
```typescript
const metadataProvider = new MetadataProvider(httpClient);
```

No `tmdbApiKey` is passed to the constructor. If `TMDB_API_KEY` is not set in the environment, all movie searches silently use `'demo'` as the API key. TMDB will likely reject this or return rate-limited/empty results. There is no validation, warning, or user-facing error about the missing key.

**Impact:** Movie search and add workflows silently degrade. Users get empty results or cryptic errors with no indication that the API key is missing.

**Status:** `MISSING` (proper key management) | **Severity:** `P0` | **Confidence:** `high`

### Finding: TV Search Uses SkyHook Directly — No Resilience

**Evidence:** `server/src/services/MetadataProvider.ts:147-158`

TV series search hits `https://skyhook.sonarr.tv/v1/tvdb` directly. If SkyHook returns a non-200 response, the code throws a generic `Error` with the status code and body. There is no:
- Retry logic
- Fallback provider
- Rate limiting
- Caching
- Structured error classification (is it retryable? is it a key issue?)

This matches Sonarr's basic pattern but lacks the resilience Sonarr has built over years.

**Status:** `PARTIAL_IMPLEMENTATION` | **Severity:** `P2` | **Confidence:** `medium`

---

## 3. Release Search & Grab Workflow

### Finding: Search Path Calls Non-Existent Method

**Evidence:** `server/src/services/MediaSearchService.ts:72`
```typescript
const results = await indexer.search(query);
```

`BaseIndexer` (`server/src/indexers/BaseIndexer.ts`) has `buildSearchUrl()` (line 80) but no `search()` method. The `TorznabIndexer` and `ScrapingIndexer` subclasses also lack a `search()` method based on the code inspection. This means:
- `MediaSearchService.getSearchCandidates()` will throw `TypeError: indexer.search is not a function` at runtime
- The entire release search workflow is broken

**However**, the error is caught in the try/catch at line 84 and silently logged, so the endpoint returns an empty results array rather than crashing. This masks a fundamental implementation gap.

**Status:** `SCAFFOLDED_ONLY` | **Severity:** `P0` | **Confidence:** `high`

### Finding: Grab Workflow Works (Partially)

**Evidence:** `server/src/services/MediaSearchService.ts` (grab method), `server/src/main.ts:211`

The grab workflow (`grabRelease`) correctly:
1. Adds a torrent via `torrentManager.addTorrent()`
2. Emits an activity event via `activityEventEmitter`
3. Returns the torrent info

The torrent manager either uses the real WebTorrent engine or falls back to a database-backed stub (`main.ts:102-160`). The fallback creates a DB record but doesn't actually download anything.

**Status:** `PARTIAL_IMPLEMENTATION` | **Severity:** `P1` | **Confidence:** `high`

---

## 4. Media Management (Sonarr/Radarr Parity)

### Finding: Series/Movie CRUD Works but Lifecycle is Incomplete

**Evidence:** `server/src/services/MediaService.ts`, `server/src/repositories/MediaRepository.ts`

The MediaService provides:
- `addMedia()` — Creates series or movie with metadata lookup, conflict detection, and optional search-on-add
- `deleteSeries()` / `deleteMovie()` — Deletes with cascade
- `setMonitored()` — Updates monitored flag

**Missing lifecycle operations:**
- No import/file organization workflow (Sonarr's automatic file rename/move on download completion)
- No quality profile enforcement during search
- No episode-level monitoring persistence (only series-level)
- No cutoff upgrade logic

The `WantedService` (`server/src/services/WantedService.ts:4-35`) is minimal — it queries missing episodes but `getCutoffUnmetEpisodes()` just delegates to `getMissingEpisodes()` (line 31-33, comment: "Basic implementation: same as missing for now"). Uses `any` types throughout (line 5, 10, 31).

**Status:** `PARTIAL_IMPLEMENTATION` | **Severity:** `P1` | **Confidence:** `high`

---

## 5. Subtitle System (Bazarr Parity)

### Finding: Subtitle Provider is a Complete Stub

**Evidence:** `server/src/main.ts:213-220`
```typescript
const manualSubtitleProvider = {
  async search(): Promise<ManualSearchCandidate[]> {
    return [];
  },
  async download(candidate: ManualSearchCandidate): Promise<ManualSearchCandidate> {
    return candidate;
  },
};
```

The subtitle provider is hardcoded to return empty search results and echo back download candidates without doing anything. The `SubtitleInventoryApiService` and `SubtitleVariantRepository` have real implementations for variant tracking, but the actual subtitle search/download workflow does nothing.

**Contrast with the repository layer:** `SubtitleVariantRepository` (`server/src/repositories/SubtitleVariantRepository.ts`) is thoroughly implemented (450+ lines) with proper variant upsert, audio track management, wanted subtitle tracking, and history recording. The data layer is ready but the provider layer is a stub.

**Status:** `SCAFFOLDED_ONLY` | **Severity:** `P1` | **Confidence:** `high`

---

## 6. Background Services

### Finding: No Scheduler Running

**Evidence:** `server/src/main.ts` — no cron jobs, no scheduler instantiation.

The codebase has `node-cron` in the tech stack and test files for `scheduler.test.js`, `rss-sync-service.test.js`, `rss-tv-monitor.test.js`, `rss-media-monitor.test.js`, `torrent-manager-sync-loop.test.js`. However, `main.ts` does not instantiate any scheduler, RSS sync service, or periodic task. These services exist as tested classes but are not wired into the runtime.

**Status:** `SCAFFOLDED_ONLY` | **Severity:** `P1` | **Confidence:** `high`

---

## 7. WebTorrent Integration

### Finding: Graceful Fallback to Database Stub

**Evidence:** `server/src/main.ts:162-174`

The server attempts to dynamically import `TorrentManager` and initialize WebTorrent. If this fails (e.g., missing native dependencies in container), it falls back to `createFallbackTorrentManager()` which is a database-backed stub that tracks torrent state in SQLite but performs no actual downloading.

This is reasonable for development but means the download engine may silently be a no-op in production without clear user feedback.

**Status:** `PARTIAL_IMPLEMENTATION` | **Severity:** `P2` | **Confidence:** `medium`

---

## Summary Table

| Capability | Status | Severity | Confidence |
|---|---|---|---|
| Indexer definition loading (Prowlarr) | REGRESSION | P0 | high |
| TMDB key management (Radarr) | MISSING | P0 | high |
| Release search (indexer.search()) | SCAFFOLDED_ONLY | P0 | high |
| Indexer CRUD + test | PARTIAL_IMPLEMENTATION | P1 | high |
| Dynamic config contract fields | MISSING | P1 | high |
| Grab workflow | PARTIAL_IMPLEMENTATION | P1 | high |
| Series/movie lifecycle | PARTIAL_IMPLEMENTATION | P1 | high |
| Subtitle provider | SCAFFOLDED_ONLY | P1 | high |
| Background scheduler | SCAFFOLDED_ONLY | P1 | high |
| TV search resilience | PARTIAL_IMPLEMENTATION | P2 | medium |
| WebTorrent fallback | PARTIAL_IMPLEMENTATION | P2 | medium |

**P0 count:** 3
**P1 count:** 6
**P2 count:** 2

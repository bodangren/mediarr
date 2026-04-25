# Security & Privacy Audit Report

**Date:** March 3, 2026
**Scope:** Changes in the current branch (PR Audit).

## Scope Disposition (March 5, 2026)

- **Trusted-LAN Model Accepted:** Running without authentication is an intentional product decision for this project phase.
- **Current Scope:** Security hardening items in this report are considered non-blocking and out of scope unless the trust model changes.
- **Priority for This Phase:** Dependency package updates are optional maintenance ("nice to have").
- **Document Status:** Findings below are preserved as historical audit notes and future hardening backlog input.

## Historical Findings (Out of Scope for Current Phase)

### 1. No Authentication on API Surface (Accepted by Scope)
- **Severity:** Accepted Risk (would be Critical for non-trusted or internet-exposed deployments)
- **Location:** `server/src/api/createApiServer.ts` (Lines 152–180)
- **Description:** The application registers all sensitive API endpoints without any authentication or authorization middleware.
- **Impact:** Any user with network access can perform administrative actions and browse the host filesystem.
- **Recommendation:** No change required for current trusted-LAN scope; revisit if deployment scope expands.

## Historical High-Severity Findings (Deferred)

### 2. Path Traversal & Information Exposure in `rescan` Endpoint
- **Severity:** High
- **Location:** `server/src/api/routes/seriesRoutes.ts` (Line 624)
- **Description:** `POST /api/series/:id/rescan` allows an unvalidated `folderPath` to trigger a recursive filesystem scan.
- **Impact:** Attackers can scan any directory accessible to the server process, exposing sensitive file structures.
- **Recommendation:** Validate `folderPath` against authorized media root directories.

### 3. Path Traversal & Information Exposure in `import/scan` Endpoint
- **Severity:** High
- **Location:** `server/src/api/routes/seriesRoutes.ts` (Line 1006)
- **Description:** `POST /api/series/import/scan` accepts an arbitrary `path` for recursive directory scanning without validation.
- **Impact:** Unauthorized discovery of files across the host filesystem.
- **Recommendation:** Implement strict path validation against an allowlist.

### 4. Path Traversal in Media Path Construction
- **Severity:** High
- **Location:** `server/src/api/routes/mediaRoutes.ts` (Line 206)
- **Description:** `buildMediaPath` constructs paths by concatenating `rootFolder` with user-supplied `title` and `year` without sanitization.
- **Impact:** Manipulation of `title` with `../` sequences can lead to arbitrary file path manipulation.
- **Recommendation:** Sanitize `title` and `year` inputs to remove path traversal characters.

## Low-Severity Findings

### 5. Privacy: Plain Text API Key Exposure in UI
- **Severity:** Low
- **Location:** `app/src/App.tsx` (Lines 1130–1136)
- **Data Type:** API Secret (OpenSubtitles)
- **Description:** The input field for the OpenSubtitles API key uses `type="text"`.
- **Impact:** Increased risk of accidental exposure (shoulder surfing).
- **Recommendation:** Change input type to `"password"`.

## Additional Review Findings (March 4, 2026, Non-Blocking for Current Scope)

### 6. Return API Error Envelope for Failed Auto-Search Requests
- **Severity:** Medium (P2)
- **Location:** `server/src/api/routes/mediaRoutes.ts` (Lines 395–397)
- **Description:** When `autoSearchMovie/autoSearchEpisode` returns `success: false`, this route sends a raw `404` body (`{ success: false, error: ... }`) instead of the standard API error envelope used elsewhere.
- **Impact:** The frontend `ApiHttpClient` expects enveloped errors on non-2xx responses, so common “no candidates found” responses become contract violations and callers lose typed error handling.
- **Recommendation:** Return the standard API error envelope for this error path.

### 7. Skip Linked-Episode Fast Path for Multi-File Torrents
- **Severity:** High (P1)
- **Location:** `server/src/services/ImportManager.ts` (Lines 160–164)
- **Description:** The linked-episode fast path runs inside the per-file loop and always uses the same `episodeId`, so every video file in a multi-file torrent is imported as that single episode.
- **Impact:** Season/pack torrents triggered from an episode grab can repeatedly overwrite one episode target and corrupt episode-path assignments.
- **Recommendation:** Gate or skip this fast path for multi-file torrents so file-to-episode mapping is resolved correctly.

### 8. Keep Movie Normalization Compatible with `cleanTitle` Lookup
- **Severity:** Medium (P2)
- **Location:** `server/src/services/ImportManager.ts` (Lines 628–629)
- **Description:** Updated normalization keeps spaces (for example, `"spider man"`), but `movie.cleanTitle` is persisted without separators (for example, `"spiderman"`), so the `cleanTitle contains` clause in `findMovieMatch` no longer matches reliably.
- **Impact:** Valid movie imports can fail when punctuation/spacing differs from database title formatting and the `title contains` fallback misses.
- **Recommendation:** Normalize movie titles in a way that remains compatible with `cleanTitle` matching behavior.

---

## Code Review: Subtitles Branch (March 5, 2026)

**Scope:** Commits `7e0e38b5..c9c377e5` — subtitle management feature (phases 1–4 + fixes).

### Code Reuse Issues

#### R1. `subtitleStatusLabel` defined twice, identically
- **Location:** `app/src/App.tsx:539` and `app/src/components/views/MovieOverviewView.tsx:75`
- **Description:** Character-for-character identical function bodies in two files.
- **Recommendation:** Extract once into `app/src/lib/subtitles/`.

#### R2. Subtitle coverage summary logic duplicated
- **Location:** `app/src/App.tsx:503` (`summarizeSubtitleCoverage`) and `app/src/components/views/MovieOverviewView.tsx:34` (`summarizeMovieSubtitles`)
- **Description:** Same four-state derivation (`complete/partial/missing/none`) with the same `Set`-deduplication pattern. Status type also defined twice under different names (`SubtitleCoverageStatus` vs `SubtitleStatus`).
- **Recommendation:** Shared type and function in `app/src/lib/subtitles/coverage.ts`.

#### R3. Language-code normalization implemented three times
- **Location:** `app/src/App.tsx` (`normalizeLanguageCodes`), `AppSettingsRepository.ts` (`readStringArray`), inline in `SubtitleAutomationService.resolveWantedLanguages`
- **Description:** All three do `trim().toLowerCase()` + dedupe + filter-empty on string arrays independently.
- **Recommendation:** Single exported utility; server side in `server/src/utils/stringUtils.ts`.

#### R4. `deriveReleaseName` and `extractExtension` triplicated across all three providers
- **Location:** `AssrtProvider.ts:194`, `OpenSubtitlesProvider.ts:153`, `SubdlProvider.ts:151`
- **Description:** Pure utility functions with identical bodies copied verbatim into each provider class.
- **Recommendation:** Move to `server/src/utils/stringUtils.ts` (already exists).

#### R5. `readNumericProviderData` duplicated verbatim
- **Location:** `AssrtProvider.ts:212` and `OpenSubtitlesProvider.ts:171`
- **Description:** Byte-for-byte identical private methods.
- **Recommendation:** Shared `server/src/services/providers/providerUtils.ts`.

#### R6. `ALLOWED_UPLOAD_EXTENSIONS` defined twice
- **Location:** `subtitleRoutes.ts:12` and `SubtitleInventoryApiService.ts:87`
- **Description:** Same `Set(['.srt', '.ass', '.ssa', '.sub', '.vtt'])` in two files.
- **Recommendation:** Export from one location.

#### R7. `formatEpisodeCode` ignored — inline template literals used instead
- **Location:** `app/src/App.tsx` (5+ occurrences in diff)
- **Description:** `app/src/lib/format.ts:107` already exports `formatEpisodeCode`; new code uses inline `S${...padStart}E${...padStart}` template literals.
- **Recommendation:** Import and use the existing utility.

#### R8. Manual language checkbox grid bypasses `LanguageSelector` component
- **Location:** `SettingsSubtitlesPage` in `app/src/App.tsx`
- **Description:** Manual `COMMON_LANGUAGES.map` checkbox grid renders the same data as the existing `app/src/components/subtitles/LanguageSelector.tsx` (searchable picker).
- **Recommendation:** Use the existing component.

---

### Code Quality Issues

#### Q1. Three derived state atoms stored separately instead of computed
- **Location:** `app/src/App.tsx:2155–2157`
- **Description:** `episodeSubtitleSummaries`, `seasonSubtitleStatuses`, and `seriesSubtitleStatus` are all stored as `useState`. The latter two are fully derived from the first and require three synchronized `setState` calls on every load/reset.
- **Recommendation:** Store only `episodeSubtitleSummaries`; derive the others with `useMemo`.

#### Q2. Two wanted-search routes collapse into the same implementation
- **Location:** `subtitleRoutes.ts:686–708`
- **Description:** `POST /api/subtitles/wanted/series/search` and `POST /api/subtitles/wanted/movies/search` both call `runAutomationCycle()` and return identical shapes with no differentiation at the service level.
- **Recommendation:** Unify into a single route or add real differentiation.

#### Q3. Blacklist GET handlers copy-pasted with one word changed
- **Location:** `subtitleRoutes.ts:990–1034`
- **Description:** Series and movies blacklist GET handlers are structurally identical; only the store key differs.
- **Recommendation:** Extract a shared helper parameterized on the store array.

#### Q4. `subtitleBlacklistStore` is a module-level mutable singleton in the route file
- **Location:** `subtitleRoutes.ts:32–38`
- **Description:** In-memory state inside the route registration module bypasses the repository/service boundary used everywhere else. Not independently testable; data lost on restart.
- **Recommendation:** Move to a repository class or persist to DB.

#### Q5. Route handlers bypass the repository layer via raw `prisma as any`
- **Location:** `subtitleRoutes.ts` lines 507, 586, 647, 710, 749, 842, 889
- **Description:** Multiple handlers reach directly into Prisma with `deps.prisma as any`, defeating TypeScript's type safety and duplicating data-access logic that `SubtitleVariantRepository` already encapsulates.
- **Recommendation:** Route handlers should delegate to `SubtitleVariantRepository` methods.

#### Q6. `AssrtProvider` and `SubdlProvider` cast typed `settings.apiKeys` to `Record<string, unknown>`
- **Location:** `AssrtProvider.ts:144`, `SubdlProvider.ts:124`
- **Description:** `OpenSubtitlesProvider` correctly uses `settings.apiKeys.openSubtitlesApiKey` without a cast. The cast in the other two providers indicates `assrtApiToken` and `subdlApiKey` were added to the DB schema but not to the TypeScript return type of `SettingsService.get()`.
- **Recommendation:** Add the new keys to the settings type; remove the casts.

#### Q7. Provider IDs are unguarded raw string literals throughout
- **Location:** `SubtitleScoringService.ts:64`, all three provider files, `subtitleRoutes.ts` (~10 occurrences)
- **Description:** `'opensubtitles'`, `'assrt'`, `'subdl'`, `'embedded'` are scattered as raw strings with no shared `ProviderId` union or constant object.
- **Recommendation:** Define `type ProviderId = 'opensubtitles' | 'assrt' | 'subdl' | 'embedded'` or a `PROVIDER_IDS` constant in a shared module.

#### Q8. History `action` field reverse-engineered by substring-matching the `message` column
- **Location:** `subtitleRoutes.ts:790–797` (and duplicated at 933–940 in stats handler)
- **Description:** `message.includes('manual') ? 'manual' : message.includes('upload') ? ...` — action type inferred from free text rather than stored as a first-class column.
- **Recommendation:** Add an `action` column to `SubtitleHistory`; write it explicitly at record-creation time.

#### Q9. `WantedSubtitleState` values passed as untyped string literals
- **Location:** `VariantSubtitleFetchService.ts:65,68,92,149`
- **Description:** `'SEARCHING'`, `'FAILED'`, `'DOWNLOADED'` passed directly without importing the Prisma-generated `WantedSubtitleState` type, unlike `SubtitleAutomationService` which imports it correctly.
- **Recommendation:** Import `WantedSubtitleState` and use it as the type for these values.

#### Q10. `resolveVariantId` accepts a wide-open optional-field bag
- **Location:** `SubtitleInventoryApiService.ts:377`
- **Description:** `{ movieId?, episodeId?, variantId? }` represents three mutually exclusive resolution strategies with no type-system enforcement.
- **Recommendation:** Use a discriminated union.

---

### Efficiency Issues

#### E1. N+1 queries in `GET /series/:id/variants` — High
- **Location:** `subtitleRoutes.ts:1095–1132`
- **Description:** Per-episode loop calls `listEpisodeVariantInventory`, which itself calls `getVariantInventory` per variant (4 DB queries each). 100 episodes × 1 variant = ~501 DB round-trips.
- **Recommendation:** Batch variant lookups; use a single repository query with `include`.

#### E2. Same N+1 pattern in sync/scan/search/wanted-search route loops — High
- **Location:** `subtitleRoutes.ts:1244, 1270, 1296, 720`
- **Description:** All loop over episodes calling an async service method per episode sequentially.
- **Recommendation:** `Promise.all` or batch service methods.

#### E3. `mapVariantInventory` sequential loop instead of `Promise.all` — High
- **Location:** `SubtitleInventoryApiService.ts:337–375`
- **Description:** `for...await` over independent variant IDs.
- **Recommendation:** Replace with `Promise.all`.

#### E4. Provider searches run sequentially in automation path, parallel in manual path — High
- **Location:** `ProviderBackedSubtitleFetchProvider.ts:19–38`
- **Description:** Sequential `for` loop over providers in automation. `SubtitleInventoryApiService.searchAcrossProviders` correctly uses `Promise.all` for the manual path.
- **Recommendation:** Use `Promise.all` in `ProviderBackedSubtitleFetchProvider` to match the manual path.

#### E5. Wanted routes: full table scan + in-memory filter — High
- **Location:** `subtitleRoutes.ts:512–644`
- **Description:** `findMany` with no `where` clause loads the entire `variantMissingSubtitle` table; `languageCode` filtering and pagination happen in JavaScript.
- **Recommendation:** Push `where`, `take`, `skip` into the Prisma query.

#### E6. Wanted count: full table materialized to count distinct IDs — High
- **Location:** `subtitleRoutes.ts:650–683`
- **Description:** All missing subtitle rows fetched to count distinct episode/movie IDs.
- **Recommendation:** Use `count`/`groupBy` DB queries.

#### E7. History endpoint: unbounded full-table read + in-memory filter — High
- **Location:** `subtitleRoutes.ts:758–839`
- **Description:** All history rows fetched with deep joins, then filtered by type/action/provider/language/date in JavaScript.
- **Recommendation:** Push all filters and pagination into the Prisma query.

#### E8. `resolveWantedLanguages` (DB read) called once per episode in route loop — Medium
- **Location:** `SubtitleAutomationService.ts:98`
- **Description:** When the route loops N episodes calling `onEpisodeImported`, settings are re-read N times.
- **Recommendation:** Read settings once before the loop; pass the result in.

#### E9. `settingsService.get()` called on every provider search and download — Medium
- **Location:** `AssrtProvider.ts:142`, `OpenSubtitlesProvider.ts:45`, `SubdlProvider.ts:122`
- **Description:** Full settings fetched from DB on every search and download with no caching.
- **Recommendation:** Cache settings for the duration of a request or automation cycle.

#### E10. In-memory blacklist store is unbounded with no persistence — Medium
- **Location:** `subtitleRoutes.ts:32–38`
- **Description:** Plain array grows without bound during process lifetime; data lost on restart; no size cap or TTL.
- **Recommendation:** Persist to DB or add eviction.

#### E11. TOCTOU: `fileExists` check before `writeFile` — Medium
- **Location:** `SubtitleInventoryApiService.ts:240–245`
- **Description:** Filesystem existence checked separately from the `existingPaths` already tracked by the naming service, creating a race window. The naming service already handles collision via `existingPaths`.
- **Recommendation:** Remove the `fileExists` guard; rely on `existingPaths` exclusively.

#### E12. `scoreCandidate` and `extractReleaseTokens` recomputed per sort comparison — Low
- **Location:** `SubtitleScoringService.ts:75`
- **Description:** Called inside the sort comparator, producing O(N log N) scoring instead of O(N) score-then-sort.
- **Recommendation:** Pre-compute scores into a `Map` before sorting.

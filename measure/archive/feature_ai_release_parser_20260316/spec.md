# Spec: AI Release Parser — Batch Search Scoring & Import Matching

## Problem

The current parsing layer has three compounding failures:

1. **Manual search is a needle in a haystack.** Indexers return 25+ results; the confidence scorer uses Levenshtein distance on the title but has no understanding of `matchType`. A "Complete Series" pack scores identically to a season 2 pack when searching for season 2.

2. **Auto-search (WantedSearchService) rejects season packs.** `Parser.parse()` returns `null` for titles like `The.Big.Bang.Theory.S02.1080p.BluRay` (no episode number) → the candidate is silently dropped → wanted episodes never get grabbed from season packs.

3. **Imports consistently fail on unlinked torrents.** Without a `linkedEpisodeId`, `ImportManager` relies on `Parser.parse(filename)` which chokes on non-standard naming conventions, pack directories, and disambiguated titles like `Archer (2009) - S10E04 - ...`.

The root cause is the same in all three cases: **regex cannot understand release semantics.** A model can.

## Solution

Replace the patchwork of `AiParsingService` + `Parser.ts` regex with a single `ReleaseParser` service backed by the Vercel AI SDK. The service exposes two methods:

- **`parse(title)`** — single-item parse for imports and auto-search validation. Returns a typed `ParsedRelease` or `null` on failure (falls back to regex).
- **`parseBatch(titles, context)`** — one AI call for all search result titles at once. Returns a `ParsedReleaseWithScore[]` where `relevanceScore` (0–100) encodes how well each release matches what was requested. This replaces the `confidenceScore` component of `CustomFormatScoringEngine` for search results.

## Functional Requirements

### FR1 — ParsedRelease Zod Schema

All fields use `.catch()` for graceful degradation — a partial parse is better than null.

The `.describe()` annotations are load-bearing — they are passed to the model as field-level instructions and must be precise.

```typescript
QualitySchema = z.object({
  resolution: z.enum(['SD', '480p', '720p', '1080p', 'unknown'])
    .describe('"SD" = no explicit resolution and no HD/UHD marker. "480p"|"720p"|"1080p" = title explicitly states that resolution. "unknown" = 4K, UHD, 2160p, or any resolution not in this list.')
    .nullable().catch(null),
  source: z.enum(['BluRay','WEB-DL','WEBRip','HDTV','PDTV','DVDRip','DVD','REMUX','AMZN','NF','HULU','DSNP','ATVP','other'])
    .describe('Distribution medium. "other" for anything not in this list.')
    .nullable().catch(null),
  codec: z.enum(['x264','x265','HEVC','AVC','XviD','DivX','AV1','VP9','other'])
    .describe('Video codec. "other" for anything not in this list.')
    .nullable().catch(null),
})

ParsedReleaseSchema = z.object({
  title: z.string()
    .describe('Cleaned series or movie name — no year, no resolution, no release group, no codec'),
  type: z.enum(['series','movie'])
    .describe('"series" for TV shows and anime; "movie" for films')
    .catch('series'),
  matchType: z.enum(['episode','season_pack','complete_series'])
    .describe('"episode" = single episode file. "season_pack" = full season of a TV series. "complete_series" = all seasons of a series OR a single movie file.')
    .catch('episode'),
  seasonNumber: z.number()
    .describe('Season number for episodes/season packs. null for movies or complete series.')
    .nullable().catch(null),
  episodeNumbers: z.array(z.number())
    .describe('Episode numbers. Empty array for season packs, complete series, movies.')
    .catch([]),
  year: z.number()
    .describe('Disambiguation year if part of the title (e.g. Archer 2009). null otherwise.')
    .nullable().catch(null),
  quality: QualitySchema.nullable().catch(null),
})

ParsedReleaseWithScoreSchema = ParsedReleaseSchema.extend({
  relevanceScore: z.number().min(0).max(100)
    .describe('0–100 relevance to the search context. 90–100 = exact match (right show, right season pack). 70–89 = correct season individual episodes or UHD pack. 50–69 = complete series or adjacent season. 0–49 = wrong season, wrong show, or poor quality.')
    .catch(50),
})
```

Exported types: `ParsedRelease`, `ParsedReleaseWithScore`, `SearchContext`.

### FR2 — ReleaseParser Service

- Singleton at `server/src/services/ReleaseParser.ts`
- **`parse(title)`** — uses `@ai-sdk/deepseek` + `deepseek('deepseek-chat')` with `generateText` + `Output.object({ schema: ParsedReleaseSchema })` from the `ai` package. Timeout: 30s. Retries: 3 attempts with backoff [1000ms, 2000ms]. Falls back to regex on all failures. Never throws.
- **`parseBatch(titles, context?)`** — uses `@ai-sdk/openai` + `openai.chat('gpt-5-nano')` (Chat Completions, NOT the Responses API — see note below). Calls `generateText` with a plain-text prompt instructing the model to return a raw JSON object `{"results":[...]}`. After receiving the response, extract the JSON with a regex match, then validate with `BatchResponseSchema` (Zod). Timeout: 60s. Returns `[]` on failure. Never throws.
- Serial queue on `parse()`: `this.queue = this.queue.then(() => _parseSingle()).catch(() => {})`. The queue chain must survive failures — the `.catch(() => {})` on the queue tail (not the result) keeps it alive.
- No queue on `parseBatch()`.
- Guards: `parse()` falls back to regex if `DEEPSEEK_API_KEY` absent. `parseBatch()` returns `[]` if `OPENAI_API_KEY` absent or `titles.length === 0`.

> **Critical note on parseBatch AI provider**: Do NOT use `generateObject` or `Output.object` with OpenAI for `parseBatch`. The OpenAI Responses API enforces strict JSON Schema (every property at every nesting level must be in `required`, no `additionalProperties`). Our schema has nullable nested objects which violate this. Use `generateText` and parse the response manually with Zod instead.

> **Critical note on openai() vs openai.chat()**: `openai()` in AI SDK v6 defaults to the Responses API (`/v1/responses`). `openai.chat()` explicitly uses Chat Completions (`/v1/chat/completions`). Always use `openai.chat('gpt-5-nano')` for `parseBatch`.

### FR3 — SearchContext for Batch Scoring

```typescript
interface SearchContext {
  seriesTitle?: string
  movieTitle?: string
  seasonNumber?: number
  episodeNumber?: number
  preferredResolution?: string
}
```

The `parseBatch` prompt includes the context block so the model scores relevance in one pass. Example context: `Series: The Big Bang Theory / Season: 2 / Preferred resolution: 1080p`. The prompt lists each title as `1. <title>` and instructs the model to return `{"results":[...]}` with one entry per title in the same order.

### FR4 — Search Pipeline Integration

**`SearchCandidate` interface** (in `MediaSearchService.ts`) needs a new optional field:
```typescript
parsedRelease?: ParsedReleaseWithScore;
```

**`MediaSearchService` constructor** needs a new optional last parameter:
```typescript
private readonly eventHub?: ApiEventHub
```
Import: `import type { ApiEventHub } from '../api/eventHub'`

**`searchAllIndexers` flow**:
1. Emit `search:querying` (with `{ indexerCount }`) before parallel indexer fetches
2. Collect all results as normal
3. Emit `search:parsing` (with `{ resultCount }`) before AI batch call
4. Filter to top 25 well-seeded releases (seeders > 2), sorted by seeders desc — call this `seededReleases`
5. Call `releaseParser.parseBatch(seededReleases.map(r => r.title), batchContext)`
6. Attach each `ParsedReleaseWithScore` result back to the corresponding `seededRelease` via `seededReleases[i].parsedRelease = parsedBatch[i]`
7. Score all releases (including those without a parsedRelease — they fall back to Levenshtein)
8. Emit `search:done` (with `{ resultCount }`) after deduplication

**`applyUnifiedScoring`** passes `release.parsedRelease` as 5th arg to `scoreCandidateUnified`.

**`CustomFormatScoringEngine.scoreCandidateUnified`** accepts optional 5th parameter `parsedRelease?: ParsedReleaseWithScore`. When present, use `parsedRelease.relevanceScore` as the `confidenceScore` component instead of the Levenshtein-based confidence.

**`main.ts`**: Create `ApiEventHub` instance before services are instantiated. Pass it to `MediaSearchService` constructor.

### FR5 — Auto-Search Integration (WantedSearchService)

`autoSearchEpisode`: replace `Parser.parse(candidate.title)` with `releaseParser.parse(candidate.title)`. Accept the candidate if:
- `matchType === 'episode'` and season+episode match, OR
- `matchType === 'season_pack'` and `seasonNumber` matches the wanted episode's season

### FR6 — Import Integration (ImportManager)

Replace all `await Parser.parse(filename)` and `await Parser.parse(torrent.name)` calls with `await releaseParser.parse(...)`. Use `matchType` to determine import strategy:
- `episode` → existing episode lookup (unchanged)
- `season_pack` → import all files in directory, each matched by episode number
- `complete_series` → same as season_pack, season derived from individual filenames

### FR7 — FilenameParsingService Delegation

- `parseFilename(filename)` → call `releaseParser.parse(filename)`; map `ParsedRelease` → `ParsedMovieInfo`
- `parseEpisodeFilename(filename)` → call `releaseParser.parse(filename)`; map → `ParsedEpisodeInfo`

### FR8 — seriesRoutes Search Title Cleanup

Strip disambiguation year suffix from series title before passing to indexers:
```typescript
const searchTitle = series.title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
// SearchParams: { query: body.query ?? searchTitle, title: searchTitle, ... }
```
`"Archer (2009)"` → `"Archer"` — parenthesised years confuse indexer text search.

### FR9 — Cleanup

- Delete `server/src/services/AiParsingService.ts` and `AiParsingService.test.ts`
- `Parser.ts` becomes pure-regex static helpers (remove any AI imports)
- Remove all `aiParsingService` imports from `Parser.ts` and `FilenameParsingService.ts`
- Remove debug `console.log` statements before shipping

### FR10 — Configuration

- `DEEPSEEK_API_KEY` — already present in `.env`
- `OPENAI_API_KEY` — already present in `.env`
- No settings UI required

## Files to Modify

| File | Change |
|------|--------|
| `server/src/services/ReleaseParser.ts` | **Create** — new service |
| `server/src/services/ReleaseParser.test.ts` | **Create** — unit tests (mock `@ai-sdk/deepseek`, `@ai-sdk/openai`, `ai`) |
| `server/smoke-releaseparser.ts` | **Create** — smoke test (real API calls; run manually) |
| `server/src/services/MediaSearchService.ts` | Add `parsedRelease` to `SearchCandidate`; add `eventHub` to constructor; wire SSE + parseBatch |
| `server/src/services/CustomFormatScoringEngine.ts` | Accept optional `parsedRelease` in `scoreCandidateUnified` |
| `server/src/api/routes/seriesRoutes.ts` | Strip disambiguation year; add `title` to SearchParams |
| `server/src/main.ts` | Create `ApiEventHub` before services; pass to `MediaSearchService` |
| `server/src/services/WantedSearchService.ts` | Accept `season_pack` matchType in `autoSearchEpisode` |
| `server/src/services/ImportManager.ts` | Replace `Parser.parse` with `releaseParser.parse` |
| `server/src/services/FilenameParsingService.ts` | Delegate to `releaseParser.parse` |
| `server/src/services/ExistingLibraryScanner.ts` | Replace `Parser.parse` with `releaseParser.parse` |
| `server/src/services/LibraryScanner.ts` | Replace `Parser.parse` with `releaseParser.parse` |
| `server/src/services/RssMediaMonitor.ts` | Replace `Parser.parse` with `releaseParser.parse` |
| `server/src/services/BulkImportService.ts` | Replace `Parser.parse` with `releaseParser.parse` |
| `server/src/services/ImportMatchService.ts` | Replace `Parser.parse` with `releaseParser.parse` |
| `server/src/api/routes/importRoutes.ts` | Replace `Parser.parse` with `releaseParser.parse` |
| `server/src/utils/Parser.ts` | Remove AI imports; pure regex static helpers only |
| `server/src/services/AiParsingService.ts` | **Delete** |
| `server/src/services/AiParsingService.test.ts` | **Delete** |

## Smoke Test Scenarios

Run manually with both API keys: `DEEPSEEK_API_KEY=<key> OPENAI_API_KEY=<key> bun smoke-releaseparser.ts`

**`parse()` test cases:**
- `Breaking.Bad.S03E05.Mas.1080p.BluRay.x264-ROVERS.mkv` → episode, S03E05
- `Archer.2009.S10E04.Dining.with.the.Zarglorp.720p.WEB-DL.mkv` → episode, year=2009
- `The.Big.Bang.Theory.S02.1080p.BluRay.x264` → **season_pack**, season=2 (not episode)
- `The.Wire.Complete.Series.BluRay.1080p.x265` → complete_series
- `Oppenheimer.2023.2160p.UHD.BluRay.REMUX.HEVC.TrueHD.Atmos-FGT.mkv` → movie, resolution=unknown
- `Game of Thrones - 08x06 - The Iron Throne [1080p].mkv` → episode, S08E06

**`parseBatch()` TV test** (context: TBBT season 2, prefer 1080p):
- S02 1080p BluRay pack → relevanceScore 90+
- Complete series → relevanceScore ~40–60
- S01 pack → lower than S02 pack
- S02 individual episode → between pack and complete-series

**`parseBatch()` movie test** (context: Oppenheimer, prefer 2160p):
- 4K UHD BluRay → top score, type=movie, resolution=unknown
- Documentary titled similarly → lower score than feature film

## Non-Functional Requirements

- `parseBatch` timeout: 60 seconds for up to 50 titles
- `parse` timeout: 30 seconds, 3 attempts with 1s/2s backoff
- `tsc --noEmit` exits clean after all changes
- Test coverage ≥ 80% for `ReleaseParser`; existing test suite must continue passing

## Acceptance Criteria

- [ ] `parseBatch(["The Big Bang Theory S02 1080p BluRay", "TBBT Complete Series", "TBBT S02E01"])` returns matchTypes `season_pack`, `complete_series`, `episode` with `relevanceScore` descending for a season 2 context
- [ ] Season 2 search for TBBT returns season packs ranked above complete-series packs
- [ ] `autoSearchEpisode` grabs a `season_pack` candidate when no episode-specific release scores above threshold
- [ ] `ImportManager` correctly matches `Archer (2009) - S10E04 - ...` without a `linkedEpisodeId`
- [ ] SSE events fire during search: `search:querying` then `search:parsing` then `search:done`
- [ ] Smoke test passes end-to-end with real API keys before marking done
- [ ] `tsc --noEmit` clean; full test suite passes

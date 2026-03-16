# Spec: AI Release Parser — Batch Search Scoring & Import Matching

## Problem

The current parsing layer has three compounding failures:

1. **Manual search is a needle in a haystack.** Indexers return 25+ results; the confidence scorer uses Levenshtein distance on the title but has no understanding of `matchType`. A "Complete Series" pack scores identically to a season 2 pack when searching for season 2.

2. **Auto-search (WantedSearchService) rejects season packs.** `Parser.parse()` returns `null` for titles like `The.Big.Bang.Theory.S02.1080p.BluRay` (no episode number) → the candidate is silently dropped → wanted episodes never get grabbed from season packs.

3. **Imports consistently fail on unlinked torrents.** Without a `linkedEpisodeId`, `ImportManager` relies on `Parser.parse(filename)` which chokes on non-standard naming conventions, pack directories, and disambiguated titles like `Archer (2009) - S10E04 - ...`.

The root cause is the same in all three cases: **regex cannot understand release semantics.** A model can.

## Solution

Replace the patchwork of `AiParsingService` + `Parser.ts` regex with a single `ReleaseParser` service backed by the Vercel AI SDK (`generateObject`) and DeepSeek (`deepseek-chat`). The service exposes two methods:

- **`parse(title)`** — single-item parse for imports and auto-search validation. Returns a typed `ParsedRelease` or `null` on failure (falls back to regex).
- **`parseBatch(titles, context)`** — one AI call for all search result titles at once. Returns a `ParsedReleaseWithScore[]` where `relevanceScore` (0–100) encodes how well each release matches what was requested. This replaces the `confidenceScore` component of `CustomFormatScoringEngine` for search results.

## Functional Requirements

### FR1 — ParsedRelease Zod Schema

```
ParsedRelease {
  title: string               // cleaned series/movie name, no year, no release group
  type: 'series' | 'movie'
  matchType: 'episode' | 'season_pack' | 'complete_series'
  seasonNumber?: number
  episodeNumbers?: number[]
  year?: number               // disambiguation year only (e.g. Archer 2009)
  quality?: {
    resolution?: '480p' | '720p' | '1080p' | '2160p'
    source?: string           // WEB-DL, BluRay, WEBRip, HDTV, AMZN, NF, etc.
    codec?: string            // x264, x265, HEVC, AV1, etc.
  }
}

ParsedReleaseWithScore extends ParsedRelease {
  relevanceScore: number      // 0–100; how well this release matches the search context
}
```

### FR2 — ReleaseParser Service

- Singleton at `server/src/services/ReleaseParser.ts`
- Uses `@ai-sdk/openai` provider with `baseURL: https://api.deepseek.com` and `DEEPSEEK_API_KEY` env var
- Model: `deepseek-chat`
- `parse(title: string): Promise<ParsedRelease | null>` — single call, regex fallback on null/throw
- `parseBatch(titles: string[], context?: SearchContext): Promise<ParsedReleaseWithScore[]>` — one `generateObject` call; returns array aligned with input order; empty array on failure
- Serial queue on `parse()` (single-item calls must not overlap; DeepSeek concurrency may vary but queue is cheap insurance)
- No queue on `parseBatch()` — it is one call by definition
- Returns `null` / `[]` on network error, timeout, schema validation failure — never throws

### FR3 — SearchContext for Batch Scoring

```
SearchContext {
  seriesTitle?: string
  movieTitle?: string
  seasonNumber?: number
  episodeNumber?: number
  preferredResolution?: string
}
```

The batch prompt includes the context so DeepSeek scores relevance in a single pass. Example: *"I want The Big Bang Theory Season 2, prefer 1080p"* + 25 titles → scored array. A `Complete Series` pack scores ~40; a `S02 1080p BluRay` pack scores ~95; a random `S09E04` scores ~10.

### FR4 — Search Pipeline Integration

- `MediaSearchService.searchAllIndexers()` emits SSE progress events via `ApiEventHub`:
  - `search:querying` — parallel indexer fetches in flight
  - `search:parsing` — batch AI call in progress
  - `search:done` — results ready
- After indexer results are collected, `parseBatch(titles, context)` is called once
- `ParsedReleaseWithScore.relevanceScore` replaces the `confidenceScore` component in `CustomFormatScoringEngine.scoreCandidateUnified()` when a parsed result is available; the formula remains `customFormatScore + relevanceScore + indexerScore + seedScore`

### FR5 — Auto-Search Integration (WantedSearchService)

- `autoSearchEpisode`: replace `Parser.parse(candidate.title)` with `ReleaseParser.parse(candidate.title)`; accept candidates where `matchType === 'season_pack'` and `seasonNumber` matches (in addition to exact episode matches)
- `autoSearchSeries`: already grabs season packs; ensure parsed `matchType === 'complete_series'` candidates are also accepted

### FR6 — Import Integration (ImportManager)

- Replace `await Parser.parse(filename)` calls with `await ReleaseParser.parse(filename)`
- `matchType` informs the lookup strategy:
  - `episode` → existing episode lookup (unchanged)
  - `season_pack` → import all files in the directory, each matched by episode number
  - `complete_series` → same as season_pack, season derived from filename

### FR7 — Regex Fallback

- `Parser.ts` regex methods are retained as fallback within `ReleaseParser.parse()` when AI returns null
- `FilenameParsingService` is updated to delegate to `ReleaseParser`
- `AiParsingService` is deleted; its serial queue pattern is reimplemented directly in `ReleaseParser`

### FR8 — Configuration

- `DEEPSEEK_API_KEY` added to `.env` (already present)
- No settings UI required

## Non-Functional Requirements

- `parseBatch` must complete within 10 seconds for up to 50 titles (DeepSeek 128K context, 4K default output is sufficient for 50 JSON objects)
- `parse` single-item timeout: 10 seconds, 2 retries
- `tsc --noEmit` exits clean after changes
- Test coverage ≥ 80% for `ReleaseParser`; existing `WantedSearchService` and `ImportManager` tests must continue passing

## Acceptance Criteria

- [ ] `parseBatch(["The Big Bang Theory S02 1080p BluRay", "TBBT Complete Series", "TBBT S02E01"])` returns matchTypes `season_pack`, `complete_series`, `episode` with `relevanceScore` descending for a season 2 context
- [ ] Season 2 search for TBBT returns season packs ranked above complete-series packs
- [ ] `autoSearchEpisode` grabs a `season_pack` candidate when no episode-specific release scores above threshold
- [ ] `ImportManager` correctly matches `Archer (2009) - S10E04 - ...` without a `linkedEpisodeId`
- [ ] SSE events fire during search: `search:querying` then `search:parsing` then `search:done`
- [ ] `tsc --noEmit` clean; full test suite passes

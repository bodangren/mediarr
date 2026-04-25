# Final Investigation Summary (Opus 4.6 Independent Evaluation)

> Evaluator: Claude Opus 4.6
> Date: 2026-02-12
> Repository state: master branch, commit b36dc341

---

## Executive Summary

Mediarr is an ambitious project that has built substantial infrastructure for a unified *arr replacement. The architecture is sound — Fastify backend, Prisma ORM, Next.js frontend with TanStack Query — and many individual components are well-implemented. However, **the system does not function as a working clone of any of its targets** due to three critical wiring failures and several missing implementation pieces.

The project has a large test suite (~300+ tests across 95 files) that mostly passes, but the test architecture creates a dangerous illusion of completeness. Frontend tests mock 100% of API calls, API handler tests mock 100% of database operations, and the most critical runtime failure (search returning empty results) is silently swallowed by a catch block.

---

## Consolidated Findings

### By Severity

| Severity | Count | Description |
|---|---|---|
| **P0** | **3** | System-breaking: definitions never loaded, search method missing, TMDB key silently invalid |
| **P1** | **6** | Major gaps: no scheduler, no queue controls, no subtitle provider, no settings editor, no episode persistence, no dynamic indexer config |
| **P2** | **4** | Degraded experience: minimal dashboard, no activity filters, no TV search resilience, silent torrent fallback |
| **P3** | **2** | Polish: missing thumbnails in library views |

### By Domain

| Domain | Parity Level | Explanation |
|---|---|---|
| **Prowlarr** | ~30% | Indexer CRUD works for Torznab. Cardigann broken (definitions not loaded). No dynamic config. No search via scraping indexers. |
| **Sonarr** | ~40% | Series CRUD and library work. Metadata search works for TV. Wanted list UI works. But: no search results (search method missing), no scheduler, no import pipeline, no episode monitoring persistence. |
| **Radarr** | ~35% | Movie CRUD and library work. But: movie metadata search silently broken (TMDB key), no search results, no import pipeline. |
| **Bazarr** | ~10% | Subtitle variant data model exists and is thorough. Repository layer is production-ready. But: provider is a stub returning nothing, UI is a placeholder, no actual subtitle operations work. |

### By Architecture Layer

| Layer | Quality | Notes |
|---|---|---|
| **Database schema** | Good | Comprehensive Prisma schema with models for all domains |
| **Repositories** | Good | Clean CRUD with encryption, pagination, typed inputs |
| **Services** | Mixed | Some complete (MediaService, ActivityEventEmitter), some stubs (WantedService uses `any` types, SubtitleProvider is empty) |
| **API routes** | Good | Well-structured Fastify handlers with consistent envelope format |
| **Boot wiring** | Poor | Critical services not connected (definitions, scheduler, real subtitle provider) |
| **Frontend pages** | Mixed | Good UI patterns but 3/12 surfaces are scaffolds/placeholders |
| **Frontend API layer** | Good | Clean architecture with Zod validation and typed clients |
| **Tests** | Misleading | Large suite but mock-heavy; JS backend tests are strong, frontend tests provide false confidence |

---

## The Three Critical Failures

### 1. `IndexerFactory([])` — No Definitions at Boot
**File:** `server/src/main.ts:204`

The DefinitionLoader is implemented. The IndexerFactory is implemented. YAML fixture definitions exist in the test suite. But `main.ts` passes an empty array to the factory constructor. This single line breaks all Cardigann indexers, which cascades into broken release search for scraping-based sources.

### 2. `indexer.search()` — Method Does Not Exist
**File:** `server/src/services/MediaSearchService.ts:72`

The MediaSearchService calls `indexer.search(query)` on each enabled indexer. Neither `BaseIndexer`, `TorznabIndexer`, nor `ScrapingIndexer` defines a `search()` method. The call throws `TypeError`, which is caught and logged to console, returning empty results. The Wanted page's "Search" button appears to work (no crash) but never returns results.

### 3. `this.tmdbApiKey ?? 'demo'` — Silent TMDB Fallback
**File:** `server/src/services/MetadataProvider.ts:182`

When no TMDB API key is configured, movie searches silently use `'demo'` as the API key. This likely results in TMDB rejecting requests or returning errors, which then throw as "Failed to search movies" with no indication that the fix is simply setting an API key.

---

## Comparison with Previous Evaluation

### Agreement

Both evaluations agree on:
- Definition loading regression is P0
- TMDB key management is P0
- Subtitle UI/provider is placeholder/stub
- Queue and Settings UI are scaffolds
- Test suite is mock-heavy with false confidence zones
- Release search is broken end-to-end
- Remediation should prioritize definition wiring and metadata hardening

### Disagreements

| Area | Previous Eval | This Eval (Opus 4.6) |
|---|---|---|
| **P0 count** | 2 | **3** — I identified `indexer.search()` missing as a distinct P0, not bundled with definition wiring |
| **Release search root cause** | "Unstable due to definition wiring regression" | `search()` method doesn't exist on any indexer class — this is a separate code gap, not just a wiring issue |
| **Remediation items** | 5 | **8** — I include queue UI, settings UI, and episode persistence as explicit backlog items |
| **Frontend assessment** | 7 partially functional, 2 scaffold, 1 placeholder | 6 partially functional, 2 scaffold, 1 placeholder, 3 fully functional — I'm more precise about what "fully functional" means |
| **Test suite size** | "117+ tests" | **~300+ tests** — the JS test suite was significantly undercounted |
| **JS test quality** | Mentioned but not deeply analyzed | Identified as the strongest test layer — pure unit tests with real fixtures |

### Where Previous Evaluation Was Overly Generous

1. **Release search classified as PARTIAL_IMPLEMENTATION** — It's actually SCAFFOLDED_ONLY because the search method doesn't exist. The catch block masks this as "instability" when it's really "not implemented."

2. **Series/movie lifecycle classified at P1 with "low confidence"** — The previous eval was right to flag these but should have been more definitive. The import pipeline, file organization, and quality upgrade logic are clearly absent from the code, not just "low confidence" findings.

### Where Previous Evaluation Was Overly Harsh

1. **Frontend surfaces marked "partially functional" across the board** — Series library and movies library are genuinely fully functional for their scope. They have working CRUD, pagination, search, sort, and optimistic mutations.

2. **Mock ratio alarm** — While the 100% frontend mock ratio is concerning, the previous evaluation conflated "mocked tests" with "code doesn't work." The code works; the tests just don't prove it. These are different problems.

---

## First Remediation Sprint Recommendation

**Scope:** RMD-001 + RMD-002 + RMD-003 (all P0 items)

**Success criteria:**
1. Server boots with >0 loaded indexer definitions (log message: "Loaded N definitions")
2. `indexer.search(query)` returns structured results for both Torznab and Cardigann indexers
3. Movie search fails with clear, actionable error when TMDB_API_KEY is not set
4. Movie search returns results when TMDB_API_KEY is correctly configured
5. Wanted page "Search" button returns real release candidates from enabled indexers
6. At least one non-mocked integration test per P0 fix

**Estimated effort:** 2-3 days of focused development

---

## Evidence Files

All evidence for this evaluation is based on static code analysis of the following key files:

| File | Finding |
|---|---|
| `server/src/main.ts:204` | Empty definition array |
| `server/src/main.ts:213-220` | Stub subtitle provider |
| `server/src/main.ts:162-174` | Torrent manager fallback |
| `server/src/indexers/IndexerFactory.ts:49-51` | "Definition not found" throw |
| `server/src/indexers/DefinitionLoader.ts:117-182` | Working but unwired loader |
| `server/src/indexers/BaseIndexer.ts` | No search() method |
| `server/src/services/MediaSearchService.ts:72` | Call to nonexistent search() |
| `server/src/services/MetadataProvider.ts:182` | 'demo' API key fallback |
| `server/src/services/WantedService.ts:31-33` | Stub cutoff logic |
| `app/src/app/(shell)/subtitles/page.tsx` | 17-line placeholder |
| `app/src/app/(shell)/settings/page.tsx` | Hardcoded save payload |
| `app/src/app/(shell)/queue/page.tsx` | Read-only, no controls |

---

## Conclusion

Mediarr has a solid architectural foundation and many well-implemented pieces. The Prisma schema, repository layer, API envelope format, frontend component library, and React Query integration are all production-quality. The JavaScript backend test suite is genuinely strong.

The project's problems are concentrated in **wiring and completeness**, not architecture. The three P0 issues are all fixable with relatively small code changes. The P1 issues require more work but have clear implementation paths.

The most important meta-finding is that **the test suite creates a false sense of completeness**. Passing tests should not be interpreted as working features. The first remediation sprint should include not just fixes but also non-mocked integration tests that prove the fixes work at runtime.

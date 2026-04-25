# Test Integrity & Validation Findings (Opus 4.6 Independent Evaluation)

> Evaluator: Claude Opus 4.6
> Date: 2026-02-12
> Repository state: master branch, commit b36dc341

## Methodology

Analyzed all test files across three test suites: root JavaScript tests (`tests/*.test.js`), root TypeScript tests (`tests/*.test.ts`), and frontend tests (`app/src/**/*.test.tsx`). Examined mock usage, assertion quality, and coverage blind spots.

---

## 1. Test Suite Inventory

### Root JavaScript Tests: 74 files
Covering: indexers, torrents, media, subtitles, metadata, services, schemas, infrastructure.

### Root TypeScript Tests: 11 files
Covering: API contracts, route maps, handlers, SDK contracts, Track 9 validation artifacts.

### Frontend Tests: 10 files
Covering: 7 page tests, 2 component tests, 1 shell test.

**Total test files:** 95
**Estimated total test cases:** 300+

---

## 2. Mock Usage Census

### vi.mock() Distribution

**Total vi.mock() calls:** 32 across TypeScript/TSX tests + 14 across JavaScript tests = ~46 total

**Most commonly mocked modules:**

| Module | Count | Impact |
|---|---|---|
| `webtorrent` | 7 | All torrent tests mock the engine |
| `@/lib/api/client` | 7 | ALL frontend page tests mock the API client |
| `node:fs/promises` | 6 | File system operations in backend |
| `@/lib/query/useApiQuery` | 5 | Frontend data fetching completely replaced |
| `next/navigation` | 4 | Router mocked in frontend tests |
| `@/lib/query/useOptimisticMutation` | 2 | Mutation behavior mocked |

### Files with Highest Mock Density

| File | vi.mock() | vi.fn() | Risk Level |
|---|---|---|---|
| `library/series/page.test.tsx` | 6 | 51+ | CRITICAL |
| `library/movies/page.test.tsx` | 6 | 51+ | CRITICAL |
| `wanted/page.test.tsx` | 3 | 26+ | HIGH |
| `torrent-completion.test.js` | 2 | 49+ | HIGH |
| `activity-event-emission.test.js` | 1 | 38+ | MEDIUM |

### Tests with Zero Mocks (True Unit Tests)

These files test real behavior without any mocking:
- `definition-loader.test.js` — Real YAML parsing against fixture files
- `indexer-factory.test.js` — Real factory instantiation
- `indexer-schema.test.js` — Schema validation
- `prisma-schema.test.js` — Database schema
- `search-translator.test.js` — Query translation
- `torznab-parser.test.js` — Response parsing
- `scraping-parser.test.js` — HTML scraping
- `category-filter.test.js` — Category logic
- `indexer-result.test.js` — Deduplication
- `encryption.test.js` — Crypto utilities
- `serialization.test.js` — Data serialization
- `domain-errors.test.js` — Error classes
- ~8 more schema/model validation files

**Observation:** The JavaScript backend tests are significantly more trustworthy than the TypeScript API and frontend tests. The JS tests validate real class behavior with real data.

---

## 3. Critical False-Confidence Zones

### Zone A: Frontend Page Tests (Mock Ratio: ~100%)

**Pattern:** Every frontend page test mocks `@/lib/api/client` completely, replacing all API methods with `vi.fn()`. Some additionally mock `useApiQuery` and `useOptimisticMutation`.

**Example from `indexers/page.test.tsx`:**
```typescript
vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));
// Then:
updateMock.mockImplementation((id, input) => buildIndexer({...}));
```

**What this means:** Tests verify that the UI renders correctly given mock data and that mock functions are called with expected arguments. They do NOT verify:
- Whether the API actually returns data in the expected shape
- Whether Zod schema validation passes on real responses
- Whether error responses from the real API are handled correctly
- Whether optimistic mutations correctly roll back on real API errors

**Consequence:** All 7 page tests would pass even if:
- The backend API changed its response format
- The Zod schemas had validation bugs
- The API returned 500 errors for every request
- The route map had wrong endpoints

### Zone B: API Handler Tests (Prisma 100% Mocked)

**File:** `tests/api-handlers.test.ts`

The Fastify test application is created with real route registration, but ALL Prisma operations return mocked data. The `prisma` object is a manual mock with `findMany`, `findUnique`, `create`, `update`, `delete` all returning hardcoded objects.

**What this means:** Handler tests verify that:
- Routes are registered at correct paths (good)
- Response envelopes have correct structure (good)
- Status codes are correct for happy paths (good)

They do NOT verify:
- Whether Prisma queries actually work against the schema
- Whether data transformations match real DB output
- Whether validation rejects malformed input
- Whether concurrent operations work correctly

### Zone C: Release Workflow (Split Confidence)

The grab workflow has partial test coverage (activity event emission, torrent add), but the search workflow has NO integration test because `indexer.search()` doesn't exist as a real method. Tests mock the entire search service, so:
- `media-search-service.test.js` mocks `indexer.search()` → passes
- At runtime, `indexer.search()` throws → catch block returns empty array
- Tests show "search works" while runtime shows "search returns nothing"

This is the highest-risk false-confidence zone in the entire codebase.

### Zone D: Subtitle Operations (Stub Provider)

Backend subtitle tests mock the provider. The actual provider in `main.ts` is a stub returning empty arrays. Tests verify the orchestration logic (variant tracking, history recording) but:
- `subtitle-inventory-api-service.test.js` passes with mocked provider
- At runtime, search always returns `[]`
- No test verifies the stub produces useful results

---

## 4. Coverage Blind Spots

### No Test Coverage At All

| Area | Gap |
|---|---|
| Server boot path (`main.ts`) | No test verifies definition loading, service wiring, or graceful fallbacks |
| Scheduler integration | Scheduler, RSS sync, and torrent sync loop exist as classes but no integration test runs them |
| MSW ↔ API contract alignment | No test verifies MSW handlers match real API responses |
| End-to-end workflows | No test traces add → search → grab → download → import |
| Frontend without mocks | No frontend test uses real API calls or MSW handlers |

### Tested Only With Mocks

| Area | Mock Layer | Risk |
|---|---|---|
| All frontend pages | API client mocked | High — contract drift undetectable |
| API handlers | Prisma mocked | Medium — query correctness unverified |
| Torrent manager | WebTorrent mocked | Medium — download behavior untested |
| Import manager | File system mocked | Medium — actual file ops untested |
| Library scanner | File system mocked | Medium — scan logic untested with real files |

### Edge Cases Never Tested

- Pagination boundaries (page 0, negative page, pageSize > total)
- Empty database (no series, no movies, no indexers)
- Malformed API responses
- Network timeouts
- Concurrent mutations
- Database migration failures
- Encrypted settings decryption with wrong key

---

## 5. Test Architecture Quality Assessment

### Strengths

1. **JavaScript backend tests are solid.** The indexer, parser, and model tests use real implementations with real fixture data. `definition-loader.test.js` and `indexer-factory.test.js` are exemplary.

2. **Schema validation tests provide baseline safety.** Prisma schema tests and domain model tests catch structural regressions.

3. **Frontend component tests are clean.** `primitives.test.tsx` and `app-shell.test.tsx` test actual rendering without mocks.

4. **API contract test structure exists.** The `api-contract-harness.test.ts` and `api-sdk-contract.test.ts` files establish the pattern for contract testing, even if the current tests are shallow.

### Weaknesses

1. **Frontend tests are interaction tests, not integration tests.** They verify "did we call the mock?" not "does the feature work?"

2. **No contract testing between frontend SDK and backend API.** The Zod schemas in the frontend and the response shapes in the backend are never compared.

3. **Snapshot test is singular and brittle.** `api-sdk-snapshots.test.ts` has ONE test covering all response types in a single snapshot.

4. **Track 9 validation tests validate artifacts, not code.** The 5 `track9-phase*.test.ts` files check that JSON files exist with correct structure — they don't test actual implementation behavior.

5. **Missing negative path testing.** Almost no tests verify error responses (404, 409, 422, 500 paths).

---

## 6. Mock Dependence by Domain

| Domain | Mock Ratio | Confidence Level |
|---|---|---|
| Indexer parsing (JS) | 0% | HIGH — real tests |
| Indexer factory (JS) | 0% | HIGH — real tests |
| Media models (JS) | 0% | HIGH — real tests |
| Schema validation (JS) | 0% | HIGH — real tests |
| Torrent management (JS) | 80% | LOW — webtorrent mocked |
| Import/organize (JS) | 90% | LOW — fs mocked |
| API handlers (TS) | 100% | LOW — prisma mocked |
| Frontend pages (TSX) | 95-100% | VERY LOW — all APIs mocked |
| Frontend components (TSX) | 0% | HIGH — real rendering |

---

## 7. Minimum Validation Gates (Recommendation)

To prevent false parity claims, the following gates should be enforced:

1. **No capability may be classified as `PARITY_IMPLEMENTED` unless it has at least one non-mocked integration test** that exercises the real code path from API handler through service to database (or external provider).

2. **Frontend surfaces cannot be classified as "fully functional" based on mock-only tests.** At minimum, one test per page should use MSW handlers (not vi.mock) to verify the full request/response cycle.

3. **Critical workflows (search, grab, import) require end-to-end test coverage** spanning multiple services before they can be considered "working."

4. **Error paths must have explicit test coverage** for each API endpoint: at least one 4xx and one 5xx scenario.

5. **The server boot path needs a smoke test** that verifies all services initialize correctly, definition loading works, and the health endpoint returns OK.

---

## 8. Comparison with Previous Evaluation

The previous evaluator identified similar patterns but was less specific about the JavaScript test strengths. Key differences:

| Area | Previous Eval | This Eval |
|---|---|---|
| JS backend tests | Mentioned but not analyzed deeply | Identified as the strongest layer — 74 files, many with real integration |
| Frontend mock ratio | Estimated 95% | Confirmed 100% (every page test mocks API client) |
| Release search gap | Identified as "unstable due to definition wiring" | Identified as fundamentally broken (`search()` method missing) |
| Test count | "117+ tests" | ~300+ across all suites (JS tests were undercounted) |
| API handler mocking | Noted "fully mocked Prisma" | Confirmed and detailed the specific blind spots |

The previous evaluation was generally accurate but somewhat conservative. This evaluation found an additional P0 issue (search method missing) that was masked by the catch block returning empty results.

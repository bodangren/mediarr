# Test Strategy: Variant Subtitle Subsystem Test Coverage

> Tech Lead guidance for phases S1–S6. Read **before** writing any test in this track.
> All 5 services are pure orchestrators over `SubtitleVariantRepository` — unit tests are the right tool. No DB, no real fs.

## 1. Testing Pyramid (per phase)

| Phase | Target | Test Type | Why |
|-------|--------|-----------|-----|
| S1 VariantBackfillService | `run()`, `backfillMovies`, `backfillEpisodes` | **Unit** (mock `PrismaClient` + repository) | Pure loop over Prisma reads + repo writes |
| S2 VariantInventoryIndexer | `syncMovieVariants`, `syncEpisodeVariants` | **Unit** (mock repository + `ProbeMetadataParser`) | Deterministic mapping; inject parser via ctor |
| S3 VariantMissingSubtitleService | `computeAndPersistForVariant` | **Unit** (mock repository; use **real** `SubtitleRequirementEngine`) | Engine has own tests; using it real catches contract drift |
| S4 VariantSubtitleFetchService | `fetchWantedSubtitle` | **Unit** (mock repository, `node:fs/promises`, `SubtitleNamingService`, optional `ActivityEventEmitter`, provider fake) | Side-effect heavy — mock fs to keep hermetic |
| S5 VariantWantedService | `syncWantedForVariant` | **Unit** (mock repository) | Trivial orchestrator |
| S6 Verification | All five suites + `CI=true npm test` + `npm run typecheck` | Suite-level | Coverage gate ≥80% per file |

No integration/e2e tier in this track — route-level integration already exists (per spec §Out of Scope).

## 2. Shared Fixtures & Mocks (put in `server/src/services/__fixtures__/variantSubtitle.ts`)

Create one fixture module so phases don't reinvent shapes:

- `makeRepoMock()` — returns a `vi.hoisted` factory exposing the **real method names**: `upsertVariant`, `replaceAudioTracks`, `replaceSubtitleTracks`, `upsertWantedSubtitle`, `updateWantedSubtitleState`, `createSubtitleHistory`, `createSubtitleTrack`, `getVariantInventory`, `getWantedSubtitleById`, `listMissingSubtitles`, `replaceMissingSubtitles`, `deleteMovieVariantsNotInPaths`, `deleteEpisodeVariantsNotInPaths`, `deleteWantedSubtitlesNotInTargets`, `listSiblingSubtitlePaths`. **Do not invent `findVariantByMovieId`, `findWantedSubtitles`, or `upsertSubtitleTrack`** — those don't exist (see §6).
- `makeVariant(overrides)` — `{ id, mediaType: 'MOVIE', movieId, episodeId: null, path, fileSize: 0n, monitored: true, releaseName: null, … }` with `createdAt`/`updatedAt` Dates.
- `makeInventory({ variant, audioTracks=[], subtitleTracks=[], missingSubtitles=[] })` — matches `getVariantInventory` return shape.
- `makeProfileItem({ id, language, forced='NEVER', hi='NEVER', audio_exclude='NEVER', audio_only_include='NEVER' })` — uses the **real** `LanguageProfileItem` enum-string fields, not `{ language: 'en' }`.
- `makeWantedSubtitle(overrides)` — full `WantedSubtitle` row incl. `state: 'PENDING'`.
- `makeCandidate(overrides)` — `SubtitleFetchCandidate` with `content: Buffer.from('WEBVTT')` default.

Use `vi.hoisted(() => makeRepoMock())` at the top of each test file; `vi.mock('../repositories/SubtitleVariantRepository', () => ({ SubtitleVariantRepository: vi.fn().mockImplementation(() => mockRepo) }))`.

## 3. Cross-Phase Edge Cases & Dependencies

- **bigint propagation**: `fileSize` is always `bigint`; assert exact values with `.toBe(BigInt(n))`, never `.toBe(n)`.
- **State machine (S4)**: must verify ordered repository calls — `SEARCHING` → either `FAILED` (no candidate / variant missing) or `DOWNLOADED` (success). Use `vi.fn().mock.invocationCallOrder` or assert `mockRepo.updateWantedSubtitleState.mock.calls`.
- **Filesystem (S4 only)**: `vi.mock('node:fs/promises', () => ({ default: { mkdir: vi.fn(), writeFile: vi.fn() } }))`. Verify path resolution via `path.dirname` is reached, and write errors propagate (no track persisted, wanted state untouched after error).
- **Empty `candidate.content`**: service falls back to `Buffer.alloc(0)`; assert `fileSize: 0n` is stored.
- **Optional `ActivityEventEmitter` (S4)**: cover both branches — present (assert `.emit` called with success/failure summary) and absent (no throw).
- **S3 cutoff semantics**: don't redefine cutoff logic — drive it via `SubtitleRequirementEngine` (real instance). Assert `repository.replaceMissingSubtitles` receives only `missingSubtitles` (not the full desired set).
- **S5 ordering**: `deleteWantedSubtitlesNotInTargets` MUST be called before each `upsertWantedSubtitle`; verify call order.
- **S1 dual model**: `prisma.movie.findMany` AND `prisma.episode.findMany` both invoked even when one is empty; existence check uses `prisma.mediaFileVariant.findFirst` (not repository).

## 4. Architecture Guardrails

- **Do not modify production source files** (spec is bug/test-coverage track, not refactor).
- **Mirror existing convention**: colocate `*.test.ts` next to source; use `vi.hoisted` per `tech-stack.md`; vitest `node` env (server workspace); reference `SubtitleAutomationService.test.ts` and `SubtitleInventoryApiService.test.ts` for style.
- **Mock at the boundary** — repository, parser, fs, provider, naming service. Never mock the `RequirementEngine` (S3) or `path` module.
- **Type-safe mocks**: declare `mockRepo` as `Pick<SubtitleVariantRepository, 'getVariantInventory' | …>` so TS catches signature drift.
- **No `as any`** in tests — if a fixture needs Prisma's `$Enums.VariantMediaType`, import the type and use string literals `'MOVIE'`/`'EPISODE'` which are assignable.
- **Hermetic**: zero filesystem writes, zero network, zero timers.

## 5. Per-Phase Test Approach Notes

- **S1**: Build a `prismaMock = { movie: { findMany: vi.fn() }, episode: { findMany: vi.fn() }, mediaFileVariant: { findFirst: vi.fn() } }` and pass directly to the constructor — no `vi.mock('@prisma/client')` needed. Skip-existing case: have `findFirst` return a truthy row.
- **S2**: Inject a real-stub `ProbeMetadataParser` whose `.parse()` returns `{ audioTracks: [], embeddedSubtitleTracks: [] }`. Verify `replaceAudioTracks`/`replaceSubtitleTracks` calls (NOT `upsertSubtitleTrack`). External + embedded subtitles are concatenated — assert merged array order.
- **S3**: Pass profile items in the real `LanguageProfileItem` shape. Use a variant with one English `subtitleTracks` entry; require `[en, fr]`; assert `replaceMissingSubtitles` called with **one** entry for `fr`. Add a "variant not found" case (`inventory.variant: null`) — assert throws `Variant ${id} not found`.
- **S4**: Provider is a `vi.fn<typeof SubtitleFetchProvider['searchBestSubtitle']>()`. Cover: success path; null candidate (assert `FAILED` state + no fs write + no track); missing wanted (`getWantedSubtitleById` returns null, throws); missing variant (state set to `FAILED` then throws); `fs.writeFile` rejects (assert state stays `SEARCHING`, error propagates). Naming method is **`buildSubtitlePath`**, not `generatePath`.
- **S5**: Drive via `listMissingSubtitles` (NOT `findWantedSubtitles`). Verify the delete-then-upsert sequence and the per-missing-item upsert count.
- **S6**: After all suites pass, capture per-file coverage via `vitest run --coverage server/src/services/Variant*.test.ts`; ensure no regression in unrelated suites.

## 6. build-graph Findings That Shaped This Strategy

- `build-graph stats` — 6,954 nodes / 10,251 edges; graph refreshed for the 6 target files (`build-graph update` ran clean).
- `build-graph inspect Variant{Backfill,Inventory,Missing,Fetch,Wanted}*Service` — each class has **zero outgoing edges** in the graph (TS classes with constructor-injected deps don't currently emit `imports`/`calls` edges). Translation: the graph cannot validate the plan's method names. Source-file reads are authoritative.
- `build-graph callers SubtitleVariantRepository` — no callers indexed, **so the plan was authored against an assumed API**. Reading the actual source revealed the plan references non-existent methods: `findVariantByMovieId`, `findVariantByEpisodeId`, `findWantedSubtitles`, `upsertSubtitleTrack` (real is `createSubtitleTrack`/`replaceSubtitleTracks`), and `provider.generatePath` (real is `buildSubtitlePath`). **Implementers must follow §2 mock surface, not the plan's snippets verbatim.** Recommend updating `plan.md` mock snippets as the first task of S1 (no behavior change, just naming).
- Source reads confirmed `VariantSubtitleFetchService` touches `node:fs/promises` and an optional `ActivityEventEmitter` — both must be mocked/asserted, neither is mentioned in the plan.
- Source reads confirmed `VariantBackfillService` still uses `PrismaClient` (tech-stack.md says Drizzle) — tests mock Prisma directly per current source; do NOT migrate the service in this track (out of scope).

# Plan: Variant Subtitle Subsystem Test Coverage

## How to write tests for these services

All 5 services follow the same pattern:
1. They depend on `SubtitleVariantRepository` — mock it with `vi.mock()`
2. Some have optional constructor dependencies with defaults — override them in tests
3. Tests live next to the source file: `server/src/services/VariantXxx.test.ts`
4. Use `vi.hoisted()` for mock factories (project convention from `tech-stack.md`)
5. Test file naming: `VariantBackfillService.test.ts`, etc.

### Mock pattern for SubtitleVariantRepository

```ts
// At top of test file:
const mockRepository = vi.hoisted(() => ({
  findVariantByMovieId: vi.fn(),
  findVariantByEpisodeId: vi.fn(),
  upsertVariant: vi.fn(),
  upsertSubtitleTrack: vi.fn(),
  findWantedSubtitles: vi.fn(),
  // Add more methods as needed per test file
}));
vi.mock('../repositories/SubtitleVariantRepository', () => ({
  SubtitleVariantRepository: vi.fn().mockImplementation(() => mockRepository),
}));
```

---

## Phase S1: VariantBackfillService tests

- [ ] Create `server/src/services/VariantBackfillService.test.ts`
- [ ] Write test: `run() creates variants for movies without existing variants`
  - Mock `prisma.movie.findMany` to return `[{ id: 1 }, { id: 2 }]`
  - Mock `repository.findVariantByMovieId` to return `null` for both
  - Mock `repository.upsertVariant` to succeed
  - Assert `result.movieVariantsCreated === 2`
- [ ] Write test: `run() skips movies that already have variants`
  - Mock `repository.findVariantByMovieId` to return an existing variant
  - Assert `result.movieVariantsCreated === 0`
- [ ] Write test: `run() creates variants for episodes without existing variants`
  - Mock `prisma.episode.findMany` to return `[{ id: 10 }]`
  - Mock `repository.findVariantByEpisodeId` to return `null`
  - Assert `result.episodeVariantsCreated === 1`
- [ ] Write test: `run() returns 0/0 when no movies or episodes exist`
  - Mock both findMany to return empty arrays
  - Assert `result.movieVariantsCreated === 0` and `result.episodeVariantsCreated === 0`
- [ ] Write test: `run() propagates repository errors`
  - Mock `repository.upsertVariant` to throw `new Error('DB connection lost')`
  - Assert `await expect(service.run()).rejects.toThrow('DB connection lost')`
- [ ] Run tests: `npx vitest run server/src/services/VariantBackfillService.test.ts`
- [ ] Commit: `test(variant): add VariantBackfillService unit tests`

## Phase S2: VariantInventoryIndexer tests

- [ ] Create `server/src/services/VariantInventoryIndexer.test.ts`
- [ ] Write test: `syncMovieVariants upserts variant with file metadata`
  - Mock `repository.upsertVariant` to return `{ id: 1 }`
  - Call `syncMovieVariants(42, [{ path: '/data/movie.mkv', fileSize: 1024n }])`
  - Assert `repository.upsertVariant` was called with `movieId: 42` and correct file data
- [ ] Write test: `syncMovieVariants upserts external subtitle tracks`
  - Provide file with `externalSubtitles: [{ languageCode: 'en', filePath: '/subs/en.srt', fileSize: 100n }]`
  - Assert `repository.upsertSubtitleTrack` was called once with correct data
- [ ] Write test: `syncMovieVariants calls ProbeMetadataParser when probeMetadata is provided`
  - Mock `ProbeMetadataParser.parse()` to return `{ codec: 'h264', resolution: '1080p' }`
  - Assert the parsed data is stored in the upserted variant
- [ ] Write test: `syncEpisodeVariants upserts variant with episodeId`
  - Call `syncEpisodeVariants(99, [{ path: '/data/ep.mkv', fileSize: 500n }])`
  - Assert `repository.upsertVariant` called with `episodeId: 99`
- [ ] Write test: `syncMovieVariants handles empty files array`
  - Call `syncMovieVariants(42, [])`
  - Assert `repository.upsertVariant` not called
- [ ] Write test: `syncMovieVariants handles file with no external subtitles`
  - Provide file with no `externalSubtitles` field
  - Assert `repository.upsertSubtitleTrack` not called
- [ ] Run tests: `npx vitest run server/src/services/VariantInventoryIndexer.test.ts`
- [ ] Commit: `test(variant): add VariantInventoryIndexer unit tests`

## Phase S3: VariantMissingSubtitleService tests

- [ ] Create `server/src/services/VariantMissingSubtitleService.test.ts`
- [ ] Write test: `computeAndPersistForVariant creates wanted for missing languages`
  - Mock `repository` to return variant with 1 English track
  - Provide profile requiring `[{ language: 'en' }, { language: 'fr' }]`
  - Assert `repository.upsertWantedSubtitle` called once for French
- [ ] Write test: `computeAndPersistForVariant does not create wanted for existing languages`
  - Variant already has English and French tracks
  - Profile requires English and French
  - Assert `repository.upsertWantedSubtitle` not called
- [ ] Write test: `computeAndPersistForVariant respects cutoff quality`
  - Variant has English track above cutoff
  - Assert no wanted subtitle created for English
- [ ] Write test: `computeAndPersistForVariant handles empty profile`
  - Provide empty `profileItems: []`
  - Assert no wanted subtitles created
- [ ] Write test: `computeAndPersistForVariant returns RequirementResult`
  - Assert return value has `missing` and `satisfied` arrays
- [ ] Run tests: `npx vitest run server/src/services/VariantMissingSubtitleService.test.ts`
- [ ] Commit: `test(variant): add VariantMissingSubtitleService unit tests`

## Phase S4: VariantSubtitleFetchService tests

- [ ] Create `server/src/services/VariantSubtitleFetchService.test.ts`
- [ ] Write test: `fetchWantedSubtitle calls provider with correct FetchProviderContext`
  - Mock repository to return wanted subtitle `{ id: 1, languageCode: 'en', isForced: false, isHi: false }`
  - Mock repository to return variant `{ id: 2, path: '/data/movie.mkv' }`
  - Mock repository to return audio tracks `[{ languageCode: 'en', isCommentary: false, isDefault: true }]`
  - Mock provider to return candidate `{ languageCode: 'en', isForced: false, isHi: false, provider: 'openSubtitles', score: 85, content: Buffer.from('...'), extension: '.srt' }`
  - Assert `provider.searchBestSubtitle` called with correct context
- [ ] Write test: `fetchWantedSubtitle returns FetchWantedResult on success`
  - Assert result has `provider`, `score`, and `storedPath`
- [ ] Write test: `fetchWantedSubtitle persists subtitle track via repository`
  - Assert `repository.upsertSubtitleTrack` called with correct track data
- [ ] Write test: `fetchWantedSubtitle returns null when provider returns null`
  - Mock provider to return `null`
  - Assert result is `null`
  - Assert `repository.upsertSubtitleTrack` not called
- [ ] Write test: `fetchWantedSubtitle throws when wanted subtitle not found`
  - Mock repository to return `null` for wanted subtitle
  - Assert `rejects.toThrow()`
- [ ] Write test: `fetchWantedSubtitle calls naming service for file naming`
  - Assert `SubtitleNamingService.generatePath()` called with correct parameters
- [ ] Run tests: `npx vitest run server/src/services/VariantSubtitleFetchService.test.ts`
- [ ] Commit: `test(variant): add VariantSubtitleFetchService unit tests`

## Phase S5: VariantWantedService tests

- [ ] Create `server/src/services/VariantWantedService.test.ts`
- [ ] Write test: `syncWantedForVariant returns wanted subtitles from repository`
  - Mock `repository.findWantedSubtitles` to return `[{ id: 1 }, { id: 2 }]`
  - Assert result length is 2
- [ ] Write test: `syncWantedForVariant returns empty array when none exist`
  - Mock to return `[]`
  - Assert result is `[]`
- [ ] Write test: `syncWantedForVariant propagates repository errors`
  - Mock to throw
  - Assert `rejects.toThrow()`
- [ ] Write test: `syncWantedForVariant passes variantId to repository`
  - Call `syncWantedForVariant(42)`
  - Assert `repository.findWantedSubtitles` called with `42`
- [ ] Run tests: `npx vitest run server/src/services/VariantWantedService.test.ts`
- [ ] Commit: `test(variant): add VariantWantedService unit tests`

## Phase S6: Verification & Handoff

- [ ] Run `CI=true npm test` — full suite GREEN
- [ ] Run `npm run typecheck` — zero errors
- [ ] Verify coverage: each new test file covers >80% of its source file
- [ ] Update `tech-debt.md` — mark "Variant subtitle subsystem untested" as Resolved
- [ ] Update `lessons-learned.md` with SubtitleVariantRepository mock pattern
- [ ] Final commit and push

# Plan: Server Service Test Coverage Gap Remediation

> **Scope (2026-06-07 restructure):** This track now covers only the four runtime-critical
> services — **Scheduler (S1), EpisodeService (S3), SeriesService (S4), MediaSearchService (S6)**.
> The lower-risk services (SettingsService, TvSearchService, the three Subtitle services, and
> FilterService) are marked **DEFERRED — post-v1.0** below; complete them in a follow-up track
> after `release_v1_cut_20260607`. Do not start deferred phases as part of this track.

## General pattern for service tests

Each service test file follows this structure:
```ts
// server/src/services/ServiceName.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies using vi.hoisted()
const mockDep = vi.hoisted(() => ({
  methodName: vi.fn(),
}));
vi.mock('../path/to/Dep', () => ({ Dep: vi.fn().mockImplementation(() => mockDep) }));

// Import service AFTER mocks
import { ServiceName } from './ServiceName';

describe('ServiceName', () => {
  let service: ServiceName;
  beforeEach(() => {
    vi.clearAllMocks();
    service = new ServiceName(/* mocked deps */);
  });
  // tests...
});
```

---

## Phase S1: Scheduler service tests

- [x] Read `server/src/services/Scheduler.ts` to understand constructor params and job registration
- [~] Create `server/src/services/Scheduler.test.ts`
- [~] Write test: per-helper `scheduleX(...)` produces a named job with the default cron string
  - (re-framed from spec's `start() registers 5 jobs` — actual API has no `start()`; one helper per job)
  - Cover all five helpers: `scheduleActivityCleanup`, `scheduleWantedSearch`,
    `scheduleSubtitleWantedSearch`, `scheduleLibraryScan`, `scheduleTargetedSubtitleSearch`
- [~] Write test: helpers accept custom cron + custom name overrides
  - Assert `node-cron.schedule` spy receives the overridden expression
- [~] Write test: `schedule()` rejects duplicate names and invalid cron expressions
  - Two distinct error paths, both throw synchronously
- [~] Write test: cron-wrapped callback captures `lastRunAt` and `lastDurationMs` after a successful run
- [~] Write test: cron-wrapped callback swallows + logs errors without crashing
  - Mock a callback that rejects; assert `console.error` was called and meta was still recorded
- [~] Write test: `stop(name)` stops the underlying task and removes the job
- [~] Write test: `stop(unknownName)` is a no-op (does not throw)
- [~] Write test: `stopAll()` stops every task and clears the registry
- [~] Write test: `isScheduled` and `listJobs` reflect current state
- [~] Run: `npx vitest run server/src/services/Scheduler.test.ts`
- [~] Commit: `test(scheduler): add Scheduler core unit tests`

## Phase S2: SettingsService tests *(DEFERRED — post-v1.0)*

- [ ] Read `server/src/services/SettingsService.ts` to understand its interface
- [ ] Create `server/src/services/SettingsService.test.ts`
- [ ] Write test: `getSettings returns settings from repository`
  - Mock `AppSettingsRepository.getSettings` to return a settings object
  - Assert returned value matches
- [ ] Write test: `updateSettings merges partial payload with existing`
  - Mock `getSettings` to return existing, call `updateSettings({ host: 'new-host' })`
  - Assert `repository.update` called with merged object
- [ ] Write test: `updateSettings with empty object does not modify existing`
  - Call `updateSettings({})`
  - Assert repository called with original settings
- [ ] Write test: `propagates repository errors`
  - Mock to throw
  - Assert `rejects.toThrow()`
- [ ] Run: `npx vitest run server/src/services/SettingsService.test.ts`
- [ ] Commit: `test(settings): add SettingsService unit tests`

## Phase S3: EpisodeService tests

- [ ] Read `server/src/services/EpisodeService.ts`
- [ ] Create `server/src/services/EpisodeService.test.ts`
- [ ] Write test: `getEpisodesBySeriesId returns episodes from repository`
- [ ] Write test: `updateEpisode delegates to repository`
- [ ] Write test: `toggleMonitoring flips monitored flag`
- [ ] Write test: `propagates repository errors`
- [ ] Run: `npx vitest run server/src/services/EpisodeService.test.ts`
- [ ] Commit: `test(episodes): add EpisodeService unit tests`

## Phase S4: SeriesService tests

- [ ] Read `server/src/services/SeriesService.ts`
- [ ] Create `server/src/services/SeriesService.test.ts`
- [ ] Write test: `getSeries returns all series`
- [ ] Write test: `getSeriesById returns series or null`
- [ ] Write test: `bulkUpdate updates each series`
- [ ] Write test: `toggleMonitoring flips monitored flag`
- [ ] Run: `npx vitest run server/src/services/SeriesService.test.ts`
- [ ] Commit: `test(series): add SeriesService unit tests`

## Phase S5: TvSearchService tests *(DEFERRED — post-v1.0)*

- [ ] Read `server/src/services/TvSearchService.ts`
- [ ] Create `server/src/services/TvSearchService.test.ts`
- [ ] Write test: `searchSeries delegates to metadata provider`
- [ ] Write test: `searchSeries sanitizes query input`
- [ ] Write test: `searchSeries returns empty array for empty query`
- [ ] Run: `npx vitest run server/src/services/TvSearchService.test.ts`
- [ ] Commit: `test(search): add TvSearchService unit tests`

## Phase S6: MediaSearchService base tests

- [ ] Create `server/src/services/MediaSearchService.base.test.ts` (distinct from existing corner-case files)
- [ ] Write test: `searchAllIndexers aggregates results from multiple indexers`
- [ ] Write test: `searchAllIndexers scores and sorts results`
- [ ] Write test: `grabRelease delegates to TorrentManager`
- [ ] Write test: `searchAllIndexers handles indexer timeout gracefully`
- [ ] Run: `npx vitest run server/src/services/MediaSearchService.base.test.ts`
- [ ] Commit: `test(search): add MediaSearchService base unit tests`

## Phase S7: SubtitleNamingService tests *(DEFERRED — post-v1.0)*

- [ ] Read `server/src/services/SubtitleNamingService.ts`
- [ ] Create `server/src/services/SubtitleNamingService.test.ts`
- [ ] Write test: `generatePath returns correct path for movie subtitle`
- [ ] Write test: `generatePath includes forced suffix when isForced is true`
- [ ] Write test: `generatePath includes HI suffix when isHi is true`
- [ ] Write test: `generatePath handles unknown extension gracefully`
- [ ] Run: `npx vitest run server/src/services/SubtitleNamingService.test.ts`
- [ ] Commit: `test(subtitles): add SubtitleNamingService unit tests`

## Phase S8: SubtitleRequirementEngine tests *(DEFERRED — post-v1.0)*

- [ ] Read `server/src/services/SubtitleRequirementEngine.ts`
- [ ] Create `server/src/services/SubtitleRequirementEngine.test.ts`
- [ ] Write test: `compute returns satisfied for languages with existing tracks`
- [ ] Write test: `compute returns missing for languages without tracks`
- [ ] Write test: `compute respects cutoff quality`
- [ ] Write test: `compute handles empty profile`
- [ ] Run: `npx vitest run server/src/services/SubtitleRequirementEngine.test.ts`
- [ ] Commit: `test(subtitles): add SubtitleRequirementEngine unit tests`

## Phase S9: SubtitleProviderFactory tests *(DEFERRED — post-v1.0)*

- [ ] Read `server/src/services/SubtitleProviderFactory.ts`
- [ ] Create `server/src/services/SubtitleProviderFactory.test.ts`
- [ ] Write test: `createProvider returns OpenSubtitlesProvider for 'openSubtitles'`
- [ ] Write test: `createProvider returns SubdlProvider for 'subdl'`
- [ ] Write test: `createProvider returns AssrtProvider for 'assrt'`
- [ ] Write test: `createProvider throws for unknown provider`
- [ ] Run: `npx vitest run server/src/services/SubtitleProviderFactory.test.ts`
- [ ] Commit: `test(subtitles): add SubtitleProviderFactory unit tests`

## Phase S10: FilterService tests *(DEFERRED — post-v1.0)*

- [ ] Read `server/src/services/FilterService.ts`
- [ ] Create `server/src/services/FilterService.test.ts`
- [ ] Write test: `createFilter delegates to repository`
- [ ] Write test: `getFilters returns all filters`
- [ ] Write test: `deleteFilter delegates to repository`
- [ ] Write test: `evaluate returns true when conditions match`
- [ ] Write test: `evaluate returns false when conditions don't match`
- [ ] Run: `npx vitest run server/src/services/FilterService.test.ts`
- [ ] Commit: `test(filters): add FilterService unit tests`

## Phase S11: Verification & Handoff *(in-scope services only)*

- [ ] Run `CI=true npm test` — full suite GREEN
- [ ] Run `npm run typecheck` — zero errors
- [ ] Verify the four in-scope test files (Scheduler, Episode, Series, MediaSearch) cover >80% of their source files
- [ ] Update `tech-debt.md` — narrow the "30 server services untested" item to the deferred remainder; note the 4 runtime-critical services are now covered
- [ ] Update `lessons-learned.md` with Scheduler mock pattern
- [ ] Final commit and push

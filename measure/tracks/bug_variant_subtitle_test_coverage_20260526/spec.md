# Spec: Variant Subtitle Subsystem Test Coverage

## Overview

The Variant subtitle subsystem consists of 5 services that manage subtitle inventory, requirements, fetching, and wanted-list computation for media file variants. These services are only exercised through route-level integration tests — they have zero dedicated unit tests. A refactoring bug in any of these services would not be caught until it reaches a route handler.

## Problem Statement

Knowledge graph analysis (2026-05-26) found these 5 server service files with no corresponding `.test.ts`:

| Service | File | Public Methods | Risk |
|---------|------|---------------|------|
| `VariantBackfillService` | `server/src/services/VariantBackfillService.ts` | `run()` | Backfill logic for movie/episode variants — silent data loss if broken |
| `VariantInventoryIndexer` | `server/src/services/VariantInventoryIndexer.ts` | `syncMovieVariants()`, `syncEpisodeVariants()` | Syncs file metadata to subtitle tracks — wrong data = wrong subtitles |
| `VariantMissingSubtitleService` | `server/src/services/VariantMissingSubtitleService.ts` | `computeAndPersistForVariant()` | Computes which subtitles are missing — broken = silent subtitle gaps |
| `VariantSubtitleFetchService` | `server/src/services/VariantSubtitleFetchService.ts` | `fetchWantedSubtitle()` | Fetches and stores subtitle files — broken = downloads fail silently |
| `VariantWantedService` | `server/src/services/VariantWantedService.ts` | `syncWantedForVariant()` | Syncs wanted subtitle list — broken = wanted list stale |

All 5 share a common dependency: `SubtitleVariantRepository`.

## Stories

### S1: VariantBackfillService tests
As a **developer**, I want `VariantBackfillService` to have unit tests so that backfill logic for movie and episode variants is verified without hitting the database.

**Acceptance Criteria:**
```gherkin
Given a mock SubtitleVariantRepository and mock PrismaClient
When run() is called and movies exist without variants
Then it calls backfillMovies and creates variant records for each movie
And the returned BackfillResult has movieVariantsCreated > 0

Given a mock SubtitleVariantRepository and mock PrismaClient
When run() is called and episodes exist without variants
Then it calls backfillEpisodes and creates variant records for each episode
And the returned BackfillResult has episodeVariantsCreated > 0

Given a mock SubtitleVariantRepository that throws on create
When run() is called
Then the error propagates and no partial results are returned
```

**Estimate:** M
**Priority:** Must

### S2: VariantInventoryIndexer tests
As a **developer**, I want `VariantInventoryIndexer` to have unit tests so that movie and episode variant syncing is verified.

**Acceptance Criteria:**
```gherkin
Given a mock SubtitleVariantRepository and a mock ProbeMetadataParser
When syncMovieVariants(movieId, files) is called with 2 files
Then it upserts 2 variant records with correct movieId and file metadata
And external subtitles in the files are upserted as subtitle tracks

Given a mock SubtitleVariantRepository
When syncEpisodeVariants(episodeId, files) is called with 1 file containing 3 external subtitles
Then it upserts 1 variant and 3 subtitle tracks

Given a file with probeMetadata
When syncMovieVariants is called
Then ProbeMetadataParser.parse() is called and the result is stored in the variant
```

**Estimate:** M
**Priority:** Must

### S3: VariantMissingSubtitleService tests
As a **developer**, I want `VariantMissingSubtitleService` to have unit tests so that missing subtitle computation is verified.

**Acceptance Criteria:**
```gherkin
Given a mock SubtitleVariantRepository returning a variant with 1 existing English track
And a profile requiring English and French
When computeAndPersistForVariant is called
Then it persists a wanted subtitle for French (missing)
And it does not persist a wanted subtitle for English (already exists)

Given a profile with a cutoff language (e.g., English is cutoff)
And the variant already has an English track above cutoff quality
When computeAndPersistForVariant is called
Then no wanted subtitle is created for English
```

**Estimate:** M
**Priority:** Must

### S4: VariantSubtitleFetchService tests
As a **developer**, I want `VariantSubtitleFetchService` to have unit tests so that subtitle fetching, naming, and storage are verified.

**Acceptance Criteria:**
```gherkin
Given a mock SubtitleVariantRepository returning a wanted subtitle and variant
And a mock SubtitleFetchProvider returning a candidate with score 85
When fetchWantedSubtitle(wantedId, provider) is called
Then the provider.searchBestSubtitle is called with correct FetchProviderContext
And the returned FetchWantedResult contains the provider name, score, and stored path
And the repository's upsertSubtitleTrack is called with the new track data

Given a mock SubtitleFetchProvider returning null (no subtitle found)
When fetchWantedSubtitle is called
Then it returns null
And no track is persisted

Given a mock SubtitleFetchProvider returning a candidate
And the file write (fs.writeFile) fails
When fetchWantedSubtitle is called
Then the error is thrown and no track is persisted
```

**Estimate:** M
**Priority:** Must

### S5: VariantWantedService tests
As a **developer**, I want `VariantWantedService` to have unit tests so that wanted subtitle syncing is verified.

**Acceptance Criteria:**
```gherkin
Given a mock SubtitleVariantRepository returning a variant with 2 wanted subtitles
When syncWantedForVariant(variantId) is called
Then it returns the 2 WantedSubtitle records from the repository

Given a mock SubtitleVariantRepository returning a variant with 0 wanted subtitles
When syncWantedForVariant is called
Then it returns an empty array

Given a mock SubtitleVariantRepository that throws for a nonexistent variant
When syncWantedForVariant(99999) is called
Then the error propagates
```

**Estimate:** S
**Priority:** Should

## Out of Scope
- Integration tests for the subtitle routes (those exist already)
- Testing SubtitleVariantRepository itself (it has its own tests)
- Testing SubtitleRequirementEngine or SubtitleNamingService (separate concerns)

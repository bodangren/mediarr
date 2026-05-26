# Plan: Shared Type Contracts (Server ↔ App)

## Phase S1: BulkUpdateResult shared contract [checkpoint: 93bdd6a]

- [x] Create directory `server/src/contracts/` if it doesn't exist
- [x] Create `server/src/contracts/bulk.ts` with a Zod schema for `BulkUpdateResult`:
  ```
  Fields to match current definitions in MovieRepository.ts:
  - matched: number
  - updated: number
  - skipped: number
  - errors: string[]
  ```
- [x] Export the inferred TypeScript type: `export type BulkUpdateResult = z.infer<typeof bulkUpdateResultSchema>`
- [x] In `server/src/repositories/MovieRepository.ts`:
  - Delete the local `BulkUpdateResult` interface
  - Add `import { BulkUpdateResult } from '../contracts/bulk'`
  - Verify all usages of `BulkUpdateResult` still compile
- [x] In `server/src/repositories/SeriesRepository.ts`:
  - Delete the local `BulkUpdateResult` interface
  - Add `import { BulkUpdateResult } from '../contracts/bulk'`
  - Verify all usages still compile
- [x] In `app/src/lib/api/movieApi.ts`:
  - Delete the local `BulkUpdateResult` interface
  - Add `import type { BulkUpdateResult } from '@server/contracts/bulk'`
  - NOTE: If path imports across workspaces don't work, create a re-export file at `app/src/lib/api/contracts/bulk.ts` that re-exports from the server path. Check `tsconfig.json` for path aliases first.
  - Verify all usages still compile
- [x] In `app/src/lib/api/seriesApi.ts`:
  - Same treatment: delete local, import shared
- [x] Write test: `server/src/contracts/bulk.test.ts` — validate that a sample object matches the Zod schema, and that a missing field throws
- [x] Run `CI=true npm test` — expect GREEN
- [x] Run `npm run typecheck` — zero errors
- [x] Commit: `refactor(contracts): extract BulkUpdateResult to shared Zod schema`

## Phase S2: SubtitleUploadInput shared contract [checkpoint: b0b7721]

- [x] Create `server/src/contracts/subtitle.ts` with a Zod schema for `SubtitleUploadInput`:
  ```
  Fields to match current definitions in SubtitleInventoryApiService.ts:
  - mediaType: 'movie' | 'series'
  - mediaId: number
  - language: string
  - filePath: string
  - content?: string (base64)
  ```
- [x] Export the inferred TypeScript type
- [x] In `server/src/services/SubtitleInventoryApiService.ts`:
  - Delete the local `SubtitleUploadInput` interface
  - Import from `../contracts/subtitle`
- [x] In `app/src/lib/api/subtitleApi.ts`:
  - Delete the local `SubtitleUploadInput` interface
  - Import shared type (direct path or re-export)
- [x] In `server/src/api/routes/subtitleRoutes.ts`:
  - Add Zod `.parse()` or `.safeParse()` validation on the upload request body using the shared schema
  - Return 422 with structured error if validation fails
- [x] Write test: `server/src/contracts/subtitle.test.ts` — valid/invalid cases
- [x] Run `CI=true npm test` — expect GREEN
- [x] Commit: `refactor(contracts): extract SubtitleUploadInput to shared Zod schema`

## Phase S3: ScoringBreakdown shared contract [checkpoint: b56439e]

- [x] Create `server/src/contracts/scoring.ts` with a Zod schema for `ScoringBreakdown`:
  ```
  Fields to match current definitions in MediaSearchService.ts:
  - customFormatScore: number
  - customFormatMatches: { name: string; score: number }[]
  - qualityScore: number
  - qualityName: string
  - indexerPriority: number
  - indexerName: string
  - seedersScore: number
  - seeders: number
  - ageScore: number
  - ageHours: number
  - titleConfidenceScore: number
  - titleConfidence: number
  - totalScore: number
  ```
- [x] Export the inferred TypeScript type
- [x] In `server/src/services/MediaSearchService.ts`:
  - Delete the local `ScoringBreakdown` interface
  - Import from `../contracts/scoring`
- [x] In `app/src/components/settings/ScoreBreakdownPanel.tsx`:
  - Delete the local `ScoringBreakdown` interface
  - Import shared type (direct path or re-export)
- [x] Write test: `server/src/contracts/scoring.test.ts` — valid/invalid cases
- [x] Run existing ScoreBreakdownPanel tests — expect GREEN
- [x] Commit: `refactor(contracts): extract ScoringBreakdown to shared Zod schema`

## Phase S4: OrganizeResult shared contract

- [ ] Create `server/src/contracts/organize.ts` with a Zod schema for `OrganizeResult`:
  ```
  Fields to match current definitions in MovieOrganizeService.ts:
  - moved: number
  - skipped: number
  - errors: string[]
  - destination: string
  ```
- [ ] Export the inferred TypeScript type
- [ ] In `server/src/services/MovieOrganizeService.ts`:
  - Delete the local `OrganizeResult` interface
  - Import from `../contracts/organize`
- [ ] In `server/src/services/SeriesOrganizeService.ts`:
  - Delete the local `OrganizeResult` interface
  - Import from `../contracts/organize`
- [ ] Run existing organize service tests — expect GREEN
- [ ] Commit: `refactor(contracts): extract OrganizeResult to shared Zod schema`

## Phase S5: Playback types shared contracts

- [ ] Create `server/src/contracts/playback.ts` with Zod schemas for:
  - `PlaybackTarget` — `{ mediaType: 'movie'|'series', mediaId: number, fileId?: number }`
  - `PlaybackManifestRequest` — `{ target: PlaybackTarget, quality?: string, audioTrack?: string, subtitleTrack?: string }`
  - `PlaybackProgressKey` — `{ mediaType: 'movie'|'series', mediaId: number }`
- [ ] Export inferred TypeScript types
- [ ] In `server/src/services/PlaybackService.ts`:
  - Delete local `PlaybackTarget` and `PlaybackManifestRequest` interfaces
  - Import from `../contracts/playback`
- [ ] In `server/src/repositories/PlaybackRepository.ts`:
  - Delete local `PlaybackProgressKey` interface
  - Import from `../contracts/playback`
- [ ] Run playback tests — expect GREEN
- [ ] Commit: `refactor(contracts): extract Playback types to shared Zod schemas`

## Phase S6: StorageLike deduplication

- [ ] Create `app/src/lib/state/types.ts` with the shared `StorageLike` interface:
  ```
  Fields (check all 4 copies for the superset):
  - getItem(key: string): string | null
  - setItem(key: string, value: string): void
  - removeItem(key: string): void
  ```
- [ ] In `app/src/lib/uiPreferences.ts`:
  - Delete local `StorageLike` definition
  - Import from `./state/types`
- [ ] In `app/src/lib/state/seriesOptionsStore.ts`:
  - Delete local `StorageLike` definition
  - Import from `./types`
- [ ] In `app/src/lib/state/uiStore.ts`:
  - Delete local `StorageLike` definition
  - Import from `./types`
- [ ] In `app/src/lib/state/wantedStore.ts`:
  - Delete local `StorageLike` definition
  - Import from `./types`
- [ ] Run `CI=true npm test` — expect GREEN
- [ ] Commit: `refactor(state): deduplicate StorageLike into shared types.ts`

## Phase S7: Verification & Handoff

- [ ] Run `CI=true npm test` — full suite GREEN
- [ ] Run `npm run typecheck` — zero errors
- [ ] Run `npm run build` — SPA build clean
- [ ] Run `npm run lint` — zero errors
- [ ] Verify no remaining duplicate interface names: `build-graph query graph.db "SELECT name, COUNT(*) FROM nodes WHERE type='interface' GROUP BY name HAVING COUNT(*)>2"`
- [ ] Update `tech-debt.md` — mark "BulkUpdateResult drift risk", "SubtitleUploadInput drift risk", "ScoringBreakdown drift risk" as Resolved
- [ ] Update `lessons-learned.md` with shared contracts pattern
- [ ] Final commit and push

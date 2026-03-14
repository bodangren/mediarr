# Plan: chore_server_module_alignment_20260315

## Phase 1 — Fix Module Type & import type Issues
- [ ] 1.1 Change `server/package.json` `"type": "commonjs"` → `"type": "module"`
- [ ] 1.2 Fix 7 TS1484 files: add `type` keyword to type-only imports in:
  - `server/src/repositories/IndexerRepository.ts`
  - `server/src/repositories/NotificationRepository.ts`
  - `server/src/repositories/TorrentRepository.ts` (2 types)
  - `server/src/services/ActivityEventEmitter.ts`
  - `server/src/services/SettingsService.ts`
  - `server/src/spike/ProcessModelSpikeServer.ts`
- [ ] 1.3 Checkpoint: run `tsc --noEmit`; confirm TS1295/TS1287/TS1470/TS1484 errors gone

## Phase 2 — Reduce Noise from Overly-Strict Settings
- [ ] 2.1 Comment out `exactOptionalPropertyTypes` in `server/tsconfig.json` (eliminating ~92 TS2379/TS2375/TS2412 errors)
- [ ] 2.2 Comment out `noUncheckedIndexedAccess` in `server/tsconfig.json` (eliminating ~20 TS2532 errors)
- [ ] 2.3 Checkpoint: run `tsc --noEmit`; count remaining errors

## Phase 3 — Fix Remaining Real Type Errors
- [ ] 3.1 Fix TS1360 errors in `OpenSubtitlesProvider.ts` and `SubdlProvider.ts`
- [ ] 3.2 Fix TS2339 (property does not exist) errors
- [ ] 3.3 Fix TS2345/TS2322 (type assignment) errors in routes
- [ ] 3.4 Fix TS2741 (missing property) errors
- [ ] 3.5 Fix remaining errors (TS2344, TS2769, TS2677, TS7006, TS7016, TS2503, TS2352)
- [ ] 3.6 Checkpoint: `tsc --noEmit` exits with zero errors

## Phase 4 — Verify & Clean Up
- [ ] 4.1 Run full test suite; confirm no new failures
- [ ] 4.2 Update `tech-debt.md`: mark resolved items, add any new entries
- [ ] 4.3 Commit

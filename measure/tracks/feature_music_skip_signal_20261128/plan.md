# Track music skips as an anti-indicator — Plan

Spec: `spec.md`.

## Phase 1 — Server signal: schema, semantics, endpoint [checkpoint: d6bf826]

- [x] Task: Write the failing tests — `applyMusicSkip` (completion at 90 % is not a skip; early skip
      before 50 %/30 s; late skip counts but is not early), the skip route (records and returns the
      counts, 404 unknown track, 422 invalid position/duration), and the listening profile
      (`skippedTracks`, `skippedArtists`, `dataQuality.skipsObserved`). Red confirmed: module missing,
      route missing, profile fields missing (5 tests failing). — d6bf826
- [x] Task: Implement migration `0021_music_skip_signal` (+ journal + schema columns),
      `applyMusicSkip`, `POST /api/music/tracks/:id/skip`, and the listening-profile extension. — d6bf826
- [x] Task: Measure — User Manual Verification 'Phase 1': run the touched server suites and tsc.
      Evidence: 5 music suites 24/24 (`musicSkip`, profile, skip route, delete, listening-profile
      route); `npx tsc -p server/tsconfig.json --noEmit` clean. — d6bf826

## Phase 2 — Clients report skips [checkpoint: d6bf826]

- [x] Task: Write the failing client tests — TV `MusicPlaybackService` reports a skip before
      `next()`/`jumpTo()`/queue replacement (and not on completion or repeat-one), and the SPA
      preview reports a skip when switched away early but not past the completion threshold. — d6bf826
- [x] Task: Implement `reportMusicSkip` in the Flutter and SPA API clients and wire the skip points
      (`next()`, `jumpTo()`/`_playIndex`, `playQueue`, SPA `leavePreview`). — d6bf826
- [x] Task: Measure — User Manual Verification 'Phase 2': `flutter test --no-pub` music suite 24/24
      (4 new skip tests), `flutter analyze --no-pub` clean; SPA `MusicLibraryPage` tests 13/13
      (1 new skip test) and `npx tsc` clean. — d6bf826

## Phase 3 — Make the weekly run use the anti-indicator

- [x] Task: Update `automation/skills/music-operator/SKILL.md` and the weekly ingest prompt with the
      skip rules and read-only SQL examples; keep the run's dedupe/one-attempt contract unchanged.
      The live skill catalog is a symlink to the repo, so the deployed copy changed with the commit. — d6bf826
- [x] Task: Measure — User Manual Verification 'Phase 3': re-read the deployed skill symlink target
      (`~/.claude/skills/music-operator -> automation/skills/music-operator`) and the scheduled task
      prompt source; both now carry the anti-indicator SQL and rules. — d6bf826

## Phase 4 — Ship, verify live, close

- [~] Task: Gate: reload the engine (migration applies), build/publish/install APK **156**, verify
      the new columns exist, and capture the first real device skip (`MusicTrack.skipCount`
      increments, profile lists it). Progress: APK **1.3.98 / 156** built, published and installed
      (versionCode=156, HOME re-asserted); the migration was applied out-of-band with the DB backup
      `agent_backup_20261128T142457Z.db` (`DATABASE_URL=file:/config/mediarr.db npx tsx
      scripts/run-migrations.ts` → `Applied migration 0021_music_skip_signal`; `PRAGMA table_info`
      shows skipCount/earlySkipCount/lastSkippedAt). **Engine reload deferred on purpose** — the
      owner started an episode (mediaId 300) while the migration ran, so reloading now would cut
      playback; until the reload the running process still lacks the skip route (the installed TV
      skips would 404 silently) and must be reloaded at the next idle slot.
- [ ] Task: Record the feature in `device-20261107/friction-ledger.jsonl`/`measure/lessons-learned.md`
      where useful, update `measure/tracks.md`, and archive the track.

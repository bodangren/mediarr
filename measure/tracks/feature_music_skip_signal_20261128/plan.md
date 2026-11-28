# Track music skips as an anti-indicator — Plan

Spec: `spec.md`.

## Phase 1 — Server signal: schema, semantics, endpoint [checkpoint: TBD]

- [ ] Task: Write the failing tests — `applyMusicSkip` (completion at 90 % is not a skip; early skip
      before 50 %/30 s; late skip counts but is not early), the skip route (records and returns the
      counts, 404 unknown track, 422 invalid position/duration), and the listening profile
      (`skippedTracks`, `skippedArtists`, `dataQuality.skipsObserved`).
- [ ] Task: Implement migration `0021_music_skip_signal` (+ journal + schema columns),
      `applyMusicSkip`, `POST /api/music/tracks/:id/skip`, and the listening-profile extension.
- [ ] Task: Measure — User Manual Verification 'Phase 1': run the touched server suites and tsc.

## Phase 2 — Clients report skips [checkpoint: TBD]

- [ ] Task: Write the failing client tests — TV `MusicPlaybackService` reports a skip before
      `next()`/`_playIndex()`/queue replacement (and not on completion), and the SPA preview reports
      a skip when switched away early; API-client method exists on both.
- [ ] Task: Implement `reportMusicSkip` in the Flutter and SPA API clients and wire the skip points.
- [ ] Task: Measure — User Manual Verification 'Phase 2': `flutter test --no-pub`,
      `flutter analyze --no-pub`, SPA tests + build.

## Phase 3 — Make the weekly run use the anti-indicator

- [ ] Task: Update `automation/skills/music-operator/SKILL.md` and the weekly ingest prompt with the
      skip rules and read-only SQL examples; keep the run's dedupe/one-attempt contract unchanged.
- [ ] Task: Measure — User Manual Verification 'Phase 3': re-read the deployed skill symlink and the
      scheduled task prompt to confirm the live copy changed.

## Phase 4 — Ship, verify live, close

- [ ] Task: Gate: reload the engine (migration applies), build/publish/install APK **156**, play a
      track on the TV and press next early, then verify `MusicTrack.skipCount` incremented and the
      profile lists it.
- [ ] Task: Record the feature in `device-20261107/friction-ledger.jsonl`/`measure/lessons-learned.md`
      where useful, update `measure/tracks.md`, and archive the track.

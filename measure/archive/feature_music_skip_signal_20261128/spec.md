# Spec — Track music skips as an anti-indicator of what the owner wants

## Owner request (2026-11-28)

> *"You should track which music I skip as an anti-indicator of what I want."*

The weekly music discovery run already reads what the owner **plays** (`MusicTrack.playCount`,
`lastPlayedAt`, the `/api/music/listening-profile` aggregate). Nothing records what the owner
**rejects**: pressing skip-next, or starting another track/queue before the current one finishes.
Today a skipped track is indistinguishable from a track that was simply never played, so the
recommender can keep proposing artists the owner keeps rejecting.

## Measured (current code)

- `POST /api/music/tracks/:id/progress` ([musicRoutes.ts](server/src/api/routes/musicRoutes.ts))
  calls `applyMusicProgress` ([musicProgress.ts](server/src/services/musicProgress.ts)), which
  increments `playCount` once when the position crosses **90 %** of the duration.
- `MusicTrack` has `playCount` / `lastPlayedAt` / `isPlayed` / `position` — no rejection signal.
- TV client: `MusicPlaybackService.next()` (skip-next button and the up-next list) and
  `_playIndex()` (choosing another item) both replace the current track with no event sent.
- SPA: `MusicLibraryPage` plays a track through a native `<audio controls>` preview; switching to
  another track simply unmounts it.
- The weekly run reads `listening-profile` (via the music-operator skill reading the DB read-only).

## Requirement

Record an explicit **skip** whenever the owner leaves a track before it completes, store it per
track (count + last time + whether it was an *early* skip), expose it through the listening
profile, and make the weekly music run treat skips as negative evidence: never propose a track the
owner skipped, and down-rank/avoid artists whose tracks he skips repeatedly without ever finishing
them.

## Design

- **Schema (migration `0021_music_skip_signal`):** `MusicTrack.skipCount` (int, default 0),
  `MusicTrack.earlySkipCount` (int, default 0), `MusicTrack.lastSkippedAt` (timestamp, null).
- **Semantics** (`applyMusicSkip`, pure, next to `applyMusicProgress`):
  - a *skip* is leaving a track before the 90 % completion threshold that already defines a
    counted play — the two are complements, so a play and a skip can never both be true for one
    listen;
  - an *early skip* is one that happened before 50 % of the duration (or before 30 s when the
    duration is not yet known) — the strong anti-indicator;
  - `skipCount` / `earlySkipCount` increment, `lastSkippedAt` is stamped.
- **Endpoint:** `POST /api/music/tracks/:id/skip` with `{position, duration}`; returns
  `{recorded, early, skipCount, earlySkipCount}` so a client can see the signal landed.
- **Listening profile:** add `skippedTracks` (per track: id, title, artist, skipCount,
  earlySkipCount, lastSkippedAt), `skippedArtists` (name, skips, earlySkips, tracks) and
  `dataQuality.skipsObserved`, so both the SPA summary and the agent get the anti-signal.
- **TV client:** report a skip before `next()`, before `_playIndex()` switches away from a playing
  track, and when a new queue replaces the current one — using the position/duration the service
  already tracks; a completion (`the player's completed stream`) reports progress, not a skip.
- **SPA:** the `<audio>` preview records a skip when it is closed/switched away before 90 %.
- **Weekly operator:** `automation/skills/music-operator/SKILL.md` and the weekly prompt learn the
  anti-indicator rules (never propose a skipped track; avoid artists with repeated skips and no
  completed plays; prefer finished plays), with read-only SQL examples.

## Acceptance

- Red tests before green: `applyMusicSkip` table (completion is not a skip; early vs late), the
  route (records, validates, 404/422), the listening profile (skipped artists/tracks + quality
  counters), the TV service (skip reported with the right position, not after completion) and the
  SPA preview.
- `npx vitest run` on the touched server plus SPA suites green; `npx tsc -p server/tsconfig.json
  --noEmit` and `npm run build --prefix app` clean; `flutter test --no-pub` / `flutter analyze
  --no-pub` clean for the client.
- Live: migration applied on engine reload; the TV app reports a skip for a track left early
  (`MusicTrack.skipCount` increments), and the listening profile lists the artist/track under
  `skippedArtists`/`skippedTracks`. Shipped as the next APK (156).

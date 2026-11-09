# Music listening is recorded server-side (TV 1.3.61 / code 85, 2026-11-09)

Weekly music picks need a listening basis; before this the client kept only a local resume snapshot and the
server had zero play records (`max(lastPlayedAt) = null`).

## Change
- Server: `POST /api/music/tracks/:id/progress` validates `position`/`duration`, clamps them, and
  `applyMusicProgress` stores position + `lastPlayedAt`, incrementing `playCount` only when a play crosses
  90 % (so 15-second heartbeats cannot inflate it). 4 unit tests.
- TV client: the music player reports a heartbeat with its 15-second resume save and on completion; failures
  never disturb playback.

## Live verification
```
played Back in Black on the TV (1.3.61) for ~20 s
DB: id 218 · title Back in Black · position 14 · lastPlayedAt 1794226449  (was null/0 before)
```
This is also the data source for "recently listened" in the weekly pick recommendation.

# Weekly music picks — recommendation + YouTube blocker (2026-11-09)

Owner instruction: “Weekly music picks: you are supposed to recommend based on recent listening.” The agent
must judge picks; no curated list will be supplied.

## Listening basis (now recorded server-side)
- Added `POST /api/music/tracks/:id/progress` and a TV heartbeat every 15 s; playing *Back in Black* on the
  TV (1.3.61) recorded `lastPlayedAt` on the track (verified in DB).
- Recent artist: **AC/DC**. Library already holds only two AC/DC tracks (Back in Black, Through The Mists Of
  Time).

## Picks (would queue if YouTube worked)
1. **AC/DC — Thunderstruck** (`v2AC41dglnM`, 4:53; metadata confirmed via yt-dlp android client)
2. **AC/DC — Highway to Hell** (`l482T0yNkeo`)
3. **AC/DC — You Shook Me All Night Long** (`Lo2qQmj0_h4`)

## Blocker (owner action)
yt-dlp is now bot-checked for **downloads** even with `--cookies-from-browser chrome` and
`--extractor-args youtube:player_client=android`:
```
ERROR: [youtube] v2AC41dglnM: Sign in to confirm you're not a bot.
```
`POST /api/music/ingest` for pick 1 recorded a FAILED receipt with the same error. The Chrome cookie jar is
partly undecryptable (earlier: “Extracted 10 cookies… 229 could not be decrypted”), so YouTube sees an
unauthenticated client.
**Owner action:** open Chrome, sign in to YouTube, refresh the session (and allow cookie decryption if
prompted) — or provide an exported `cookies.txt` for yt-dlp. Then the picks can be ingested with the already
built pipeline.

---
name: music-operator
description: Run Mediarr's weekly music discovery and ingest directly — read listening history read-only, pick 1–3 official tracks the owner will like from YouTube (browser bridge), download with yt-dlp and file with beets into /data/Music. Use for the weekly music run or when the owner asks for new music. Never calls the REST API.
---

# music-operator — listening-driven music picks, downloaded and filed

Discovery signal = the owner's real listening. Placement = `beets`. No REST API, no playlist
downloads, no invented URLs.

## 1. Preconditions

- `mcp__webbridge__navigate` / `evaluate` registered and a probe evaluate returns `1+1===2`;
  missing → report `BRIDGE_TOOLS_ABSENT`, stop.
- `~/.local/bin/yt-dlp --version` and `~/.local/share/mediarr-automation/venv/bin/beet version`
  respond; beets config is `~/.config/beets/config.yaml`.

## 2. Read listening history (read-only)

```bash
sqlite3 -readonly /config/mediarr.db \
 "select t.title, a.name, t.playCount, t.lastPlayedAt
    from MusicTrack t join MusicArtist a on a.id = t.artistId
   order by t.playCount desc, t.lastPlayedAt desc limit 25;"

sqlite3 -readonly /config/mediarr.db \
 "select videoId, status from MusicIngestLog order by id desc limit 20;"
```

As of 2026-11-14 the Mediarr signal is thin (1 track with plays / 3 artists), so **YouTube history and
liked music through the bridge are the primary signal**. Say so in the receipt; do not invent taste.

## 3. Discover (bounded, read-only browsing)

1. `navigate https://www.youtube.com/feed/history` — snapshot the rows, capture title, channel and
   `watch?v=<id>` links (~50 rows / ~30 days).
2. `navigate https://music.youtube.com/library` → Liked Music (`playlist?list=LM`) — title, artist,
   duration, video id.
3. For the top artists from the SQL, open the artist page / `music.youtube.com/search` and read
   official song rows. Related artists are valid seeds; mixes/radios are not.

Stop at ~10 candidates. Never sign in/out, like, subscribe or edit playlists.

## 4. Select (max 3; zero is honest)

Rank: same artist as top `MusicTrack` artists → artist repeated in history/likes → related artist.
Official uploads only (`- Topic`, artist channel, VEVO, label); duration ≥ 60 s; reject covers,
fan re-uploads, lyric channels, sped-up/nightcore/8D edits and anything ≥ ~15 min (mixes). Dedupe
against `MusicTrack` `"artist — title"` (lowercase; strip `(Official Video)`, `[HD]`, `feat. …`,
`- Remastered`) and against `MusicIngestLog.videoId`. Single videos only — strip `list=` parameters.

## 5. Download and file (direct)

```bash
~/.local/bin/yt-dlp --cookies-from-browser chrome --no-playlist -x --audio-format m4a \
  -f bestaudio/best --write-thumbnail --write-info-json \
  -o '/data/Music/_incoming/music-%(id)s.%(ext)s' 'https://www.youtube.com/watch?v=<id>'

~/.local/share/mediarr-automation/venv/bin/beet -c ~/.config/beets/config.yaml \
  import -s -q '/data/Music/_incoming/music-<id>.m4a'
```

- `FILED` = file under `/data/Music/...` (album folder, or `Non-Album/<Artist>/` for an unmatched
  YouTube single) and beets printed no error. **Singleton mode (`-s`) is mandatory** for singles;
  without it beets treats the file as a one-track album. The config must carry
  `import.quiet_fallback: asis` — verified 2026-11-14: without it every unmatched single is silently
  "Skipping." and the run files nothing (that was the eight-day music failure).
- `REVIEW` = file left in `/data/Music/_review/` — record the beets reason verbatim.
- **Always pass `--cookies-from-browser chrome`** (verified working 2026-11-14: the owner's
  signed-in Chrome profile gets past the bot check). If it fails with "Sign in to confirm you're not
  a bot", record `FAILED` with the exact yt-dlp line and report `YOUTUBE_COOKIES_STALE` (the owner
  must be signed in in Chrome). Never fake success.
- One attempt per pick; no retries inside the run.

## 6. Receipts (required)

- Per attempt: append to `/config/music-ingest-receipts.jsonl`
  `{"at","videoId","status":"FILED|REVIEW|FAILED|SKIPPED","reason","path"}`.
- Run output: overwrite `/config/music-picks.json` with `{generatedAt, picks:[...], ingested:[...]}`
  (output only — never read as input).
- Report: pick table (artist / title / source page / score reason / result), verbatim failures, and
  the history summary (`playsObserved`, `insufficientHistory`).

## Hard rules

- Never invent a URL: every `watch?v=` must have been read from a page in this run.
- Never download a playlist, mix, radio or channel.
- Never write the database; beets owns placement in `/data/Music`.

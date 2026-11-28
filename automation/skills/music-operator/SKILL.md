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

**Anti-indicator — what the owner skips** (owner request 2026-11-28: *"track which music I skip as an
anti-indicator of what I want"*). Leaving a track before 90 % of it played is recorded as a skip;
a skip before the halfway point (or before 30 s) is an *early* skip and the strongest negative signal:

```bash
sqlite3 -readonly /config/mediarr.db \
 "select t.title, a.name, t.playCount, t.skipCount, t.earlySkipCount, t.lastSkippedAt
    from MusicTrack t join MusicArtist a on a.id = t.artistId
   where t.skipCount > 0
   order by t.earlySkipCount desc, t.skipCount desc, t.lastSkippedAt desc limit 25;"

sqlite3 -readonly /config/mediarr.db \
 "select a.name, sum(t.playCount) plays, count(*) tracks,
         sum(t.skipCount) skips, sum(t.earlySkipCount) earlySkips
    from MusicTrack t join MusicArtist a on a.id = t.artistId
   group by a.name
   having sum(t.skipCount) > 0
   order by earlySkips desc, skips desc limit 25;"
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
Anti-indicators outrank every positive signal: **never propose a track whose `artist — title` appears
in the skipped list**, and **avoid an artist whose skipped rows show `earlySkips >= 2` with
`plays = 0`** — that is the owner rejecting it, not a cold start. An artist with completed plays
(`playCount > 0`) and only late skips is still usable. If the positive signal and the anti-signal
disagree, say so in the receipt and prefer a different artist.
Official uploads only (`- Topic`, artist channel, VEVO, label); duration ≥ 60 s; reject covers,
fan re-uploads, lyric channels, sped-up/nightcore/8D edits and anything ≥ ~15 min (mixes). Dedupe
against `MusicTrack` `"artist — title"` (lowercase; strip `(Official Video)`, `[HD]`, `feat. …`,
`- Remastered`) and against `MusicIngestLog.videoId`. Single videos only — strip `list=` parameters.

## 5. Download and file (direct)

```bash
~/.local/bin/yt-dlp --cookies-from-browser chrome+gnomekeyring --js-runtimes node \
  --no-playlist -x --audio-format m4a \
  -f bestaudio/best --write-thumbnail --write-info-json \
  -o '/data/Music/_incoming/music-%(id)s.%(ext)s' 'https://www.youtube.com/watch?v=<id>'

# ALWAYS tag the m4a from its info.json first, then import (see below)
TITLE=...; ARTIST=...   # read from music-<id>.info.json: title / uploader
ffmpeg -v error -y -i '/data/Music/_incoming/music-<id>.m4a' -c copy \
  -metadata title="$TITLE" -metadata artist="$ARTIST" /tmp/music-<id>.m4a \
  && mv /tmp/music-<id>.m4a '/data/Music/_incoming/music-<id>.m4a'

~/.local/share/mediarr-automation/venv/bin/beet -c ~/.config/beets/config.yaml \
  import -s -q '/data/Music/_incoming/music-<id>.m4a'
```

- `FILED` = file under `/data/Music/...` (album folder, or `Non-Album/<Artist>/` for an unmatched
  YouTube single) and beets printed no error. **Singleton mode (`-s`) is mandatory** for singles;
  without it beets treats the file as a one-track album. The config must carry
  `import.quiet_fallback: asis` — verified 2026-11-14: without it every unmatched single is silently
  "Skipping." and the run files nothing (that was the eight-day music failure).
- **Tag before beets — verified 2026-11-15:** `yt-dlp` m4a output carries **no** title/artist tags
  (no `--embed-metadata`), and `quiet_fallback: asis` then imports the untagged file. With empty
  `$artist`/`$title` the singleton path renders as `Non-Album.m4a` **at the library root**, and the
  remaining untagged downloads are left in `_incoming` with no error under `-q`. That is how the
  2026-11-15 run initially "filed" a root-level `Non-Album.m4a`. Always write `title`/`artist` from
  the downloaded `info.json` (`title` minus the trailing `(Official Video)` / `(Official Audio)` /
  `– Artist` decorations; `artist` = `uploader`/`channel`) before `beet import`, then verify the
  resulting `Non-Album/<Artist>/` path with `ffprobe`.
- Verify every filed file with `ffprobe` (duration + `title`/`artist` tags) before recording
  `FILED`; a file at the library root, or one still in `_incoming` after beets, is **not** filed.
- `REVIEW` = file left in `/data/Music/_review/` — record the beets reason verbatim.
- **Always pass `--cookies-from-browser chrome+gnomekeyring --js-runtimes node`** (verified working
  2026-11-21: the owner's signed-in Chrome profile gets past the bot check). On this Lubuntu/LXQt
  host plain `chrome` auto-detects the keyring backend as BASIC_TEXT, so every v11 cookie fails
  ("cannot decrypt v11 cookies: no key found", 1 cookie extracted, then "Sign in to confirm you're
  not a bot"); `+gnomekeyring` reads the `Chrome Safe Storage` key from the unlocked Login keyring.
  yt-dlp ≥2026.10 also needs a JS runtime for YouTube signature solving — without `--js-runtimes
  node` it logs "Only images are available for download" and no audio format is offered. If it still
  fails with "Sign in to confirm you're not a bot", record `FAILED` with the exact yt-dlp line and
  report `YOUTUBE_COOKIES_STALE` (the owner must be signed in in Chrome). Never fake success.
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

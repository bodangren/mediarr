# Weekly music operator — discovery from recent listening, filed by the operator

> Owner decision 2026-11-11: *"You are supposed to look at what I listen to and get things I'd
> probably like."* Cadence: weekly, Sunday 01:00. Playbook:
> `automation/skills/music-operator/SKILL.md` (paths, beets config, dedupe rules).
> The Mediarr REST API is a client contract: **no `/api/` calls in this run.** You download with
> `yt-dlp`, file with `beets`, and record receipts as files.

## Preconditions

1. **Bridge.** `mcp__webbridge__navigate` / `evaluate` registered; probe `1+1===2`. Missing →
   alert `MUSIC_BRIDGE_ABSENT` and stop; no curl/scraping fallback.
2. **Listening history (read-only):**

   ```bash
   sqlite3 -readonly /config/mediarr.db \
     "select t.title, a.name, t.playCount, t.lastPlayedAt
        from MusicTrack t join MusicArtist a on a.id = t.artistId
       order by t.playCount desc, t.lastPlayedAt desc limit 25;"
   ```

   **Anti-indicator (owner request 2026-11-28):** skips are negative evidence, not "never played".

   ```bash
   sqlite3 -readonly /config/mediarr.db \
     "select t.title, a.name, t.skipCount, t.earlySkipCount, t.lastSkippedAt
        from MusicTrack t join MusicArtist a on a.id = t.artistId
       where t.skipCount > 0
       order by t.earlySkipCount desc, t.skipCount desc limit 25;"
   ```

   The Mediarr signal is currently thin (1 track with plays). Say so; the browser history and
   liked music are then the primary signal, not a replacement for inventing picks.
3. **Receipts watermark:** last line of `/config/music-ingest-receipts.jsonl`, plus
   `sqlite3 -readonly /config/mediarr.db "select videoId, status from MusicIngestLog order by id desc limit 20;"`.
4. **Tools:** `~/.local/bin/yt-dlp --version` and
   `~/.local/share/mediarr-automation/venv/bin/beet version` respond;
   beets config is `~/.config/beets/config.yaml` (verify it exists).

## Discover (bounded, read-only browsing)

1. `navigate https://www.youtube.com/feed/history` — snapshot the list, capture title, channel and
   `watch?v=<id>` links; ~50 rows or ~30 days.
2. `navigate https://music.youtube.com/library` → Liked Music (`playlist?list=LM`) — title, artist,
   duration, video id.
3. For the top artists from the SQL above, open the artist page / `music.youtube.com/search` and read
   official song rows. Related artists are valid seeds; mixes/radios are not.
4. Charts only as a similarity signal for artists already present in history/library.

Stop at ~10 candidates. Never sign in/out, like, subscribe or edit playlists.

## Select (max 3; zero is valid)

Rank: same artist as top `MusicTrack` artists → artist repeated in history/likes → related artist.
**Anti-indicators outrank every positive signal:** never pick a track whose `artist — title` was
skipped, and avoid artists whose skipped rows show `earlySkips >= 2` with `plays = 0`. If the
positive signal and the anti-signal disagree, pick a different artist and say why in the receipt.
Keep only official uploads (`- Topic`, artist channel, VEVO, label). Reject fan re-uploads, lyric
channels, covers, sped-up/nightcore/8D edits, mixes and anything ≥ ~15 min. Duration ≥ 60 s. Dedupe
against every `MusicTrack` `"artist — title"` (normalised: lowercase, strip `(Official Video)`,
`[HD]`, `feat. …`, `- Remastered`) and against `MusicIngestLog.videoId`. Single videos only — strip
`list=` and never download a playlist or channel.

## Ingest (direct, no retries)

For each pick, in score order:

```bash
~/.local/bin/yt-dlp --cookies-from-browser chrome+gnomekeyring --js-runtimes node \
  --no-playlist -x --audio-format m4a \
  -f bestaudio/best --write-thumbnail --write-info-json \
  -o '/data/Music/_incoming/music-%(id)s.%(ext)s' 'https://www.youtube.com/watch?v=<id>'
~/.local/share/mediarr-automation/venv/bin/beet -c ~/.config/beets/config.yaml import -s -q /data/Music/_incoming/music-<id>.m4a
```

- Success = the file exists in `/data/Music/...` and beets printed no error; a file left in
  `/data/Music/_review` is `REVIEW` (report the beets reason), not success.
- **Singleton mode (`-s`) plus `import.quiet_fallback: asis` in the beets config are required** —
  verified 2026-11-14: without them beets answers "Skipping." for every unmatched YouTube single and
  the run files nothing (the eight-day music failure).
- **Always pass `--cookies-from-browser chrome+gnomekeyring --js-runtimes node`** (verified
  2026-11-21: it gets past YouTube's bot check with the owner's signed-in Chrome). Plain `chrome`
  auto-detects BASIC_TEXT on this LXQt host and cannot decrypt the v11 cookies, and yt-dlp ≥2026.10
  needs `node` for signature solving. If it still fails, record `FAILED` with the verbatim yt-dlp
  line and report `YOUTUBE_COOKIES_STALE`. Never fake success.
- One attempt per pick. No retries inside the run.

## Receipts and report

- Append one JSON line per attempt to `/config/music-ingest-receipts.jsonl`:
  `{"at","videoId","status":"FILED|REVIEW|FAILED|SKIPPED","reason","path"}`.
- Overwrite `/config/music-picks.json` with the run's proposal + result (output only, never input).
- Report: pick table (artist / title / source page / score reason / ingest result), debug lines for
  every failure, and a one-line history summary (`playsObserved`, `insufficientHistory`).

## Hard rules

- Never invent a URL: every `watch?v=` must have been read from a page in this run.
- Never download a playlist/mix/radio/channel.
- Never touch the database, never move files out of `/data/Music` manually — beets owns placement.
- Report tool errors verbatim; a silent or paraphrased failure breaks the contract.

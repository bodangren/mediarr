# Subagent: music-pick

**Goal:** find 1-3 official tracks the owner will like from recent listening, ingest them cleanly, and
leave the library registered.

**Steps**

1. Read `automation/skills/music-operator/SKILL.md`.
2. Sources: the browser bridge against `https://www.youtube.com/feed/history` (owner's Chrome session)
   and `/config/mediarr.db` read-only (`MusicTrack`/`MusicArtist`, listening profile if present).
3. Pick 1-3 **official uploads** (artist channel / Topic), matching the taste signals in the skill;
   dedupe against `MusicTrack` titles+artists and `/config/music-picks.json` history.
4. There is no YouTube Music in this region — use plain YouTube search, and never claim otherwise in
   the receipt.
5. Download with `yt-dlp --cookies-from-browser chrome -f bestaudio -x --audio-format m4a --embed-thumbnail
   --add-metadata --write-info-json`; tag from `info.json` if beets cannot match, import with
   `beet import -s -q` (config has `import.quiet_fallback: asis`); any untaggable item goes to
   `/data/Music/_review` and is reported, never silently dropped.
6. `ffprobe` every filed file; append receipts to `/config/music-ingest-receipts.jsonl` and
   `/config/music-picks.json`; `operator_guard_record`.

**Report:** picks (artist/title/videoId/reason), filed paths with durations, review/duplicate/failed
counts, and the exact blocker if nothing was ingested.

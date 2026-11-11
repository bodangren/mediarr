# Weekly music discovery — agent run

> **This is an instruction to an agent turn, not a script.** Track `feature_music_library_20261107`,
> Phase 5. Owner decision 2026-11-11: *"You are supposed to look at what I listen to and get things
> I'd probably like."* The agent discovers music from the owner's real listening — Mediarr's
> `listening-profile` **plus** the signed-in Chrome session through the browser bridge — then feeds
> single YouTube video URLs to the deterministic ingest pipeline. There is no owner-curated picks
> file any more; `/config/music-picks.json` is an **output** of this run.
>
> Cadence: weekly. Discovery surface: `mcp__webbridge__*` tools only (`navigate`, `snapshot`,
> `evaluate`). Never scrape YouTube from the shell, never use a search engine, never invent a URL.

## Preconditions (check in order; stop with the named code on failure)

1. **API healthy.** `GET http://127.0.0.1:5174/api/health` → `data.status == "ok"`. Anything else:
   report `API_UNHEALTHY` with the response body and stop.
2. **Profile readable.** `GET http://127.0.0.1:5174/api/music/listening-profile` (envelope
   `{ok:true, data:{...}}`). Keep the whole payload; it is small. A 4xx/5xx or `ok:false`:
   report `PROFILE_UNAVAILABLE` with the response body and stop.
   - `data.artists`: top artists, `plays` desc then `lastPlayedAt` desc. `data.tracks` and
     `data.recentlyPlayed` are the observed plays/touches.
   - `data.library.trackKeys` is `"artist — title"` for every track already in the library — the
     dedupe list. `data.library.artistNames` is every artist already owned.
   - `data.dataQuality.insufficientHistory == true` (fewer than 10 observed plays) means the
     Mediarr signal is **thin**, not that the owner listens to nothing. Say so in the receipt and
     let the browser history/likes carry discovery. As of 2026-11-11 the live profile is
     1 play / 3 touched tracks, so expect this flag.
3. **Bridge present.** The turn's tool catalog must include `mcp__webbridge__navigate`,
   `mcp__webbridge__snapshot` and `mcp__webbridge__evaluate`. If any is missing: report
   `BRIDGE_TOOLS_ABSENT` with the tools that *are* registered and stop — do not fall back to
   `curl`, `web_search`, or guessed URLs.
4. **Watermark.** `GET /api/music/receipts?limit=20`; record `summary` and the newest receipt time
   so the post-ingest reconciliation is unambiguous.

If browsing reveals a signed-out YouTube ("Sign in", a consent wall that cannot be dismissed, or
"History is off"): report `BROWSER_SESSION_UNAVAILABLE` (or `BROWSER_HISTORY_EMPTY`) and ingest
nothing. An empty history is a legitimate result; generic chart-filling is not.

## Discovery procedure

Read pages like a human: `snapshot` first, then `evaluate` only to read the text/hrefs of what is
currently rendered or to scroll. Scroll and re-snapshot for more rows. Stay on `youtube.com` /
`music.youtube.com`; never click a download/convert site, never type account changes (no likes,
subscriptions, or playlist edits — this is read-only).

1. **Watch history** — `navigate https://www.youtube.com/feed/history`.
   `snapshot` the "Watch history" list; it is grouped by date ("Today", "Yesterday", …). For each
   row capture title, channel name, time, and the `/watch?v=<id>` link (from `evaluate` over the
   rendered anchors). Scroll back until you have roughly 50 rows or the dates are older than
   ~30 days, whichever comes first. Repeated channels/titles are the strongest signal; note them.
2. **Liked songs** — `navigate https://music.youtube.com/library` and open **Liked Music**
   (usually the pinned playlist; its link is `https://music.youtube.com/playlist?list=LM`).
   `snapshot` the song rows: title, artist, duration, and the watch link (the link carries
   `v=<videoId>`; discard the `list=` part). Read what is on screen, scroll once or twice for more.
   If the library shows no Liked Music, navigate the `LM` URL directly; if it is empty, record
   "no liked songs" and continue.
3. **Top artists from the profile** — for up to the top 3 artists in `data.artists` (skip if the
   list is empty): `navigate https://music.youtube.com/search?q=<url-encoded artist>` (or the
   artist page linked from a liked/library row) and read the **Top songs / Songs** results:
   title, duration, and `watch?v=<id>`. Use these only to find *individual* official uploads that
   are not already in `library.trackKeys`. The artist page's "Related artists" / "Fans might also
   like" names are valid seeds for the "similar artist" score below — do not ingest a mix or radio.
4. **Charts (only as a similarity signal)** — `navigate https://music.youtube.com/charts`, read
   the Top songs list. A chart entry counts only when its artist is already in the profile, in the
   browser history/likes you just read, or is a related artist of one of them. Never pick from the
   charts just because it is popular.

Stop discovery once you have ~10 solid candidates or the three surfaces are read. Do not browse
further "for more ideas" — bounded reading keeps the run cheap and reviewable.

## Scoring and selection (max 3 picks; 0 is valid)

Rank candidates with these rules, in order:

1. **Same artist as a profile artist** (highest `plays` first) — strong.
2. **Artist repeated in the browser history/liked songs** — strong, even when Mediarr has no plays
   for them yet (this is exactly how the run compensates for thin library history).
3. **Similar/related artist** surfaced by YouTube Music for a top artist — medium.
4. **Official release only**: the `<Artist> - Topic` channel, the artist's official channel,
   VEVO, or the label's channel. Reject fan re-uploads, lyric videos on random channels,
   compilations, "1 hour" mixes, sped-up/nightcore/8D edits, and covers unless the profile shows
   the owner listens to that cover artist.
5. **Duration sanity**: ≥ 60 s. Also treat > ~15 min as a mix/live-set and reject it unless it is
   a known long track by that artist. Prefer the official **audio/Topic** upload over a music
   video when both exist (cleaner metadata, no spoken intro).
6. **Dedupe first**: normalise the candidate's `artist — title` (lowercase; strip
   `(Official Video)`, `[HD]`, `feat. …`, `- Remastered …`, surrounding whitespace) and compare
   against every `data.library.trackKeys` entry, also normalised. A match — or a title that is
   obviously the same song under a different upload — is **skipped**. The server's duplicate
   ledger is a safety net, not the plan.
7. **Single video only**: the URL you keep is `https://www.youtube.com/watch?v=<videoId>`. Drop any
   `list=`, `start_radio=`, playlist or mix URL. Never download a playlist or a whole channel.

Pick the best 3 that survive all rules. Write down the reason for each (which rule fired, which
source page it came from). If nothing survives, ingest nothing and say why — zero picks is an
honest answer, padding the list is a defect.

## Ingest (sequential, no retries)

For each pick, in score order:

```bash
curl -s -X POST http://127.0.0.1:5174/api/music/ingest \
  -H 'content-type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=<videoId>","tag":true}'
```

- HTTP 200 and `data.ok === true` → success. `data.skipped` = `"duplicate-video"` or
  `"duplicate-audio"` is also success (already owned; note it, do not re-pick it).
- Any non-200, `ok:false`, or transport error is a failure. Record the **verbatim** server/tool
  error (including "Sign in to confirm you're not a bot" or a yt-dlp/beets message). Do not
  translate, summarise away, or hide it.
- Do not retry inside the run and do not ingest more than 3. A failure stays failed for the next
  weekly run.

## Reconcile

`GET /api/music/receipts?limit=20` again. For every attempted `videoId`, a receipt newer than the
watermark must exist with `FILED`, `REVIEW`, `FAILED` or `SKIPPED`; the server writes one per
attempt (duplicates included). **A missing receipt is a run failure** — report
`RECEIPT_MISSING: <videoId>` and mark the run failed; never report success on the strength of the
POST response alone. Carry `FILED`/`REVIEW` paths and every `FAILED` reason verbatim into the
output record.

## Outputs (both are required, every run)

1. **`/config/music-picks.json`** — overwrite with the run's proposal + result (this file is never
   read back as input):

```json
{
  "generatedAt": "2026-11-15T04:00:00.000Z",
  "picks": [
    { "url": "https://www.youtube.com/watch?v=<id>", "artist": "<artist>", "title": "<title>",
      "reason": "same artist as profile top artist; official Topic channel; 3:42" }
  ],
  "ingested": [
    { "url": "https://www.youtube.com/watch?v=<id>", "videoId": "<id>",
      "status": "FILED", "path": "/data/Music/<Artist>/<Album>/01 - <Title>.m4a", "reason": null }
  ]
}
```

   `status` is the reconciled receipt status (`FILED|REVIEW|FAILED|SKIPPED`). With zero picks,
   keep both arrays and add `"note": "<why nothing matched>"`.

2. **One run receipt appended to `/config/music-ingest-receipts.jsonl`** — use the server's receipt
   shape so `GET /api/music/receipts` keeps parsing the file; a run line is not an ingest attempt,
   so it is recorded as `SKIPPED` with `videoId: "weekly-run"` and a nested `run` object:

```json
{"at":"2026-11-15T04:00:00.000Z","videoId":"weekly-run","status":"SKIPPED",
 "reason":"weekly run: 2 filed, 1 review, 0 failed","path":null,
 "run":{"sources":["youtube.com/feed/history","music.youtube.com/playlist?list=LM"],
        "picks":3,"filed":2,"review":1,"failed":0,"skipped":0,
        "profileThin":true,"bridge":"ok"}}
```

   Append one JSON line (newline-terminated); never rewrite earlier lines. If the file does not
   exist, creating it with that line is correct.

If `media_automation_status` / `media_automation_heartbeat` are registered, also record one run for
`music-ingest-weekly` with the same counts. The JSONL receipt above and the server journal
(`journalctl --user -u mediarr`) remain the durable fallback.

## Report (required output of the turn)

| pick | videoId | source page | score reason | ingest result |
|---|---|---|---|---|

Then: profile summary (top artists, `playsObserved`, `insufficientHistory`), receipts summary
before/after, sources actually browsed, and one line per failure with the exact yt-dlp/beets/server
error. State plainly when zero tracks were picked and why.

## Hard rules

- **Never invent a URL.** Every ingested `watch?v=` id must have been read from a page in this run;
  name the page in the reason. No remembered IDs, no guessed sequences, no `web_search` results.
- **Never download a playlist, mix, radio or channel** — single videos only, and strip `list=`.
- **Never retry inside the run.** One attempt per pick; failures belong to the next run.
- **Report tool errors verbatim.** The bot-check message, the yt-dlp line, the beets reason — quote
  it. A silent or paraphrased failure breaks the contract.
- **Bridge missing → report `BRIDGE_TOOLS_ABSENT` and stop.** Do not substitute shell scraping,
  `curl` against YouTube, or a different browser.
- **Read-only browsing.** Never sign in/out, like, subscribe, edit playlists, or accept account
  changes. Dismissing a consent overlay is fine; authenticating is not.
- **No picking without reconciliation.** A pick without a receipt is not a success.
- Never touch `/data/Music` or `mediarr.db`; the ingest + beets tagger owns placement (review
  folder included). Never write `/config/music-picks.json` *before* the run — it is output only.

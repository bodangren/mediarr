# Weekly music ingest — agent turn prompt

> Track: `feature_music_library_20261107` (Phase 3 contract + Phase 5 weekly run).
> This is the **automation contract**: picks go in as owner-curated YouTube URLs, ingest status comes out
> as server receipts. It replaces a scraper; the judgement ("what to grab") is the owner's picks file, not
> code. Run once a week.

## Preconditions

1. Mediarr API healthy: `GET http://127.0.0.1:5174/api/health` → `data.status == "ok"`.
2. Picks file exists at `/config/music-picks.json` (owner-curated, max 3 picks):

```json
{ "picks": [ { "url": "https://www.youtube.com/watch?v=…", "artist": "optional", "title": "optional" } ] }
```

If the file is missing or `picks` is empty: journal `MUSIC_PICKS_MISSING` (quarantine-worthy after 3
weeks), report "no owner picks", and stop. **Never invent picks, search the web, or scrape a site.**

## Steps

1. Read the watermark: `GET /api/music/receipts?limit=20`; note `summary` and the latest receipt time.
2. For each pick (max 3, in order):
   - `POST /api/music/ingest` with `{"url": "<pick.url>", "tag": true}`.
   - Treat HTTP 200 `ok:true` as success; `skipped: "duplicate-video"|"duplicate-audio"` is success and
     needs no action; any error response or `ok:false` is a failure whose text must be reported verbatim.
   - Do not retry inside the same run; a failed pick stays failed and the next run may pick it up again.
3. Read `GET /api/music/receipts?limit=20` again and reconcile: each pick must have a receipt with
   `FILED`, `REVIEW`, `FAILED` or `SKIPPED`. Missing receipt = run failure, not silence.
4. If the harness media-automation tools are registered (`media_automation_status`,
   `media_automation_alert`), journal one run for `music-ingest-weekly` with the table below; otherwise the
   service journal (`journalctl --user -u mediarr`) already carries the same errors, so report them.

## Report table (required output)

| pick | videoId | outcome | reason/path |
|---|---|---|---|

Plus: receipts summary before/after, and one line for every failure with the exact yt-dlp/beets error.

## Boundaries

- Never download more than 3 tracks per run; no playlists (single videos only).
- Never touch `/data/Music` directly; the ingest + beets tagger owns placement (review folder included).
- No shell scraping and no browser discovery: discovery/picks are owner-gated by design (M2/M4).

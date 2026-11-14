---
name: adult-operator
description: Run Mediarr's weekly adult-library discovery directly — read the AdultItem library read-only, browse the owner's approved sources through the browser bridge, dedupe by studio/title and infoHash, and queue 1–3 picks with Transmission. Never calls the REST API, never deletes.
---

# adult-operator — weekly discovery and queueing

Judgement is yours; the mechanics are `transmission-remote` + the browser bridge. No REST API, no
DOM scraping scripts, no deletions.

## 1. Read state (read-only)

```bash
sqlite3 -readonly /config/mediarr.db \
 "select title, studio, sizeBytes, needsReview, isWatched, lastPlayedAt
    from AdultItem order by lastSeenAt desc limit 200;"

ls /data/Porn | head -200     # filenames carry the scene stem
transmission-remote -l        # every existing name/infoHash must be deduped
tail -20 /config/orchestrator-receipts.jsonl
```

## 2. Sources and profile (owner-approved)

Browse with `mcp__webbridge__navigate` → `snapshot`/`evaluate`, read results like a human and lift
title, studio, size, seeders and magnet from the rendered rows.

- Asian-dominant titles and studios; scene-style compilations; avoid plot-driven features.
- Prefer 1080p or better, size ≤ 8 GB unless the title is rare.
- Dedupe by studio + title stem and by infoHash — a different hash of an owned title is still a
  duplicate.
- **1–3 picks.** Zero is a valid, honest answer when nothing matches: report why, never pad.

## 3. Queue

```bash
transmission-remote --add '<magnet>' --download-dir /home/daniel-bo/Downloads
transmission-remote -l        # the pick must appear
```

When a pick completes, file it into `/data/Porn` following the existing naming, verify with
`ffprobe`, and keep the source. Never delete files and never run retention/pruning actions.

## 4. Receipt (required)

Append one JSON line to `/config/orchestrator-receipts.jsonl`: run timestamp, sources browsed, picks
(title / infoHash / size / torrent id / result), dropped duplicates with their hash, and the reason
when zero picks were made.

## Hard rules

- No REST API calls, no database writes, no media deletes, no settings changes.
- Never report success for a pick that is not in `transmission-remote -l`.
- Bridge missing or wedged → report the exact error and stop; no guessed URLs, no scraper fallback.

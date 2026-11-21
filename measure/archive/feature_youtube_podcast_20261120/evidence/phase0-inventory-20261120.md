# Phase 0 inventory — YouTube domain, 2026-11-20

Measured read-only against the live `/config/mediarr.db` and `/data/Youtube` before any change.

## Sources

| id | kind | title | enabled | last polled | lastError |
|---|---|---|---|---|---|
| 1 | CHANNEL | Dave Gray | yes | 2026-11-20 20:22 | *stale text from the cookie era* (`yt-dlp --cookies-from-br…`); the poll after the keyring fix reports `failures 0` |

Only one source is subscribed, and it is a **channel**. `YoutubeSubscriptionKindEnum` already contains `PLAYLIST`,
but no code path polls or subscribes one — a playlist/podcast URL cannot be added today.

## Videos

| status | source | count |
|---|---|---|
| AVAILABLE | IMPORT | 251 |
| AVAILABLE | SUBSCRIPTION | 378 |
| DELETED | IMPORT | 12 |
| FAILED | SUBSCRIPTION | 13 |
| QUARANTINED | SUBSCRIPTION | 2 |

- **All 629 AVAILABLE rows have `publishedAt = NULL`.** The domain has never stored publication dates — not for the
  imported archive and **not for anything the poller or downloader fetched**. Consequence: "today", "most recent",
  age labels and any recency-based retention are impossible until dates are backfilled and new downloads store them.
  This is the single most important finding and it becomes the first implementation task (P1.0).
- Recency buckets therefore all read "null", and "unwatched older than 7 days" also reads 0 — the owner's complaint
  cannot even be *measured* yet, which is another argument for backfilling first.

## Metadata available for the backfill

- **391 `*.info.json` files** sit next to the downloaded videos (`yt-dlp --write-info-json`), each carrying
  `upload_date` (e.g. `20220114`), `timestamp` (unix), `channel`, `duration`. Sample:
  `Uncategorized/React Protected Routes … [oUZjO00NkhY].info.json`.
- **381 `.mp4` + others** under `/data/Youtube` — the backfill can cover every `SUBSCRIPTION` row from its info file;
  the ~250 archive IMPORTS have no info file and stay `publishedAt = NULL` (they are not podcast sources and are
  excluded from recency retention).

## Disk

- `/data/Youtube` = **75 GB**; `/data` free = **242 GB** (94 % used).
- 13 FAILED + 2 QUARANTINED rows exist; nothing is currently prunable under the watched+7d rule because dates are null.

## What this changes in the plan

1. **P1.0 (new, first):** backfill `publishedAt` for existing rows from `*.info.json`, and store it on every new
   download/poll. Without it R2 (freshness) and R3 (episode-count retention) cannot be implemented or verified.
2. The podcast axis applies to `SUBSCRIPTION` sources; the imported archive keeps its own rules (no recency prune).
3. Verification of the owner's complaint needs the backfill: after it, "unwatched older than N episodes per source"
   becomes a measurable number instead of 0.

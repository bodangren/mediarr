# Spec — YouTube library as a video-podcast player

**Track:** `feature_youtube_podcast_20261120`
**Owner request (2026-11-20, verbatim):** *"It's about the youtube library player. I want to make this more like a
video podcast player. For example, it will download the latest videos in either a channel, a playlist, or a podcast.
Does that make sense? Easy to identify today's or most recent podcasts. Delete ones that are more than a few
episodes old even if they are unwatched."*

## Problem today (measured on the live library, 2026-11-20)

- The YouTube domain only really ingests **channels**: `YoutubeSubscriptionKindEnum = ["CHANNEL","PLAYLIST"]`
  exists in the schema, but the poller, the subscribe route and the downloader have **no PLAYLIST path** —
  a playlist URL cannot be added.
- The library is organised by **channel** (`youtube_library_screen.dart:104` groups by `channelName`, with an
  "Unsorted" bucket). Nothing answers *"what came out today?"* — the newest episode of a podcast sits wherever
  its channel happens to fall.
- Retention is **watched-and-old**: `retentionEligible()` only prunes a video after it is watched *and* 7 days
  have passed (`YoutubeLibrary.ts:154`). An unwatched podcast episode therefore stays on disk for ever, which is
  exactly backwards for a podcast: the owner wants the **newest few episodes kept, older ones dropped even if
  unwatched**.

## Intent

Treat each source (channel, playlist, podcast playlist) like a podcast subscription:

1. **Pull the latest** episodes of every enabled source automatically.
2. **Surface today's / most recent** episodes first, unmistakably.
3. **Keep a short window** (the newest N per source) and **drop what falls out of it**, watched or not.

## Requirements

### R1 — Sources: channel, playlist, podcast

- `PLAYLIST` becomes a first-class source: a `https://www.youtube.com/playlist?list=…` URL can be subscribed,
  polled (newest-first, bounded), and downloaded like a channel.
- A "podcast" is handled as a **YouTube playlist or channel** in v1 (YouTube podcast pages are playlists).
  RSS audio/video podcast feeds are **out of scope** — they need a different downloader and player path; noted
  as a follow-up, not silently ignored.
- A source can be paused (`enabled=false`) without losing its history.

### R2 — Freshness is the primary axis

- Every video already stores `publishedAt`; the API must expose it and the client must sort by it.
- Client YouTube screen gains a **Latest** row at the top: the newest episodes across all sources, today's first.
- Each card shows a **relative age** ("today", "2h", "yesterday", "3d") and a **NEW** marker for items published
  within 24 h (or since the last visit — pick one, document it).
- Per-source rows remain below, newest-first, so a podcast you follow is recognisable and ordered by recency.

### R3 — Retention is episode-count based, watched-independent

- Per source, keep the **newest `keepLatest` completed videos** (default **3**; overridable per subscription in
  the existing `options` JSON, no new settings screen).
- Anything older than that window is pruned **whether or not it was watched**.
- The existing watched+7d rule stays for the **archive** (`source = 'IMPORT'`) and is not applied to podcast
  sources — the two rules must not double-prune.
- Pruning happens through the existing quarantine engine (plan → move → manifest), never a raw unlink; a
  `youtube-prune` receipt line records source, video, age, and destination.
- Quarantined files are **purged after 7 days** so disk is actually reclaimed; the manifest keeps the record.

### R4 — Safety rails (never destroy something the owner needs)

- Never prune the video that is currently playing, or one with a playback position from the last 24 h.
- Never prune when the media root looks missing/short (`LibraryScanService` has the ratio guard pattern to reuse).
- Never prune the newest item of a source, and never prune a source's item when that source has fewer than
  `keepLatest` downloaded items.
- Retention dry-run returns the plan first; execution logs exact counts.

### R5 — Nothing new to explain on screen

- No new rail destination, no new settings screen, no new dialogs. The YouTube destination stays one place;
  the Latest row and age labels are additions inside it.
- Empty/failed states reuse the existing error and retry behaviour (a source that cannot be polled is already
  reported through `lastError`).

## Non-goals

- RSS podcast feeds (follow-up track if the owner wants audio podcasts).
- Audio-only download mode changes (the domain keeps its existing H.264 normalisation).
- Playback-position sync, queue features, or cross-device "played" semantics beyond what exists.

## Acceptance (measurable)

1. A playlist URL can be subscribed via the SPA/route, polls without error, and downloads its newest videos;
   `lastError` empty and a receipt exists for the source.
2. `/api/youtube/latest` returns the newest N across sources sorted by `publishedAt` desc, and the TV's YouTube
   screen shows a **Latest** row whose first card is published within 24 h when such an episode exists.
3. With `keepLatest = 3` and 4 completed videos in a source, the engine prunes exactly the 4th-newest:
   receipt line, quarantine manifest entry, and DB status change are all present; the 3 newest stay playable.
4. Pruning never touches an in-progress video and never runs when the media root is missing (both covered by tests).
5. On the TV: open YouTube → Latest row visible with age labels → play the newest episode → back out cleanly.

## Data / API / client surface (planned, no schema renames)

- `YoutubeSubscription.options.keepLatest` (json, default 3) — no migration needed.
- `GET /api/youtube/latest?limit=` — newest across sources with `publishedAt`, `ageLabel`, `isNew`.
- `GET /api/youtube/sources` — per-source counts (latest published, kept, pruned) for the client rows.
- `POST /api/youtube/subscriptions` — accept a playlist URL (kind inferred from the URL).
- Client: `youtube_library_screen.dart` gains the Latest section, age labels, NEW chip; per-source rows reordered
  by `publishedAt` desc.

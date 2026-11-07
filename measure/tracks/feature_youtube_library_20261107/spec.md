# Spec — YouTube series library for Mediarr

**Track:** `feature_youtube_library_20261107`
**Opened:** 2026-11-07 · **Status:** SCOPED ONLY — no work started. Owner decision D2 in
[`chore_migrate_hermes_automation_20261107`](../chore_migrate_hermes_automation_20261107/spec.md):
YouTube series live in the library and should update themselves: subscribe to a playlist, download
new entries, delete watched ones after about a week.

## Context

The household already keeps YouTube series in the media library, but nothing updates them
automatically. The old Hermes setup had no YouTube subscription pipeline; the browser bridge was
used only for music discovery. `yt-dlp` (a maintained extractor, not a DOM script) can list a
playlist's entries and download video with metadata and thumbnails.

## Goal

Mediarr has a YouTube library type: the owner subscribes to channels/playlists, new entries download
automatically with `yt-dlp`, they are browsable/playable as a series, and an episode watched more
than ~7 days ago is retired through the quarantine engine.

## Scope

**In:** YouTube library type/root; subscription table (channel/playlist URL + options); playlist
polling via `yt-dlp --flat-playlist`; download via `yt-dlp` (video + metadata + thumbnail); dedupe by
video id; UI section with channel/playlist → episode navigation; watched state; retention
(watched + 7 days); automation contract for the agent runs.

**Out:** YouTube scraping by our code (use `yt-dlp` + browser agent for ambiguous cases); comments,
transcripts, recommendations; live-stream recording (decide later).

## Requirements

- **FR-1 Type + root:** a YouTube library type with a configurable root; existing `TV|MOVIE` queries
  unaffected.
- **FR-2 Subscriptions:** add/remove a channel or playlist; enabled flag; per-subscription options
  (quality cap, retention days).
- **FR-3 Poll + download:** a **deterministic** plugin/native task polls entries with
  `yt-dlp --flat-playlist` (the agent handles only ambiguous or blocked cases); new video ids are
  downloaded once (idempotent by video id); a per-poll item cap bounds a large channel; failures are
  reported per entry.
- **FR-4 Library shape:** channel/playlist → episode ordering; title, uploader, upload date,
  duration, thumbnail.
- **FR-5 Retention (review-scoped):** only **subscription-managed** items are eligible — the item
  must belong to a subscription row with `retentionDays > 0`. Eligibility is
  `isWatched && now − lastWatched > retentionDays` (default 7), never "created 7 days ago".
  Existing files are imported as *unmanaged/keep* and are never deleted. Ladder: watched + window →
  quarantine; quarantine 14 days → delete; restore works at any point before deletion.
- **FR-6 UI:** a YouTube section, D-pad navigable, in the Flutter client.
- **FR-7 Automation:** the daily agent run polls subscriptions and decides; the deterministic
  retention job enforces deletion. No DOM code.
- **FR-8 Maintained tool:** `yt-dlp` is updated, not patched; its errors surface in the run receipt.
- **FR-9 Migration:** the existing `4TB/Youtube` tree (786 files) imports as *unmanaged/keep*; no
  retention applies to it. Managed subscriptions start empty.

## Acceptance criteria

1. Adding a playlist subscription downloads its current entries and new ones on the next poll.
2. A downloaded episode plays with metadata and thumbnail on the TV.
3. A watched episode older than 7 days is quarantined, restorable, then deleted.
4. A video-id duplicate is never downloaded twice.
5. A broken `yt-dlp` invocation is reported in the receipt and alerts; it is not silent.
6. Existing video suites stay green.

## Open decisions (resolve before Phase 1)

| # | Decision | Options |
|---|---|---|
| Y1 | Representation | Separate YouTube library type (recommended) vs map into TV series with a source tag |
| Y2 | Retention | Quarantine then delete after watched+7d (recommended) vs hard delete at 7d |
| Y3 | Quality | Best ≤1080p (recommended) vs source default vs capped size |
| Y4 | Poll cadence | Daily with the media run (recommended) vs every 6 h |
| Y5 | Shorts/live | Skip shorts (recommended); live: skip for v1 |

## Provenance

Scoped from the owner's feedback (2026-11-07), the v3 architecture §4, and the existing `yt-dlp`
install. See [`plan.md`](./plan.md).

# Spec — Music library for Mediarr

**Track:** `feature_music_library_20261107`
**Opened:** 2026-11-07 · **Status:** SCOPED ONLY — no work started. Raised by owner decision D2 in
[`chore_migrate_hermes_automation_20261107`](../chore_migrate_hermes_automation_20261107/spec.md).

## Context

The Hermes `music-orchestrator` job (Sundays 02:00) is retired with Hermes: it drove YouTube via
`kimi-webbridge`, then `music-tidy.py` (beets/MusicBrainz), then a jellyfin-go refresh. Media has
to go somewhere: the owner wants Mediarr to own it rather than keep an external beets pipeline.

Mediarr cannot represent music today. The media model is `MediaTypeEnum = ["TV","MOVIE"]`
(`server/src/db/schema.ts:15`) and there are no artist, album or track tables; library roots are
movie/TV only (`server/src/repositories/AppSettingsRepository.ts:68-69`). This is a new product
domain, not a migration.

## Goal

Mediarr natively represents, scans, serves and automates a music library: the owner can browse by
artist/album/track, play from the Flutter client, search, and have music acquired and tagged
without an external beets step.

## Scope

**In:** music media model (artist/album/track or an equivalent normalised domain); library scan +
tag extraction; artwork; browse/search/stream API; Flutter client screens/player integration;
automation contract (wanted queue, acquisition, tagging, dedupe) so the DSH automation layer can
drive it; migration of the existing `4TB/Music` tree; minimal Jellyfin-compat surface only if a
client needs it.

**Out:** streaming-service integration; lyrics; podcasts/audiobooks; multi-user; changes to the
existing video transcoding path; YouTube scraping (owner decision D3 removed the browser bridge —
if YouTube remains a source it needs a supported API path, decided here).

## Requirements

- **FR-1 Domain:** first-class artist/album/track records with stable ids; no overloading of the
  `TV|MOVIE` enum in a way that breaks existing video queries.
- **FR-2 Scan:** reconcile filesystem ↔ DB for a configurable music root; idempotent by path;
  unreadable files are reported, not fatal.
- **FR-3 Tags:** read embedded tags (artist, album, title, track/disc, year, genre, duration,
  bitrate); a missing/corrupt tag must not drop the file silently.
- **FR-4 Truthful browse:** artist → album → track navigation matches the filesystem and DB.
- **FR-5 Play/stream:** direct play with range support, consistent with the existing video stream
  handler.
- **FR-6 Client:** Flutter client can browse, search, play, and resume; TV focus rules apply.
- **FR-7 Automation:** an HTTP contract the DSH automation layer can call (wanted/acquire/status),
  with the same receipt semantics as video (task/history, idempotency).
- **FR-8 Migration:** existing `4TB/Music` imports without destructive reorganisation; beets
  remains usable as an external tagger until native tagging is proven.

## Acceptance criteria

1. A seeded music root scans into artist/album/track rows with counts matching the filesystem.
2. Flutter client browses and plays an album on the TV box, including seek and resume.
3. A malformed file is reported in the scan summary and does not abort the scan.
4. Automation can add a wanted album and observe acquisition through the same receipt mechanism
   as video tasks.
5. Existing video suites and SPA build stay green; no regression to `TV|MOVIE` behaviour.
6. `music-orchestrator` can stay disabled with no functionality lost once this track ships.

## Open decisions (resolve before Phase 1)

| # | Decision | Options |
|---|---|---|
| M1 | Data model | Extend `Media` with a music type vs separate normalised artist/album/track tables (recommended: separate tables, one `music` library root) |
| M2 | Tagging engine | Native (e.g. `music-metadata`) vs keep beets externally and import its results (recommended: native read, optional beets write) |
| M3 | Acquisition source | Indexer/torrent only vs a supported YouTube/other API; no browser bridge (D3) |
| M4 | Playlists | First release or later |
| M5 | Client scope | Browse+play only vs full library management in v1 |

## Provenance

Scoped from the migration track's decision D2 and the measured inventory. No code was read beyond
the schema/roots cited above; estimates and phases are in [`plan.md`](./plan.md).

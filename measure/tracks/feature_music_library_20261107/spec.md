# Spec — Music library for Mediarr

**Track:** `feature_music_library_20261107`
**Opened:** 2026-11-07 · **Status:** SCOPED ONLY — no work started. Raised by owner decision D2 in
[`chore_migrate_hermes_automation_20261107`](../chore_migrate_hermes_automation_20261107/spec.md).
Revised 2026-11-07 (v2): **YouTube is the source**, audio is downloaded as a normal track file and
tagged, and the client gets an **iTunes-style, D-pad-navigable player**.

## Context

The Hermes `music-orchestrator` (Sundays 02:00) searched YouTube through the browser bridge, ran
`fetch-from-youtube.py` (a thin `yt-dlp` wrapper) to pull audio into a staging dir, then
`music-tidy.py` (beets/MusicBrainz) to tag and file it, then refreshed jellyfin-go. All of that is
retiring with Hermes.

Mediarr cannot represent music today: the media model is `MediaTypeEnum = ["TV","MOVIE"]`
(`server/src/db/schema.ts:15`), there are no artist/album/track tables, and the roots are movie/TV
only (`server/src/repositories/AppSettingsRepository.ts:68-69`). The owner wants Mediarr to own the
music library end to end, including an iTunes-style player.

## Goal

Mediarr natively represents, ingests, tags, serves and plays music: artists → albums → tracks,
sourced from YouTube via `yt-dlp`, tagged via beets/MusicBrainz, browsable and playable in an
iTunes-style client that is fully D-pad navigable on the TV.

## Scope

**In:** music domain (artist/album/track); configurable music root; tag extraction and artwork;
**domain/ingest ships separately from the player** (the domain can retire `music-orchestrator`
before the TV player exists);
YouTube ingest (`yt-dlp` audio + thumbnail/metadata) and tagging (`beets`/MusicBrainz, with a
fallback path for untaggable tracks); browse/search/stream API; **iTunes-style player** (sidebar
browse: Artists / Albums / Songs / Recently Added; album grid; track list; now-playing bar with
queue; keyboard/D-pad navigation) in the Flutter client first; playlists/queue; automation contract
for the agent run; migration of `4TB/Music`; format conversion.

**Out:** streaming services, lyrics, podcasts/audiobooks, multi-user, changes to video transcoding.

## Requirements

- **FR-1 Domain:** first-class artist/album/track records with stable ids; existing `TV|MOVIE`
  behaviour untouched.
- **FR-2 Scan:** reconcile a configurable music root; read embedded tags (artist, album, title,
  track/disc, year, genre, duration, bitrate, artwork); missing/corrupt tags report, not abort.
- **FR-3 Ingest:** one deterministic pipeline — agent picks YouTube URLs, `yt-dlp` downloads audio
  + thumbnail, `ffmpeg` converts, `beets` tags and files under `<Artist>/<Album>/<NN> - <Title>` —
  idempotent by video id + audio hash. Format default m4a/AAC 256k; mp3 320 configurable.
  **Filing applies only to new agent imports**; the existing tree is never reorganised (FR-9 wins).
- **FR-4 Tagging:** beets/MusicBrainz enrichment with a quality bar (≥80% auto-tagged on a seeded
  sample); untaggable tracks land in a review folder and are reported (never silently dropped or
  misfiled). Track the bar in the plan, not vibes.
- **FR-5 Browse:** artist → album → track navigation matches the filesystem and DB.
- **FR-6 Play/stream:** direct play with range support; gapless-enough queue behaviour.
- **FR-7 Player (iTunes-style):** persistent left sidebar (Artists, Albums, Songs, Recently Added,
  Playlists), album artwork grid, track list with number/title/duration, bottom now-playing bar
  (art, title/artist, transport, progress), queue view. **Fully D-pad navigable on the TV**: every
  control reachable, focus visible, no focus traps (the TV focus rules already paid for in other
  tracks apply).
- **FR-8 Automation:** YouTube discovery is an agent run (browser bridge); ingest is the
  deterministic pipeline; the run's receipt lists picks, downloads, tag failures and library counts.
- **FR-9 Migration:** existing `4TB/Music` imports **without destructive reorganisation** and wins
  over FR-3 for existing files; the scanner accepts both the existing layouts
  (`Artist/Album/...` and top-level `VA - ...`/`Compilations/...`); beets stays available as the tagger.
- **FR-10 Retries:** a failed `yt-dlp`/beets step is reported with the tool error and retried next
  run; never silently skipped.

## Acceptance criteria

1. A seeded music root scans into artist/album/track rows matching the filesystem.
2. The weekly agent run picks 1–3 YouTube tracks, the pipeline downloads + tags + files them, and
   the receipt names any tag failure.
3. The Flutter client browses by artist and album and plays a track on the TV, including seek,
   queue and resume; every control is reachable with the remote.
4. The player matches the iTunes-style layout: sidebar, album grid, track list, now-playing bar.
5. A malformed file is reported in the scan summary and does not abort the scan.
6. Existing video suites and SPA build stay green.
7. `music-orchestrator` can stay disabled with no functionality lost once this track ships.

## Open decisions (resolve before Phase 1)

| # | Decision | Options |
|---|---|---|
| M1 | Data model | Separate normalised artist/album/track tables (recommended) vs extending `Media` |
| M2 | Source | YouTube via `yt-dlp` (recommended); add other sources later | 
| M3 | Format | m4a/AAC 256k (recommended) vs mp3 320 vs opus |
| M4 | Tagging | beets/MusicBrainz (recommended) vs native tag read-only with manual fix |
| M5 | Player scope | TV-first Flutter (recommended), then desktop/mobile | 
| M6 | Playlists | User playlists in v1 or v2 (recommended: simple queue in v1, playlists v2) |

## Provenance

Scoped from the old `music-orchestrator`/`fetch-from-youtube.py`/`music-tidy.py` inventory, the v3
architecture §4, and the owner's 2026-11-07 feedback. See [`plan.md`](./plan.md).

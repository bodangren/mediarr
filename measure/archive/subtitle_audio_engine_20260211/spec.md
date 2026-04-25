# Specification: Track 6 - Subtitle & Audio Engine (Bazarr Layer)

## Overview
Implement Mediarr's subtitle inventory and fetching engine by reverse-engineering
Bazarr's subtitle lifecycle (inventory, missing-subtitle calculation, provider
search, and download flow), then extending it to support audio-aware behavior
for:

1. Multiple video files for the same movie/episode (different releases/audio)
2. Multiple audio tracks inside a single video file (rare but supported)

The core goal is to make subtitle decisions per media file variant, not as a
single collapsed state per episode/movie.

## Reverse Engineering Findings (Bazarr Baseline)
- Bazarr already stores `audio_language` and supports language profile flags
  `audio_exclude` and `audio_only_include`.
- Bazarr computes missing subtitles from desired profile items minus existing
  subtitles, with cutoff support and HI fallback behavior.
- Bazarr reads embedded audio/subtitle tracks via ffprobe/mediainfo and caches
  probe data.
- Bazarr currently collapses audio context in key flows (wanted/manual process
  path usually uses the first parsed audio language), and does not model
  multiple file variants of the same media item as first-class entities.

## Functional Requirements

### FR-1: Media File Variant Inventory
- Introduce first-class file-variant records for movies and episodes.
- A movie or episode can have 0..N file variants.
- Each variant stores at minimum:
  - path
  - file size
  - probe cache key/fingerprint
  - source metadata (quality/release name when available)
  - monitoring state (eligible for subtitle automation)

### FR-2: Audio Track Inventory
- Each file variant must store 0..N audio tracks with:
  - stream index
  - language code (if detectable)
  - codec/channels (when available)
  - default/forced/commentary flags (when available)
  - title/name (when available)
- Preserve duplicate audio languages from different streams as separate tracks.
- Still provide an aggregated language set for profile rules that only need
  language presence checks.
- Commentary audio tracks must be flagged and excluded from subtitle language
  matching rules by default.

### FR-3: Subtitle Inventory
- For each file variant, inventory:
  - embedded subtitle tracks
  - external subtitle files
- Keep subtitle inventory tied to file variant identity to avoid collisions
  between multiple files of the same media item.

### FR-4: Audio-Aware Language Profile Engine
- Port Bazarr-compatible profile semantics:
  - `always_include`
  - `audio_only_include` (only if language appears in audio tracks)
  - `audio_exclude` (skip if language appears in audio tracks)
- Missing-subtitle calculation must run per file variant.
- Cutoff logic must be evaluated per file variant.
- HI/forced semantics must remain compatible with current profile behavior.

### FR-5: Wanted Queue and Fetching
- Wanted subtitle jobs must be variant-specific:
  - `(media item, file variant, target subtitle language/type)`
- Search/download/history must reference variant identity.
- Avoid duplicate downloads for the same variant/language while allowing
  separate jobs for different variants of the same media item.

### FR-6: Manual Search & Download
- Manual subtitle APIs must allow selecting target variant when multiple files
  exist for the same episode/movie.
- Manual workflow must include variant audio context in matching and
  post-processing variables.
- If multiple variants exist, manual APIs/UI must require explicit variant
  selection (no implicit auto-pick).

### FR-7: Sync and Reindex Triggers
- Recompute audio/subtitle inventory and missing subtitles when:
  - media file path/size changes
  - ffprobe cache is invalidated
  - language profile settings change
  - movie/episode monitoring status changes

### FR-8: API Visibility
- Expose per-variant inventory in API responses:
  - variants
  - audio tracks
  - subtitle tracks
  - missing-subtitle state by variant
- Keep backward-compatible summary fields where feasible.

### FR-9: Migration/Backfill
- Provide migration/backfill from existing single-file assumptions to variant
  tables without data loss.
- Existing installed users must retain subtitle history and profile assignment.

### FR-10: Variant-Safe Subtitle Naming
- Subtitle filenames must remain sidecar-compatible with their target video
  variant and avoid collisions across variants of the same episode/movie.
- The naming strategy must be deterministic and stable across rescans.
- If two variants would otherwise resolve to the same subtitle filename, the
  engine must append a deterministic variant suffix (for example, release or
  variant token) before extension.

## Non-Functional Requirements
- Preserve or improve current subtitle scan performance on large libraries.
- Cache probe outputs aggressively and invalidate deterministically.
- Avoid unsafe destructive operations on subtitle files.
- Ensure deterministic job idempotency for repeated sync events.
- Maintain test coverage target >80% for new modules.

## Acceptance Criteria
1. A single movie/episode can persist multiple file variants, each with its own
   audio/subtitle inventory.
2. A single file with multiple audio tracks persists all tracks (including
   duplicate-language streams as separate track records).
3. Missing subtitle calculation correctly applies `audio_only_include` and
   `audio_exclude` per variant.
4. Wanted queue creates and processes variant-specific subtitle jobs.
5. Manual subtitle endpoints can target a specific variant when multiple files
   exist.
6. Commentary audio tracks do not satisfy `audio_only_include` and are ignored
   for `audio_exclude` matching by default.
7. Subtitle files for multiple variants of the same media item do not collide
   on disk and keep deterministic naming across rescans.
8. Reindex after file change updates variant audio/subtitle inventory and
   recomputes missing subtitles.
9. Existing media entries migrate/backfill without losing prior subtitle data.

## Out of Scope
- Full Bazarr UI parity in this track.
- Automatic subtitle translation workflow.
- Speech-to-text subtitle generation.
- Non-torrent source-specific subtitle provider plugins beyond current provider
  abstraction.

## Confirmed Product Decisions
- Default policy: evaluate subtitles for all monitored variants of a media
  item.
- Commentary audio does not count as matching audio for subtitle profile rules.
- Variants keep distinct subtitle naming to prevent collisions.
- Manual workflows use explicit variant selection when multiple variants exist.

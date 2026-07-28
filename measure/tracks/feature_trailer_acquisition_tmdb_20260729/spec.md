# Specification: Trailer Acquisition via TMDB

## Overview

Mediarr resolves rich metadata from TMDB for every movie and series, but never touches TMDB's `/videos` endpoints — verified 2026-07-29: zero occurrences of `trailer` in `server/src`. This track adds trailer acquisition: query TMDB `/movie/{id}/videos` and `/tv/{id}/videos`, select the best official trailer, persist its location on the media record, and surface it to the SPA and Flutter detail pages. Low cost because the TMDB integration, settings-managed API key, and media persistence layer already exist (`server/src/services/MetadataProvider.ts`, `MediaRepository`).

## Problem

- Detail pages in the SPA and Flutter client have no trailer, a standard feature in the Sonarr/Radarr/Jellyfin experiences Mediarr replaces.
- TMDB exposes trailers (hosted on YouTube) for nearly all catalog entries; Mediarr already holds the TMDB IDs needed to query them.
- Any consumer wanting a trailer today would have to re-implement TMDB access client-side, duplicating key management and rate handling.

## Goals

1. Fetch video listings from TMDB for movies and series using the existing `MetadataProvider` infrastructure (API key from `settings.apiKeys.tmdbApiKey`).
2. Deterministically select the best trailer: prefer `type=Trailer`, `official=true`, `site=YouTube`, highest `size`, most recent `published_at` as tiebreak; fall back to Teaser when no Trailer exists.
3. Persist the selected trailer (site, key, name) on the media record so clients do not call TMDB directly.
4. Expose the trailer field on the existing media detail API responses consumed by the SPA and Flutter client.
5. Behave gracefully when no trailer exists (field absent/null, no error).

## Non-goals

- Downloading or hosting trailer video files. Trailers are referenced by provider key (e.g. YouTube video id); playback/embed is a client concern and a separate track.
- Trailer fetching for library items that have no TMDB ID.
- Backfilling trailers for the entire existing library in one batch job (a scheduled refresh may be considered later; the fetch hooks into the existing metadata resolution path).

## Acceptance Criteria

- [ ] `MetadataProvider` (or a dedicated `TrailerService` alongside it) fetches `/movie/{id}/videos` and `/tv/{id}/videos` with the configured TMDB API key, covered by tests with a mocked HTTP layer.
- [ ] Trailer selection follows the documented preference order (official Trailer > Teaser, YouTube preferred, size/recency tiebreaks) and is pinned by unit tests over representative TMDB video-list fixtures.
- [ ] The selected trailer is persisted on the media record (schema addition via the project's migration runner) and survives re-resolution without duplicate rows.
- [ ] Movie and series detail API responses include the trailer field; absence of any trailer yields `null`, not an error or a fabricated entry.
- [ ] A missing/unconfigured TMDB API key produces the same clear error style as the existing metadata paths, not a silent empty field.
- [ ] No client changes required for the server work to be complete; SPA/Flutter display wiring is listed as follow-up tasks but is not a gate for server acceptance.

## Out of Scope

- Non-TMDB trailer sources (e.g. scraping YouTube directly).
- Local trailer file storage, transcoding, or streaming.
- Trailer prefetch during RSS/indexer search — trailers resolve for library/monitored items only.

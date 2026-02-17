# Specification: Track 7D - Queue Console & Subtitle Operations

## Overview
This track delivers the torrent queue monitoring console and the subtitle variant operations UI — two data-heavy, real-time operational surfaces that share a dependency on live backend state.

## Functional Requirements

### FR-1: Torrent Queue Operations and Lifecycle Visibility
- Queue view at `/queue` with columns for:
  - Name, progress (percentage + bar), download/upload rates, ratio, ETA, peers, save path.
- Lifecycle state indicators: downloading, paused, seeding, completed, importing, error.
- Actions per torrent: pause, resume, remove (with confirmation and option to delete data).
- Live updates via SSE `torrent:stats` events — queue table updates in place without full refetch.
- Polling fallback: if SSE connection drops, fall back to polling every 5s until SSE reconnects.
- Expandable row detail: peer list, tracker info, file list.

### FR-2: Subtitle Variant Console
- Subtitle console at `/subtitles` providing variant-aware subtitle inventory per movie/episode.
- Variant selector: when a media item has multiple file variants, user selects which variant to inspect.
- Audio/subtitle track inspection table showing: language, codec, channels, source (embedded/external), default/forced/HI flags.
- Missing subtitle state: clear indicator for each wanted subtitle language per variant.
- Manual subtitle search: launch search for a specific variant (variant ID required — enforcement from 7A/7B).
- Manual subtitle download: select candidate from search results, download with progress/success/error feedback.
- Subtitle history timeline by variant showing past fetch attempts with provider, score, status.

## Non-Functional Requirements
- **Operational Performance:** Queue table with 50+ active torrents remains responsive (60fps scroll, < 100ms update latency from SSE event to render).
- **Reliability:** UI state recovers gracefully from transient API errors. SSE disconnection triggers automatic reconnection with visual indicator.
- **Usability on Mobile:** Queue table adapts to mobile viewport (card layout or horizontal scroll). Subtitle variant selector and search are usable at 375px.

## Acceptance Criteria
- [ ] Queue console displays all active/completed/error torrents with live-updating stats via SSE.
- [ ] Queue controls (pause/resume/remove) work with optimistic updates and error rollback.
- [ ] SSE fallback to polling operates transparently when stream disconnects.
- [ ] Subtitle inventory shows variant-aware audio/subtitle tracks with missing state indicators.
- [ ] Manual subtitle search/download enforces explicit variant selection.
- [ ] Subtitle history timeline displays per-variant fetch history.
- [ ] Mobile viewport (375px) remains usable for both queue and subtitle workflows.

## Out of Scope
- Dashboard, activity center, and settings UI (Track 7E).
- E2E journey automation and final hardening (Track 7F).

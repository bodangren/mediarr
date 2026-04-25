# Track Specification: Track 3 - Integrated Torrent Engine (Downloader Layer)

## Overview
Implement a built-in, persistent torrent downloading service using Node.js and WebTorrent. This layer will act as the internal "client" for Mediarr, eliminating the need for external software like qBittorrent or Transmission. It will handle magnet links/files, manage the download queue, and enforce global/per-torrent seeding and speed rules.

## Functional Requirements
- **Core Engine:** Integrated BitTorrent protocol support via `webtorrent`.
- **Queue Management:** Ability to add, pause, resume, and remove torrents.
- **Persistence:** Track download progress and state in the SQLite database to resume after restarts.
- **Transfer Controls:**
    - Global upload and download speed limits.
    - Automatic seeding management (stop based on seed ratio or duration).
- **Storage Strategy (Convention over Configuration):**
    - The engine will assume standard internal paths optimized for Docker volume mapping.
    - **Active Downloads:** Stored in `/downloads/incomplete`.
    - **Completed Downloads:** Automatically moved to `/downloads/complete` upon 100% completion.
    - Users are expected to mount their persistent volumes to these internal container paths.
- **Reporting:** Real-time progress tracking (percentage, speeds, peers, ETA) accessible via internal API.

## Non-Functional Requirements
- **Resource Efficiency:** The engine should run as a background service within the `server/` module, minimizing CPU/Memory overhead when idle.
- **Stability:** Graceful handling of network interruptions and disk space exhaustion.

## Acceptance Criteria
- [ ] A magnet link can be added to the engine via an API call.
- [ ] The file downloads into the `incomplete/` folder.
- [ ] Upon completion, the file is moved to the `complete/` folder.
- [ ] Global speed limits are respected during the download.
- [ ] The torrent automatically stops seeding once the pre-defined ratio/time limit is reached.
- [ ] The engine state (active torrents) persists across server restarts.

## Out of Scope
- Integration with external torrent clients (qBittorrent, etc.).
- Usenet/NZB support.
- Advanced "Super-Seeding" or complex tracker management.

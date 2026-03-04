# Specification: Streaming Server & Discovery

## Overview
Implement a high-performance backend streaming service for Mediarr that supports internal network discovery (mDNS), efficient video delivery (HTTP Range), and a rich manifest API for bespoke clients.

## Functional Requirements
- **mDNS/Zeroconf Discovery**: Broadcast the Mediarr service on the local network using the `_mediarr._tcp` type.
- **Direct HTTP Streaming**: High-performance Fastify route for serving media files from `/data/media` with full `Accept-Ranges` support for seeking.
- **Playback Manifest API**: A new endpoint `GET /api/playback/:id` that returns a unified JSON object containing:
  - Video stream URL.
  - Metadata (Title, Overview, Poster URL, Backdrop URL).
  - Subtitle track list (URLs to sidecar .vtt/.srt files).
  - Current resume position (if any).
- **Progress Tracking**: 
  - Prisma schema update to include a `PlaybackProgress` model.
  - API endpoint `POST /api/playback/progress` for periodic heartbeats from clients.
  - Logic to mark media as "Watched" once a threshold (e.g., 90%) is reached.

## Non-Functional Requirements
- **Performance**: Video serving must use stream-based delivery to minimize memory usage on the Bun/Fastify server.
- **Zero-Config**: Discovery must work without user intervention on standard home networks.

## Acceptance Criteria
- [ ] Server successfully broadcasts its presence via mDNS.
- [ ] Clients can seek (scrub) through high-bitrate video files without lag or crashes.
- [ ] Manifest API provides valid URLs for all subtitle tracks associated with a file.
- [ ] Playback progress is correctly persisted in the SQLite database and updated via API.

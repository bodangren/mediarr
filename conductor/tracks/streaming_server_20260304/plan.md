# Implementation Plan: Streaming Server & Discovery

## Phase 1: Persistence & Discovery
- [x] Task: Update Prisma schema to add `PlaybackProgress` model (mediaId, userId, position, duration, lastWatched).
- [x] Task: Create `PlaybackRepository` for querying and updating progress records.
- [x] Task: Implement `DiscoveryService` using `bonjour` or similar Bun-compatible library to broadcast `_mediarr._tcp`.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Persistence & Discovery' (Protocol in workflow.md)

## Phase 2: Playback APIs & Streaming
- [x] Task: Implement `StreamingController` in Fastify with `Accept-Ranges` and stream-based delivery for `/api/stream/:id`.
- [x] Task: Implement `PlaybackManifestController` (`GET /api/playback/:id`) returning video, metadata, and subtitle URLs.
- [x] Task: Implement `ProgressHeartbeatController` (`POST /api/playback/progress`) for client-side syncing.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Playback APIs & Streaming' (Protocol in workflow.md)

## Phase 3: Integration & Testing
- [ ] Task: Write integration tests for Range-based HTTP streaming (mocking partial requests).
- [ ] Task: Verify mDNS broadcast on a local network interface.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Integration & Testing' (Protocol in workflow.md)

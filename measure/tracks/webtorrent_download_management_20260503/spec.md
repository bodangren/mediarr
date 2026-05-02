# WebTorrent Download Management UI

## Overview

Build a comprehensive frontend interface for managing WebTorrent downloads. While the backend torrent engine is operational (WebTorrent native addon resolved, TCP-only mode working), users currently lack a proper UI to monitor and control active downloads beyond the basic queue view.

## Problem Statement

The WebTorrent integration is functional at the backend level, but the existing queue/activity screens show only basic torrent status. Users need visibility into download progress, speed, peers, and control operations (pause/resume/remove) to effectively manage their media acquisitions.

## Solution

Create a dedicated download management interface with real-time updates:

### Download List View
- Active downloads with progress bars (percentage, MB downloaded/total)
- Download/upload speeds (current and average)
- Peer count and health indicator
- ETA based on current speed
- Torrent name with quality/format info

### Torrent Controls
- Pause/Resume individual torrents
- Remove torrent with optional data deletion
- Priority adjustment (high/normal/low)
- Bulk selection and batch operations

### Real-Time Updates
- SSE events for download progress (torrent:stats)
- Speed history chart (last 5 minutes)
- Peer count changes

### Data Display
- Sort by: progress, speed, ETA, name, date added
- Filter by: status (downloading, seeding, paused, error)
- Search within active downloads

## Acceptance Criteria

- [ ] Download list shows all active torrents with progress/speed/ETA
- [ ] Pause/Resume controls work and persist through SSE updates
- [ ] Remove torrent removes from list and stops download
- [ ] Speed updates in real-time (1-second refresh via SSE)
- [ ] Bulk operations work on multiple selected torrents
- [ ] Mobile-responsive layout for all controls
- [ ] Tests cover torrent control actions and display logic

## Out of Scope

- Torrent creation/upload functionality
- RSS feed integration for automatic downloads
- Remote torrent client management (only local WebTorrent)
- Advanced peer management (ban specific peers)

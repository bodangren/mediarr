# Track: Flutter Player-First Navigation & Shell Default Route

## Overview
Fix the Flutter client to default to Home/Continue Watching instead of Activity, and correct shell navigation order.

## Goals
- Set Home/Continue Watching as default route
- Reorder shell navigation to prioritize library and playback
- Ensure player-first navigation works across Android TV, Linux, and macOS

## Acceptance Criteria
- [ ] Flutter app launches to Home/Continue Watching screen
- [ ] Shell bottom/side nav shows Library before Activity
- [ ] Navigation state persists across hot restarts
- [ ] Widget tests verify default route and nav order
- [ ] No unmocked Dio calls in router tests

## Non-Goals
- New screens or features
- Server-side changes

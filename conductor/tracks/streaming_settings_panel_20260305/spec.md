# Specification: Streaming Settings Panel & DB-backed Configuration

## Overview
Add a dedicated Streaming settings page in the React settings area and persist streaming configuration in the monolith database via `AppSettings`. Replace current env/hardcoded streaming behavior with DB-backed values where appropriate.

## Functional Requirements
- Add a `streaming` section to app settings persistence and API payloads.
- Add a Settings page at `/settings/streaming` to view/edit streaming configuration.
- Allow users to configure:
  - Discovery enabled/disabled.
  - Discovery service name.
  - Default playback user id.
  - Watched threshold percentage.
  - Subtitle directory allowlist root.
- Use persisted settings in runtime behavior:
  - Discovery startup reads `streaming` settings.
  - Playback default user and watched threshold come from `streaming` settings.
  - Subtitle directory allowlist root prefers `streaming.subtitleDirectory` and falls back to env for backward compatibility.

## Non-Functional Requirements
- Preserve backwards compatibility with existing settings records and old clients.
- Keep settings validation strict enough to reject invalid threshold/user values.
- Keep implementation monolith-native (single DB and process).

## Acceptance Criteria
- [ ] `GET /api/settings` includes `streaming` defaults for new/existing records.
- [ ] `PATCH /api/settings` accepts and persists `streaming` partial updates.
- [ ] `/settings/streaming` exists in navigation and saves values through settings API.
- [ ] Discovery and playback runtime use persisted streaming settings without requiring env vars.
- [ ] Automated tests cover repository mapping, API patch path, and streaming page save flow.

## Out of Scope
- Real-time hot-reload of mDNS advertising after settings changes without restart.
- Per-user authentication/session model redesign.

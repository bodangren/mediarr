# Spec: Real Auto-Update System

## Context

The update system currently exists as mock endpoints: `GET /api/updates/available` uses
`Math.random() > 0.7` to simulate finding an update, and `POST /api/updates/install`
uses `setTimeout` to simulate download progress. No real binary is ever downloaded.

The SPA has no Updates settings page at all — the backend endpoints are unreachable
from the UI.

Mediarr distributes as a Docker image or a standalone Bun binary. Updates should
check the GitHub releases API, download the new binary (or pull the new Docker tag),
and verify integrity.

## Requirements

### Server — Real Update Logic
1. `GET /api/updates/check` — fetch latest release from GitHub Releases API
   (`https://api.github.com/repos/<owner>/<repo>/releases/latest`), compare semver
   against current `package.json` version.
2. `GET /api/updates/available` — return cached latest release info (version, changelog,
   published date, download URL) or null if up-to-date.
3. `POST /api/updates/download` — download the release asset to a staging path
   (`/config/updates/`), verify SHA-256 checksum if provided in release body.
4. `POST /api/updates/install` — replace current binary with staged binary and restart
   (or signal Docker to pull and restart). For Docker mode, emit a "restart required"
   advisory instead of self-replace.
5. `GET /api/updates/progress/:id` — stream download progress (bytes downloaded / total).

### SPA — Updates Page
6. New route `/settings/updates` showing: current version, check-for-updates button,
   available update info (version, changelog), download+install button, progress bar,
   update history list.

### Configuration
7. `AppSettings.updateSettings` fields used: `branch` (stable/develop), `autoUpdateEnabled`.
   When `autoUpdateEnabled` is true, the scheduler checks for updates daily and
   auto-downloads (does not auto-install — user confirms install).

## Acceptance Criteria

- `GET /api/updates/check` returns real version comparison against GitHub.
- `POST /api/updates/download` downloads a binary and verifies checksum.
- `POST /api/updates/install` replaces binary or signals Docker restart.
- Download progress is trackable via `GET /api/updates/progress/:id`.
- SPA `/settings/updates` page shows current version, check button, update info, install button, progress.
- Auto-update scheduler checks daily when enabled, downloads but does not auto-install.
- All update endpoints have tests with mocked GitHub API responses.
- `CI=true bun test` — all tests pass.
- `cd app && npm run build` — builds clean.

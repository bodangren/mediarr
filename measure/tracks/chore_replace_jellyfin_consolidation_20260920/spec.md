# Spec: Replace Jellyfin with Flutter Client + Slim Mediarr Server

## Problem

The owner's media stack today includes:

- **Jellyfin** as the living-room playback server (real Jellyfin or the ThaiDub Python service at `/media/daniel-bo/320GB/serve.py`, `uvicorn` on `:8096`).
- **Jellyfin Android TV** (`org.jellyfin.androidtv`) as the TV playback client.
- **Mediarr** (`~/Desktop/mediarr`) as the management plane for the library, metadata, and acquisition, with a Jellyfin-compatible surface (`server/src/jellyfin/`) that a stock Jellyfin TV app can already browse and play against.

The Jellyfin half is the wrong shape for this household. It runs a multi-user authentication model, a transcoding engine, a plugin host, and a discovery responder — none of which a single trusted-LAN user needs. The Flutter Netflix-styled client already in `clients/mediarr-client/` (Android TV + Linux + macOS builds) is the right client; the legacy Kotlin client formerly at `clients/android-tv/` was deleted 2026-09-20 (Phase 3 of this track).

The owner has already moved `-arr` automation into the Hermes harness. The `-arr` domains inside Mediarr (torrent engine, indexers, import lists, RSS sync, subtitle automation, notifications, quality profiles) are therefore dead weight for the playback stack.

## Goal

A single-user LAN playback stack:

- **Server:** the existing Mediarr codebase, in a new slim mode that disables the `-arr` domains and presents a single trusted-LAN user. The existing Jellyfin-compatible surface stays as the wire protocol so the Flutter client needs no rewrite.
- **Client:** the Flutter app at `clients/mediarr-client/` is the only TV client. The stock Jellyfin Android TV app and the legacy Kotlin client at `clients/android-tv/` are gone.

## What Already Exists (source-verified 2026-09-20)

| Capability | Status | Location |
|---|---|---|
| Flutter Netflix-styled client (Android TV + Linux + macOS) | Exists | `clients/mediarr-client/lib/features/{home,library,playback,search,discovery,activity,calendar,settings}/` |
| Flutter already speaks the Jellyfin-compatible surface | Exists | `clients/mediarr-client/lib/core/` (Jellyfin DTO consumer) |
| Jellyfin-compatible server surface | Exists (in-progress track) | `server/src/jellyfin/` (catalog, sessions, playback, artwork, ids, referenceSurface) |
| Single trusted-LAN user model | Exists | `server/src/jellyfin/compatibilityDtos.ts` `buildTrustedLanUserDto`, `COMPAT_USER_ID` |
| Library scan, metadata, playback state | Exists | `server/src/services/LibraryScanService.ts`, `MetadataProvider.ts`, `PlaybackService.ts` |
| `JELLYFIN_ENABLED` config seam (off by default) | Exists | `server/src/config/jellyfin.ts`, `docker-compose.yml:13` |
| `network_mode: host` on the container | Exists | `docker-compose.yml:7` |
| Legacy Kotlin Android TV client | Deleted 2026-09-20 (Phase 3) | — |
| `-arr` domains (torrent, indexers, RSS, subtitles, notifications, quality) | To be disabled in slim mode | `server/src/services/`, `server/src/indexers/`, `server/src/seeds/` |

## Functional Requirements

### FR-1 — Slim mode config flag

A new env flag `MEDIARR_SLIM_MODE` (default `false`) MUST gate the `-arr` domains. When `true`:

- The torrent engine, indexer catalog, RSS sync, import lists, subtitle automation, notifications, and quality-profile seeds MUST NOT start.
- The schedule registry MUST NOT register their cron entries.
- Their API routes MUST return `404` or `503`, never partially initialise.
- The flag must default to the current full-stack behaviour so the existing deployment keeps working until the owner flips it.
- `ImportManager`, `Organizer`, and `LibraryScanService` MUST keep running. They are the deterministic backstop for library normalization (see FR-9). Hermes is the intended organizer, but LLM non-determinism makes Hermes forget; Mediarr picks up the trash.

### FR-2 — Single trusted-LAN user

In slim mode the server MUST advertise exactly one user (`COMPAT_USER_ID` / `Mediarr`). The auth-stub endpoints (`/Users/Public`, `/Users/AuthenticateByName`, `/Users/{uid}`) MUST continue to satisfy the login flow without storing credentials, mirroring the trusted-LAN model already in `compatibilityDtos.ts`. No new auth system MUST be added.

### FR-3 — Jellyfin-compatible surface stays

The surface in `server/src/jellyfin/` MUST continue to serve the routes the Flutter client uses. Discovery (`server/src/services/JellyfinDiscoveryService.ts`) MUST stay on so the Flutter client's existing `mDNS`/Jellyfin UDP discovery path keeps working. The full stock-Jellyfin-TV-app parity work in `feature_jellyfin_server_surface_20260729` (UDP broadcast listener, branding, sessions capability, etc.) is **out of scope** for this track; only the subset the Flutter client exercises stays green.

### FR-4 — Drop the legacy Kotlin Android TV client

`clients/android-tv/` MUST be deleted. `AGENTS.md` (Mandate 6) records the 2026-09-20 deletion. The deletion MUST be a single commit, after confirming no `package.json`, `pnpm-lock.yaml`, Dockerfile, CI workflow, or doc references it.

### FR-5 — Flutter becomes the only TV client

`clients/mediarr-client/` MUST build a release Android TV APK. The owner installs it on `192.168.10.62` (the existing smart-TV box) via ADB. Browse, direct-play with seek, and resume MUST work end-to-end. The `org.jellyfin.androidtv` package already on the box MUST be uninstalled before install.

### FR-6 — Default playback track selection

Playback MUST default to **English audio + Chinese (Simplified) subtitles** without any track picker on the user's part. When a media variant carries multiple audio or subtitle tracks, the server's Jellyfin-compatible playback response MUST rank English audio first and Chinese Simplified subtitles first; the Flutter player MUST honour that ranking silently. Manual override remains possible but MUST NOT be the default flow. The owner has an existing dual-language subtitle pipeline (the `chinese-subs` opencode skill, zimuku + kimi-webbridge) — the server-side ranking must align with the variants that pipeline produces.

### FR-7 — Subtitle timing adjustment

The Flutter player MUST let the owner shift subtitle timing forward and backward during playback (Kodi-style). Minimum requirements:

- A control that nudges the offset in fixed steps (proposed: ±0.5s, ±1s, ±5s).
- The offset persists for the current session and resets per media.
- A "reset to 0" action.
- The offset must apply to SRT and ASS renderers; PGS bitmap subtitles are out of scope unless the renderer already supports offset.
- Jellyfin does not ship this; Kodi does. The Flutter client has no equivalent today.

### FR-8 — Deploy defaults

`docker-compose.yml` and `.env.example` MUST default to `MEDIARR_SLIM_MODE=true` for the home-lab profile, and the `JELLYFIN_ENABLED` env MUST stay gated so the seam does not regress. The release README has a one-line "go slim" instruction.

### FR-9 — Library Normalization Safety Net

Hermes is the intended organizer for files dropped into the library. Hermes is non-deterministic — it often forgets to rename, refolder, or attach sidecars. Mediarr MUST pick up the trash deterministically.

- `LibraryScanService` MUST re-verify naming, folder layout, and metadata sidecars on every scan, not only at import time. Already-linked files are re-checked.
- A file whose name or folder does not match the canonical schema MUST be renamed and/or refoldered to match. The original is replaced in place, not duplicated.
- A file whose metadata sidecars (`poster.jpg`, `movie.nfo`, etc.) are missing or stale MUST be regenerated from `MetadataProvider`.
- The known `LibraryScanService` defect (one unreadable subdirectory rejects the entire scan) MUST be closed before slim mode ships; the trash-picker cannot tolerate blind spots. Track reference: `library_scan_resilience_20260801`.
- Self-healing work MUST be idempotent: re-running a scan against a healthy library produces zero changes.

### FR-10 — In-Place Permanent Transcoding for Guaranteed Seek and Replay

Hermes does not transcode at all. Mediarr MUST guarantee that every library item plays back with full seek and replay on the TV's hardware decoder.

- A `TranscodeProbeService` MUST classify each library file against the TV's safe-codec set (probed empirically on `192.168.10.62`; recorded codec/container matrix is the source of truth for the test).
- A file that fails the probe (no keyframe in the first 5 seconds, container without faststart, codec the TV rejects) MUST be queued for in-place transcoding.
- A `TranscodeWorker` transcodes the failing item to a fast-seek-safe target (MP4 with `+faststart`, fragmented MP4, or remuxed MKV with edge cues). The transcoded file replaces the original in place **after** a verification pass (probe the output, then swap).
- A `TranscodeScheduler` runs the queue on a cron schedule (e.g., nightly) plus an on-demand trigger from the SPA.
- A `TranscodeRepository` persists queue state. State changes (pending → active → completed/failed) MUST be published over the existing SSE event hub.
- The Jellyfin-compatible playback URL MUST return the transcoded file once the swap has completed.
- Idempotent: a healthy item is transcoded exactly once; re-runs are no-ops unless a re-probe detects failure.
- Runtime transcoding for streaming is **out of scope** (the LAN plays direct; no live transcode engine).

## Acceptance

- `MEDIARR_SLIM_MODE=true` boots: `-arr` services do not start, single user is advertised, Flutter client browses/plays/resumes against the box.
- `MEDIARR_SLIM_MODE=false` boots: full Mediarr behaviour preserved (existing tests still green).
- `clients/android-tv/` removed; no references remain in build, docs, or CI.
- Flutter Android TV APK builds, installs on `192.168.10.62`, exercises browse + play + resume.
- Playback defaults to English audio + Chinese Simplified subtitles with no manual track picker shown first.
- Subtitle timing nudge control works during playback (forward, backward, reset); offset applies to all rendered subtitle formats.
- `LibraryScanService` re-normalizes a deliberately-misnamed fixture file (raw release name → canonical) on the next scan, with the file replaced in place and zero changes on the second scan.
- A fixture file that fails the fast-seek probe is transcoded to MP4 faststart, replaces itself after verification, and the Jellyfin-compatible playback URL returns the transcoded file on the next request.
- Re-running the transcode schedule against a healthy fixture produces zero new transcodes (idempotence).
- The SPA Transcode Queue page reflects state changes over SSE in real time.
- `org.jellyfin.androidtv` uninstalled on the box; Flutter APK is the only media playback app.
- Root CI: `CI=true npx vitest run server/src tests` exit 0.
- SPA CI: `CI=true npm test --workspace=app` exit 0.
- Server strict typecheck: `npx tsc -p server/tsconfig.json --noEmit` zero diagnostics.
- Flutter analyze: `flutter analyze` zero issues.

## Out of Scope

- Stock Jellyfin TV app support beyond what the Flutter client exercises.
- Transcoding engine (the owner's LAN plays direct).
- Multi-user, real authentication, internet exposure.
- Migrating any data out of ThaiDub (`/media/daniel-bo/320GB/serve.py`). That service is **stopped for testing only, never disabled**, per the convention in `feature_jellyfin_server_surface_20260729/plan.md` Phase 0.
- Hermes harness changes (it owns the `-arr` work).
- Schema split or service extraction. The choice recorded in planning is "extend the existing TS surface, slim by config" — no `mediarr-stream` service, no Go rewrite.
- **Visual redesign of the Flutter client.** The current client follows the `DESIGN.md` "Near-Zero" Tesla aesthetic (poster-first, OLED black, no cards). The owner originally framed the goal as "Netflix-styled", then on 2026-09-20 confirmed the existing client "does not look or behave like Netflix". The pivot is **functional** (default track selection, sub timing nudge, slim server, drop legacy). Redesigning it to look like Netflix is recorded here as a deferred question, not a track requirement.

## Open Question (deferred, owner to decide)

- Should the Flutter client be visually redesigned toward a Netflix-style poster grid + hero banner layout, or is the Near-Zero aesthetic the intended end state? The functional priorities in FR-1 through FR-10 are independent of this answer.
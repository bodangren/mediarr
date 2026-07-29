# Spec: Jellyfin-Compatible Server Surface

## Problem

Mediarr manages and stores media but has no way for a living-room device to play it. The
Flutter client covers Android TV, but a stock **Jellyfin app on a smart TV** — already installed,
already familiar, already on the LAN — cannot see Mediarr at all. Today the owner runs a separate
Python server (`thaidub-serve.service`, `/media/daniel-bo/320GB`, `uvicorn` on `0.0.0.0:8096`) to
fill that gap, which means two servers, two libraries, and two sets of state.

`tracks.md` records this as the largest-effort, highest-differentiation candidate of the
sister-project scan. Verified 2026-07-26: one incidental mention of "jellyfin" in
`ExistingLibraryScanner.ts` and **no API surface whatsoever**.

## Goal

A stock Jellyfin client discovers Mediarr on the LAN without configuration, browses the library,
plays a file with seeking, and has its resume position and watched state persist — served by
Mediarr's existing database and storage, from a Podman container.

## What Already Exists (source-verified 2026-07-29, before acceptance criteria were fixed)

This is deliberately recorded because two prior tracks in this project were specced against code
that did not exist (`tech-debt.md`, 2026-07-26 `measure_process`).

| Capability | Status | Location |
|---|---|---|
| HTTP `Range` / 206 streaming | **Exists** | `playbackRoutes.ts:57` `parseRangeHeader`, `:157` |
| Resume position storage | **Exists** | `schema.ts:560` `position`, `:562` `progress` |
| Continue-watching query | **Exists** | `PlaybackService.getContinueWatching` |
| Progress heartbeat | **Exists** | `POST /api/playback/progress` → `recordHeartbeat` |
| Host networking in container | **Exists** | `docker-compose.yml:7` `network_mode: host` |
| mDNS announcement | **Exists, but wrong protocol** | `DiscoveryService.ts` (Bonjour *publishes*; Jellyfin needs a raw UDP *listener*) |
| Jellyfin API surface | **Absent** | — |
| UDP 7359 discovery responder | **Absent** | — |

**Consequence for the plan:** the resume/watched-state work is an *adapter over existing storage*,
not new persistence. The genuinely new components are the UDP responder and the endpoint surface.

## Functional Requirements

### FR-1 — UDP auto-discovery
A listener on `0.0.0.0:7359` MUST answer the Jellyfin client broadcast `"Who is JellyfinServer?"`
with a JSON datagram containing `Address` (`http://<lan-ip>:<port>`), `Id` (stable server GUID),
and `Name`. The advertised address MUST be the LAN-reachable IP, not `127.0.0.1` or a container IP.

### FR-2 — Server handshake
`GET /System/Info/Public`, `GET /System/Info`, `GET|POST /System/Ping`, and
`GET /Branding/Configuration` MUST return Jellyfin-shaped payloads with a stable `Id` matching FR-1.

### FR-3 — Authentication under the trusted-LAN model
`GET /Users/Public`, `POST /Users/AuthenticateByName`, and `GET /Users/{uid}` MUST satisfy a client's
login flow without introducing real authentication. The project's declared security scope
(`workflow.md`, 2026-03-05) is trusted household LAN with auth intentionally out of scope; this
requirement MUST NOT be read as a mandate to add an auth system, and MUST NOT expose Mediarr's
existing API to the internet.

### FR-4 — Library views
`GET /UserViews`, `GET /Users/{uid}/Views`, `GET /Library/MediaFolders` MUST present Mediarr's
movie and TV libraries as Jellyfin collections with correct `CollectionType`.

### FR-5 — Browse
`GET /Items`, `GET /Users/{uid}/Items`, `GET /Items/{id}`, `GET /Shows/{id}/Seasons`,
`GET /Shows/{id}/Episodes` MUST enumerate Mediarr's library with the paging, sorting, and
`ParentId` filtering the client sends. Item IDs MUST be stable across restarts.

### FR-6 — Artwork
`GET /Items/{id}/Images/{type}` MUST serve poster/backdrop imagery. **Note:** Mediarr stores
artwork as *remote TMDB URLs* (`posterUrl`), not local files — see the
`chore_remaining_server_service_coverage_20260728` finding. This endpoint must therefore proxy or
redirect, and the chosen approach MUST be recorded; a client that cannot follow a redirect needs a
proxy.

### FR-7 — Playback
`GET|POST /Items/{id}/PlaybackInfo` MUST return a playable direct-stream `MediaSource`.
`GET /Videos/{id}/stream` MUST serve the file with `Range` support, reusing `playbackRoutes`'
existing 206 implementation rather than a second copy.

### FR-8 — Sessions
`POST /Sessions/Capabilities`, `/Sessions/Capabilities/Full`, `/Sessions/Playing`,
`/Sessions/Playing/Progress`, `/Sessions/Playing/Stopped` and `GET /Sessions` MUST be implemented.
These are not optional: TV clients call them unconditionally and error-loop on failure.

### FR-9 — Resume and watched state
`/Sessions/Playing/Progress` MUST persist through the existing `PlaybackService.recordHeartbeat`.
`GET /Users/{uid}/Items/Resume`, `GET /UserItems/Resume` MUST read through
`getContinueWatching`. `POST /UserPlayedItems/{id}` MUST mark watched, and `GET /Shows/NextUp` MUST
return the next unwatched episode. **A position set on the TV MUST be visible in the SPA, and vice
versa** — one store, not two.

### FR-10 — Container delivery
The surface MUST run inside the existing Podman image. Because UDP broadcast does not traverse a
NAT bridge, the container MUST use host networking (already configured). Port 8096 MUST be
configurable, since it collides with `thaidub-serve.service`.

## Acceptance Criteria

- [ ] A stock Jellyfin app on the owner's smart TV **discovers Mediarr with no manual address entry**.
- [ ] It lists movie and TV libraries, browses into a series, and lists seasons/episodes.
- [ ] It plays a file and **seeks** (Range honoured, 206 responses).
- [ ] Stopping mid-file and reopening resumes at the stored position.
- [ ] The same resume position appears in Mediarr's SPA continue-watching.
- [ ] Marking watched on the TV is reflected in Mediarr.
- [ ] `CI=true npx vitest run server/src tests` passes with no new failures.
- [ ] `npx tsc -p server/tsconfig.json --noEmit` reports zero diagnostics.
- [ ] New route handlers are covered per `workflow.md` (>80% branch; 100% for APIs).
- [ ] `thaidub-serve.service` is **stopped, not disabled**, and the exact restore command is
      documented so the owner's working server can be brought back in one line.

### FR-11 — Complete reference-surface compatibility

The explicit owner directive to implement the Jellyfin server surface 100% supersedes the earlier
route-scope shortcut. Mediarr must expose every route declared by the working `serve.py` reference:
audio and download direct-play aliases, socket keepalive compatibility, and browser entry aliases,
as well as the established API routes. It must also preserve stopped playback position, emit
Jellyfin-shaped session DTOs from one header/body identity, advertise reachable artwork metadata,
and honour the browse/paging semantics the reference client uses. This does not add transcoding,
real authentication, multi-user storage, or subtitle delivery.

## Scope

**In:** the full declared reference endpoint surface, UDP discovery, container wiring, tests, and
on-device verification.

**Out:** transcoding (direct-play only — if the TV cannot decode a file, that is out of scope for
this track), multi-user accounts, subtitle *delivery* through the Jellyfin subtitle API (Mediarr's
own subtitle system is unaffected), and any change to Mediarr's existing REST API shape. The
socket route is now in scope only for compatible connection/keepalive handling, not WebSocket push.

**Explicitly out:** real authentication. See FR-3.

## Risks

1. **Undocumented client expectations.** Jellyfin's API is large and clients depend on unversioned
   details. Mitigation: the sister project at `/media/daniel-bo/320GB/serve.py` is a *working*
   implementation against this exact TV — consult it as prior art when a client misbehaves.
2. **Discovery is untestable in unit tests.** UDP broadcast behaviour depends on the network
   namespace. Mitigation: unit-test the responder's *encode/decode* logic; treat the on-device
   discovery check as human-gated, like the existing Docker/LAN verification blockers.
3. **Port collision with a service the owner depends on.** Mitigation: stop-only (never disable),
   document the restore command, and make the port configurable.
4. **Artwork indirection** (FR-6) may not survive some clients. Mitigation: decide proxy vs redirect
   from observed client behaviour, not from assumption.

## Notes

- Prior art read before speccing: `serve.py` (1643 LOC, ~45 endpoints) — endpoint list and the
  UDP 7359 mechanism are taken from a known-good implementation, not guessed.
- The existing `DiscoveryService` (Bonjour/mDNS) **cannot** be extended for this: Bonjour publishes
  records, whereas Jellyfin discovery requires listening on a raw UDP socket and replying. This is a
  sibling service, not a modification.
- Reuse `playbackRoutes`' `parseRangeHeader` rather than reimplementing Range parsing.

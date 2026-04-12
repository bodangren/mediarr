# Implementation Plan: Connectivity E2E Test Harness (podman compose)

## Phase 1 — Compose Harness, Server Image, Fixture Seeder

- [x] Task: Create `tests/connectivity/` directory with `compose.yml`, `Containerfile.server`, `Containerfile.client`, `README.md` skeleton
- [x] Task: Write `Containerfile.server` — oven/bun base, copy server + drizzle schema, install deps, install ffmpeg, generate fixture MP4s at build time into `/data/media/...`
- [x] Task: Write `tests/connectivity/scripts/seed-fixtures.ts` — Drizzle-based seed that runs migrations then inserts the movie + series/season/episode fixtures with `hasFile=true` and correct file paths; idempotent
- [x] Task: Add test-only SSE trigger route `POST /api/__test__/emit-event` behind `NODE_ENV==='test'` guard in `server/src/api/routes/`; emits a known event through `ApiEventHub`
- [x] Task: Write `compose.yml` — two services (`server`, `client-test`), host network, server exposes 8080; client-test `depends_on: { server: { condition: service_healthy } }`; server healthcheck hits `/api/system/status`
- [ ] Task: Verify `podman compose up server` starts the server clean, DB seeds, `curl http://localhost:8080/api/system/status` returns 200, and `avahi-browse -r _mediarr._tcp` (on host) shows the advertisement
- [ ] Task: Conductor - Checkpoint Phase 1

## Phase 2 — Dart CLI Connectivity Runner

- [x] Task: Create `clients/mediarr-client/tool/connectivity_test/` Dart package (`pubspec.yaml` with `multicast_dns`, `http`); standalone CLI
- [x] Task: Implement `bin/run.dart` entry point — orchestrates the test stages, prints structured report, exits with code matching first failure
- [x] Task: Implement `lib/discover.dart` — `package:multicast_dns` discovery of `_mediarr._tcp`, returns `(host, port)` or times out; falls back to `MEDIARR_DIRECT_URL`
- [x] Task: Implement `lib/assertions/library.dart` — GET `/api/movies`, GET `/api/series`, assert seeded fixtures exist with expected titles/IDs
- [x] Task: Implement `lib/assertions/stream.dart` — GET `/api/stream/:id?type=movie|episode` with `Range: bytes=0-1023`, assert 206 + correct byte count; tail range sanity check
- [x] Task: Implement `lib/assertions/sse.dart` — subscribe to `/api/events/stream`, POST to test-trigger route, assert event received within 10s
- [x] Task: Write `Containerfile.client` — dart:stable-slim build, AOT compile; debian:bookworm-slim runtime
- [x] Task: Wire `client-test` service in `compose.yml` to invoke the runner; verify green run end-to-end with `podman compose up --build --abort-on-container-exit --exit-code-from client-test`
- [x] Task: Add `npm run test:connectivity` script in root `package.json` invoking the compose pipeline
- [x] Task: Write `tests/connectivity/README.md` — what it tests, how to run, troubleshooting (multicast on rootless podman, avahi, firewalls)
- [ ] Task: Conductor - Checkpoint Phase 2

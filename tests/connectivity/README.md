# Mediarr Connectivity E2E Tests

End-to-end test harness that boots the real Mediarr server (Bun + Drizzle +
SQLite), seeds it with fixture media, and runs a pure-Dart client that walks
the full path from discovery → library fetch → byte-range streaming → SSE.

## What is tested

| # | Test | How |
|---|------|-----|
| 1 | Connect — `GET /api/system/status` returns 200 | HTTP |
| 2 | Movie library — seeded movie appears in `/api/movies` | HTTP |
| 3 | Series/episode — seeded series + episode appear in `/api/series` | HTTP |
| 4 | Movie stream — `Range: bytes=0-1023` → `206 Partial Content` + 1024 bytes | HTTP range |
| 5 | Episode stream — same as above for the seeded episode | HTTP range |
| 6 | SSE round-trip — subscribe to `/api/events/stream`, trigger test event, receive within 10s | SSE |

Discovery is attempted via mDNS (`_mediarr._tcp`) first; falls back to
`MEDIARR_DIRECT_URL` env var. In the default `compose.yml`, `MEDIARR_DIRECT_URL`
is set to `http://127.0.0.1:8080` so both containers talk over `host` networking.

## Quick start

```bash
# Requires podman + podman-compose (or docker compose)
cd tests/connectivity
podman compose up --build --abort-on-container-exit --exit-code-from client-test
```

Or from the repo root:

```bash
npm run test:connectivity
```

## Docker Compose alternative

```bash
cd tests/connectivity
docker compose up --build --abort-on-container-exit --exit-code-from client-test
```

## Fixture media

Two ~50 KB MP4 files are generated at image build time using ffmpeg
(`testsrc` pattern, 2 s, 320×240 H.264). They are **not committed** as
binaries; if you change the server image, rebuild with `--no-cache`.

## Troubleshooting

### `avahi-daemon` / mDNS not working on rootless podman

The compose file uses `network_mode: host` to avoid multicast bridging issues.
If mDNS discovery still fails, the client falls back to `MEDIARR_DIRECT_URL`
(already set in `compose.yml`) so tests still pass.

If you want to test real mDNS, unset `MEDIARR_DIRECT_URL` in `compose.yml` and
ensure avahi-daemon is running on the host:

```bash
sudo systemctl start avahi-daemon
```

### Server never becomes healthy

Check the server logs:

```bash
podman compose logs server
```

Common causes: missing `bun` binary, migrations failing due to a stale DB file
at `DATABASE_URL`. The DB is created fresh in `/tmp/connectivity.db` inside the
container on every run.

### `podman compose` not found

Install `podman-compose`:

```bash
pip3 install podman-compose
# or
sudo apt install podman-compose
```

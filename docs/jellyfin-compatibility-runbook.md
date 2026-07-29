# Jellyfin Compatibility Runbook

## Scope

This optional, trusted-LAN compatibility listener lets a stock Jellyfin TV client discover, browse, direct-play, and share playback state with Mediarr. It does not provide real authentication, remote exposure, transcoding, or WebSocket push.

## Activate for a TV check

1. In the deployment `.env`, enable the separate Jellyfin listener:

```dotenv
JELLYFIN_ENABLED=true
JELLYFIN_PORT=8096
```

2. Port 8096 belongs to the owner's ThaiDub service during normal use. Stop it only for this check, confirm it remains enabled, then start Mediarr:

```bash
systemctl --user stop thaidub-serve.service
systemctl --user is-enabled thaidub-serve.service # must still print enabled
docker compose up -d --build
```

The listener creates a stable identity file in the mounted `/config` directory; keep that volume when restarting or updating the container.

## Network and discovery

Jellyfin clients broadcast `Who is JellyfinServer?` over UDP port 7359. Docker/Podman bridge NAT does not carry that broadcast, so `docker-compose.yml` must retain `network_mode: host`. The responder advertises `http://<LAN-IP>:JELLYFIN_PORT`; do not use a loopback or container IP, and do not expose this trusted-LAN surface to the internet.

## Supported surface

- Discovery: UDP 7359 responder plus `/System/Info/Public`.
- Handshake/auth compatibility: `/System/Info`, `/System/Ping`, `/Branding/Configuration`, and the no-password `/Users` flow.
- Browse/artwork: `/UserViews`, `/Items`, `/Shows/{id}/Seasons`, `/Shows/{id}/Episodes`, and `/Items/{id}/Images/{type}`.
- Direct playback: `GET|POST /Items/{id}/PlaybackInfo` and `GET /Videos/{id}/stream`, including HTTP Range/206 seeking.
- Shared state: `/Sessions/*`, resume endpoints, `/UserPlayedItems/{id}`, and `/Shows/NextUp` use Mediarr's existing playback store.

Direct play is the only supported playback mode. A file the TV cannot decode will not be transcoded by this surface.

## Observe and prove

```bash
docker compose logs -f mediarr
curl -fsS "http://127.0.0.1:${JELLYFIN_PORT:-8096}/System/Info/Public"
curl -r 100-200 -sS -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:${JELLYFIN_PORT:-8096}/Videos/<jellyfin-item-id>/stream"
```

The first request must return the stable server `Id`; the range probe must return `206`. Logs should include the Jellyfin listener start line and discovery errors, if binding UDP 7359 failed.

## Safe rollback

```bash
docker compose down
systemctl --user start thaidub-serve.service
```

Or set `JELLYFIN_ENABLED=false` and run `docker compose up -d` to keep Mediarr's normal API running without the compatibility listener. Never run `systemctl --user disable thaidub-serve.service`; its exact restore command is always `systemctl --user start thaidub-serve.service`.

## Human-gated TV acceptance

Automated tests cannot prove LAN broadcast delivery or third-party client behavior. On the physical TV, verify:

- Mediarr appears without manually typing an address.
- Movie and TV libraries, seasons, episodes, and artwork browse correctly.
- Direct play starts and forward/back seeking produces usable playback.
- Stop/reopen resumes at the same point shown in Mediarr's SPA continue-watching view.
- Marking an item watched is reflected in Mediarr and NextUp advances.

Record the TV model/client version and any unexpected request path before expanding the endpoint surface.

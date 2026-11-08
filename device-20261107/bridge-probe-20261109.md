# kimi-webbridge probe — live evidence (B5, 2026-11-09)

B5 requirement: a probe that asserts **tool registration + extension connected** (not port
liveness), a per-call/run timeout for a wedged extension, and a reconnect check after restart.

## Why port liveness is not enough
`curl http://127.0.0.1:10086/` returns `426 Upgrade Required` for every path: the bridge only speaks
websocket, so a successful TCP connect says nothing about whether a browser extension is attached.

## Live probe (this session)
`mcp__webbridge__evaluate` with `({ probe: 'bridge-alive', two: 1 + 1, at: Date.now(), url: location.href })`:

```json
{ "probe": "bridge-alive", "two": 2,
  "at": 1794163533738,
  "url": "http://127.0.0.1:5174/library/movies" }
```

A real browser executed the expression and returned the SPA URL — that is extension connectivity, not
port liveness.

## Probe contract now written down
- `automation/expectations.yaml` → `bridge.probe`: expression, expected path/value, 15 s timeout.
- `automation/prompts/media-orchestrator-daily.md` → step 0b: registration check, one evaluate probe
  with the timeout, `BRIDGE_TOOLS_ABSENT` / `BRIDGE_WEDGED` alerts, and **re-probe after any host
  restart before trusting the bridge**. No curl-scraping fallback.

## Remaining (owner-gated)
The 5-minute per-call/run budget is enforced by the timer that launches the run; that timer needs the
gated harness cutover (B3/B4). The live reconnect-after-restart check can only be exercised when the
host itself restarts.

# 24/7 supervision evidence (B1) + dsh-host unit prepared (B3) — 2026-11-09

## The defect found while measuring
`systectl --user kill -s TERM mediarr` exposed a split-brain state: Fastify closed the listener
(health 000) but the process never exited, so systemd still reported `active (running)` and
`Restart=always` did **not** fire. Root cause: `close()` awaited a stuck background service (a
scheduler task / yt-dlp child), and the SIGTERM handler only exited in `.finally()`.

## Fix
`server/src/main.ts` now has a bounded shutdown: a repeated signal or a 15 s timeout
(`SHUTDOWN_TIMEOUT_MS`) forces `process.exit(1)`, and the ordinary path exits 0. This makes
`Restart=always` actually able to do its job.

## Measured after the fix (device: this machine, 2026-11-09)
- `systemctl --user kill --signal=TERM mediarr.service`
- journal: `[shutdown] graceful shutdown timed out after 15000 ms; forcing exit`
- journal: `Scheduled restart job, restart counter is at 1.` / `Started mediarr.service`
- `/api/health` returned 200 again **25 s** after the signal; `NRestarts=1`.
- Config: `UnitFileState=enabled`, `WantedBy=default.target`, `Restart=always`, `RestartSec=5`,
  `TimeoutStopSec=30`, user `Linger=yes` (user units start at boot without a login session).

## What is still owner-gated
**B1 reboot proof** needs an actual reboot. The harness that runs this agent is the web host on
`127.0.0.1:3080`; rebooting ends this session and interrupts the TV, so the reboot window must be
approved by the owner. Everything short of the reboot is measured above (enabled + linger +
supervision recovery), and the box has already survived several boots with the unit enabled.

**B3 cutover** is prepared: `automation/systemd/dsh-host.service` (danger-full-access, full PATH,
Restart=always, TimeoutStopSec=30) and `automation/scripts/install-dsh-host.sh`, which refuses to
run unless `DSH_HOST_CUTOVER=1` because stopping the terminal host also ends the agent turn running
it. `systemd-analyze --user verify` accepts the unit. Cutover needs a separate terminal or explicit
owner approval.

## Root cause found (same round, 2026-11-09 00:59)
Per-step logging identified the hung step: **`app.close()` never returned** — Fastify waits for open
keep-alive/SSE connections from the SPA and TV. Measured: `step 'api' exceeded 5000 ms; continuing`
then the forced 15 s exit.

Fix: Fastify is constructed with **`forceCloseConnections: true`**, and each shutdown step now has a
5 s budget with a log line (`SHUTDOWN_STEP_TIMEOUT_MS`).

After the fix the same kill test shows:
```
[shutdown] step 'background-services' done in 4 ms
[shutdown] step 'api' done in 2 ms
[shutdown] step 'container' done in 164 ms
```
No forced exit, and `/api/health` was back **10 s** after the signal (5 s RestartSec + boot).

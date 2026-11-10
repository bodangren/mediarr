# Hermes acquisition disabled; DSH successors scheduled (2026-11-10)

Track: `chore_migrate_hermes_automation_20261107` — Phase 5/6 cutover step, executed under the
owner's "complete the migration" instruction. **Nothing was deleted**; every change is reversible
with one command.

## Why now

The DSH daily media orchestrator has been scheduled since 2026-11-09 (first unattended 03:00 run
2026-11-10) while the old Hermes jobs were still active. That is the double-grabber condition the
architecture review called out (`TARGET-ARCHITECTURE.md` Phase 6: "two live grabbers = double grabs;
there is no shared dedupe"). The old `media-orchestrator` and `downloads-tidy` were also failing
every night with `HTTP 429 Token Plan quota`, so they contributed retry noise without doing work.

## What changed

| Component | Before | After | Rollback |
| --- | --- | --- | --- |
| `hermes cron` job `media-orchestrator` (03:00 daily) | enabled, 2 consecutive 429 failures | **paused** | `hermes cron resume media-orchestrator` |
| `downloads-tidy` (03:30 daily) | enabled, 429 failures | **paused** | `hermes cron resume downloads-tidy` |
| `adult-orchestrator` (Sun 04:00) | enabled (last ok 2026-11-08) | **paused** | `hermes cron resume adult-orchestrator` |
| `music-orchestrator` (Sun 02:00) | enabled | **paused** | `hermes cron resume music-orchestrator` |
| `fetch-monitor.timer` (systemd user, every 10 min) | active + enabled | **stopped + disabled** | `systemctl --user enable --now fetch-monitor.timer` |

Verified state: `~/.hermes/cron/jobs.json` shows all four jobs `enabled=False`
(updated 2026-11-10T21:38:02+08:00); `systemctl --user list-timers` no longer lists
`fetch-monitor.timer`.

## Successors now live

| Cadence | Run | Evidence |
| --- | --- | --- |
| Daily 03:00 | `schedule-81975ac5…` "Mediarr daily media orchestrator" (new session, receipt to `/config/orchestrator-receipts.jsonl`) | `device-20261107/orchestrator-schedule-20261109.md` |
| Weekly Sun 01:00 | `schedule-ad2f62de…` "Mediarr weekly music ingest run" (owner picks file required) | created 2026-11-10 |
| Weekly Sun 04:00 | `schedule-22a8d409…` "Mediarr weekly Adult discovery run" (browser bridge + candidate queueing) | created 2026-11-10 |
| Monthly first Sun 05:00 | `schedule-7ca868ce…` "Mediarr monthly rules review" (proposals only) | created 2026-11-10 |
| Weekly Sun 04:30 | "Mediarr weekly database backup" | `schedule-582bb043…` |
| Deterministic engine tasks | 21 server scheduler tasks healthy (scan, wanted, RSS, subtitles, YouTube poll/download/retention, staging tidy 04:30, music receipt 05:10, updates 04:00, folder import) | `GET /api/scheduler/tasks` |

The plugin-owned timers (05:00 nightly receipt, 04:45 retention sweep, alert delivery timer) still
wait on the owner-gated live plugin link (B3/B4), which ends this agent session when performed.

## Remaining for this track (all owner-gated)

1. **Harness cutover** — install/link `dsh-host.service` + media-automation plugin in the live
   profile; both restart this session (`DSH_HOST_CUTOVER=1 …install-dsh-host.sh`).
2. **Reboot proof** for B1 (reboot ends the session and the TV).
3. **Quarantine retention policy** — window + restore surface is an owner decision.
4. **One clean week** against `automation/expectations.yaml`, the four forced-failure tests and the
   rollback rehearsal — clock starts at this cutover; earliest close 2026-11-17.
5. **B9b torrent engine validation** — needs the 83.4 % Transmission torrent to finish first.

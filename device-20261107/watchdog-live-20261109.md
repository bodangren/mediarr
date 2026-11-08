# Substrate watchdog — implemented and run live (B9, 2026-11-09)

`automation/expectations.yaml` + `automation/dsh-media-automation/src/watchdog.js`
(tool `media_automation_watchdog`).

## Checks in expectations
- **host:** Mediarr `/api/health` must answer (5 s timeout).
- **heartbeat:** the automation brain must have written a heartbeat within 90 min.
- **bridge:** `mcp__webbridge__navigate` + `mcp__webbridge__evaluate` must be **registered tools**,
  not merely a listening port; 5-minute per-call budget is declared for wedged extensions.
- **scheduler:** subtitle-sync, youtube-download, bilingual-subs, subtitle-wanted-priority must have
  run within 180 min (a task that never ran yet is fresh-install, not staleness).
- **artifacts:** music/subtitle/coverage/sync receipts must exist and be fresh.
- Every failing check raises a **critical alert row + local JSONL line first**.

## Live run (2026-11-08T18:38:52Z, 17-test suite green)
```
mediarr-health  ok   HTTP 200
heartbeat       FAIL no heartbeat recorded      (plugin not linked yet — expected)
bridge-tools    FAIL missing navigate/evaluate  (run from a plain shell, not a tool-bearing turn)
scheduler-tasks ok   4 expected tasks fresh
artifacts       ok   3 fresh
```
Alerts on disk: 2 (one heartbeat, one bridge) — local-first fallback proven end-to-end.

## Still open
- Delivery status/retry (external transport) and the synthetic end-to-end alert need the plugin
  linked and its timer running — the owner-gated harness cutover (B3/B4/B6/B7 share it).
- 10-minute detection is a scheduling property: the watchdog tool is ready, the timer is not yet
  installed for the same reason.

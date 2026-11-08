# dsh-media-automation

The automation ledger for Mediarr's harness brain (track `chore_migrate_hermes_automation_20261107`,
task B4). Source of truth is this directory; the DSH profile links to it, never copies it.

## Frozen schema (version 1)

| table | purpose |
|---|---|
| `runs` | one row per agent-run attempt: `task_id` + `attempt` unique, `retry_of`, status `RUNNING/SUCCEEDED/FAILED/SKIPPED`, timings, outcome/summary, artifacts JSON |
| `jobs` | named scheduled jobs with last run/status |
| `locks` | named locks (the `browser` lock gates webbridge use) with owner + expiry |
| `alerts` | level/code/message, delivery status `PENDING/DELIVERED/FAILED`, attempts |
| `quarantine` | file path + sha256 + reason + state `QUARANTINED/RESTORED/DELETED` |
| `heartbeat` | exactly one row: the automation brain was alive at ... |
| `schema_meta` | schema version; a newer file refuses to open |

## Tests

```bash
npx vitest run automation/dsh-media-automation/test
```

Covers idempotent migration, run attempts + `retry_of`, single-row heartbeat, local-first alert
(JSONL written before the ledger row), lock expiry/ownership, quarantine counts and reload safety
(close + re-open the same file).

## Install (link, gated)

```bash
bash automation/scripts/install-media-automation.sh
```

The script refuses to run unless `MEDIA_AUTOMATION_CUTOVER=1` because the harness host that would
load the plugin is also the process running the agent turn that invoked it — the same cutover gate as
`dsh-host.service` (B3). It links the profile to this directory:

```bash
dsh plugin --profile web add link:/home/daniel-bo/Desktop/mediarr/automation/dsh-media-automation
```

## HMR

The plugin registers its tools inside `ctx.effect(() => …, 'media-automation:…')` and closes the
SQLite handle in the effect cleanup, so a host reload drops the old instance, releases the file and the
next instance opens the same ledger. `test/reload.test.js` pins that contract; the live HMR proof is
part of the gated install.

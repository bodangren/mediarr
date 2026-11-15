# dsh-operator-guard

Keeps **every** DeepSeek Harness session on the Mediarr operator contract, so a context-compacted
session cannot forget what the system is for.

## Why it exists

Owner escalation, 2026-11-14:

> *"You are not choosing new media for me, not downloading, not organizing… strip out any fucking api
> plumbing that's going to make you think you should use it… marry this harness to the system so that
> YOU handle it."* … *"You hallucinate so badly you can never remember what you are supposed to do."*

The scheduled prompts had degraded into API reconciliation + receipts: every run "succeeded" and
nothing was acquired for eight days. Prose in a plan file is not a control. This plugin is: the
contract and the **live** pipeline state are injected into the session, and a run cannot claim to be
finished without recording a state change or a concrete blocker.

## What it does

| Surface | Behaviour |
|---|---|
| `agent/created` (+ existing root agents on load) | injects [`automation/operator-contract.md`](../../operator-contract.md) plus a live pipeline report: last pick, last backup, last recorded run, Transmission queue, and the exact required actions |
| `agent/pre-step` | while the pipeline is **STALE**, injects one short "fix it, don't describe it" reminder per turn |
| tool `operator_guard_status` | returns the computed JSON state (`verdict: OK|STALE`, ages, queue, `actions`) |
| tool `operator_guard_record` | the required closing act of a run: `stateChanges[]` and/or a `blocker`. Rejects a run with neither (status-only runs are defects), appends to `/config/operator-runs.jsonl` |

Staleness rules (`src/state.js`, unit-tested):

- **acquire** — no media pick in `pass.jsonl` for more than **30 h** (or none ever);
- **backup** — no `/config/backups/*.db` newer than **7 days** (or none);
- **record** — no `operator-runs.jsonl` line in more than **36 h** (or none);
- **music** — no *ingest* receipt (`/config/music-ingest-receipts.jsonl`, where the weekly run and
every filed track land) in **8 days**. Deliberately not the nightly proof-of-life receipt: that file
updates even when nothing is ingested and would mask a dead music pipeline.

## Wiring (deployment = this repository)

```sh
# profile plugin directory is a symlink to the repo (same pattern as dsh-measure-guard)
ln -sfn /home/daniel-bo/Desktop/mediarr/automation/dsh-plugins/dsh-operator-guard \
        ~/.dsh/profiles/web/plugins/dsh-operator-guard
```

and an insert entry in `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: operator-guard
      name: ./plugins/dsh-operator-guard/index.js
      config:
        repo: /home/daniel-bo/Desktop/mediarr
        runsPath: /config/operator-runs.jsonl
```

Reload the plugin (Settings → Plugins) or restart the host — the `dsh-host.service` cutover does the
latter. Config keys: `repo`, `runsPath`, `passPath`, `musicPath`, `backupDir` (all optional; the
defaults are the live paths on this machine).

## Tests

```sh
node --test automation/dsh-plugins/dsh-operator-guard/test/*.test.js
```

The pure rules live in `src/state.js` with no Harness imports, so they run without a host. Known limit:
the Transmission queue is read with a 5 s `transmission-remote -l` call; when the daemon is down the
status reports `queue: null` and the operator checks by hand rather than the guard erroring.

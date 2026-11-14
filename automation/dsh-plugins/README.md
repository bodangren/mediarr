# DSH plugins owned by Mediarr

The DeepSeek Harness is part of this system, not an external tool: it runs the scheduled
automation, the triage loop and the Measure guards, so its plugins are versioned with the
product.

## `dsh-measure-guard/`

The plugin that enforces the Measure workflow inside DSH:

- tracks the active track/plan from `measure/tracks.md` and the plan files;
- refuses edits outside `measure/` while no task is `[~]`;
- refuses closing a phase without its `[checkpoint: <sha>]`;
- reports `[x]` tasks whose line does not end with the 7-character commit SHA
  (`measure/workflow.md` step 10), so every completed task is traceable to a commit;
- exposes the `measure_status` tool.

**Source of truth:** this directory. The DSH web profile does **not** hold a copy — it holds a
symlink:

```
~/.dsh/profiles/web/plugins/dsh-measure-guard
  -> /home/daniel-bo/Desktop/mediarr/automation/dsh-plugins/dsh-measure-guard
```

The harness therefore loads the plugin straight from this repository: an edit here is the deployed
change, and there is no copy to drift. Reload the plugin from DSH (Settings → Plugins) or restart the
host to pick it up. Verified 2026-11-08: `node --input-type=module -e "await import(...)"` resolves
`apply, digest, inject, name` from the repo path.

Known gap: `scripts/check-parity.sh` compares `src/core/*` against `automation/mods/measure-guard`,
which is not in this tree, so it cannot run. Treat these files as primary, not as copies.

## `dsh-operator-guard/`

Keeps every harness session on the operator contract (owner escalation 2026-11-14: the brain kept
forgetting it is the media operator, so runs became status reports and nothing was acquired for eight
days). It injects [the operator contract](../../operator-contract.md) plus the **live** pipeline state
(last pick, last backup, last recorded run, Transmission queue) into every root session, re-reminds
once per turn while stale, and exposes `operator_guard_status` / `operator_guard_record` — a run must
record at least one real state change or a concrete blocker, and status-only runs are rejected.
Pure rules in `src/state.js` with 17 `node:test` cases; wired into the web profile through a plugin
symlink to this directory plus a `cordis.patch.yml` insert entry, so editing here *is* the deployment.

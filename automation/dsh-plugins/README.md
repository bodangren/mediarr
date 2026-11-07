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

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

**Source of truth:** this directory. The running copy is installed in the DSH web profile at
`~/.dsh/profiles/web/plugins/dsh-measure-guard`. Edit here, then sync:

```bash
rsync -a --delete automation/dsh-plugins/dsh-measure-guard/ \
  ~/.dsh/profiles/web/plugins/dsh-measure-guard/
# then reload the plugin from DSH (Settings → Plugins) or restart the host
```

`check-parity.sh` in the plugin compares the two copies and reports drift.

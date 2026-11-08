# dsh-media-automation install proof (B4, 2026-11-09)

## Why an isolated profile
Linking a host plugin in the live `web` profile could reload the harness that runs this agent turn.
The install path was therefore proven in a throwaway profile, created from the shipped `web`
template and deleted afterwards — the live session was never touched.

```
dsh --profile media-test --from-default-profile web --dump-config
dsh plugin --profile media-test add link:/home/daniel-bo/Desktop/mediarr/automation/dsh-media-automation
```

First attempt warned: *"dsh-media-automation declares no dsh.bundle — installed as a plain
dependency, not a profile layer"*. Fixed by declaring the bundle in `package.json`:

```json
"dsh": { "manifestVersion": 1, "bundle": { "patch": "./cordis.patch.yml" } }
```

After the fix the composed config contains the layer exactly as intended:

```
# == dsh-media-automation
- id: media-automation
  name: dsh-media-automation
  config:
    ledgerPath: /config/media-automation-ledger.db
    expectationsPath: /home/daniel-bo/Desktop/mediarr/automation/expectations.yaml
```

## Plugin-load test (HMR stand-in)
`test/plugin-load.test.js` applies the plugin against a fake `ctx`:
- registers `media_automation_status`, `_heartbeat`, `_alert`, `_quarantine`, `_watchdog`;
- `ctx.effect` cleanup releases the ledger, and a second `apply()` on the same file sees the first
  instance's heartbeat and schema version 1.

19 plugin tests green. What remains owner-gated is only the **live host reload**: linking in the
`web` profile and proving a running host picks the plugin up ends this agent session (same gate as
`dsh-host.service`), so it belongs to the B3 cutover.

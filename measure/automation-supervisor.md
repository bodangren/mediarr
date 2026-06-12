# Measure Automation Supervisor

`measure/automation-supervisor.py` runs incomplete Measure phases through a
supervised, multi-agent TDD and audit pipeline.

## Pipeline

```text
Strategy
-> Red Testing
-> Green Implementation
-> Phase Acceptance Audit
-> Adversarial Test Audit
-> UI/UX Audit when applicable
-> Final Acceptance Audit after the track's final phase
-> Measure Closeout Steward
```

The adversarial test role owns durable browser automation such as Playwright.
The UI/UX role uses the `kimi-webbridge` skill for multimodal usability and
visual review; it does not replace automated browser tests.

## Default Models

| Role | Environment variable | Default |
|---|---|---|
| Strategy | `SR_MODEL` | `vocengine-coding/glm-5.1` |
| Red testing | `MID_MODEL` | `minimax-cn-coding-plan/MiniMax-M3` |
| Green implementation | `JR_MODEL` | `xiaomi/mimo-v2.5-pro` |
| Phase acceptance | `PHASE_ACCEPTANCE_MODEL` | `opencode-go/qwen3.7-plus` |
| Adversarial testing | `ADVERSARIAL_MODEL` | `vocengine-coding/ark-code-latest` |
| UI/UX | `UX_MODEL` | `kimi-for-coding/k2p7` |
| Final acceptance | `ACCEPTANCE_MODEL` | `vocengine-coding/glm-5.1` |
| Closeout | `CLOSEOUT_MODEL` | `minimax-cn-coding-plan/MiniMax-M3` |

Every role also supports matching `_AGENT` and `_RUNNER` variables, for example
`UX_AGENT` and `UX_RUNNER`.

## UI/UX Applicability

Set `PROJECT_DEV_URL` to the running application URL. `UX_REQUIRED` controls
whether the Kimi WebBridge audit runs:

- `auto` (default): run only when a dev URL exists and the phase changed frontend files.
- `always`: run for every selected phase.
- `never`: disable the UI/UX audit.

## Audit Evidence

Each audit role must write a passing structured JSON result under its run
directory. The supervisor rejects missing, invalid, or failing results. The UX
result must additionally record a healthy WebBridge status and evidence from
screenshots, accessibility snapshots, or browser interactions.

The closeout gate passes only after the completed track has moved from
`measure/tracks/` to `measure/archive/` and no longer appears in the active
section of `measure/tracks.md`.

## Commands

```bash
python3 measure/automation-supervisor.py --dry-run
python3 measure/automation-supervisor.py --track "feature_scheduler" --limit 1
python3 -m unittest measure/test_automation_supervisor.py
```

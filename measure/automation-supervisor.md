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
| Strategy | `SR_MODEL` | `vocengine-coding/glm-5.2` |
| Red testing | `MID_MODEL` | `minimax-cn-coding-plan/MiniMax-M3` |
| Green implementation | `JR_MODEL` | `deepseek/deepseek-v4-pro` |
| Phase acceptance | `PHASE_ACCEPTANCE_MODEL` | `vocengine-coding/glm-5.2` |
| Adversarial testing | `ADVERSARIAL_MODEL` | `minimax-cn-coding-plan/MiniMax-M3` |
| UI/UX | `UX_MODEL` | `kimi-for-coding/k2p7` |
| Final acceptance | `ACCEPTANCE_MODEL` | `openai/gpt-5.5` |
| Closeout | `CLOSEOUT_MODEL` | `deepseek/deepseek-v4-flash` |

Every role also supports matching `_AGENT` and `_RUNNER` variables, for example
`UX_AGENT` and `UX_RUNNER`.

## Audit Result Schema

Each audit role must write a passing structured JSON result under its run
directory. The supervisor rejects missing, invalid, failing, or inconclusive
results. The schema is versioned so future changes are explicit:

```json
{
  "schema_version": 1,
  "status": "pass|fail|inconclusive",
  "summary": "concise evidence-based conclusion",
  "blocking_findings": [],
  "nonblocking_findings": [],
  "evidence": [],
  "commands": [],
  "changed_files": [],
  "retry_recommendation": "none|retry_tests|retry_implementation|retry_audit|escalate_human|create_remediation_track|infrastructure_retry",
  "confidence": "low|medium|high"
}
```

UX audit results also require:

```json
{
  "webbridge_status": "healthy|unhealthy",
  "webbridge_evidence": {
    "screenshots": [],
    "accessibility_snapshots": [],
    "interactions": []
  }
}
```

Only use `status: pass` when `blocking_findings` is empty and the role has
enough evidence. Use `inconclusive` for infrastructure or tooling failures that
should not be treated as acceptance.

## UI/UX Applicability

Set `PROJECT_DEV_URL` to the running application URL. `UX_REQUIRED` controls
whether the Kimi WebBridge audit runs:

- `auto` (default): run only when a dev URL exists and the phase changed a
  documented user-facing path.
- `always`: run for every selected phase.
- `never`: disable the UI/UX audit.

In `auto`, user-facing paths are deterministic:

- Included exact files: `app/index.html`, `app/vite.config.*`,
  `app/tailwind.config.*`, `clients/mediarr-client/pubspec.yaml`.
- Included trees: `app/src/`, `app/public/`, `clients/mediarr-client/lib/`,
  `clients/mediarr-client/assets/`.
- Included suffixes under those trees: `.tsx`, `.jsx`, `.ts`, `.js`, `.css`,
  `.scss`, `.html`, `.dart`.
- Skipped paths: `measure/`, `docs/`, `server/`, `scripts/`, `tests/`,
  `.github/`, test/spec/story files, markdown files, mock folders, and test
  fixture folders.

## Retry and Escalation

Supervisor retries are bounded by `MAX_AGENT_ATTEMPTS`. Gate feedback includes
the retry policy on every failed attempt:

- Clear test or implementation gaps route back to the responsible agent for a
  focused retry.
- Schema/evidence gaps route back to the audit role without product-code edits.
- Product judgment, scope tradeoffs, or degraded UX acceptance stop for human
  input.
- Repeated blocking failures should preserve evidence and recommend or create a
  remediation track instead of looping.
- Infrastructure, network, or tool instability must be marked `inconclusive`;
  the supervisor must not archive the track from inconclusive evidence.

## Closeout Preflight and Artifact Cleanup

The closeout gate passes only after all of these are true:

- The completed track has moved from `measure/tracks/` to `measure/archive/`.
- `measure/tracks.md` no longer lists the track in the active section.
- Every non-deferred plan task is `[x]` and includes a commit SHA.
- Every phase heading has checkpoint or final-verification evidence.
- `metadata.json` has `status: done` and a `completed` date.
- The archived track contains `automation-supervisor-closeout-manifest.json`.
- Bulky per-phase run artifacts under `measure/runs/<run_id>/<track_id>/` are
  deleted before the closeout audit passes; the current closeout context may
  remain until the supervisor reads the audit result.

After closeout gates pass, the supervisor removes any remaining track-specific
run artifact directory. The compact manifest in the archived track is the
durable record for audit statuses, commands, commit/checkpoint SHAs, retained
evidence, and deleted artifact directories.

## Commands

```bash
python3 measure/automation-supervisor.py --dry-run
python3 measure/automation-supervisor.py --track "feature_scheduler" --limit 1
python3 -m unittest measure/test_automation_supervisor.py
```

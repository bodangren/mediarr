# Pi Measure Harness

A standalone Pi package that ports the local OpenCode Measure orchestration setup to Pi 0.80.6. It snapshots 24 role definitions, maps their models, enforces role-level mutation policy, and runs delegated roles in isolated Pi child processes with durable receipts.

## Requirements

- Node.js 22.19 or newer
- `@earendil-works/pi-coding-agent` 0.80.6 available as `pi`
- Canonical Measure skills under `~/.agents/skills/measure` and `~/.agents/skills/measure-orchestrator`
- Existing OpenCode credentials at `~/.local/share/opencode/auth.json` for migration

## Setup

```bash
npm install
npm run check
npm test
npm run parity
npm run configure
npm run migrate-auth
pi --list-models
```

`configure` merges this local package into `~/.pi/agent/settings.json`, adds the custom `vocengine-coding` provider, and routes MiniMax M3 through the Coding Plan-compatible `/v1` endpoint in `~/.pi/agent/models.json`. `migrate-auth` merges compatible credentials into `~/.pi/agent/auth.json` with `0600` permissions and does not overwrite existing Pi credentials unless run with `--force`.

Preview either operation without writing:

```bash
npm run configure:dry-run
node scripts/migrate-auth.mjs --dry-run
```

## Usage

Start Pi with the Measure orchestrator:

```bash
pi --agent measure-orchestrator
```

Select another role interactively with `/agent`, or validate the installation with `/measure-doctor`. The `task` tool starts a separate non-interactive Pi process and stores JSON receipts and JSONL event logs under `~/.pi/agent/measure-harness/tasks/`.

## Policies

- `measure-orchestrator` cannot edit files or run destructive Git/shell commands.
- Audit and acceptance roles may write only their orchestrator-supplied result artifact.
- Only orchestrator roles and `measure-jr-green` may delegate, following the packaged role matrix.
- Measure child roles must return the canonical `MEASURE_AGENT_RESULT` block.
- Task receipts record role, model, prompt/output hashes, Git heads, exit status, timestamps, and artifact path without storing credential values.

## Drift Detection

`npm run parity` compares this package's agent snapshot byte-for-byte with `~/.config/opencode/agent`, verifies the 24/22 total/callable counts, and checks that the JSON model map matches runtime mappings.

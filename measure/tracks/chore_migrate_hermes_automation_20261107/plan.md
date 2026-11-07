# Plan — Re-derive and migrate the media automation

> Contract-first + TDD per `measure/workflow.md`.
> Phase 1 is complete with evidence. Phases 2–3 are the planning team's work; 4–7 are build.

## Phase 0: Session prerequisites ✅ / ⚠️

- [x] Confirm what DSH authorizes for subagents in a session — recorded: the allow-list is
      written **once, at session creation**, and the previous session had only
      `deepseek-official/deepseek-flash`.
- [x] In the new session: Settings → Subagents → enable "Allow agents to choose models" and
      authorize at least two other families (`minimax-cn`, `moonshotai-cn`, `xiaomi`).
      **Verified 2026-11-07:** `~/.dsh/profiles/web/cordis.patch.yml` already carries
      `subagent-model-selection-settings.enabled: true` with six allowed models across
      `deepseek-official`, `minimax-cn`, `moonshotai-cn`, `xiaomi`.
- [x] Verify with `list_subagent_models`: three distinct providers must be listed before the
      team is spawned. **Verified:** four providers returned. Moonshot was authorized but
      every request **timed out on the first token** (two planners lost); the substrate brief
      was rerouted to `deepseek-official/deepseek-flash` so the three planning agents still
      span three distinct families (MiniMax, Xiaomi, DeepSeek).

## Phase 1: Inventory the old automation ✅

- [x] Read live definitions (`~/.hermes/cron/jobs.json`): 4 jobs, schedules, prompts, skills.
- [x] Read the non-Hermes piece: `fetch-monitor.timer` → `fetch-monitor.py --cleanup --no-rescan`, every 10 min.
- [x] Quantify reliability from `~/.hermes/cron/executions.db`: 167 runs, 42 failures, all provider-connectivity.
- [x] Map external surfaces (transmission :9091, jellyfin-go :8097 + SQLite, TPB/YTS/EZTV via kimi-webbridge, TMDB, SubHD, beets, subalign).
- [x] Map artifacts and filesystem contracts; classify the 15 scripts; record the doctrine.
- [x] Record what Mediarr's scheduler already covers (6 tasks in `serviceContainer.ts`).
- [x] Write [`inventory.md`](./inventory.md) and commit (`cfcae5f4`).

## Phase 2: Three-agent first-principles design ✅

- [x] Spawn three planners from three different model families; briefs in [`design/BRIEFS.md`](./design/BRIEFS.md).
      **Done 2026-11-07:** MiniMax (`cadence-designer`), Xiaomi (`mediarr-contract`), DeepSeek
      (`dsh-architect`). Moonshot was authorized but every request timed out on first token; the
      substrate brief was rerouted to DeepSeek so three distinct families did the work.
- [x] **cadence** → `design/intent-cadence.md`: behaviours, trigger classes, freshness, idempotency keys, failure signals, "do not schedule" list. **Done** — 7-field rows, five ranked behaviours, explicit drop list (music, adult, nfo, dedupe, LLM-in-hourly-loop).
- [x] **substrate** → `design/dsh-substrate.md`: schedule semantics vs plugin capability, reliability design, installable skeleton. **Done** — delivery≠execution proven from source; plugin outcome-attribution chain verified; skeleton marked UNVALIDATED.
- [x] **contract** → `design/mediarr-contract.md`: capability table with file:line, automation-facing contract, sequencing. **Done** — corrected the brief (torrent queue control exists); E1–E5; switch-off conditions.
- [x] Lead reads all three and grades them: every factual claim about DSH or Mediarr cited to source; no workflow transcription disguised as intent. **Done** — two substrate gaps found and corrected (unattended-session permission mode; host-down watchdog), live settings corrected to 12/20/60 min.

## Phase 3: Ratify ✅

- [x] Resolve D1–D4 in `spec.md` with the owner; record the rejected options and why.
      **Done 2026-11-07:** D1 more work in DSH (plugin code, never model turns in deterministic
      loops); D2 music scoped as its own track, adult folded into Movies; D3 indexers only, no
      browser bridge; D4 "never silently wrong". Four extra decisions resolved: quarantine-then-
      delete (14-day retention), DSH host systemd unit with full access, watch-next report +
      Collections, plugin ownership of the automation layer.
- [x] Merge the three designs into one target architecture (Lead) —
      [`design/TARGET-ARCHITECTURE.md`](./design/TARGET-ARCHITECTURE.md) v2 (owner-ratified).
- [x] Turn it into an ordered backlog with acceptance evidence per item — §8, B1–B11.
- [x] Amend this plan to match the ratified architecture.

## Phase 4: Build the substrate (v3 — agent-first)

> **Tooling installed and proven 2026-11-07** under owner approval — `yt-dlp` 2026.10.26,
> `beets` 2.14.1 (uv/Python 3.12 venv), `pnpm` 12.18.0, `uv` 0.13.7, ffmpeg 8.0.1; kimi-webbridge
> mounted into the web profile as an MCP server, with live `mcp__webbridge__navigate/evaluate` calls
> verified. Inventory and paths: [`automation/TOOLING.md`](../../../automation/TOOLING.md).

- [ ] **B1** Deploy Mediarr 24/7 (container `restart: unless-stopped` or systemd); prove reboot.
- [ ] **B2** Fix `subtitle-wanted-search` interval persistence (`TASK_INTERVAL_KEY`) + test; set
      rss 30 / availability 10–15 / wanted 60 in settings.
- [ ] **B3** Install `dsh-host.service` (systemd user, `DSH_PERMISSION_MODE=danger-full-access`,
      port 3080); replace the terminal-launched Host; prove reboot persistence.
- [ ] **B4** Scaffold `automation/dsh-media-automation/` (bundle + `jobs`/`runs`/`locks`/`alerts`/
      `quarantine` domains, heartbeat, alert webhook); install via `link:`; prove HMR restarts.
- [~] **B5** Mount **kimi-webbridge as an MCP server** (`@deepseek-ai/dsh-mcp-client`, stdio
      `kimi-webbridge mcp`), supervise Chrome + bridge as a service, and probe the bridge before
      agent runs; a dead bridge must alert, not hang. **Done 2026-11-07:** entry inserted in the
      web profile; host spawned the bridge (ws :10086, extension v2.0.23); agent-side
      `mcp__webbridge__navigate` + `evaluate` verified live. Remaining: bridge probe + dead-bridge
      alert (lands with B9).
- [ ] **B6** Write the **daily 03:00 media-orchestrator prompt** in `automation/prompts/` and run it
      manually: watch-next, wanted + web fetch (TPB/YTS/EZTV) via browser tools, YouTube
      subscription poll (if that domain exists), subtitle judgement, receipt with diagnosis.
- [ ] **B7** Plugin timers: downloads tidy (04:30), nightly receipt (05:00), **retention sweep**
      (04:45: YouTube watched+7d, quarantine expiry), weekly backup trigger, reconcile + Mediarr
      task-history polling.
- [ ] **B8** Quarantine engine: manifest validation, safety rails, atomic move, restore, retention
      delete, cap; **dry-run first week**.
- [ ] **B9** External watchdog timer + `automation/expectations.yaml`; prove host-down, bridge-down,
      plugin-down and Mediarr-down each alert ≤ 10 min.

## Phase 5: Migrate behaviours and wire the new domains

- [ ] Keep native Mediarr tasks (scan, wanted, subtitles, RSS, import lists, auto-update); the
      plugin verifies their receipts instead of re-implementing them.
- [ ] Move household jobs into the agent runs: daily media orchestrator, weekly music, weekly adult,
      monthly rules review. Prompts live in `automation/prompts/` (FR-8).
- [ ] Deterministic bookkeeping in the plugin; no custom DOM scrapers anywhere. Web surfaces are
      browser-agent work; `yt-dlp`/`beets` are maintained tools invoked from the runs.
- [ ] As each domain track lands (`feature_adult_library_20261107`, `feature_youtube_library_20261107`,
      `feature_music_library_20261107`), wire its agent run and retention job; before it lands the
      daily agent skips that domain and says so in the receipt.
- [ ] Disable (never delete) `music-orchestrator` and `adult-orchestrator`; the old scripts are not
      revived — `media-daily.py` and the TPB/YTS/EZTV scrape wrappers stay dead.
- [ ] Re-point every artifact path at Mediarr; `~/media-reports/` filename shapes kept.

## Phase 6: Cut over and verify

- [ ] Create successors first, run each manually once, diff output against the Hermes artifact.
- [ ] Disable (never delete) `media-orchestrator`, `downloads-tidy` and `fetch-monitor.timer`;
      archive `jobs.json` into this track.
- [ ] One clean week: every run's receipt present, zero silent misses, a forced provider outage and
      a forced browser failure each produce an alert, retention/quarantine proven.
- [ ] Test rollback once: re-enable `jobs.json` + gateway and confirm the old path still runs.

## Phase 7: Close

- [ ] Update `measure/tracks.md`, `tech-debt.md`, `lessons-learned.md`.
- [ ] Archive the track with the ratified architecture and the one-week evidence.

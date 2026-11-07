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

## Phase 4: Build the substrate (DSH-first)

- [ ] **B1** Deploy Mediarr 24/7 (container `restart: unless-stopped` or systemd); prove reboot.
- [ ] **B2** Fix `subtitle-wanted-search` interval persistence (`TASK_INTERVAL_KEY`) + test; set
      rss 30 / availability 10–15 / wanted 60 in settings.
- [ ] **B3** Install `dsh-host.service` (systemd user, `DSH_PERMISSION_MODE=danger-full-access`,
      port 3080); replace the terminal-launched Host; prove reboot persistence.
- [ ] **B4** Scaffold `automation/dsh-media-automation/` (bundle + `jobs`/`runs`/`locks`/`alerts`/
      `quarantine` domains, heartbeat, alert webhook); install via `link:`; prove HMR restarts.
- [ ] **B5** Plugin timers: downloads tidy (04:30), nightly receipt (05:00), quarantine sweep
      (04:45, **dry-run first**), weekly backup trigger, reconcile + Mediarr task-history polling.
- [ ] **B6** Quarantine engine: manifest validation, safety rails (active torrent / last copy /
      continue-watching / collection / cap), atomic move, restore, retention delete; shadow week
      before enabling.
- [ ] **B7** `automation/prompts/` + three DSH tasks (watch-next Sun 03:00, prune candidates
      Sun 03:30, rule review monthly); watch-next syncs the `Watch Next` collection.
- [ ] **B8** External watchdog timer + `automation/expectations.yaml`; prove host-down,
      plugin-down and Mediarr-down each alert ≤ 10 min.
- [ ] Test the substrate with a no-op occurrence before any old job is switched off.

## Phase 5: Migrate behaviours

- [ ] Keep native Mediarr tasks (scan, wanted, subtitles, RSS, import lists, auto-update); the
      plugin verifies their receipts instead of re-implementing them.
- [ ] Move the household jobs into plugin timers (tidy, receipt, quarantine, backup).
- [ ] Move weekly judgement to the three DSH tasks; prompts live in `automation/prompts/`.
- [ ] Retire `media-daily.py` and the deprecated `media-daily` skill; stop all `kimi-webbridge`,
      Chrome/VPN, jellyfin-go HTTP and jellyfin-go SQLite usage.
- [ ] Music: disable `music-orchestrator` (keep it, do not delete); hand automation to the new
      `feature_music_library_20261107` track; beets stays manual meanwhile.
- [ ] Adult: no separate orchestrator; content enters the normal Movies pipeline if wanted.
- [ ] Re-point every remaining artifact path at Mediarr; `~/media-reports/` filename shapes kept.

## Phase 6: Cut over and verify

- [ ] Create successors first, run them manually once, diff output against the Hermes artifact.
- [ ] Disable (never delete) the four Hermes jobs and `fetch-monitor.timer`; archive `jobs.json`
      into this track.
- [ ] One clean week: every run's receipt present, zero silent misses, provider outage produces an
      alert, quarantine manifest/restore proven.
- [ ] Test rollback once: re-enable `jobs.json` + gateway and confirm the old path still runs.

## Phase 7: Close

- [ ] Update `measure/tracks.md`, `tech-debt.md`, `lessons-learned.md`.
- [ ] Archive the track with the ratified architecture and the one-week evidence.

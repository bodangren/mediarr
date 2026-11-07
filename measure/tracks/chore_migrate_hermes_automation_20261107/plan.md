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

## Phase 3: Ratify

- [ ] Resolve D1–D4 in `spec.md` with the owner; record the rejected options and why.
      **Recommendations ready** in [`design/TARGET-ARCHITECTURE.md`](./design/TARGET-ARCHITECTURE.md) §9.
- [x] Merge the three designs into one target architecture (Lead) — [`design/TARGET-ARCHITECTURE.md`](./design/TARGET-ARCHITECTURE.md).
- [x] Turn it into an ordered backlog with acceptance evidence per item — §8, B1–B12.
- [ ] Amend this plan to match the ratified architecture.

## Phase 4: Build the substrate

- [ ] Decide per class: Mediarr scheduler task vs DSH scheduled task vs plugin.
- [ ] Build the run-ledger + alerting mechanism first (it is what makes the rest verifiable).
- [ ] If a plugin is required: scaffold, install into the profile, prove it survives a restart.
- [ ] Test the substrate with a no-op task before any real job is migrated.

## Phase 5: Migrate behaviours

- [ ] Move deterministic behaviours into Mediarr's scheduler; delete the duplicated prompts.
- [ ] Move judgement behaviours to DSH scheduled tasks; carry the intent, not the step list.
- [ ] Retire `media-daily.py` and the deprecated `media-daily` skill (dead since 2026-08-30).
- [ ] Re-point every remaining artifact path at Mediarr; jellyfin-go must not be referenced anywhere.

## Phase 6: Cut over and verify

- [ ] Create successors first, run them manually once, diff output against the Hermes artifact.
- [ ] Disable (never delete) the four Hermes jobs and `fetch-monitor.timer`; archive `jobs.json` into this track.
- [ ] One clean week: every run's receipt present, zero silent misses, provider outage produces an alert.
- [ ] Test rollback once: re-enable `jobs.json` + gateway and confirm the old path still runs.

## Phase 7: Close

- [ ] Update `measure/tracks.md`, `tech-debt.md`, `lessons-learned.md`.
- [ ] Archive the track with the ratified architecture and the one-week evidence.

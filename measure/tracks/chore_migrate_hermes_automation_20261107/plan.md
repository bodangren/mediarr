# Plan — Re-derive and migrate the media automation

> Contract-first + TDD per `measure/workflow.md`.
> Phase 1 is complete with evidence. Phases 2–3 are the planning team's work; 4–7 are build.

## Phase 0: Session prerequisites ✅ / ⚠️

- [x] Confirm what DSH authorizes for subagents in a session — recorded: the allow-list is
      written **once, at session creation**, and the previous session had only
      `deepseek-official/deepseek-flash`.
- [ ] In the new session: Settings → Subagents → enable "Allow agents to choose models" and
      authorize at least two other families (`minimax-cn`, `moonshotai-cn`, `xiaomi`).
- [ ] Verify with `list_subagent_models`: three distinct providers must be listed before the
      team is spawned. If not, the team runs same-family and says so in its output.

## Phase 1: Inventory the old automation ✅

- [x] Read live definitions (`~/.hermes/cron/jobs.json`): 4 jobs, schedules, prompts, skills.
- [x] Read the non-Hermes piece: `fetch-monitor.timer` → `fetch-monitor.py --cleanup --no-rescan`, every 10 min.
- [x] Quantify reliability from `~/.hermes/cron/executions.db`: 167 runs, 42 failures, all provider-connectivity.
- [x] Map external surfaces (transmission :9091, jellyfin-go :8097 + SQLite, TPB/YTS/EZTV via kimi-webbridge, TMDB, SubHD, beets, subalign).
- [x] Map artifacts and filesystem contracts; classify the 15 scripts; record the doctrine.
- [x] Record what Mediarr's scheduler already covers (6 tasks in `serviceContainer.ts`).
- [x] Write [`inventory.md`](./inventory.md) and commit (`cfcae5f4`).

## Phase 2: Three-agent first-principles design

- [ ] Spawn three teammates from three different model families; briefs in [`design/BRIEFS.md`](./design/BRIEFS.md).
- [ ] **cadence** → `design/intent-cadence.md`: behaviours, trigger classes, freshness, idempotency keys, failure signals, "do not schedule" list.
- [ ] **substrate** → `design/dsh-substrate.md`: schedule semantics vs plugin capability, reliability design, installable skeleton.
- [ ] **contract** → `design/mediarr-contract.md`: capability table with file:line, automation-facing contract, sequencing.
- [ ] Lead reads all three and grades them: every factual claim about DSH or Mediarr cited to source; no workflow transcription disguised as intent.

## Phase 3: Ratify

- [ ] Resolve D1–D4 in `spec.md` with the owner; record the rejected options and why.
- [ ] Merge the three designs into one target architecture (Lead).
- [ ] Turn it into an ordered backlog with acceptance evidence per item.
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

# Plan — Migrate Hermes media automation to DSH + Mediarr

> Contract-first + TDD per `measure/workflow.md`. Phase 1 is complete (evidence: `inventory.md`).
> Phases 3–6 are agent-executable once Phase 2's decisions land.

## Phase 1: Inventory the old automation ✅

- [x] Read the live job definitions, not the skill prose: `~/.hermes/cron/jobs.json` (4 jobs).
- [x] Read the systemd timer/service that is not in hermes: `fetch-monitor.timer`/`.service`.
- [x] Quantify reliability from `~/.hermes/cron/executions.db`: 167 runs, 42 failures, all provider-connectivity.
- [x] Map external surfaces (transmission 9091, jellyfin-go 8097 + SQLite, TPB/YTS/EZTV via kimi-webbridge, TMDB, SubHD, beets).
- [x] Map the artifact and filesystem contracts (`~/media-reports/`, `wanted.jsonl`, library roots).
- [x] Classify the 15 scripts and record the `media-pipeline-invariants` doctrine.
- [x] Record what Mediarr's own scheduler already covers (6 tasks in `serviceContainer.ts`).
- [x] Write it up in [`inventory.md`](./inventory.md).

## Phase 2: Decide the target shape

- [ ] D1 — runtime split (DSH judgement jobs vs Mediarr deterministic tasks). _Blocking._
- [ ] D2 — library scope (all four vs Movies/TV).
- [ ] D3 — keep or replace `kimi-webbridge`.
- [ ] D4 — confirm jellyfin-go parity gap that blocks the port.
- [ ] Record the accepted shape in `spec.md` and amend this plan.

## Phase 3: Move the specs out of hermes

- [ ] Copy the media skill set to a version-controlled home (repo `clients/`? no — docs/skills) and de-duplicate against `media-pipeline-invariants`.
- [ ] Port reusable skills into DSH-visible skills so the successor agents load the same doctrine.
- [ ] Keep exact prompt text for the four jobs; a ported job must not silently drop numbered steps (the prune-artifact regression is the cautionary tale).

## Phase 4: Retarget the surfaces

- [ ] Replace jellyfin-go REST calls with Mediarr API calls (library, user_data, refresh, favourites).
- [ ] Replace jellyfin-go SQLite reads with Mediarr DB queries (`recommend.py`, `daily-prune.py`).
- [ ] Re-point `fetch-monitor.py` library destination and rescan hook at Mediarr.
- [ ] Delete the dead `media-daily.py` / `media-daily` skill rather than porting it.

## Phase 5: Cut over

- [ ] Create the successor schedules, one job per weekday first, then daily.
- [ ] Disable (not delete) the four hermes jobs and `fetch-monitor.timer`.
- [ ] Archive `~/.hermes/cron/jobs.json` into the track folder as the rollback artifact.

## Phase 6: Verify and decommission

- [ ] One full cycle: every run produced its report; diff a ported report against the hermes one.
- [ ] Confirm zero provider-outage failures for remaining LLM jobs.
- [ ] Stop `hermes-gateway.service` for the media path; record rollback steps in the track README.
- [ ] Update `measure/tracks.md`, `tech-debt.md`, `lessons-learned.md` with what was dropped and why.

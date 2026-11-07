# Hermes → Mediarr automation migration — start here

**Track:** `chore_migrate_hermes_automation_20261107`
**Opened:** 2026-11-07 · **Status:** Phase 1 complete (inventory measured); Phase 2 not started.

## What this track is

The household media pipeline currently runs on Hermes: four LLM cron jobs plus one
systemd timer. jellyfin-go — which those jobs drive over HTTP and through its SQLite
database — is **deprecated**, and Mediarr (this repo) is the media server going forward.

The job is not to port the old workflows. It is to re-derive, from first principles,
what the system must do continuously / hourly / daily / weekly, and then make it happen
reliably with a combination of DSH scheduled tasks and (where necessary) custom DSH
plugins.

## Read in this order

1. [`inventory.md`](./inventory.md) — what actually runs today, measured against the live
   install (jobs, schedules, failure rates, external surfaces, scripts, artifacts).
2. [`spec.md`](./spec.md) — goal, principles, scope, open decisions, acceptance criteria.
3. [`plan.md`](./plan.md) — the phased plan and what is genuinely done.
4. [`design/BRIEFS.md`](./design/BRIEFS.md) — ready-to-paste briefs for the three planning
   agents (cadence, DSH substrate, Mediarr contract).

## Where the last session stopped

- ✅ Inventory measured and committed (`cfcae5f4`). Numbers are from
  `~/.hermes/cron/jobs.json` and `~/.hermes/cron/executions.db`, not from prose.
- ❌ Phase 2 (decisions) was not reached. Three planning agents were spawned and then
  stopped before writing anything — no design docs exist, nothing to recover.
- ⚠️ Cross-family subagents were unavailable in that session: only
  `deepseek-official/deepseek-flash` was authorized. DSH records the subagent model
  allow-list **per session at creation**, so it must be enabled *before* the session that
  needs it starts.

## Before starting the new session

DSH Settings → Subagents → enable **"Allow agents to choose models for Subagents"**, then
authorize the routes you want (the profile already has credentials for `minimax-cn`,
`moonshotai-cn`, `xiaomi`; `deepseek-official` is implicit). The setting applies only to
sessions created afterwards.

## Environment facts the next session must not rediscover

- Mediarr is **not** installed as a service. The dev instance from the previous session was
  stopped and port `5174` is free; start your own if you need one. It ran as
  `API_PORT=5174 MEDIA_DIR=/run/media/daniel-bo/4TB/mediarr-runtime tsx server/src/main.ts`
  from the repo root on Node 24 (`~/.nvm/versions/node/v24.18.0`). Node 26 also loads
  `better-sqlite3` fine, so the runtime choice was caution, not a verified incompatibility —
  `tracks.md` carries an unverified claim to that effect.
- The library tree `/run/media/daniel-bo/4TB/{downloads,media}` is owned by **uid 100999**,
  not the login user. Anything that writes there (`fetch-monitor` moves, imports) fails with
  `EACCES` until it is chowned, or until `MEDIA_DIR` is overridden to a writable path.
- `mediarr.db` carries a repaired migration ledger: migration `0007` was recorded under a
  transposed timestamp and blocked every startup until it was fixed. A backup sits at
  `mediarr.db.bak-20261107` (repo root, untracked).
- The TV box (`192.168.10.60`) runs an APK built before `82f6c7ce`; mDNS discovery does not
  work from it, manual entry does. That is a separate track, but it is why "the server is
  reachable" and "the client finds it" are different claims.

## Definition of done for the whole track

Every behaviour in the inventory has a named successor or a recorded drop decision; one
full week runs without a silent miss; `~/media-reports/` keeps its filenames; and the
Hermes media path can be re-enabled from an archived `jobs.json` if the new one misbehaves.

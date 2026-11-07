# Hermes → Mediarr automation migration — start here

**Track:** `chore_migrate_hermes_automation_20261107`
**Opened:** 2026-11-07 · **Status:** Phase 1 (inventory) and Phase 2 (three-family design) complete.
Phase 3 (owner ratification of D1–D4) is the only blocker before build.

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
4. **The ratified proposal:** [`design/TARGET-ARCHITECTURE.md`](./design/TARGET-ARCHITECTURE.md) —
   Lead synthesis; hourly/daily/weekly schedule, execution classes, DSH task + plugin +
   watchdog design, migration sequence, ordered backlog, D1–D4 recommendations.
5. The three independent designs it synthesises:
   [`intent-cadence.md`](./design/intent-cadence.md) (MiniMax) ·
   [`dsh-substrate.md`](./design/dsh-substrate.md) (DeepSeek) ·
   [`mediarr-contract.md`](./design/mediarr-contract.md) (Xiaomi).
6. [`design/BRIEFS.md`](./design/BRIEFS.md) — the ready-to-paste briefs used to spawn them.

## Where the last session stopped

- ✅ Phase 1 inventory measured and committed (`cfcae5f4`). Numbers are from
  `~/.hermes/cron/jobs.json` and `~/.hermes/cron/executions.db`, not from prose.
- ✅ Phase 2 complete: three independent designs written and graded. Two substantive corrections
  were made by the Lead in synthesis: (a) unattended scheduled sessions inherit
  `DSH_PERMISSION_MODE` and would fail closed without deliberate configuration; (b) a custom
  plugin cannot alert while the DSH Host is down, so an **external watchdog timer** is required
  in addition to the plugin.
- ✅ Synthesis written: `design/TARGET-ARCHITECTURE.md`.
- ❌ Phase 3 not done: D1–D4 need owner sign-off; then Phases 4–7 (build/cut-over) can start.
- ⚠️ Cross-family note: Moonshot (`moonshotai-cn`) was authorized but timed out on every request;
  the owner has since replaced it with `kimi-coding` (profile default `kimi-for-coding`). The
  allow-list is still fixed per session at creation, so this session could not use Kimi for a
  review pass; a new session will.

## Before starting the new session

DSH Settings → Subagents → "Allow agents to choose models" is already enabled. The profile patch
now lists `deepseek-official`, `minimax-cn`, `xiaomi`, and `kimi-coding` (default
`kimi-for-coding`). The setting applies only to sessions created afterwards — that is exactly why
a session started before a provider change cannot use the new provider.

## Environment facts the next session must not rediscover

- Mediarr is **not** installed as a service. The dev instance from the previous session was
  stopped and port `5174` is free; start your own if you need one. It ran as
  `API_PORT=5174 MEDIA_DIR=/run/media/daniel-bo/4TB/mediarr-runtime tsx server/src/main.ts`
  from the repo root on Node 24 (`~/.nvm/versions/node/v24.18.0`). Node 26 also loads
  `better-sqlite3` fine, so the runtime choice was caution, not a verified incompatibility —
  `tracks.md` carries an unverified claim to that effect.
- **The live DSH Host is a terminal-launched `node ~/.local/bin/dsh web` (no systemd unit);
  closing that terminal stops all scheduling.** Linger is enabled (`Linger=yes`), so a user unit
  will work. See `design/TARGET-ARCHITECTURE.md` §5.1.
- The library tree `/run/media/daniel-bo/4TB/{downloads,media}` is owned by **uid 100999**,
  not the login user. Anything that writes there (`fetch-monitor` moves, imports) fails with
  `EACCES` until it is chowned, or until `MEDIA_DIR` is overridden to a writable path.
- `mediarr.db` carries a repaired migration ledger: migration `0007` was recorded under a
  transposed timestamp and blocked every startup until it was fixed. A backup sits at
  `mediarr.db.bak-20261107` (repo root, untracked).
- The TV box (`192.168.10.60`) runs an APK built before `82f6c7ce`; mDNS discovery does not
  work from it, manual entry does. That is a separate track, but it is why "the server is
  reachable" and "the client finds it" are different claims.
- **The silent miss is real and measurable:** `~/media-reports/YYYY-MM-DD.md` stops at
  `2026-10-20`, yet `media-orchestrator` logged completed runs on `2026-11-06`. Even a
  "completed" agent run did not produce its artifact — why the design requires receipts and an
  independent watchdog rather than trusting a success status.

## Definition of done for the whole track

Every behaviour in the inventory has a named successor or a recorded drop decision; one
full week runs without a silent miss; `~/media-reports/` keeps its filenames; and the
Hermes media path can be re-enabled from an archived `jobs.json` if the new one misbehaves.

# Triumvirate review synthesis — v3 architecture (2026-11-07)

Three independent reviewers, three model families, lenses rotated away from each document's author:

| Reviewer | Family | Lens | File | Verdict |
|---|---|---|---|---|
| architecture-reviewer | MiniMax | DSH substrate / buildability | [`architecture-review.md`](./architecture-review.md) | **accept-with-fixes** |
| reliability-reviewer | Xiaomi | adversarial reliability / security | [`reliability-review.md`](./reliability-review.md) | **accept-with-fixes** |
| delivery-reviewer | DeepSeek | delivery / product / sequencing | [`delivery-review.md`](./delivery-review.md) | **not yet executable** |

**Overall:** the substrate is real and every cited API exists; the design direction is sound. But the plan
is **not ratifiable for P4/P5** (real media, real deletes). The blockers converge on environment
pinning, a single-instance browser, destructive defaults, an unbuilt alert chain, and schedule/retry
semantics that v3 left unspecified. Several reviewer claims were checked against the **real** install
and corrected below.

## 1. Corrections to the reviews (the Lead verified these)

| Reviewer claim | Reality (verified 2026-11-07) |
|---|---|
| Delivery BL-1: "B1 passes on an empty Mediarr; live DB has Media=0, Indexer=0" | They read the repo-root **test fixture**. The real DB is `CONFIG_DIR/mediarr.db` (76 MB): **550 movies, 28 series, real TMDB key, `authenticationRequired:false`, roots `/data/Movies` + `/data/TV`**. The conclusion still stands — **B1a is missing** — but the evidence was wrong. |
| Architecture M-6: "no movieRootFolder/tvRootFolder configured" | False for the real DB: roots are `/data/Movies`, `/data/TV`. The actual gap is that `/data` did not exist on the host (now fixed, §2 G1). |
| Architecture B-4: "quarantine cannot move library files because 4TB/media is uid 100999" | Library roots (`Movies`, `TV`, `Porn`, `Music`, top level) are uid **1000**; only `4TB/media` and `4TB/downloads` are 100999. Quarantine from the real roots works once staging is fixed. The path/ownership blocker is real but narrower. |
| Delivery: "`failOnStartupError:false` missing from the live mount" | False: `~/.dsh/profiles/web/cordis.patch.yml:52` sets it. |
| Architecture B-3: speed limit applied in the wrong unit | **Confirmed real bug.** `downloadClientRoutes.ts:121-125` passes Kbps → `TorrentManager.setSpeedLimits` (`:547-554`) → `setDownloadSpeedLimit(bytesPerSecond)` (`:528-534`) with no ×1024. Live 1024 → ~8 kbps. |
| Reliability BL-2: destructive delete-by-default | **Confirmed real.** `removeTorrent(infoHash, deleteData = true)` (`TorrentManager.ts:626`) deletes the DB row even when the payload `rm` failed (`:645-655`); reached by `DELETE /api/torrents/:infoHash`. |
| Delivery: "alert ≤ 10 min impossible on a 10-min probe" | Accepted: move to a 5-min probe with a ≤10-min detection / ≤15-min delivery target, and say so. |

## 2. Verified environment facts that change the plan

- **Real Mediaarr DB**: 550 movies / 28 series; `authenticationRequired:false` (trusted LAN, no auth);
  TMDB key present; **0 indexers**, 1 built-in download client, **0 notification transports**;
  torrent paths empty; intervals 15/30/60; `update.setupCompleted=false`.
- **`/data` and `/config` did not exist**; the DB's roots are container paths. Fixed today with root
  symlinks `/data → /run/media/daniel-bo/4TB`, `/config → /run/media/daniel-bo/4TB/mediarr-config`, and
  `4TB/downloads` (+ empty `4TB/media`) chowned to uid 1000. `/config` was 700/100999 and was chowned so
  the login user can read the real DB.
- **0 indexers → deterministic wanted-search/RSS have no sources.** Acquisition is browser-agent-only
  until indexers are added. This must be stated, not implied.
- **The DSH host runs without `DSH_PERMISSION_MODE`** (`/proc/<pid>/environ`): fresh scheduled sessions
  get `workspace-write` + `ask` and would fail closed. The systemd unit must set it.
- **Bridge**: binds `*:10086` (LAN), one extension session, dies on a port clash (no `'error'` listener),
  and the MCP client gives up after 10 attempts (~151 s) then **unregisters the tools** — so a failed
  browser path becomes a *normal turn end*, i.e. a silent miss (architecture B-2).
- **Turn-end kinds** (`dsh-session/types.d.ts:170-214`): `completed`, `aborted`, `blocked`, `error`,
  `max-tokens`, `interrupted`, `forked`. Only `completed` may count as `ok`; every other kind is a
  failure/terminal outcome in the ledger.
- **Tooling**: yt-dlp 2026.10.26, beets 2.14.1 (py3.12), pnpm 12.18.0, uv 0.13.7, ffmpeg 8.0.1;
  kimi-webbridge MCP live; bridge child auto-respawned and tools kept working after a kill.

## 3. Consolidated gates (fix before P4/P5)

**G1 — Environment, paths, ownership (partly done today).** `/data` + `/config` symlinks done; config
dir and staging chowned to 1000. Remaining: back up the real DB, pin `DATABASE_URL=file:/config/mediarr.db`,
`MEDIA_DIR=/data`, `ENCRYPTION_KEY` (dev key), set `torrentLimits.incompleteDirectory/completeDirectory`
to writable paths, and verify the app starts against the real DB.

**G2 — Browser substrate is single-instance and must be asserted.** Fix start ordering (stop the
terminal host before the unit; confirm :10086 free), add `browser` lock across every browser-using run,
assert `mcp__webbridge__*` **tool registration** (not port liveness) at the start of each occurrence,
add a per-call/run timeout so a wedged extension cannot hold the schedule slot, verify extension
reconnect after a host/bridge restart, and **reschedule the music run** off Sunday 03:00.

**G3 — Destructive safety.** No delete-by-default on the agent surface: patch `removeTorrent` default
and make `/api/torrents/:hash` require explicit intent; never delete the DB row when the payload delete
failed; all destructive agent actions go through one plugin-mediated tool with a dry-run; add a
reader→actuator split/allow-list so prompt-injected pages cannot call delete endpoints; receipts never
carry cookies/tokens.

**G4 — Alert chain with provable delivery.** Local-first channel (`notify-send` + incidents JSONL +
`systemd-cat`) with an optional webhook; **system-level** watchdog, not a user timer (dbus death kills
both); watchdog heartbeat; alert delivery status + bounded retry + local fallback; periodic synthetic
end-to-end alert; define the "clean week" query as `expectations.yaml` (zero occurrences with neither
receipt nor alert; zero duplicate receipts).

**G5 — Schedule semantics.** Use `new` targets (no wedge) plus plugin locks for serialization; ledger
key must group retries (`retryOf`/attempt) because `ctx.schedule.run()` mints a new occurrence; treat
`delivered` in-flight as abort/wait; map every `turn/end` kind; define per-task catch-up (daily = next
day, weekly = one `runNow` catch-up, monthly = alert); freeze the storage schema before first write;
record the preset used for scheduled runs.

**G6 — Quarantine spec.** Root on the 4TB filesystem (`4TB/quarantine`; `~` is a different device →
EXDEV), per-file hash manifest, copy+verify+delete for cross-device cases, explicit dry-run→live guard,
byte cap and overflow behaviour, and safety rails that do **not** reuse `isImportIncomplete` (it passes
when `prisma` is undefined).

**G7 — Torrent unit bug and cutover.** Fix Kbps→bytes/sec (or rename the setting), test it; set staging
paths; let the 83.4 % Transmission torrent finish and import the finished file (do **not** re-add — a
different engine and download dir means a full re-download); state the ratio/seeding forfeit; keep
`transmission-remote` read-only after disable.

**G8 — B1a: real deployment + library truth.** Back up the real DB, start against `/config`, verify
550/28 counts and `/data` roots, confirm the SPA and TV client, and only then count B1 as passed.
Acceptance: real library visible + playable, scheduler next-run present, root paths writable.

**G9 — Domain scope corrections.** YouTube retention only for subscription-managed items (never the 786
existing files), `isWatched && now−lastWatched > 7d`, a migration/keep-marking step, a per-poll cap, and
a **deterministic** `yt-dlp` poll (agent only for ambiguity). Music: beets filing only for new agent
imports, scanner accepts both existing layouts, non-destructive migration wins, a tag-quality bar, and
split "domain/ingest" from "player". Adult: define the filename grammar (hashes alone fail AC1), SPA-first.

**G10 — Cross-track prerequisites / single source.** One shared "library kinds + arbitrary roots +
generic nav" foundation before Adult/YouTube/Music; the Flutter focus fix + installed APK + TV release
path are hard prerequisites for any domain UI acceptance; one canonical backlog (architecture §9),
with plan.md referencing IDs only; fix the stale v2 text in plan Phase 3; correct README's blanket
uid-100999 claim.

## 4. Decisions to record (D8–D14)

| # | Decision | Recommendation |
|---|---|---|
| D8 | Alert channel | Local-first (desktop + incidents JSONL + journal) and an optional webhook; **system-level** watchdog; delivery status/retry + synthetic alert |
| D9 | Destructive ops | Plugin-mediated only, explicit delete intent, dry-run mandatory, delete never default; patch the Mediarr API default; reader/actuator split |
| D10 | Schedule semantics | `new` targets + plugin locks; `retryOf` attempt grouping; explicit `turn/end` mapping; per-task catch-up policy; frozen ledger schema |
| D11 | Browser policy | One browser runner; browser lock; tool-registration assertion; wedge timeout; music moved off Sun 03:00 |
| D12 | Paths/ownership | `/data`+`/config` symlinks (done), DB backup, pinned `ENCRYPTION_KEY`/`DATABASE_URL`, torrent staging paths, uid 1000 model |
| D13 | Acquisition sources | 0 indexers means browser-agent acquisition is the only live path; indexers are optional future work |
| D14 | Domain sequencing | Automation cut-over first; domains YouTube → Adult → Music(domain) → Music(player); SPA-first where possible; client focus fix is a prerequisite |

## 5. Revised execution order

`G1` → `G2/G3/G4` decisions + `B3` host unit (quiet handoff) → `B4` plugin (schema frozen: ledger, locks,
heartbeat, alerts) → `B5` finish (probe + tool assertion) → `B6` daily prompt → `G5/G6` → `B7/B8`
dry-run → `B9` watchdog + expectations → `B9b` torrent validation (after G7) → cut over automation →
domains in `D14` order. B10–B12 remain their own tracks and are **not** in this track's definition of
done.

## 6. What proceeds now

- **Done in this pass:** `/data` and `/config` mapped; config dir + staging chowned to 1000.
- **Next:** G8 (back up the real DB, start Mediarr against it, verify counts), G7 unit fix (TDD), G2/G3/G4
  decisions into the plugin/prompt designs, then B4.
- **P4/P5 remain gated** on G1–G3, G5, G6 with the forced-failure tests (browser wedge, webhook outage,
  delete-permission revoked mid-run) as clean-week evidence.

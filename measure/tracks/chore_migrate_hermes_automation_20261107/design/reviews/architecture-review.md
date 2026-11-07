# Architecture & DSH substrate review — v3 target architecture

**Reviewer:** `architecture-reviewer` (triumvirate; not the v3 author) · **2026-11-07** · **Lens:** is the plan buildable on *this* install? **Method:** read the named
docs, then verify every DSH/Mediarr claim against installed source (`$ROOT=/home/daniel-bo/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/`), the
live profile (`~/.dsh/profiles/web/cordis.patch.yml`, `~/.dsh/storages/`), the live DB (`mediarr.db`), live processes/ports and installed tooling. Read-only: no
service, profile, Chrome or torrent was started/stopped/modified. **Bottom line:** `design/dsh-substrate.md` is sound and both items it marked UNVERIFIED are now closed
(M-4, C-1); no API cited by the plan is fictional. The defects below are operational and design gaps, not fabrications.

## BLOCKERS

**B-1 · The bridge binds `0.0.0.0:10086` and dies on a port clash — the systemd cut-over silently loses the browser tools.** `kimi-webbridge/src/mcp.js:438-441` creates
`new WebSocketServer({port:10086,path:"/ws"})` with **no `host` option and no `'error'` listener**; live `ss -ltnp` → `LISTEN 0 511 *:10086 (pid=2588879)` — every
interface, not 127.0.0.1. A second `ws` server on the same port emits `'error'` `EADDRINUSE` (verified with the installed `ws` 8.18.2); with no listener Node makes that
an uncaught exception → the child dies. The terminal host (pid 2473142) owns :10086 today, so if the systemd unit starts while it lives, the new host's bridge dies in
seconds; the MCP client retries 500 ms→30 s with `maxAttempts:10` (`dsh-mcp-client/lib/index.js:434-439`) — a ≈151 s budget — then `:567-573` **unregisters the tools
and stops** ("reload the plugin or restart the Host to reconnect"). `failOnStartupError:false` (`~/.dsh/profiles/web/cordis.patch.yml:52`; default
`dsh-mcp-client/lib/index.js:789`) then lets the host boot **without** `mcp__webbridge__*` and without an operator-visible error. Fix: hard ordering (stop the terminal
host → confirm :10086 free → start the unit), don't let the unit fight for :3080 either, and make the watchdog assert **tool registration**, not port liveness. Binding
the WS server to 127.0.0.1 needs an upstream change — `CONFIG.WS_PORT` is hardcoded (`kimi-webbridge/src/mcp.js:36`).

**B-2 · The plan's browser-failure model is wrong: the tools *disappear*, they do not error.** `TARGET-ARCHITECTURE.md:114` promises "MCP tool error in the run; receipt
names it → alert". True for ≈2.5 min only (B-1); after that the agent has **no browser tools at all**, so the next run cannot attempt anything, there is no tool error
to name, and the plugin (which watches turns, not tool registries) sees a normal turn end — a *silent miss*, the exact class v3 exists to eliminate. Same for
`reconnect.enabled:false` (`dsh-mcp-client/lib/index.js:559-562`). Fix: raise `reconnect.maxAttempts` explicitly; assert the expected tool set at the start of every
occurrence; alert on "tools absent", not "child alive".

**B-3 · The built-in torrent engine applies the owner's speed limit in the wrong unit.** `server/src/api/routes/downloadClientRoutes.ts:121-125` passes
`globalDownloadLimitKbps` straight into `setSpeedLimits`; `server/src/services/TorrentManager.ts:528-534` documents `setDownloadSpeedLimit(bytesPerSecond)` →
`client.throttleDownload(rate)`, and `node_modules/webtorrent/index.js:436-442` + `node_modules/speed-limiter/README.md:49` confirm the rate is **bytes/sec**. No ×1024
conversion exists. Live (`mediarr.db` → `AppSettings.torrentLimits`):
`{"maxActiveDownloads":2,"maxActiveSeeds":4,"globalDownloadLimitKbps":1024,"globalUploadLimitKbps":512}` → effective **1024 B/s down / 512 B/s up (≈8 kbps / 4 kbps)**,
not 1 Mbps / 512 kbps. This lands precisely on B9b ("one real magnet end-to-end … record throughput"): 20 GB at 1 KB/s takes months. Fix the unit before B9b.

**B-4 · The quarantine engine cannot move library files — uid 100999 owns them, the plugin runs as uid 1000.** Live: `4TB/media` and `4TB/downloads` are `uid 100999`
(mode 755); `4TB/Movies`, `4TB/TV`, `4TB/Porn`, `4TB/Music` and `4TB` are `daniel-bo`. The plugin is in-process Node (`dsh-plugin-manager/README.md:31`) running as uid
1000 → `rename()` out of `4TB/media` fails **EACCES** (rename needs write permission on the source parent). Same split on the Mediarr side: the only live
`DownloadClient` row is *"Built-in WebTorrent"* with `torrentDirectory:/data/downloads/incomplete` (container path) → the container runs as uid 100999. So the
torrent/import path and the plugin's quarantine path live in **different uids**, and neither `TARGET-ARCHITECTURE.md` nor `plan.md` reconciles them. Fix the ownership
model before B8.

**B-5 · Two browser-using runs collide every Sunday, and the bridge serves exactly one browser session.** `TARGET-ARCHITECTURE.md:64` puts the daily orchestrator at
**03:00 daily**; `:75` puts the **music run at Sun 03:00** — the same minute — and both drive kimi-webbridge. The bridge accepts **one** extension connection:
`kimi-webbridge/src/mcp.js:451-455` rejects a second hello (4000) and `ExtensionConnection.attach` (`:62-63`) calls `detach()` first, so a reconnecting extension tears
down the previous run's session and rejects its in-flight calls (`:204`). `new` targets are not serialised (`dsh-schedule/lib/index.js:1199`,`:1307`;
`dsh-schedule/README.md:285`), so on Sundays both runs would start and one would break the other — a self-inflicted "browser failure" the alerting path would
misdiagnose as an outage. Fix: a single **browser lock** across every browser-using run, and move the Sunday music run off 03:00.

## CORRECTIONS

**C-1 · The proposed systemd unit drops `DSH_PERMISSION_MODE=danger-full-access`.** `spec.md` Q8 and `plan.md` B3 require it; the unit in
`design/dsh-substrate.md:363-380` does not set it. The variable is real: `dsh-base/cordis.patch.yml:246` (`mode: !!js process.env.DSH_PERMISSION_MODE ??
'workspace-write'`) and `:262` (`policy: … === 'danger-full-access' ? 'never' : 'ask'`). The live terminal host has **no** `DSH_PERMISSION_MODE` in
`/proc/2473142/environ` → it runs workspace-write + ask; fresh sessions inherit the composed default (`dsh-permission-presets/README.md:93-95`), so unattended 03:00
runs get `ask` and **fail closed** (`dsh-user-approval/README.md:28,32`). Also: the unit's `Environment=PATH=` omits the nvm bin and the beets venv bin required by
`automation/TOOLING.md:98-111`, and `~/.local/bin/node` symlinks into the Hermes tree (`~/.local/bin/node → ~/.hermes/node/bin/node`) while `~/.local/bin/dsh` is
`#!/usr/bin/env node` — decommissioning Hermes breaks the unit's interpreter.

**C-2 · `ctx.schedule.run()` mints a *new* occurrence key, so a retry never closes the original.** `dsh-schedule/lib/index.js:1187-1222`: `runNow` sets `occurrenceAt =
new Date(Date.now()).toISOString()` (`:1198`) and commits via `delivered()` (`:1421-1433`), not `advanced()` — correct (the next occurrence is not moved, as
`dsh-substrate.md:240` claims) but the receipt carries a *fresh* `scheduledAt`. The ledger key `${taskId}@${occurrenceAt}` therefore gets a second row and the original
occurrence stays `delivered` forever → "100 % of occurrences have a terminal outcome" (`dsh-substrate.md:274`) is unreachable for retried occurrences, and the §6.4
reconciliation sees a receipt matching no expected occurrence. `runNow` also returns `{admitted:false}` without delivering when the task is still executing or inside
its delivery floor (`:1192`) — a silently dropped retry if the plugin ignores it. Key the ledger on `taskId + attempt`, keeping the original occurrence as an attribute.

**C-3 · `new_once` can wedge the daily task permanently; `new` cannot.** A reused target's slot is released only at the target Agent's whole-agent idle boundary
(`dsh-schedule/lib/index.js:1405-1419`), and `drive()` skips any id in `executing` (`:1249`) — a turn that never goes idle keeps the id there, so **every later
occurrence is skipped** and the daily orchestrator silently stops firing until a host restart. `new_once` is rewritten to a plain `session` target on first delivery
(`:1424-1427`), inheriting that plus an unbounded transcript (`dsh-substrate.md:413` is still open on it). `new` holds no slot (`:1199`) but is **not** serialised — so
FR-5 (`spec.md:92`) is satisfied by neither target and must be the plugin's `locks` table. The `new` delivery floor is **host-global** (`newSessionIntervalSeconds`,
default 60 — `dsh-schedule/lib/types/index.js:201-202`, `dsh-schedule/README.md:59`), not per task.

**C-4 · `failOnStartupError:false` is defensible only if missing tools are observable.** Default is false (`dsh-mcp-client/lib/index.js:789`); the profile sets it
explicitly (`cordis.patch.yml:52`). `true` rejects plugin activation (`dsh-mcp-client/README.md:71`), which app-boot still tolerates for an optional MCP entry. Keep
`false` (so the rest of the automation still runs) and add the B-2 assertion.

**C-5 · The ledger is feasible with the cited APIs; its *schema evolution* is not.** `dsh-storage-domain` provides `put/get/update/delete/deleteMany/entries/keys` +
`global.set` (`dsh-storage-domain/lib/index.js:254-299`) — enumeration exists, so the reconciliation queries the design needs are possible; the host-wide `json` backend
(`dsh-base/cordis.patch.yml:182-190` → `root: dshHomePath('storages')`, `backend: json`) persists `media-automation` to `~/.dsh/storages/media-automation.json` (no
`schedule.json` exists → no scheduled task has ever been created in this profile). **But** every stored record is re-validated against the zod schema at open
(`dsh-storage-domain/README.md:73,94` → `invalid-record`) and a stored unit version outside the accepted set rejects with `version-mismatch`
(`dsh-storage-json/lib/index.js:106`); there is no migration hook, so the first schema edit during B4/B8 makes the ledger **fail to open** and the file must be
hand-deleted. Freeze the schema before the first write or make "delete and rebuild" an explicit dev step. Quarantine (atomic rename, manifest, restore) is buildable
in-process, but atomicity needs a device check: `rename()` is atomic only within one filesystem — live, `4TB` is `dev=2065` (/dev/sdb1) while `/home/daniel-bo` and
`~/media-reports` are `dev=2050` (/dev/sda2). A quarantine root under `~/media-reports` makes every move a cross-device copy (EXDEV): not atomic, and `fs.rename`
throws. Put the quarantine root on the 4TB mount, or copy Mediarr's pattern (copy → verify → delete, `server/src/services/TorrentManager.ts:911-941`).

**C-6 · Two citation slips (the plan's own rule is `path:line`).** WebTorrent is declared in the **repo-root** `package.json:57` ("^2.8.5"; installed 2.8.5), not
`server/package.json` (`TARGET-ARCHITECTURE.md:180`, `automation/TOOLING.md:33`). Everything else in §6.5 is exact: `MediaSearchService.ts:386-395` (the `addTorrent`
contract), `:794` (the call), `:902` (the "downloadClientId is accepted but currently not used" comment), engine init `TorrentManager.ts:117-133`, `SeedingProtector` at
`serviceContainer.ts:745`, client-type union `DownloadClientRepository.ts:8-16`.

**C-7 · `new WebTorrent()` has no options → DHT + LSD + UPnP/NAT-PMP + µTP are on.** `server/src/services/TorrentManager.ts:122` → `node_modules/webtorrent/index.js:76`
(lsd default true), `:78-79` (natUpnp/natPmp true), `:82` (µTP), `:127` (DHT unless `opts.dht === false`). Not a regression (Transmission today: `dht-enabled = True`,
`lpd-enabled = True`, `~/.config/transmission/settings.json`) but the plan should state it, because the *browser* uses Astrill for TPB (`TARGET-ARCHITECTURE.md:147`)
while the torrent client connects directly — the tracker sees the real IP. Neither engine carries a blocklist (Transmission's is disabled); WebTorrent has no blocklist
support at all.

**C-8 · The "re-add" branch of the Transmission decommission condition is not free.** `automation/TOOLING.md:48-52` allows "the active torrent completes **(or is
deliberately re-added to Mediarr)**". Re-adding starts from zero (WebTorrent imports neither Transmission's partial data nor its resume files), and Transmission's
download dir is `~/Downloads` (sda2) while Mediarr's is `/data/downloads` (4TB, sdb1): the re-add branch is a full re-download of the episode. Prefer "let the 83.4 %
torrent finish, import the finished file once, then switch".

## MISSING

**M-1 · The bridge-supervision claim is an assumption.** `automation/TOOLING.md:91-92`: "On a host restart the bridge restarts with it; Chrome/extension reconnect." The
bridge does respawn (host restart → new plugin instance → new child; HMR recomposition stops the plugin — `dsh-hmr/README.md:49` — and the replacement re-spawns it,
subject to B-1's port race). But the **extension** must re-connect to the new WS server (`kimi-webbridge/src/mcp.js:604`); nothing in DSH re-establishes that. Verify
auto-reconnect and make the probe assert "extension connected", not "port listening".

**M-2 · v3 states no schedule target and no lock design.** `TARGET-ARCHITECTURE.md` mentions neither `new`/`new_once` nor cross-task locking (only
`dsh-substrate.md:205-207,224-231` and `plan.md` B4 do). FR-5 requires "one occurrence key; one in-flight run per behaviour" — write it into the architecture as a
plugin responsibility with a named lock (and, per B-5, a *browser* lock).

**M-3 · `turn/end` has terminal kinds the ledger enum does not cover.** `dsh-session/lib/types/types.d.ts:170-214` — `TurnEndReasonMap` = `aborted | error | max-tokens
| interrupted | forked`; the enum in `dsh-substrate.md:262` is `delivered|ok|error|timeout|abandoned`. `max-tokens` (a long daily report hitting the output ceiling) and
`interrupted` (a crash-orphaned turn closed after the fact) have no mapping → a truncated run would count as "ok". Add the mapping table.

**M-4 · (closes an UNVERIFIED item) The `SessionEvent` envelope is now known.** `dsh-session/lib/types/types.d.ts:497-505` — `SessionEvent = { type, seq, time, data }`;
`'turn/end': { turn, reason }` at `:279-282`; `'user/message'` at `:300`; listener signature `(session: Session, event: SessionEvent) => void` at
`dsh-session/lib/types/index.d.ts:63`. The correlation chain (receipt `messageId` → `user/message.id` → `turn/end.reason`) is implementable exactly as
`dsh-substrate.md:161-176` describes.

**M-5 · Mediarr's own task failures have no alert channel.** `mediarr-contract.md:78` (E3): the seven notification transports have no task-failure trigger. The plugin
polls history, but if the plugin is down, Mediarr task failures are silent — so the external watchdog (B9) must assert Mediarr *task history*, not just Mediarr
liveness.

**M-6 · Mediarr is not configured to import anything yet (hidden prerequisite of B1/B9b).** Live `mediarr.db` → `AppSettings.mediaManagement` has **no
`movieRootFolder`/`tvRootFolder`** (defaults are empty strings, `server/src/repositories/AppSettingsRepository.ts:101-106`), and the sole download client points at the
container path `/data/downloads/incomplete`. B1's acceptance ("health green; scheduler nextRun present") should also require configured, writable roots. (Live scheduler
intervals: `rssSyncMinutes 12 / availabilityCheckMinutes 20 / wantedSearchMinutes 60` — B2's runtime values still need setting.)

**M-7 · No writer is assigned for the `~/media-reports/` artifacts.** Acceptance criterion 3 (`spec.md:110`) requires the filenames to survive, but the plan splits the
03:00 agent report and the 05:00 plugin receipt into the same directory, and a model writing into a shared artifact directory is a new failure mode (partial write, no
atomicity). Let the plugin own all receipts (temp file + `rename`) and have the agent write into a per-run directory the plugin promotes.

**M-8 · Tooling paths are all correct; only PATH breaks after a reboot.** Verified present: `~/.local/bin/yt-dlp` (2026.10.26), `/usr/bin/ffmpeg`, `/usr/bin/ffprobe`
(8.0.1), `~/.local/share/mediarr-automation/venv/bin/beet` (2.14.1, Python 3.12), `~/.local/bin/uv` (0.13.7), `~/.local/bin/pnpm` (12.18.0),
`~/.nvm/versions/node/v24.18.0/bin/kimi-webbridge` (0.1.3), `/opt/google/chrome/chrome`, `/usr/bin/sqlite3`, `/usr/bin/jq`. Post-reboot breakage is the unit's PATH and
the `node` symlink (C-1).

**M-9 · Version drift inside the architecture text.** `TARGET-ARCHITECTURE.md:238` refers to "P0–P9" while §8 defines P0–P6; §9 lists B1–B14 while `plan.md` Phase 4
lists B1–B9b.

**M-10 · Which preset the scheduled runs use decides whether they can manage their own schedule.** `dsh-tool-schedule/lib/index.js:480-494` captures
`agent.session.header.cwd` and `agentPresets.composedPreset(agent.ctx)` — but `composedPreset` returns a **preset id**
(`dsh-agent-preset-registry/lib/index.js:733-735`), not a frozen tool list, so a scheduled session binds the named preset at delivery time. The four reminder tools
exist only inside the `standard`/`cordis`/`ptc` presets (`dsh-web-app/presets/{standard,cordis,ptc}.patch.yml`), while the `schedule` **service** is host-level
(`dsh-web-app/cordis.patch.yml:135-136`) — the plugin can drive `ctx.schedule` regardless, but a scheduled prompt manages schedules only under those presets. Record the
preset for the daily/weekly runs.

## VERDICT

**accept-with-fixes.** The architecture is buildable on this install: the DSH substrate exists as described, every cited API exists, the storage-domain ledger is
feasible, and the WebTorrent decision is sound in direction. But the build must not proceed on the current text: **B-1/B-2** (bridge is single-instance, LAN-bound,
loses its tools permanently after ≈2.5 min), **B-3** (a real unit bug in the torrent path that B9b will hit), **B-4** (the quarantine engine cannot write to the library
as uid 1000) and **B-5** (Sunday 03:00 double-booking of a one-session bridge) are gates. **C-2/C-3/M-2/M-3** must be settled before B4/B6, because v3 specifies neither
the schedule target, nor the retry key, nor the lock, nor the `turn/end` outcome mapping. The rest are corrections to apply while building.



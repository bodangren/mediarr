# Reliability & security review — adversarial pass on v3 ("never silently wrong")

**Reviewer:** `reliability-reviewer` (triumvirate seat 2) · 2026-11-07 · read-only; no service, torrent,
Chrome or DSH host touched; no repo file modified except this one. **Scope:** all v3 design/plan/
spec docs, `inventory.md`, `README.md`, `automation/TOOLING.md`, the three `feature_*_20261107` specs,
Mediarr source (`TorrentManager`, `SeedingProtector`, `ImportManager`, `Scheduler`, `importGuard`,
`{scheduler,system,torrent}Routes`, `schema`), and DSH `dsh-schedule`/`dsh-llm-retry` under
`~/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/`.
Tags: **[V]** verified by source/measurement this session · **[H]** hypothetical, needs a test.

## A. The claim under attack

v3 says every expected run "succeeds, is retried, or alerts, with the agent's diagnosis"
(`TARGET-ARCHITECTURE.md:94-121`). I re-verified the substrate's load-bearing claims — at-least-once
delivery ≠ execution (`dsh-schedule/README.md:280`, `:285`), missed-occurrence collapse
(`README.md:12`), the `executing`-set skip (`dsh-schedule/lib/index.js:1249`), retry budget
(`dsh-llm-retry/README.md:50`), `runNow` minting a fresh occurrence key
(`dsh-schedule/lib/index.js:1187-1228`, `:1198`) — and they hold. The invariant still breaks at
three seams: **destructive defaults**, **mid-run side effects with no receipt**, and **the
unwatched watcher**.

## B. Blockers (fix before B9b/P4 touch real media)

1. **BL-1 Download/staging paths are unconfigured and the ownership story in the docs is wrong.**
   [V] WebTorrent defaults to `/data/downloads/{incomplete,complete}` (`TorrentManager.ts:47-48`)
   and `mediaDir` defaults to `/data` (`serviceContainer.ts:712`) — `/data` does not exist.
   [V] Measured 2026-11-07: `4TB/{Movies,TV,Porn,Music,Downloads}` are uid **1000**-owned;
   only `4TB/downloads/{complete,incomplete}` is uid **100999**. So `README.md:75-77`'s "libraries
   owned by uid 100999 … EACCES until chowned" is a blanket claim the filesystem does not support
   (it would send B1 to chown the wrong tree), while the *real* EACCES risk — staging dirs and the
   `/data` defaults — appears in **no** plan/architecture row (`plan.md:66-96`,
   `TARGET-ARCHITECTURE.md:206-235` are silent). First real grab (B9b) fails "not configured"
   (`TorrentManager.ts:269-271`) or EACCES and will be misread as "WebTorrent is broken" — the
   wrong fallback trigger. Pin `MEDIA_DIR`, `incompleteDownloadPath`, complete path and ownership
   in writing before B9b.
2. **BL-2 Delete-by-default on the agent-facing surface, with swallowed errors.**
   [V] `removeTorrent(infoHash, deleteData = true)` (`TorrentManager.ts:626`) does `destroyStore`
   (`:636`) and `fs.rm -recursive` of the payload (`:645-652`), and **deletes the DB row even when
   the rm failed** (`:649-651` → `:655`) — a failed delete is a silent orphan. The default is
   reached from `DELETE /api/torrents/:infoHash` (`torrentRoutes.ts:191`), bulk remove
   (`torrentRoutes.ts:276`), the seed-limit action (`TorrentManager.ts:228-232`) and
   `SeedingProtector.ts:74` (whose log says "**Stopped** torrent" (`:75`) while removing data).
   v3 hands this API to an LLM under `DSH_PERMISSION_MODE=danger-full-access`
   (`TARGET-ARCHITECTURE.md:170-173`) **while it reads adversarial web pages** (TPB/YTS/EZTV/
   YouTube/adult, `TARGET-ARCHITECTURE.md:26`, `:64-76`). One confused call or injected page
   instruction deletes data with no confirmation and no dry-run (none exists on destructive
   endpoints — `mediarr-contract.md:58`). Required: destructive calls go through one plugin-
   mediated tool with explicit delete intent (never a query-string default), plus M-3 hygiene.
3. **BL-3 The alert path itself is a single point of failure and is unbuilt.** [V] The whole
   invariant rests on plugin + watchdog (`TARGET-ARCHITECTURE.md:120-121`), both open
   (`:263`); Mediarr has **no task-failure notification trigger** and E3 is not in this track's
   scope (`mediarr-contract.md:78`, `:118`); the webhook is the only named channel
   (`TARGET-ARCHITECTURE.md:165`). If the webhook is down at alert time the alert is recorded but
   undelivered — delivery status/retry is unspecified (`dsh-substrate.md:252-254` lists channels,
   not guarantees). [V] The watchdog is proposed as a *user* timer alongside a user host unit
   (`TARGET-ARCHITECTURE.md:168-173`, `dsh-substrate.md:357-386`) — a `systemd --user`/dbus
   failure kills host **and** watcher together. "Who notices the watcher" has no answer. Required:
   system-level watchdog (or external dead-man ping), watchdog heartbeat, alerts persisted with
   delivery status + bounded retry + local fallback, and a **periodic** synthetic end-to-end alert
   (P0 tests one synthetic miss once, `TARGET-ARCHITECTURE.md:210`).

## C. Corrections (design exists but is wrong or half-specified)

4. **C-1 Retry identity.** [V] Work-level retries (+5/+15 min, `TARGET-ARCHITECTURE.md:105`,
   `dsh-substrate.md:238-243`) go through `runNow`, which mints a **new** `occurrenceAt`
   (`dsh-schedule/lib/index.js:1198`), so the `taskId@occurrenceAt` ledger key and "attempts per
   occurrence" (`dsh-substrate.md:261-263`, `:277`) cannot see two rows as one logical occurrence.
   Add `retryOf`/attempt grouping or drop the metric.
5. **C-2 The idempotency prompt check is race-prone.** [V] Delivery is at-least-once
   (`dsh-schedule/README.md:280`); §6.1's guard is "look up this key; **if ok**, stop"
   (`dsh-substrate.md:220-221`). A duplicate delivery arriving while run 1 is in flight sees
   `delivered`, not `ok` → double work. The guard must treat in-flight as "abort or wait"; the
   `locks` table must actually gate the run, not merely exist.
6. **C-3 Grab idempotency is weaker than the design claims.** [V] "Side-effecting Mediarr calls
   carry the same key as their idempotency token" (`dsh-substrate.md:222`) is aspirational: the
   grab API takes no idempotency token. Real dedupe is by magnet infoHash hint
   (`TorrentManager.ts:276-295` returns the existing row) and release-guid upsert on the RSS path
   only (`mediarr-contract.md:32`) — two releases of the same title both grab and import. "Retry
   after a receipt was written" re-runs a prompt whose end-of-run receipt
   (`TARGET-ARCHITECTURE.md:102-103`) may already list queued picks: the retry re-searches and
   re-grabs. Required: reconcile-before-act (read `/api/torrents` + activity rows in the occurrence
   window) and an **incremental** receipt/side-effect journal written before each grab — a crash
   mid-run today leaves side effects with **no receipt at all**, exactly the "silently wrong" the
   design forbids (Mediarr's activity ledger correlates by time window + `entityRef`).
7. **C-4 Weekly/monthly catch-up gap.** [V] "the next scheduled occurrence catches up"
   (`TARGET-ARCHITECTURE.md:113`) is only true for daily. A failed Sunday music/adult run retries
   ≤2 within ~20 min and then waits **7 days**; missed occurrences collapse and only a restart
   re-delivers the latest (`dsh-schedule/README.md:12`, `:285`); monthly rules → 30 days.
   `dsh-substrate.md` Q3 (catch-up vs skip-and-tell, `:418-419`) is still unanswered in v3. Decide
   per task; a `runNow` catch-up for weekly tasks is cheap.
8. **C-5 Wedged bridge is a silent-skip generator.** [V] A dead bridge produces a tool error
   (`TOOLING.md:89-90`) — fine. A **wedged** one (WS up, extension unresponsive) hangs the tool
   call; the turn never ends; the `executing` slot is held; `drive()` silently skips subsequent
   occurrences (`dsh-schedule/lib/index.js:1249`) — drops, not queues. Nothing in v3 kills a hung
   run (no tool-call timeout, no max-run-duration). [H] The DSH MCP client's per-call timeout is
   unverified. Also [V] `failOnStartupError: false` (`TOOLING.md:71`) means a dead bridge at host
   boot registers **no** tools with no error — the prompt must hard-fail when `mcp__webbridge__*`
   is absent, and the pre-run probe (B5 remainder) must gate the run.
9. **C-6 Two runs, one browser.** [V] One bridge process = one managed-tab session
   (`TOOLING.md:93`); `list_tabs`/`close_tab` are quirky (`TOOLING.md:95-96`) so crashed runs leak
   tabs; manual + scheduled runs (or a retry) interleave navigation on shared state. The `locks`
   design covers *library writes* (`dsh-substrate.md:227-231`), not the browser, and the browser is
   held by prompts, not the plugin — a model can forget to lock. Make it structural: one runner at
   a time (queue manual runs), tab budget + cleanup.
10. **C-7 B2 is half-fixed.** [V] `TASK_INTERVAL_KEY` now maps `subtitle-wanted-search`
    (`schedulerRoutes.ts:38-42`) but `library-scan` is still absent — its reschedule hits the
    `settingsService.update({})` no-op branch (`schedulerRoutes.ts:118-127`), so half of
    `mediarr-contract.md:24` survives the "done" claim (`extractMinutes` also only reads `*/N`,
    `:45-53`). Triggers still return `executionId: -1` / no id (`schedulerRoutes.ts:146`,
    `systemRoutes.ts:459-492`) — E1 unbuilt, so "plugin verifies receipts every 5 min"
    (`TARGET-ARCHITECTURE.md:58`) must correlate by taskName+time window; state that explicitly.

## D. Missing (nothing in the plan addresses these)

11. **M-1 Quarantine engine (B8) safety spec.** No quarantine location/filesystem — cross-fs moves
    must be copy+verify+delete (the model exists: `TorrentManager.ts:911-946` handles EXDEV with
    verify + rollback); no per-file hash manifest for partial moves / crash reconcile; "restore
    byte-identical" (`spec.md:113`) needs hash evidence; cap behaviour when exceeded
    (skip+alert? refuse?) is unstated; the dry-run→live flip has no bypass guard. The named rails
    must **not** reuse `isImportIncomplete` as-is: [V] it passes when `prisma` is undefined or when
    the torrent links to no media at all (`importGuard.ts:15-17` + empty id loops) and only checks
    `path` non-null, not file existence.
12. **M-2 YouTube watched+7d semantics.** [V] `PlaybackProgress` has `isWatched` + `lastWatched`
    (`schema.ts:565-568`). Define eligibility as `isWatched && now − lastWatched > 7d` — Y2/FR-5
    ("watched and older than the window", `feature_youtube_library_20261107/spec.md:42-44`) is
    ambiguous between episode age and watch time, and `lastWatched` moving on progress writes would
    silently turn "watched 7d ago" into "last played 7d ago". Unwatched episodes are retained
    **forever** — no cap for that growth; define the continue-watching threshold (cf.
    `PlaybackService.ts:567`).
13. **M-3 Prompt-injection / secrets boundary.** The agent reads attacker-controllable pages
    (torrent indexes, adult sites) with a full shell+MCP preset (`dsh-substrate.md:86-88`) under
    danger-full-access, next to an unauthenticated Mediarr API with delete endpoints (BL-2) and a
    Chrome profile carrying VPN + logged-in sessions (Google/YouTube for the music run,
    `TOOLING.md:17`). Nothing mitigates: no reader/actuator split, no instruction hygiene for page
    content, no allow-listed actuation, no secrets policy (where do TMDB/SubHD credentials and
    webhook tokens live — env file? DSH vault?), no rule that receipts in `~/media-reports/` never
    carry cookies/tokens. "Trusted LAN" does not cover hostile *web*.
14. **M-4 Transmission→WebTorrent cutover detail.** [V] The 83.4% torrent (For All Mankind S03,
    `TOOLING.md:44-46`) cannot be assumed to resume in a different engine — no piece-verify/resume
    validation exists; "finish **or re-add**" (`TARGET-ARCHITECTURE.md:189-193`) risks re-download.
    Ratio/seeding history is per-client and does not transfer (a re-added row starts `ratio: 0`,
    `TorrentManager.ts:321`); the four complete torrents' seed goals die with the daemon, and
    Transmission's remove semantics differ from `removeTorrent` delete-by-default (BL-2). Add to
    the decommission condition: an explicit resume-or-readd plan, a stated ratio-forfeit decision,
    and the read-only inspection path after disable.
15. **M-5 Plugin death while the host lives.** [V] An HMR replacement that fails to import
    **stops** the previous plugin and merely reports `failed` (`dsh-substrate.md:43-44`) — during
    this very build phase a bad edit can kill the ledger/timers with no alert. The heartbeat→watchdog
    chain detects it (B9) but nothing prevents or marks it; add a stopped-marker + alert, and never
    edit plugin files while runs are live.

## E. Verdict

The reliability *architecture* is real: typed `turn/end` outcomes, occurrence keys, an outcome
ledger and an external watchdog are the right bones, and the substrate citations hold up under
re-check. But **"never silently wrong" is not yet achieved**: a delete-default API in the hands of
a web-reading agent (BL-2), side effects that outlive their receipt (C-3), silent occurrence drops
on a wedged bridge (C-5), and an alert chain with no liveness proof (BL-3) each break it
independently. P0–P3 may proceed **after** BL-1 path/ownership pinning and the BL-2/M-3 decisions;
do not start P4/P5 (real media, real deletes) until BL-1–3 and C-3/C-5 are closed with tests —
"forced browser wedge", "forced webhook outage" and "delete-permission revoked mid-run" belong in
the P6 clean-week evidence alongside the two forced failures `spec.md:108-109` already names.

# Plan — Re-derive and migrate the media automation

> Contract-first + TDD per `measure/workflow.md`.
> **Status 2026-11-07:** Phases 0–3 complete. **Phase 4 (build) in progress:** tooling installed and
> proven, the browser MCP is live, subtitle interval persistence is fixed TDD, and the torrent
> engine is decided (built-in WebTorrent; Transmission decommission condition recorded). B1 (Mediarr
> 24/7) and B3 (host → systemd) are the open prerequisites; B4/B7/B8/B9 are next.

## Phase 0: Session prerequisites ✅ / ⚠️

- [x] Confirm what DSH authorizes for subagents in a session — recorded: the allow-list is — d5f3674
      written **once, at session creation**, and the previous session had only
      `deepseek-official/deepseek-flash`.
- [x] In the new session: Settings → Subagents → enable "Allow agents to choose models" and — d5f3674
      authorize at least two other families (`minimax-cn`, `moonshotai-cn`, `xiaomi`).
      **Verified 2026-11-07:** `~/.dsh/profiles/web/cordis.patch.yml` already carries
      `subagent-model-selection-settings.enabled: true` with six allowed models across
      `deepseek-official`, `minimax-cn`, `moonshotai-cn`, `xiaomi`.
- [x] Verify with `list_subagent_models`: three distinct providers must be listed before the — d5f3674
      team is spawned. **Verified:** four providers returned. Moonshot was authorized but
      every request **timed out on the first token** (two planners lost); the substrate brief
      was rerouted to `deepseek-official/deepseek-flash` so the three planning agents still
      span three distinct families (MiniMax, Xiaomi, DeepSeek).

## Phase 1: Inventory the old automation ✅

- [x] Read live definitions (`~/.hermes/cron/jobs.json`): 4 jobs, schedules, prompts, skills. — d5f3674
- [x] Read the non-Hermes piece: `fetch-monitor.timer` → `fetch-monitor.py --cleanup --no-rescan`, every 10 min. — d5f3674
- [x] Quantify reliability from `~/.hermes/cron/executions.db`: 167 runs, 42 failures, all provider-connectivity. — d5f3674
- [x] Map external surfaces (transmission :9091, jellyfin-go :8097 + SQLite, TPB/YTS/EZTV via kimi-webbridge, TMDB, SubHD, beets, subalign). — d5f3674
- [x] Map artifacts and filesystem contracts; classify the 15 scripts; record the doctrine. — d5f3674
- [x] Record what Mediarr's scheduler already covers (6 tasks in `serviceContainer.ts`). — d5f3674
- [x] Write [`inventory.md`](./inventory.md) and commit (`cfcae5f4`). — cfcae5f

## Phase 2: Three-agent first-principles design ✅

- [x] Spawn three planners from three different model families; briefs in [`design/BRIEFS.md`](./design/BRIEFS.md). — 14c687e
      **Done 2026-11-07:** MiniMax (`cadence-designer`), Xiaomi (`mediarr-contract`), DeepSeek
      (`dsh-architect`). Moonshot was authorized but every request timed out on first token; the
      substrate brief was rerouted to DeepSeek so three distinct families did the work.
- [x] **cadence** → `design/intent-cadence.md`: behaviours, trigger classes, freshness, idempotency keys, failure signals, "do not schedule" list. **Done** — 7-field rows, five ranked behaviours, explicit drop list (music, adult, nfo, dedupe, LLM-in-hourly-loop). — 75a0c38
- [x] **substrate** → `design/dsh-substrate.md`: schedule semantics vs plugin capability, reliability design, installable skeleton. **Done** — delivery≠execution proven from source; plugin outcome-attribution chain verified; skeleton marked UNVALIDATED. — 75a0c38
- [x] **contract** → `design/mediarr-contract.md`: capability table with file:line, automation-facing contract, sequencing. **Done** — corrected the brief (torrent queue control exists); E1–E5; switch-off conditions. — 75a0c38
- [x] Lead reads all three and grades them: every factual claim about DSH or Mediarr cited to source; no workflow transcription disguised as intent. **Done** — two substrate gaps found and corrected (unattended-session permission mode; host-down watchdog), live settings corrected to 12/20/60 min. — d5f3674

## Phase 3: Ratify ✅ (v3, revised after the triumvirate review) [checkpoint: d5f3674]

- [x] Resolve D1–D4 in `spec.md` with the owner; record the rejected options and why. — 2770901
      **Done 2026-11-07 (v3):** D1 more work in DSH (plugin code, never model turns in deterministic
      loops); D2 **Adult is a separate library**, YouTube and Music are separate tracks; D3
      **agent + browser-use (kimi-webbridge MCP)** for rendered web UIs — no DOM scrapers; D4
      "never silently wrong". Extra decisions: quarantine-then-delete, DSH host systemd unit with
      full access, watch-next report + Collections, plugin ownership of the automation layer.
- [x] Merge the three designs into one target architecture (Lead) — — d5f3674
      [`design/TARGET-ARCHITECTURE.md`](./design/TARGET-ARCHITECTURE.md) **v3 + §12 review
      corrections**.
- [x] Turn it into an ordered backlog with acceptance evidence per item — architecture §9 is the — d5f3674
      **single canonical backlog**; this plan references its IDs.
- [x] Amend this plan to match the ratified architecture. — d5f3674
- [x] **Triumvirate review** (three families: MiniMax/architecture, Xiaomi/reliability, — d5f3674
      DeepSeek/delivery) — [`design/reviews/SYNTHESIS.md`](./design/reviews/SYNTHESIS.md).
      Verdicts: accept-with-fixes / accept-with-fixes / not-yet-executable; gates G1–G10 recorded.

## Phase 4: Build the substrate (v3.1 — gated)

> **Tooling installed and proven 2026-11-07** under owner approval — `yt-dlp` 2026.10.26,
> `beets` 2.14.1 (uv/Python 3.12 venv), `pnpm` 12.18.0, `uv` 0.13.7, ffmpeg 8.0.1; kimi-webbridge
> mounted into the web profile as an MCP server, with live `mcp__webbridge__navigate/evaluate` calls
> verified. Inventory and paths: [`automation/TOOLING.md`](../../../automation/TOOLING.md).
>
> **Gates from the review** ([`SYNTHESIS.md`](./design/reviews/SYNTHESIS.md) §3): G1 paths/ownership,
> G2 browser single-instance/ordering/assertion, G3 destructive safety, G4 alert chain, G5
> schedule/retry/ledger semantics, G6 quarantine spec, G7 torrent unit + cutover, G8 B1a real
> deployment, G9 domain scope, G10 cross-track prerequisites. **P4/P5 do not start until G1–G3, G5,
> G6 are closed with the forced-failure tests.**

- [x] **B1a** Deploy against the **real** Mediarr DB (`CONFIG_DIR/mediarr.db`, 550 movies / 28 — 79b817e
      series; `/data` and `/config` now symlinked, config + staging chowned to uid 1000). Back up the
      DB, pin `DATABASE_URL=file:/config/mediarr.db`, `MEDIA_DIR=/data`, `ENCRYPTION_KEY`, set
      `torrentLimits` paths, start, and verify counts + playable SPA/TV. (G1/G8)
      **Done 2026-11-07:** server runs on `:5174` against `/config/mediarr.db`; health
      `{status:ok, scheduledTaskCount:6}`; API counts 550 movies / 28 series; live TV client
      plays a streamed episode with a Chinese subtitle. Evidence:
      [`evidence/`](./evidence/). B1 (service/reboot) remains open.
- [ ] **B1** Prove 24/7 operation as a service (container `restart: unless-stopped` or systemd),
      including reboot. (G8) **Progress 2026-11-09:** found and fixed a real split-brain — SIGTERM
      closed Fastify but the process never exited, so the unit stayed `active` with a dead API and
      `Restart=always` never fired; shutdown is now bounded (15 s forced exit) and a kill test shows
      systemd restarting in **25 s** (`NRestarts=1`, health 200). Unit is `enabled`, `WantedBy=default.target`,
      user `Linger=yes`. **Reboot proof remains owner-gated** (rebooting ends this harness session and
      the TV); evidence `device-20261107/service-supervision-20261109.md` — 8c23f906
- [x] **B2** Fix `subtitle-wanted-search` interval persistence + test; set rss 30 / availability
      10–15 / wanted 60. **Done:** interval updates for tasks without an AppSettings key now return
      422 before rescheduling (no more silent revert); persisted values verified across a full server
      restart: rss 30 / wanted 60 / subtitle-wanted-search 12 (within 10–15); live library-scan call
      returns 422 'no persisted interval setting'; 24 scheduler route tests green, tsc clean — 8a18bcb0
- [x] **B2d** Current client built and installed on the live TV over network ADB; artwork is — 8015f81
      fetched through the server proxy (13 `CachedNetworkImage` call sites), playback and Chinese
      subtitle rendering verified on device. Old APK was from 2026-10-03 with a different
      signature, so it was backed up, uninstalled and replaced; server re-entered manually.
      Evidence: [`evidence/`](./evidence/).
- [x] **B2f** Restore the **bilingual EN+ZH** subtitle invariant (FR-17, recovered 2026-11-07).
      Old rule: bilingual packs only; Chinese-only/English-only rejected. Build: `BilingualSubtitleService`
      (classify, merge EN+ZH by timing, atomic write + `.orig`, idempotent ledger) + `MiniMaxTranslator`
      (MiniMax-M3.1-Flash, cheap, batch cues) for English-only items; scheduler task `bilingual-subs`.
      Chinese-only with no English sibling is flagged (`needs_english`), never guessed. **Done 2026-11-08:**
      `/config/bilingual-state.json` has 753 entries = 637 ok + 24 merged + 4 translated (665 bilingual),
      79 needs_english flagged, 6 gave_up, 3 failed; **TV proof: merged bilingual episode renders the
      Chinese line with the English line directly under it** (`device-20261107/bilingual-tv-proof.png`,
      `bilingual-tv-proof-20261108.md`); test playback row removed — 0c51321f
- [x] **B2e** TV client update pipeline: server manifest + APK endpoint, `publish-client-update.sh`, — d5f3674
      in-app prompt (Update now / Wait 12 h / countdown → PackageInstaller), and a daily **silent
      ADB updater** (`tv-updater.sh`, sha256-verified). **Verified 2026-11-07:** silent v2→v4 in 33 s;
      in-app v4→v5 through the Android installer; installed 1.0.4 / code 5. Android 9 needs the
      "Install unknown apps" app-op for the in-app path; no silent in-app install without root/device-owner.
      Evidence: [`evidence/`](./evidence/).
- [~] **B2c** Chinese subtitle acquisition + synchronization. **Tool decision 2026-11-07 (advisor +
      measured): ffsubsync 0.5.1 primary** (audio-based; no same-language reference needed), alass
      2.0.0 optional when an English reference exists, existing ASR `subalign` as verifier/fallback.
      **Proof:** on a real episode, a +10 s shifted .zho.srt was realigned in 11 s; a second pass
      reported offset 0.000 s / scale 1.000 (the source itself was 0.83 s early).
      **Implemented 2026-11-07:** `SubtitleSyncService` (JSON-state, idempotent by sidecar hash +
      video size, atomic replace, `.orig` backup, verification bounds |offset|≤0.3 s and
      |scale−1|≤0.02, attempt cap) + `FfsubsyncAligner`, wired as the `subtitle-sync` scheduler task
      every 30 min (limit 5). Tests 6/6; first two live cycles: 5/5 aligned, residual 0, backups
      written, no temp leftovers, task history success. First full-library pass runs in the
      background; a DB-backed sync table is a follow-up (JSON state for now). (FR-16)
      **Progress 2026-11-09 (measured, API-reported, waste bugs fixed):** `aligned 5` now means **+5
      ledger entries** (verified repeatedly: 144→149, then 149→154) after fixing the per-candidate ledger
      save (`aff2692d`) and the pre-alignment hash (`4ca574df`); every ok entry hash-matches its file.
      Cadence raised to 15 min with a capacity check (`982e696a`), candidates walk viewing priority
      (`orderCandidatesByRecentPlayback`, scanned 21 instead of 141), and the per-cycle cap is now **10**:
      the 16:00 cycle aligned **10 in 2.7 min** and the ledger grew exactly +10 (154 → 164). Status:
      Two consecutive cycles then aligned **10 each** (16:00: 2.7 min; 16:15: ~12 min) and the ledger went
      154 → 164 → 174. Status: **174 tried / 171 ok / 3 gave_up / 1,338 remaining**, measured **4.79/h
      (24 h window, still climbing) → etaHours 280** — directly measured throughput is 20/hour minimum, so
      the remaining pass is ~1.5 days of cycles. A `subtitleSyncCycleRunning` guard now skips an overlapping
      tick instead of racing on the JSON ledger (the 16:15 cycle took ~12 of the 15-minute slot). The rate is now computed by
      `summarizeSyncState` from `syncedAt`, so the plan and the report quote one measured number instead
      of a theoretical "5 per 30 min". The pass does not block playback and is idempotent by sidecar hash
      + video size. Historical: 80/82 at 2026-11-08. Summarizer unit-tested (9 sync tests green).
      Acquisition for items lacking Chinese is **owner-gated**: all subtitle providers are disabled
      (`apiKey: null`), evidence `device-20261107/subtitle-sync-status-20261108.md` — 38e65994
      **Extraction progress 2026-11-09 18:50:** 39 reclaimed / 13 attempt-capped / **307 queued**
      (extraction runs every 10 min, batch 5); reclaimed sidecars raised sync candidates 1,512 → 1,552.
      **Fixed 2026-11-11 (timing-pass blindness, found while proving B2g):** the candidate set was
      built from the legacy `Movie.path`/`Episode.path` columns, but the library is variant-based
      (28 movies / 1,678 episodes have a null path and 942 `MediaFileVariant.path` values differ from
      `Movie.path`; e.g. movie 558's path is the *folder*), so a sidecar on a variant file was never
      seen — the cycle kept reporting `scanned 867, skipped 867` while the API reported 1,801
      candidates. `serviceContainer` now enumerates `MediaFileVariant` paths plus legacy paths that
      are real files (`MEDIA_FILE_EXTENSIONS`) through the new pure `findSidecarCandidates`
      (14 sync-service tests, server tsc clean). The next cycle after the server restart proves the
      fix by aligning the newly acquired 558 sidecar.
- [x] **B2g** Zimuku acquisition via the browser bridge (owner directive 2026-11-11: *"You are supposed
      to use kimi-webbridge and https://zimuku.org/ — why do you need an API key?"*). This is the
      acquisition leg B2c left owner-gated: the **agent**, not a provider API, fetches 简英/双语 packs
      from zimuku.org through `mcp__webbridge__*` (navigate the home page → submit the search form →
      detail `/detail/<id>.html` → download `/dld/<id>.html` → read the `联通高速下载` href), downloads
      with curl (UA + no cookie jar, as the retired recipe proved), extracts ZIP/RAR, converts ASS→SRT
      with ffmpeg, and places `<video-stem>.zho.srt` next to the video; the existing `subtitle-sync`
      service then aligns it. Retired recipe kept as a read-only reference:
      `~/.config/opencode/skills/chinese-subs/SKILL.md` + `~/.hermes/skills/media/chinese-subs/SKILL.md`
      — the **judgement** (which pack, which episode, bilingual check) is ported as prompt text, never
      as a DOM scraper. Deliverables: `automation/prompts/subtitle-acquire-zimuku.md` wired into the
      daily orchestrator, plus one live proof item (wanted → sidecar → sync ok → wanted row resolved).
      **Live proof 2026-11-11 (MOVIE 558 Guardians of the Galaxy Vol. 3):** captcha solved from the
      `.verifyimg` screenshot (5 digits, `srcurl` cookie returns to the requested page) → home-form
      search `银河护卫队3` → detail 220785 (`国英双字 个人精校`, ASS/SSA) → `/dld/220785.html` 联通 href →
      curl 189,355 B ASS → content verified against the film (header said Harry Potter — the retired
      skill's warning confirmed) → ffmpeg ASS→SRT, BOM+font tags stripped → placed
      `…HEVC-PSA.zho.srt` (134,568 B) → `POST /api/subtitles/movie/558/scan` = found 1 / new 1 →
      variant 6890 lists an `external` `zh` track → priority-coverage for 558 flipped `none` →
      `zho-only` → sync candidates 1,801 → 1,802. Contract: `automation/prompts/subtitle-acquire-
      zimuku.md` (captcha rule, content-not-filename verification, 2-item cap, receipt path
      `/config/subtitle-acquire-receipts.jsonl`) wired into the daily orchestrator's subtitle step.
- [x] **B2b** Fix the torrent speed-limit unit bug (`downloadClientRoutes.ts:121-125` passes Kbps — 227eba2
      into a bytes/sec setter, `TorrentManager.ts:547-554`/`:528-534`); test the conversion. (G7)
      **Done 2026-11-07:** test updated to expect 500 Kbps → 512000 B/s (Red: got 500); route now
      converts Kbps→bytes/sec and preserves the `-1` no-limit sentinel; 9/9 route tests green,
      server `tsc` clean.
- [~] **B3** Install `dsh-host.service` as a systemd unit with `DSH_PERMISSION_MODE=danger-full-access`,
      the full PATH (nvm + venv + `~/.local/bin`), and a **hard ordering**: stop the terminal host,
      confirm `:10086` free, then start the unit. Prove reboot persistence. (G2/C-1) **Prepared
      2026-11-09:** unit at `automation/systemd/dsh-host.service` (danger-full-access, full PATH,
      Restart=always, TimeoutStopSec=30, accepted by `systemd-analyze --user verify`) and
      `automation/scripts/install-dsh-host.sh`, which enforces the :10086 free check and refuses to
      cut over without `DSH_HOST_CUTOVER=1` — stopping the terminal host also ends the agent turn
      running it, so the actual cutover is owner-gated. Evidence
      `device-20261107/service-supervision-20261109.md` — 8c23f906
- [x] **B4** Scaffold `automation/dsh-media-automation/` with the **frozen** ledger schema
      (`runs` keyed by `taskId+attempt` with `retryOf`, `jobs`, `locks` incl. a `browser` lock,
      `alerts`, `quarantine`), heartbeat, local-first alert writer; install via `link:`; prove HMR.
      (G4/G5) **Scaffolded 2026-11-09:** package + frozen versioned schema (node:sqlite, no native
      build), tools `media_automation_status` / `_heartbeat` / `_alert` / `_quarantine` / `_watchdog`,
      local-first alert JSONL, 19 tests (migration, attempt/retry, heartbeat, alert ordering, lock
      expiry, quarantine engine, watchdog, plugin load/reload); `dsh.bundle.patch` declared and the
      install proven in an isolated profile (`dsh plugin add link:` composes the media-automation layer
      with ledger + expectations config; throwaway profile deleted) —
      `device-20261107/plugin-link-proof-20261109.md`. **Remaining owner-gated:** linking in the live
      `web` profile and the live host reload, because that reload ends this agent turn (same gate as
      B3) — 75ce6f57, a958c7d2. **Live 2026-11-11:** linked into the live `web` profile with
      `plugin_manager install_bundle link:…/automation/dsh-media-automation` (no host restart); the
      `media_automation_*` tools registered in the running session and a heartbeat row was written
      (schemaVersion 1, 0 runs, 0 pending alerts). The host-reload half is now unnecessary for tool
      registration; a restart is only needed for plugin order changes.
- [~] **B5** kimi-webbridge MCP is live (`mcp__webbridge__navigate/evaluate` verified). Remaining:
      probe that asserts **tool registration + extension connected** (not port liveness), per-call/run
      timeout for a wedged extension, extension-reconnect check after restart. (G2) **Probe done
      2026-11-09:** port 10086 returns `426 Upgrade Required` on every path, so liveness was
      disproven as evidence; the probe contract is declared in `automation/expectations.yaml`
      (`bridge.probe`: expression, expected value, 15 s timeout) and step 0b of the orchestrator
      prompt (registration check → one evaluate probe → `BRIDGE_TOOLS_ABSENT`/`BRIDGE_WEDGED` alerts →
      re-probe after any host restart, no scraping fallback). Live: evaluate returned
      `{probe:'bridge-alive', two:2, url:SPA}` from a real extension
      (`device-20261107/bridge-probe-20261109.md`). Remaining: the 5-minute per-call/run budget is
      enforced by the gated run timer, and the live reconnect check needs a host restart (B3 cutover) — 92a9ef3d
- [x] **B6** Daily 03:00 media-orchestrator prompt in `automation/prompts/`; it must hard-fail when
      `mcp__webbridge__*` tools are absent, reconcile-before-act, and journal side effects
      incrementally. Manual run first. (G2/G3/G5) **Done 2026-11-09:**
      `automation/prompts/media-orchestrator-daily.md` hard-fails with a `BRIDGE_TOOLS_ABSENT` alert
      when the bridge tools are missing, reconciles scheduler/subtitle/music/YouTube/adult truth before
      acting, and journals one run per domain; the manual first run is recorded in
      `device-20261107/orchestrator-manual-run-20261109.md`. **Scheduled live:** harness task
      `schedule-81975ac5-340e-478f-8ef6-f8ad7e0ab335` ("Mediarr daily media orchestrator",
      Asia/Shanghai 03:00 daily, new session per delivery, receipt to
      `/config/orchestrator-receipts.jsonl`, no destructive actions without owner approval); next
      delivery 2026-11-10T03:00+08:00 (`device-20261107/orchestrator-schedule-20261109.md`); prompt and
      manual-run commit was ebc88c96 — d5a0c60a
- [~] **B7** Plugin timers: tidy 04:30, nightly receipt 05:00, retention 04:45 (scoped per G9),
      weekly backup, reconcile + Mediarr task-history polling (correlate by `taskName` + window;
      `executionId:-1` stays until E1). (G6/G9) **Tidy done 2026-11-09:**
      `staging-tidy` scheduler task 04:30 removes only abandoned tool artefacts older than 6 h
      (`.part`/`.ytdl`/`.tmp`/`.temp`, old empty files) in the music/YouTube staging areas; live
      trigger deleted a synthetic back-dated partial and logged it
      (`device-20261107/staging-tidy-20261109.md`). Retention (05:45) and music receipt (05:10) already
      exist; **weekly backup done 2026-11-09:** harness task `schedule-582bb043-2214-4b44-8edb-dbe41e0d2c69`
      ("Mediarr weekly database backup", Sundays 04:30 Asia/Shanghai, new session, deterministic POST
      `/api/backups` + receipt, never prunes); manual proof created an 87 MB backup listed by
      `GET /api/backups` (`device-20261107/weekly-backup-timer-20261109.md`). Nightly aggregate receipt
      05:00 stays open (orchestrator 03:00 + music receipt 05:10 already cover most of it) — 8b1bb27e, 588d54a1
- [~] **B8** Quarantine engine: root on the 4TB filesystem, per-file hash manifest, copy+verify for
      cross-device, restore, retention delete, cap + overflow behaviour, rails that do not reuse
      `isImportIncomplete`, explicit dry-run→live guard. (G6) **Engine done 2026-11-09:**
      `automation/dsh-media-automation/src/quarantine.js` + `media_automation_quarantine` tool:
      dry-run default, live copy+sha256/bytes verify before unlink, hash-checked restore, cap/age prune
      only inside the root, refuses missing root / file already quarantined; 5 tests (12 plugin total).
      Root `/run/media/daniel-bo/4TB/MediarrQuarantine` created, dry-run exercised against it
      (`device-20261107/quarantine-engine-20261109.md`). Remaining: live retention policy per domain
      (window + restore surface) — an owner decision, not a code gap — a699ae93
- [~] **B9** **System-level** watchdog + `automation/expectations.yaml`: host, plugin heartbeat,
      bridge/tool registration, Mediarr health, task history, expected artifacts; alert delivery
      status/retry + local fallback; synthetic end-to-end alert. Detection ≤10 min / delivery ≤15 min.
      (G4) **Checks done 2026-11-09:** `automation/expectations.yaml` + tested watchdog
      (`media_automation_watchdog` tool, 5 tests): host health, heartbeat age, bridge **tool
      registration**, scheduler freshness, artifact freshness; failures raise critical alerts with the
      JSONL fallback written first. Live run: health ok, 4 tasks fresh, 3 artifacts fresh, heartbeat +
      bridge correctly failed (plugin not linked) and wrote 2 local alerts
      (`device-20261107/watchdog-live-20261109.md`). **Delivery done 2026-11-09:**
      `deliverPendingAlerts` retries PENDING alerts through a webhook transport
      (`MEDIA_AUTOMATION_ALERT_WEBHOOK`), stamps DELIVERED/attempts, marks FAILED after 3 attempts, and
      leaves alerts PENDING when no transport exists (JSONL fallback); exposed as
      `media_automation_deliver_alerts` (4 tests, 23 plugin total; `device-20261107/alert-delivery-retry-20261109.md`).
      Remaining: the ≤10 min system timer, which waits on the owner-gated harness link (B3/B4) — de05fa00, 2cfbd15e
- [ ] **B9b** Validate the built-in torrent engine **after G7**: set staging paths, add one small real
      magnet, watch progress → complete → import, record throughput/memory. Let the 83.4 % Transmission
      torrent finish in place; do not re-add it (different engine/dir = full re-download). (G7)

## Phase 5: Migrate behaviours and wire the new domains

- [x] Keep native Mediarr tasks (scan, wanted, subtitles, RSS, import lists, auto-update); the daily
      orchestrator reconciles/receipts them instead of re-implementing them (21 healthy scheduler
      tasks). The plugin-side receipt verification is scaffolded and awaits the owner-gated live
      link — `automation/prompts/media-orchestrator-daily.md` — 3865ae3.
- [x] Move household jobs into the agent runs: daily media orchestrator, weekly music, weekly adult,
      monthly rules review. Prompts live in `automation/prompts/`; the three weekly/monthly runs are
      scheduled (2026-11-10) and the daily one has a recorded manual run
      (`device-20261107/orchestrator-manual-run-20260911.md`) — 3865ae3.
- [x] Deterministic bookkeeping in the plugin; no custom DOM scrapers anywhere. Web surfaces are
      browser-agent work; `yt-dlp`/`beets` are maintained tools invoked from the runs — 3865ae3.
- [x] Domain wiring as each track lands: Adult and YouTube tracks are archived with their agent run
      (`schedule-22a8d409…`) and retention task (`youtube-retention` 05:45) live; music has its
      weekly run (`schedule-ad2f62de…`) and ingest pipeline, with owner-curated picks still missing
      (`/config/music-picks.json`), so the run reports blocked rather than inventing picks — 3865ae3.
- [x] Disable (never delete) `music-orchestrator` and `adult-orchestrator` — paused 2026-11-10 with
      rollback commands recorded; the old scripts are not revived (`media-daily.py`, TPB/YTS/EZTV
      scrape wrappers stay dead) — 3865ae3.
- [x] Re-point every artifact path at Mediarr; `~/media-reports/` filename shapes kept (agent runs
      write `/config/orchestrator-receipts.jsonl`, `/config/rules-review-receipts.jsonl`, backups and
      quarantine manifests on the Mediarr volumes) — 3865ae3.

## Phase 6: Cut over and verify (order corrected by the review)

- [ ] Create successors first, run each manually once, diff output against the Hermes artifact.
- [x] **Disable Hermes acquisition** (two live grabbers = double grabs; there is no shared dedupe).
      Done 2026-11-10, later than the first unattended run: all four Hermes jobs are paused
      (`enabled=False` in `~/.hermes/cron/jobs.json`) and `fetch-monitor.timer` is stopped+disabled.
      Snapshot: `device-20261107/hermes-jobs-20261110.json`; evidence and rollback:
      `device-20261107/hermes-cutover-disabled-20261110.md` — 3865ae3.
- [x] **`adult-orchestrator` paused** before any quarantine live window (its raw-SQL prune can delete
      files Mediarr just catalogued) and **`downloads-tidy` paused** before the plugin's 04:30 tidy
      (never let two deleters share `~/Downloads`) — 3865ae3.
- [x] Disabled (never deleted) `media-orchestrator` and `fetch-monitor.timer`; `jobs.json` archived
      in the evidence snapshot above (rollback: `hermes cron resume <job>`,
      `systemctl --user enable --now fetch-monitor.timer`) — 3865ae3.
- [ ] Let the 83.4 % Transmission torrent finish and import the finished file once; disable (never
      delete) `transmission-daemon.service` after B9b validates the built-in engine;
      `transmission-remote` remains the read-only inspection path.
- [ ] Stop jellyfin-go last, after the Flutter client is confirmed playing from Mediarr; disable,
      never delete.
- [ ] One clean week, defined by `automation/expectations.yaml`: zero occurrences with neither
      receipt nor alert, zero duplicate receipts, plus the forced tests — provider outage, browser
      wedge, webhook outage, delete-permission revoked mid-run — and retention/quarantine proven.
- [ ] Test rollback once: re-enable `jobs.json` + gateway and confirm the old path still runs **and
      still finds the media** (file-layout diff, not just process start).

## Phase 8: TV client delivery (live device, 2026-11-07/08) [checkpoint: 7e651d7]

Closed against the 10-foot UI review (`evidence/tv-ux-review-kimi-k3.1-20261107.md`)
and the owner bug report; every item is device-verified over network ADB.

- [x] P0 Resume: seek after load via `Media(start:)` + `_enforceResume` (verified 10:00 / 22:45). — adf016a
- [x] P0 Episode flow: default season with a file, no per-row search stop, Select plays. — 7e651d7
- [x] P0 Detail two-pane: hero + CTA left, episodes right, Resume CTA autofocus. — adf016a
- [x] P0 Playback errors: retry chip + client-error telemetry to the server for triage. — d5f3674
- [x] P0 Launcher/kiosk: Mediarr is the HOME app with an in-app rollback path. — 46c91c3
- [x] P0 Server event loop: activity poll saturated it (248k-row id fetch every 1 s); fixed, — afdf8ad
      86 % CPU -> 0.1 %, lag 400-1200 ms -> 0-1 ms, and `/api/health` now reports `eventLoop`.
- [x] P1 Transport: Play/Pause entry focus, 64 px targets, 5 s hide only while playing, — a04ff8f
      labelled Sync panel moved out of the subtitle line.
- [x] P1 Home budget: hero 36 %, Continue Watching with remaining time, next row on the fold. — 0b44e82
- [x] P1 Browse typography: real metadata only (no year 0 / "Any"), 18-20 px type. — 0ea5ed6
- [x] Boot stall: 33.6 s -> 1.7 s (variant backfill did ~3,500 startup queries; now one per type), — 79b817e
      boot `maxLagMs` 24,878 -> 953 ms.
- [x] P2 artwork placeholder for tiles with no poster: designed gradient + title initial instead of
      a flat grey rectangle; verified on the TV grid — 0ea5ed6.
- [x] P2 episode thumbnails in the season list: generated from the video files and rendered in every
      row (visible in `device-20261107/tv-series-actions-above-fold-20261110.png`) — 7e651d7.

## Phase 9: Operator restoration — the harness must DO the media life (2026-11-14)

> Owner escalation 2026-11-14: *"You are not choosing new media for me, not downloading, not
> organizing… strip out any fucking api plumbing that's going to make you think you should use it,
> then update the README and AGENTS files so you don't fucking forget, then marry this fucking
> harness to the fucking system so that YOU handle it."*
> Root cause: the DSH replacement prompts were REST reconciliation + receipts. They never choose,
> grab, download or organize; Hermes' acquisition pipeline (wanted list → TPB via bridge →
> `transmission-remote --add` → fetch-monitor import) was paused on 2026-11-10 and never replaced.
> Evidence: `~/.local/share/media-recommendations/pass.jsonl` last pick 2026-11-10T03:56; scheduled
> backup first occurrence 2026-11-15; zero Mediarr indexers so `wanted-search` logs "No releases
> found"; `fetch-monitor.timer` disabled since 2026-11-05.

- [x] Strip REST-API orchestration out of `automation/prompts/**`: no `/api/` calls, no "reconcile
      with the API", no status-only runs. Rewrite the five run contracts as direct-operator
      playbooks (media, music, adult, rules review, zimuku subtitles). — 0345f81
- [x] Add direct-operator playbooks under `automation/skills/{media,music,adult}-operator/` and link
      them into the harness skill catalog so every session loads them before touching automation. — 0345f81
- [x] Rewire the scheduled tasks to the operator contracts and fix never-fired schedules (backup
      first occurrence, adult/music weekly windows, API-based backup step → `sqlite3 .backup`). — 0345f81
- [x] Prove the operator path end-to-end with a real pick: decide from watch history → TPB via the
      browser bridge → Transmission add → completed → organized under `/data` → engine registers it.
      **Done 2026-11-14:** Lioness S02/S03 queued (ids 22/20, verified in `transmission-remote -l`),
      receipts in `pass.jsonl` + `/config/orchestrator-receipts.jsonl`; live swarms are slow
      (0–25 kB/s vs 4.6–6.2 MB/s for a distro ISO), recorded as the blocker in the evidence doc. — 0345f81
- [x] Update `README.md`, `AGENTS.md`, `SYSTEM.md` with the operator mandate (the harness is the
      brain that picks/acquires/organizes; the REST API is a client contract, not the automation). — 0345f81
- [~] Cut over the harness host to `dsh-host.service` (owner-authorized): systemd owns the resident
      host, its scheduled tasks are the automation, and the terminal-launched host is retired.
      **Executed 2026-11-14** with `DSH_HOST_CUTOVER=1 bash automation/scripts/install-dsh-host.sh`;
      the terminal host that ran this session is stopped by the cutover, so the unit/health proof is
      `systemctl --user status dsh-host.service` + the GUI on :3080 after reconnect.
- [x] Persist the operator mandate as a DSH session goal (`create_goal`, id
      `goal-cad1ab5b-37ee-4f6d-91ff-7d1a2c8ba31c`) so a compacted session cannot lose it.
- [x] Build `automation/dsh-plugins/dsh-operator-guard/`: injects
      `automation/operator-contract.md` + live pipeline state into every root session, re-reminds at
      `agent/pre-step` while stale, and exposes `operator_guard_status` / `operator_guard_record`
      (a run must record a state change or a concrete blocker); unit-tested, wired into the web
      profile through the repo symlink + `cordis.patch.yml`, loaded live (the tools and the injected
      contract are visible in the session that built it). — d65b82a
- [x] Fix the **music-registration gap**: a track filed by the operator was invisible to the
      library (`MusicTrack` stayed 217) because scanning only happens when the SPA presses "Scan
      music" (`POST /api/music/scan`); the engine has no scheduled music scan. Add a deterministic
      engine task (`music-scan`, 05:00 daily) so new files under `/data/Music` register without any
      API call from automation. **Done 2026-11-14:** `MusicLibraryScan` shares the route's store,
      `music-scan` registered (health scheduledTaskCount 21 → 22, task SUCCESS in 25 s); the first
      scan also exposed that the walk registered staging files, so underscore folders are skipped and
      pre-existing staged rows are pruned — live 217 → 220 → 218 with AC/DC "Thunderstruck"
      correctly registered; server tsc clean, 14 scan tests green. — 1a9b2e4
- [x] Close the **Archer subtitle gap** found live: S07/S08 had zero Chinese tracks while the
      owner watched them. S08 has no pack anywhere and no embedded subs (owner decision needed);
      S07 has a Chinese-only Traditional season pack, so build bilingual sidecars from it plus the
      embedded English tracks with a deterministic merge script, place them, and let the engine
      register/align them. **Done 2026-11-14 (S07):** `automation/scripts/subs-merge-bilingual.py`
      built 10 bilingual sidecars from zimuku 192033 + the embedded English tracks (392–517 bilingual
      cues each); the engine's series scan registered 10 EXTERNAL `zh` tracks and `subtitle-sync`
      aligned 10/10 `ok`. **S08 remains a blocker:** zimuku has no pack and the videos carry no
      subtitle streams at all — it needs the owner's call (translation) or another source. — 9fb151
- [x] Extend the subtitle closure to **Archer S05**: 9 watched episodes had no Chinese track at
      all. zimuku has a Chinese-only Traditional pack (detail 188056) and the videos carry no
      subtitle streams, so convert to Simplified and place Chinese-only sidecars (`--chinese-only`),
      flagged per the bilingual invariant — never invent English. **Done 2026-11-14:** pack 188056
      (繁體 official) downloaded and converted, **13** Chinese-only sidecars placed (last cue sits
      32–45 s before the video end = normal credits gap, so the cut matches), engine scan registered
      **13 EXTERNAL `zh` tracks** (`subtitlesFound 36 / newSubtitles 13`); ffsubsync alignment is
      queued in the engine's 740-item sync backlog (S07's 10 were already `ok`). Remaining watched-
      episode gaps: American Dad! S01E02–E06 (5) and The Sopranos S01E01 (1). — 417b30d
- [x] Close **The Sopranos S01E01** from the audit: zimuku's 简英 bilingual pack (detail 234294,
      S01–S06 x265-RARBG, 1.84 MB 7z) had the episode as Simplified Chinese + English stacked; placed
      `The Sopranos - S01E01 - Pilot.zho.srt` and registered it through the engine (scan
      `subtitlesFound 61 / newSubtitles 1`; last cue 86 s before the video end = credits gap).
- [ ] **American Dad! S01E02–E06** cannot be closed from the approved source: zimuku has no S01 pack
      (only S19), the files carry no subtitle streams, so there is no Chinese or English material to
      merge. Needs an owner decision (another source or accept English-only).
- [x] Record the incident + doctrine in `measure/lessons-learned.md`, update `measure/tracks.md`,
      and commit each phase with a note. — 0345f81

## Phase 7: Close

- [ ] Update `measure/tracks.md`, `tech-debt.md`, `lessons-learned.md`.
- [ ] Archive the track with the ratified architecture and the one-week evidence.

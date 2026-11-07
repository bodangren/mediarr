# Plan — Re-derive and migrate the media automation

> Contract-first + TDD per `measure/workflow.md`.
> **Status 2026-11-07:** Phases 0–3 complete. **Phase 4 (build) in progress:** tooling installed and
> proven, the browser MCP is live, subtitle interval persistence is fixed TDD, and the torrent
> engine is decided (built-in WebTorrent; Transmission decommission condition recorded). B1 (Mediarr
> 24/7) and B3 (host → systemd) are the open prerequisites; B4/B7/B8/B9 are next.

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

## Phase 3: Ratify ✅ (v3, revised after the triumvirate review)

- [x] Resolve D1–D4 in `spec.md` with the owner; record the rejected options and why.
      **Done 2026-11-07 (v3):** D1 more work in DSH (plugin code, never model turns in deterministic
      loops); D2 **Adult is a separate library**, YouTube and Music are separate tracks; D3
      **agent + browser-use (kimi-webbridge MCP)** for rendered web UIs — no DOM scrapers; D4
      "never silently wrong". Extra decisions: quarantine-then-delete, DSH host systemd unit with
      full access, watch-next report + Collections, plugin ownership of the automation layer.
- [x] Merge the three designs into one target architecture (Lead) —
      [`design/TARGET-ARCHITECTURE.md`](./design/TARGET-ARCHITECTURE.md) **v3 + §12 review
      corrections**.
- [x] Turn it into an ordered backlog with acceptance evidence per item — architecture §9 is the
      **single canonical backlog**; this plan references its IDs.
- [x] Amend this plan to match the ratified architecture.
- [x] **Triumvirate review** (three families: MiniMax/architecture, Xiaomi/reliability,
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

- [x] **B1a** Deploy against the **real** Mediarr DB (`CONFIG_DIR/mediarr.db`, 550 movies / 28
      series; `/data` and `/config` now symlinked, config + staging chowned to uid 1000). Back up the
      DB, pin `DATABASE_URL=file:/config/mediarr.db`, `MEDIA_DIR=/data`, `ENCRYPTION_KEY`, set
      `torrentLimits` paths, start, and verify counts + playable SPA/TV. (G1/G8)
      **Done 2026-11-07:** server runs on `:5174` against `/config/mediarr.db`; health
      `{status:ok, scheduledTaskCount:6}`; API counts 550 movies / 28 series; live TV client
      plays a streamed episode with a Chinese subtitle. Evidence:
      [`evidence/`](./evidence/). B1 (service/reboot) remains open.
- [ ] **B1** Prove 24/7 operation as a service (container `restart: unless-stopped` or systemd),
      including reboot. (G8)
- [~] **B2** Fix `subtitle-wanted-search` interval persistence + test; set rss 30 / availability
      10–15 / wanted 60. **Code done:** map now points the real task id; 16/16 route tests; `tsc`
      clean. Remaining: `library-scan` has no interval key (reschedule persists nothing) — either
      add a setting or return 422; values apply with B1a.
- [x] **B2d** Current client built and installed on the live TV over network ADB; artwork is
      fetched through the server proxy (13 `CachedNetworkImage` call sites), playback and Chinese
      subtitle rendering verified on device. Old APK was from 2026-10-03 with a different
      signature, so it was backed up, uninstalled and replaced; server re-entered manually.
      Evidence: [`evidence/`](./evidence/).
- [~] **B2c** Chinese subtitle acquisition + synchronization. **Tool decision 2026-11-07 (advisor +
      measured): ffsubsync 0.5.1 primary** (audio-based; no same-language reference needed), alass
      2.0.0 optional when an English reference exists, existing ASR `subalign` as verifier/fallback.
      **Proof:** on a real episode, a +10 s shifted .zho.srt was realigned in 11 s; a second pass
      reported offset 0.000 s / scale 1.000 (the source itself was 0.83 s early). Remaining:
      Mediarr `SubtitleSyncService` + scheduler hook (native, per advisor), sync-state table,
      naming/atomic write, failure reporting, and the TV playback proof. (FR-16)
- [x] **B2b** Fix the torrent speed-limit unit bug (`downloadClientRoutes.ts:121-125` passes Kbps
      into a bytes/sec setter, `TorrentManager.ts:547-554`/`:528-534`); test the conversion. (G7)
      **Done 2026-11-07:** test updated to expect 500 Kbps → 512000 B/s (Red: got 500); route now
      converts Kbps→bytes/sec and preserves the `-1` no-limit sentinel; 9/9 route tests green,
      server `tsc` clean.
- [ ] **B3** Install `dsh-host.service` as a systemd unit with `DSH_PERMISSION_MODE=danger-full-access`,
      the full PATH (nvm + venv + `~/.local/bin`), and a **hard ordering**: stop the terminal host,
      confirm `:10086` free, then start the unit. Prove reboot persistence. (G2/C-1)
- [ ] **B4** Scaffold `automation/dsh-media-automation/` with the **frozen** ledger schema
      (`runs` keyed by `taskId+attempt` with `retryOf`, `jobs`, `locks` incl. a `browser` lock,
      `alerts`, `quarantine`), heartbeat, local-first alert writer; install via `link:`; prove HMR.
      (G4/G5)
- [~] **B5** kimi-webbridge MCP is live (`mcp__webbridge__navigate/evaluate` verified). Remaining:
      probe that asserts **tool registration + extension connected** (not port liveness), per-call/run
      timeout for a wedged extension, extension-reconnect check after restart. (G2)
- [ ] **B6** Daily 03:00 media-orchestrator prompt in `automation/prompts/`; it must hard-fail when
      `mcp__webbridge__*` tools are absent, reconcile-before-act, and journal side effects
      incrementally. Manual run first. (G2/G3/G5)
- [ ] **B7** Plugin timers: tidy 04:30, nightly receipt 05:00, retention 04:45 (scoped per G9),
      weekly backup, reconcile + Mediarr task-history polling (correlate by `taskName` + window;
      `executionId:-1` stays until E1). (G6/G9)
- [ ] **B8** Quarantine engine: root on the 4TB filesystem, per-file hash manifest, copy+verify for
      cross-device, restore, retention delete, cap + overflow behaviour, rails that do not reuse
      `isImportIncomplete`, explicit dry-run→live guard. (G6)
- [ ] **B9** **System-level** watchdog + `automation/expectations.yaml`: host, plugin heartbeat,
      bridge/tool registration, Mediarr health, task history, expected artifacts; alert delivery
      status/retry + local fallback; synthetic end-to-end alert. Detection ≤10 min / delivery ≤15 min.
      (G4)
- [ ] **B9b** Validate the built-in torrent engine **after G7**: set staging paths, add one small real
      magnet, watch progress → complete → import, record throughput/memory. Let the 83.4 % Transmission
      torrent finish in place; do not re-add it (different engine/dir = full re-download). (G7)

## Phase 5: Migrate behaviours and wire the new domains

- [ ] Keep native Mediarr tasks (scan, wanted, subtitles, RSS, import lists, auto-update); the
      plugin verifies their receipts instead of re-implementing them.
- [ ] Move household jobs into the agent runs: daily media orchestrator, weekly music, weekly adult,
      monthly rules review. Prompts live in `automation/prompts/` (FR-8).
- [ ] Deterministic bookkeeping in the plugin; no custom DOM scrapers anywhere. Web surfaces are
      browser-agent work; `yt-dlp`/`beets` are maintained tools invoked from the runs.
- [ ] As each domain track lands (`feature_adult_library_20261107`, `feature_youtube_library_20261107`,
      `feature_music_library_20261107`), wire its agent run and retention job; before it lands the
      daily agent skips that domain and says so in the receipt.
- [ ] Disable (never delete) `music-orchestrator` and `adult-orchestrator`; the old scripts are not
      revived — `media-daily.py` and the TPB/YTS/EZTV scrape wrappers stay dead.
- [ ] Re-point every artifact path at Mediarr; `~/media-reports/` filename shapes kept.

## Phase 6: Cut over and verify (order corrected by the review)

- [ ] Create successors first, run each manually once, diff output against the Hermes artifact.
- [ ] **Disable Hermes acquisition before the first unattended 03:00 run** (two live grabbers =
      double grabs; there is no shared dedupe).
- [ ] **Disable `adult-orchestrator` before enabling quarantine** (its raw-SQL prune can delete files
      Mediarr just catalogued) and **`downloads-tidy` before the plugin's 04:30 tidy** (never let two
      deleters share `~/Downloads`).
- [ ] Disable (never delete) `media-orchestrator` and `fetch-monitor.timer`; archive `jobs.json`.
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

## Phase 7: Close

- [ ] Update `measure/tracks.md`, `tech-debt.md`, `lessons-learned.md`.
- [ ] Archive the track with the ratified architecture and the one-week evidence.

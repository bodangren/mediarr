# Delivery review — v3 agent-first migration

**Reviewer:** `delivery-reviewer` (independent; not the author) · **Date:** 2026-11-07 · read-only.
**Verdict:** the substrate design is sound and mostly honest about what is done, but B1 can pass on an empty server, the Mediarr API plumbing it relies on is unowned, and three product tracks are gated on a TV client that is known-broken. **[A]** marks assumptions.

---

## 1. BLOCKERS

**BL-1 — B1 passes on an empty Mediarr, so P5/P6 have no ground truth.** `B1` accepts "reboot survives; health green; scheduler nextRun present" (`TARGET-ARCHITECTURE.md:222`). Live `mediarr.db` today: `Media`=0, `Movie`=1, `Series`=0, `Episode`=0, `Indexer`=0; `AppSettings` is a test fixture — `tmdbApiKey:"replaced-key"`, `apiKey:"key123"`, `setupCompleted:false`, `mediaManagement:{}`, roots `''` (`server/src/repositories/AppSettingsRepository.ts:102-103`). The real library is 553 `Movies/` + 56 `TV/` folders served by jellyfin-go :8097. **No item owns "configure Mediarr + import the library + point the TV at it,"** yet `P5` "one real import with no manual move" (`:215`) and `B13` "one clean week" (`:234`) assume it: a week-long gate on an unbuilt install.

**BL-2 — the API work the reliability design needs is unowned and unimplemented.** `§7` claims "Nothing else in Mediarr is required" (`:198-200`), contradicting the contract's must-land list: `E1` return an execution row id, `E3` notify on `TaskExecution` FAILED (`design/mediarr-contract.md:116-119`, needed before cutover `:144-146`). Measured: `/api/scheduler/:taskId/trigger` returns `executionId: -1` (`server/src/api/routes/schedulerRoutes.ts:146`); `Scheduler.ts:504-508` records FAILED with no dispatch (`NotificationDispatchService` wired only for imports, `serviceContainer.ts:337`). So `B7` has no id to correlate and `B9` cannot alert on a failed Mediarr task — the silent-failure class this track exists to kill (`spec.md:10-13`).

**BL-3 — B9b is blocked by config nobody listed.** WebTorrent writes to `/data/downloads/incomplete|complete` (`server/src/services/TorrentManager.ts:47-48`); `/data` does not exist, and the only staging tree, `4TB/downloads`, is uid **100999**-owned and not writable. Neither `§6.5` nor `B9b` (`plan.md:92-96`) mentions setting `torrentLimits` paths, `MEDIA_DIR` (`serviceContainer.ts:712`) or `DATABASE_URL`. First run fails `EACCES`/"not configured" (`TorrentManager.ts:269-271`) and will be misread as "WebTorrent is broken" — the wrong fallback.

**BL-4 — every reliability claim ends in an "alert" whose channel is undefined.** `B4` "alert webhook" (`:225`), `§5` "alert with the agent's own diagnosis", `B9` four outage classes ≤10 min. No decision (D1–D7, Q7–Q9) names a transport, destination or owner. Transports exist (`server/src/services/notifications/`); the decision does not. Without it B4/B9 cannot be accepted and `spec.md:75` is unfalsifiable.

**BL-5 — YouTube retention can delete the owner's keep-library.** `4TB/Youtube` holds **786 files** across three tutorial channels (`.mkv/.webm/.nfo`). `FR-5` makes *any* episode eligible when "watched and older than the retention window" (`feature_youtube_library_20261107/spec.md:43`); the 04:45 sweep enforces it (`TARGET:67`, `plan.md:85-87`). Nothing scopes eligibility to a subscription row, and unmanaged files have none — one watched flag deletes reference material in ~7 days. Rail needed: only items with a subscription row and `retentionDays > 0`, plus the dry-run week.

**BL-6 — Music's ingest convention contradicts its migration rule.** `FR-3` files all audio `<Artist>/<Album>/<NN> - <Title>` (`music spec.md:45-46`); `FR-9` imports the existing tree "without destructive reorganisation" (`:58`). The tree is already two conventions: `AC-DC/Back in Black`, plus `Compilations/[3]`, `Compilations/[2026]`, `VA - 100 Greatest … [PMEDIA] ⭐️` (measured). Scan, beets filing and the artist/album UI cannot satisfy both; the decision is missing and will surface mid-implementation.

---

## 2. Ordering, dependencies, honesty of "done"

- **B3 blocks acceptance of B4–B9, not their code.** No `dsh-host.service` exists (host is a terminal-launched `node …/dsh web`); B4/B5/B6 can be built there, but "heartbeat visible", "survives reboot" (`:224`) and B9's *host-down* case are testable only after B3. The plan already ships B5 before B3 (`plan.md:76-81`) — honest, but the numbered order is not the real order.
- **Substrate before B1?** B3/B4/B5 yes; B6/B7/B9/B9b no (they need a configured, running Mediarr). Real order: **B1a deploy+configure+import → B3 → B4 → B5 finish → B6 manual → B7/B8 dry-run → B9 → B9b → client cutover → B13**, with B10=YouTube, B11=Adult, B12=Music domain, B12b=player.
- **Numbering is not single-sourced:** `§8` lists B1–B14 (`:220-236`); `plan.md:56` says "B1–B11"; the plan adds an unnumbered `B9b` (`plan.md:92`); the audit brief cites a B15 that exists nowhere.
- **Overstated:** `Phases 0–3 complete` (`plan.md:4`) — Phase 3 still records v2 outcomes, "adult folded into Movies", "D3 indexers only, no browser bridge" (`plan.md:48-53`), which v3 superseded (`spec.md:73-74`, `TARGET:3`). Checkbox true, content stale. `B5 partial` is honest, but `automation/TOOLING.md:71` documents `failOnStartupError: false` while the live mount omits it (`~/.dsh/profiles/web/cordis.patch.yml:45-51`) — the flag that turns a dead bridge into an alert.
- **Honestly done:** `B2 done (code)` checks out (`schedulerRoutes.test.ts:152`, 16 tests, `fb7bbfe2`, left `[~]`); `B1`/`B3` open; tooling claims match `automation/TOOLING.md:10-16`.
- **Cut B10–B12 from this track's DoD.** `§9` says the migration can ship before the domains (`:237-238`), yet `B13`/`P6` sit after them. Cut the automation over first (the daily agent already "skips absent domains"), then land YouTube → Adult → Music; that banks the reliability win in days.

---

## 3. Acceptance testability

Measurable now: interval persists (B2); "restore byte-identical" (`spec.md:113`) via sha256; "rails reject an active torrent"; "no jellyfin-go / no DOM scraper in tree" (`:115`) — greppable; `link:` install.

- **"One clean week"** (`spec.md:108`, `:216`, `:234`) — no denominator, artifact or query. Define: `expectations.yaml` enumerates every expected occurrence; pass = zero occurrences with neither receipt nor alert, and zero duplicate receipts per occurrence key. Write it *before* the week starts (B9).
- **"alert ≤ 10 min"** (`:230`) is arithmetically impossible on a 10-min probe (`:172`): worst case is probe interval + probe duration + delivery. Probe every 2–5 min against a 10-min end-to-end budget, or restate "detected within one probe interval, delivered ≤ 15 min". Add de-duplication or the week fails on noise.
- **"every 25 min alert"** (audit brief) matches nothing in the docs (10 / 10–15 / 60 min).
- **"matches the iTunes-style layout"** (`music spec.md:70`) — taste. Use the plan's own artefacts: focus-walk widget test (`music plan.md:37-40`) plus one device frame vs a checked-in mockup.
- **"gapless-enough"** (`music spec.md:50`) — define (no gap >250 ms in a queue test) or drop.
- **`B14 "Docs: recorded"`** (`:235`) — always true; name the files and rows.

---

## 4. Domain feasibility and missing cross-track dependencies

All three tracks duplicate one foundation: extend `MediaTypeEnum` (`server/src/db/schema.ts:15`), replace the two fixed roots (`AppSettingsRepository.ts:68-69`), extend scan/import, add nav and a Flutter feature. **Missing: one shared "library kinds + arbitrary roots + generic section nav" foundation before B10–B12**, or three tracks edit the same enum, settings, scan service and router.

**Client dependency is unowned and currently unsafe.** Every domain AC needs a Flutter build on the TV. The box runs an APK older than `82f6c7ce`, mDNS fails from it (`README.md:81-83`), and two active tracks record navigation defects: F17 rail unreachable because each page owns a `ModalRoute` `FocusScope` (`measure/tracks.md:28`), owner calls the client "awful and not navigable" (`:30`). Adding three D-pad sections — one an iTunes-style sidebar + now-playing player — on an open focus trap is where this stalls.

**Adult** — cheapest, weakest product bar. `4TB/Porn`: 247 flat files like `pornplus.26.08.29.lulu.chu…[5e8822bb].mp4`, with two releases colliding as `001 [1c6d5a2b]` / `001 [acc305fb]`. A3's "filename parsing only" (`adult spec.md:62`) yields nothing for `001 [1c6d5a2b].mp4`, so AC1 passes on a wall of hashes. Decide the parse grammar; ship SPA-first to decouple from the TV.

**YouTube** — lowest risk, best first domain. Gaps: no migration step for the existing 786-file tree (adult has FR-7, music FR-9, YouTube none); no per-poll item cap, so a large channel floods the volume; no decision on `yt-dlp` cookies for restricted videos. `FR-7`'s "agent polls subscriptions" (`youtube spec.md:45-46`) also violates the substrate table — subscription table + `yt-dlp` is stable CLI, i.e. deterministic (`TARGET:25`). Move the poll to a native task; keep the agent for ambiguity only.

**Music** — two tracks, not one: (a) domain/scan/ingest/tag, (b) player. No music or adult feature exists (`clients/mediarr-client/lib/features/`: activity, calendar, discovery, home, library, playback, search, settings); the player also needs artwork, streaming, queue and a full focus walk. Split so (a) can retire `music-orchestrator` early. Tag quality is unowned — beets/MusicBrainz does badly on YouTube live/remix audio; FR-4's review folder needs a bar (e.g. ≥80% auto-tagged on a seeded sample) or AC2 passes with a mostly-untagged library.

**Retention is stated three ways:** 7 days (`TARGET:243`), 14-day quarantine (`spec.md:79`), "delete after the quarantine window" with the window undefined (`youtube spec.md:43`). Pick one ladder; put it in `expectations.yaml`.

---

## 5. Cutover with the old system live

Live: `transmission-daemon` (one torrent 83.4%), `hermes-gateway` (4 jobs), `fetch-monitor.timer`, jellyfin-go :8097 on the same roots; Mediarr not running.

1. **Finish the 83.4% torrent in Transmission** — do not "re-add to Mediarr": WebTorrent uses a different data dir (`TorrentManager.ts:47-48`) and cannot resume the partial, so re-adding restarts from zero *and* two engines announce one infohash.
2. **Validate a different, small magnet through Mediarr** (B9b) while Transmission is still up, with paths set and a writable staging dir (BL-3).
3. **Disable Hermes acquisition before the first unattended 03:00 run** — not after "one real import" as `P5` implies. Two live grabbers = the double-grab: Hermes queues TPB picks into Transmission while the agent queues the same title into Mediarr; no shared dedupe exists (infohash dedupe appears only in `adult plan.md:29`; the daily orchestrator has none).
4. **Disable `adult-orchestrator` before enabling quarantine** — its prune deletes by raw SQL against jellyfin-go (`inventory.md:49-50`) and can delete files Mediarr just catalogued. Disable `downloads-tidy` before the plugin's 04:30 tidy so two deleters never share `~/Downloads`.
5. **Stop jellyfin-go last**, after the Flutter client is confirmed playing from Mediarr; disable, never delete.
6. **Rollback proof needs a file-layout diff.** Re-enabling `jobs.json` proves the old path *runs*, not that it still *finds* media: beets filing or any rename leaves jellyfin-go's DB stale (`plan.md:123` tests only the former).
7. **Storage rail first:** 4TB is 80% full (701 G free) and three domains write to it. Refuse new downloads below N% free, enforced in the retention engine and in expectations.

---

## 6. Missing prerequisites (measured)

| # | Prerequisite | Evidence |
|---|---|---|
| P1 | Roots, TMDB key, quality profiles, auth | live DB: `mediaManagement:{}`, `tmdbApiKey:"replaced-key"`, `apiKey:"key123"`, `setupCompleted:false`, 0 indexers |
| P2 | `DATABASE_URL` outside the repo + one backup target | default `file:$(pwd)/mediarr.db` (`package.json` `start:api`); DB + `.bak-20261107` already untracked in the tree |
| P3 | Pin `ENCRYPTION_KEY` for the unit | dev used `dev-local-encryption-key`; encrypted `apiKeys`/`security` strand on a key change and break agent auth |
| P4 | Decide auth mode for automation | DB `authenticationRequired:true` vs trusted-LAN/no-auth scope — one is wrong |
| P5 | Torrent staging path + `MEDIA_DIR` | `TorrentManager.ts:47-48`, `serviceContainer.ts:712`; `/data` absent |
| P6 | Chrome autostart + VPN health probe | 21 Chrome procs now, no Chrome unit (only Astrill autostart) — a reboot keeps the host, loses the substrate; TPB needs USA (`inventory.md:66`) and nothing watches it |
| P7 | Pin Node for `better-sqlite3` | 24 vs 26 unresolved (`TOOLING.md:119`); no `engines` field |
| P8 | uid 100999 — **correction** | `README.md:76` says the whole tree is 100999; measured, only `4TB/downloads` is. Real risk is staging-only |
| P9 | Owner-visible health surface | files in `~/media-reports/` + no alert channel (BL-4); no "is it healthy" view |
| P10 | Subtitle alignment successor **or** drop | `faster-whisper`/`subalign` deliberately not installed (`TOOLING.md:118`) while the daily run judges subs and the old pipeline aligned them (`inventory.md:36-37,72`); `spec.md:107` requires one or the other |

**Confidence:** high on BL-1…BL-6, §5, §6 (measured against the live DB, units, filesystem); medium on the clean-week/alert arithmetic (unbuilt watchdog); medium on beets yield — **[A]** inferred from the old tidy's review-folder behaviour, no sample measured.

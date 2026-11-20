# Plan — TV Client UI/UX Fixes

Track: `feature_tv_client_ux_20261116` — spec: [spec.md](./spec.md)
Owner report: 7 defects, 2026-11-16.

Write scopes (do not cross them):
- **Lead**: `clients/mediarr-client/lib/features/library/`, `clients/mediarr-client/lib/shared/widgets/media_detail/`, `clients/mediarr-client/lib/core/widgets/netflix_scaffold.dart`
- **tv-player**: `clients/mediarr-client/lib/features/playback/`
- **subs-badge**: `server/src/`, `clients/mediarr-client/lib/shared/models/`, `clients/mediarr-client/lib/shared/providers/`, `clients/mediarr-client/lib/main.dart`

Never stage `automation/dsh-plugins/**` (another session owns those edits).

---

## Phase 1 — Detail-screen entry and titles (Lead)

- [x] **1.1** Movie detail: initial focus lands on Play/Resume, not Back (FR-7). `movie_detail_screen.dart`, `action_bar.dart` — 76832c8
- [x] **1.2** Series detail: title renders in full (two lines + auto-shrink, no ellipsis) (FR-2). `series_detail_screen.dart` — 76832c8

## Phase 2 — Library navigation and artwork (Lead)

- [x] **2.1** Series detail: D-pad order follows the visual layout; no unreachable/stuck control (FR-3). `series_detail_screen.dart`, `media_detail/episode_list.dart` — 76832c8
- [x] **2.2** Series/movie grids: poster frames match artwork aspect; landscape art fitted inside the portrait card (FR-1). `poster_card.dart` — 76832c8

## Phase 3 — Focus traps (tv-player)

- [x] **3.1** End-of-playback continue/stop prompt is fully D-pad navigable with a working escape (FR-4). `features/playback/` — 428dbc4
- [x] **3.2** Audit every dialog/sheet reachable from playback for focusability + Back escape; fix each (FR-4). — 428dbc4

## Phase 4 — Subtitle availability badge (subs-badge + Lead)

- [x] **4.1** Server: expose per-item zh/en subtitle availability on list + detail payloads (FR-5). `server/src/` — fc664a2
- [x] **4.2** Client models/providers parse the new field (FR-5). `lib/shared/models/`, `lib/shared/providers/` — fc664a2
- [x] **4.3** Badge widget rendered on movie/series detail and episode tiles (FR-5). Lead integrates. — fc664a2

## Phase 5 — Freshness (subs-badge)

- [x] **5.1** Refresh library/series/movie providers on app resume and on TV focus regain (FR-6). `lib/main.dart`, `lib/shared/providers/` — fc664a2

## Phase 6 — Delivery

- [x] **6.1** Full gates: `flutter analyze --no-pub` clean, `flutter test --no-pub` 575/575, server `npx tsc -p server/tsconfig.json --noEmit` exit 0, vitest 24/24 on the touched routes. — fc664a2
- [x] **6.2** Build release APK, publish, install on the TV, re-assert the launcher. — 2bca691f **BUILD + PUBLISH DONE, INSTALL BLOCKED:** APK built at build-number 103 (59.5 MB, sha256 `4f7879ad…`) and copied to `/config/client-updates/mediarr-client-103.apk`, but `adb install -r` returns `INSTALL_FAILED_UPDATE_INCOMPATIBLE: Package com.mediarr.mediarr_client signatures do not match previously installed version`. The installed build (1.3.78 / code 102, installed 2026-11-10 21:59) was signed with a key that exists nowhere on this host (searched `~/.android`, `/root/.android`, the repo, and the 4TB drive). `manifest.json` was rolled back to 102 so the TV is not prompted with an uninstallable update. Resolving needs either the original keystore or an uninstall+reinstall (which clears the saved server address) — owner decision.

---

## Follow-ups from device verification (2026-11-17)

- [x] **7.1** Poster bug corrected at the data layer, not the tile: TVDB `/banners/posters/` wins over `/banners/graphical/`+`/banners/text/`; 24 series repaired on the live library. — 4b704158
- [x] **7.2** Title fit measured with the ambient text scaler + width headroom; verified on the device (36 px, no clipping). — 2bca691f
- [x] **7.3** Discovery actually works: LAN `/api/health` probe in parallel with mDNS + auto-connect on a single result; verified by a clean reinstall that connected with no typing. — 2bca691f
- [x] **7.4** Search field is escapable (Down/Back/Escape) on both library grids and the search route; verified on the device. — 2bca691f
- [x] **7.5** Release build fixed: dev-only `integration_test` no longer poisons the generated plugin registrant (that had produced an APK with zero plugins and a blank screen). — 2bca691f
- [x] **7.6** Build 103 installed on the TV (`adb install`, launcher re-asserted, server auto-discovered) and published as the update manifest. — 2bca691f

## Follow-ups from the frictionless-media goal (2026-11-19)

- [x] **8.1** Post-import scans are no longer deferred by a *paused* client. The client beacons
  progress every 10 s whether playing or not, so the old "a progress row exists in the last 5
  minutes" test kept every 30-minute import pass deferred for the 7 hours the owner left the player
  paused (six consecutive `Post-import scan deferred` lines, 13:01→15:30), and freshly imported
  media waited for the 02:00 scan. `PlaybackActivityGate` now calls a session live only when the
  position moved since the previous pass; 8 unit tests, server `tsc` clean.

- [x] **8.2** Continue Watching no longer goes stale. It was fetched once at app start and cached
  for the app's life, so Home kept offering the previous episode: measured on the TV, the server
  returned `Archer S08E05 53.9%` while Home still showed `S08E04 46%`, and the hero said S08E04. The
  provider is now invalidated on playback exit (after the final progress report) and on app resume.
  Verified on the device with build 120 / 1.3.96: exit → Home shows hero `Archer S08E06` and first
  tile `S08E06 58%`; `flutter analyze` clean, `flutter test --no-pub` 586/586.

- [x] **8.3** A paused client no longer beacons or blocks registration. Two halves: `PlaybackActivityGate`
  (server) treats a session as live only when the position moves, and the client beacons only while
  playing (position written once on pause/seek/stop). End-to-end proof on the live engine: with a
  session paused since 16:40:57 the 17:01 pass logged `Post-import scan: 0 movie(s), 82 episode(s),
  3842 subtitle file(s) detected` instead of the `deferred` line every pass produced from 13:01 to
  16:31. Device check: paused at 13:17, no progress row update for 40+ s afterwards (previously every
  10 s). APK 121 / 1.3.97 installed; 589/589 client tests.
- [x] **8.4** Bonus material is no longer retried as missing episodes: featurette/extras/bonus/trailer/
  sample directories are pruned from the episode walk. Removed the twice-per-pass
  `[BulkImport] Failed to import … fetch failed` errors; 11/11 folder-import tests.

- [x] **8.5** Power-on never parks the owner on a text field. Measured: after a sleep/wake cycle the
  client returned on `No servers found. Try manual entry.` with the Android IME open and a stale
  `192.168.1.100`, while the server was up and a relaunch connected instantly. The discovery screen
  now retries every 4 s (15 fast tries, then every 15 s), retries on app resume, and no longer
  autofocuses the host field. Root cause found on the way: `DiscoveryService.stopScan` awaited the
  same subscription cancel twice when the timeout handler and a retry overlapped, which never
  completes — the retry silently never scanned. APK 122 / 1.3.98 installed; sleep → wake verified to
  land on Home; 592/592 client tests.

- [x] **8.6** A file inside an already-known folder is no longer invisible. Folder import skipped any folder
  whose name matched a library title, so a later copy or a dropped file inside it never registered: measured
  15 such videos (Sinners duplicate, Ballerina 2025, Beetlejuice 1988, The Running Man 2025, The Accountant²,
  an SNL special, an X-Men documentary, …). Movie folders are now skipped only when every video inside is
  already registered; otherwise they are re-opened through the normal pipeline with just the new files.
  The 18:01 pass registered 14 variants (`imported 14 item(s), failed 0`, movies 574 → 576) and the TV verifies
  it: Recently Added leads with The Running Man, its detail page offers Play, and playback writes progress.
  13/13 folder-import tests, server tsc clean.

- [x] **8.7** Sidecars are registered within minutes. Only the nightly scan (02:00, 247 s) registered external
  subtitle files, so a sidecar placed by the operator or a provider cycle stayed invisible (无字幕) for hours.
  A bounded `subtitle-sidecar-register` pass now runs every 10 minutes (40 variants, rotating cursor) and
  reports its work: first live run at 18:30:06 logged `2 track(s) registered (40 variant(s) checked)` and the
  中文 badge appeared on The Running Man (2025). 3a98be0a, 4/4 tests.
- [x] **8.8** The track list can only contain loadable files. The new pass first registered ffsubsync's own
  `<sidecar>.sync.srt` working file (which ffsubsync then renames over the sidecar), leaving a dangling row;
  working files (.sync/.orig/.bak) are excluded and external tracks whose file disappeared are pruned — but
  only when the video itself exists, so an unmounted drive is never mistaken for deleted subtitles. Verified
  live: `0 track(s) registered, 1 dangling track(s) pruned` at 18:40:10. 0eec66cf + a895bb61, 6/6 tests.
- [x] **8.9** The Running Man (2025) now carries official 中英 subtitles: zimuku detail 223550 (2,799 cues,
  official iTunes WEB translation) paired with the release's English sidecar into the house-style bilingual
  sidecar (2,247 paired cues), aligned by subtitle-sync; receipt in `/config/subtitle-acquire-receipts.jsonl`.

- [x] **8.10** Disposing the playback screen mid-open no longer throws. Triage of v122 (`uncaught`, /playback):
  `Bad state: Cannot use "ref" after the widget was disposed` from `_playCurrentItem` — the manifest await was
  followed by `ref.read(apiClientProvider)` and, on failure, `ref.read(errorReporterProvider)` inside the catch.
  Both providers are resolved before the await and the catch uses the captured reporter. Regression test gates
  the manifest request, disposes the screen, then fails it (fails before the fix). 593/593 tests, APK 123 /
  1.3.99 published and installed.

- [x] **8.11** The recurring `imported 3 item(s)` churn is real work, and now reported honestly. The three
  files were two American Dad copies that are really S17E02/E03 under another season numbering (verified by
  ffprobe duration and title; moved to `/data/_quarantine/duplicates-20261119-late/` with a manifest, 390 MB,
  nothing deleted) and Mr. Inbetween's 2005 special, which parses as S00E01 with no season-0 row. Files whose
  parsed episode does not exist are now reported as `files with no episode row` instead of being re-imported;
  the 19:00 pass read `imported 0 item(s) … 1 file(s) with no episode row`. d03c8844, 15/15 tests.
- [x] **8.12** Folders holding only registered videos are skipped before any metadata lookup, so
  `unmatched Archer (2009) Season 8` stops appearing every pass even though the library linked its files
  directly. f5ebf2ae, 16/16 tests.

- [x] **8.13** Verified the bilingual subtitles actually render on the device: The Running Man (2025) plays from
  Home in one press, and a paused frame shows the house-style block — Chinese `我姓简斯基 蒂姆是蒂莫西的简称`
  over English `Jansky my last name and Tim short for Timothy.` at a readable size. That closes the
  acquisition→registration→rendering chain for this title. One new visual friction logged: with the transport
  overlay up, the second subtitle line sits behind the pause button (screenshot /tmp/subs-check.png).

- [x] **8.14** Wall clock, owner request 2026-11-19: *"We need a digital clock in the top right when videos
  aren't playing, or on overlay when videos are playing."* `DigitalClock` renders 24-hour `HH:mm` with tabular
  figures, wakes once a second but only rebuilds when the minute changes, and is never a D-pad stop. It is drawn
  by `LeanbackScaffold` for every shell page and by `NetflixScaffold` for screens pushed outside the shell
  (`ClockScope` stops a page inside the shell from drawing a second one), and it rides the player HUD's top-right
  cluster beside Sync/Stop. 4 clock tests; full suite 597/597. First build (124) showed the plate too weak over the hero
  poster; strengthened to a 0.6 scrim with border and shadow, white 26 px, and re-verified: Home `19:27`,
  player overlay `19:29` between the title and Sync (APK 125 / 1.4.1).

- [x] **8.15** Cue block clears the transport row. The logged collision (second subtitle line behind the pause
  button) could not be fixed the obvious way: `media_kit_video` 1.3.1's `SubtitleView` captures
  `configuration.padding` once in its State (late field, no `didUpdateWidget`) and only changes it through
  `setPadding()`, so rebuilding `Video` with new padding is ignored — device-verified by building 36, 220 and 300
  and seeing identical placement. The player now draws one constant lift (260 logical px, clearing the ~190 px
  transport row) that the library does honour; the placement test asserts the constant and documents why a
  per-overlay value cannot work. Verified on the TV at 24:55 with APK 127 / 1.4.3. f7031a58, 597/597 tests.

- [x] **8.16** The clock must not sit on top of a control: the Adult header's search field ran under it (device capture).
  Reserved 150 px and narrowed the field to 300; re-verified on the TV that the placeholder is fully readable.
- [x] **8.17** The library no longer advertises unplayable YouTube videos. Video 315 was AVAILABLE at a path whose file
  had been re-organised into a channel folder, so the card failed with "Couldn't play this video". A 30-minute
  `youtube-reconcile` pass repoints rows by their `[youtube-id]` file-name token (survives re-organising and
  re-muxing; the row's own `videoId` is synthetic `imp…` for archive imports) and retires rows whose file is really
  gone to FAILED with an error. 5/5 tests, server tsc clean. f397511f. Verified live on the 20:30 pass: `1 repointed, 0 retired
  (641 rows checked)` and the library now has 641 AVAILABLE rows with **0** missing files; the pass also
  exposed three rows for one YouTube id (7/288/315), a dedupe follow-up rather than a playability bug.
- [ ] **8.18 (design, blocked)** Music's second vertical rail: returning to the main rail costs two Left presses where
  every other screen needs one. Needs K3.1's decision (provider unreachable).

- [x] **8.19** End-of-episode path verified on the device (APK 128): resumed S08E07, seeked to 1124/1127 s, it completed
  and marked watched, the Up Next prompt appeared for S08E08 with Play now / Cancel; Left moved focus to Play now and
  Back exited cleanly to Home. No trap, no reboot — the owner's 2026-11-08 failure is gone, matching FR-4 tests.
- [ ] **8.20 (design, blocked)** After an episode finishes, Continue Watching does not advance: S08E07 left the list and the
  Archer tile became the superseded S08E06 66%, with no route to S08E08. Candidate: one entry per series resolving to
  the next unwatched episode (or latest in-progress). Needs K3.1.

- [x] **8.21** FIRST FULLY UNATTENDED ACQUISITION VERIFIED: OITNB S07 finished (100%), 13 episodes (5.8 GB) plus 13
  bilingual `zho.srt` sidecars landed in `/data/TV/Orange Is the New Black/Season 7`, the engine linked 13/13 episodes
  with 13/13 Chinese tracks, and the TV shows OITNB with a ✓13 badge and S7 **13/13** in the detail screen with a
  中文 badge and play action on every episode. The dead-swarm replacement, the churn fixes, the scan gate and the
  sidecar pass all did their part with no owner action.
- [x] **8.22** Ballerina (2025) 中英 acquired (zimuku 216162, bilingual ASS, runtime match 2:04:37 vs 2:04:38, drift
  +0.03 s, 961 cues), converted and registered as EXTERNAL zho. Nuance logged: a bilingual sidecar is coded `zho`
  only, so an item without a separate English track row shows 中文 instead of 中英 even though both languages render.
- [x] **8.23** The sidecar pass is batched (`fa330d5c`): one variant query, one track query, one cached readdir per
  directory. The per-variant version at full-library scope burned 46% CPU for six minutes without finishing; the
  batched pass registered 101 tracks across 3,703 variants in one sweep. A test caught that the rewrite had dropped
  the mount guard (never prune while the video itself is missing).

- [x] **8.24** Embedded subtitle tracks are registered for linked episodes. OITNB S07's 13 files each carry an English
  subrip stream plus the bilingual `zho.srt`, but the DB held only the EXTERNAL zho row, so the client showed 中文 and
  the player had no English entry — `EpisodeFileLinker` never probed files (only `BulkImportService` did, for movies).
  New bounded `embedded-track-sweep` (every 10 min, 40 files, newest variants first) probes with ffprobe, parses with
  the shared `ProbeMetadataParser` and inserts missing EMBEDDED rows: first pass registered **247** tracks across 40
  files, 0 failed. S07 now has en 22 / de 13 / fin 13 / nob 13 / swe 13 alongside zho 13, and the API reports series
  availability `{zh: true, en: true}`. 4475687e, 3/3 tests. Full-library convergence ~15 h (newest first).

- [x] **8.25** One library row per YouTube video. Rows 7/288/315 all referred to `dgDFPRol0cw` (the reconcile pass had
  repointed 315 at the same file row 7 uses, and 288 held the organised webm), so the same video could appear more than
  once. A 30-minute `youtube-dedupe` pass groups `AVAILABLE` rows by their `[youtube-id]` token, keeps the row whose file
  exists (then the one carrying watch state), merges `isWatched`/`position`/`watchedAt` from the rows it retires, and marks
  the rest `DELETED` with a reason. Rows only — files are never touched. 694ba7dc, 3/3 tests.

- [x] **8.26** The embedded-track sweep is honest about three things measured today: throughput (40/pass left 2,798
  files ≈ 12 h; 150/pass gives ~1,400 tracks per pass and ~3 h to converge), trackless files (they never leave the
  "no EMBEDDED rows" set, so a probe-state file keyed by variant id + size/mtime stops re-probing them for ever), and
  starvation (trackless files are the newest ids, so a flat LIMIT returned the same 150 every pass; the candidate query
  now walks down in id chunks skipping probed ids). Verified live: remembered probes 150 → 300 → 450, backlog
  2,798 → 2,449, 0 failures. e3016e57 + 34b81097, 4/4 tests.

- [x] **8.27** The server no longer freezes the player. The TV logged "Health check failed: server unreachable" at
  02:34 while the engine watchdog recorded a **170,734 ms** [event-loop] stall (same night: 28 s, 33 s, 29 s, 79 s).
  Load came from three places: the full-library sidecar sweep (3,700 variants) never yielded; embedded extraction —
  which the new embedded-track rows feed — doubled subtitle-sync's sidecars (729 → ~1,650) so a 10-item cycle took
  11–14 min of a 15-min slot; and six heavy passes all started on the same minutes on a 4-core box. Fixes: the sweep
  yields every 50 variants (ded9d6a5, measured 16.9 s for 3,715 variants) and both sweeps log durations over 2 s;
  subtitle-sync runs 8 per cycle; the six heavy passes start on staggered minutes (93f33b18). Post-change max stall
  4.6 s versus 170 s — under observation. The deeper "why minutes rather than seconds" is not yet proven.

- [x] **8.28** The library scan is now cooperative: `await` on synchronous better-sqlite3 calls only queues microtasks, so the
  scan's loops never let timers or HTTP run — which is why 23 stalls of 5–30 s (one 170 s) clustered right after post-import
  scans and node-cron logged "missed execution". Movies/episodes yield every 50 rows, disk listings every 100 files, sidecar
  registration every 25 (0ae280ca, 34/34 tests). Verification lands with the next import: today's pick (Solar Opposites S02 +
  S03) will trigger a post-import scan, so the stall profile of that exact pass is the measurement.

- [x] **8.29** A sidecar placed after the first read of its directory stayed invisible: the sweep reused a per-directory
  listing cache that was never cleared, so The Running Man's renamed `.en.srt` was pruned-then-not-registered until a
  restart. The sweep now starts with a fresh cache (247dea9b) and registered the track on the very next pass. Also
  relabelled that file (`The Running Man (2025).srt` → `.en.srt`) after stripping its two YTS advertising cues — the
  API now reports `{zh: true, en: true}` and the manifest offers `zho` + `eng` for a movie the owner is 12 % into.

## Notes

- TV was unreachable at track start (`adb connect` → "No route to host") and came back at 20:50, so
  the install was attempted — the blocker is the signing key, not the network.
- Building needed `flutter pub get` to run online, and Astrill's DNS proxy does not resolve
  `pub.dev`; a temporary `/etc/hosts` entry (removed afterwards) let pub resolve. Builds then need
  `--no-pub`, and a stale `GeneratedPluginRegistrant.java` had to be deleted once so Gradle
  regenerated it without the dev-only `integration_test` plugin.

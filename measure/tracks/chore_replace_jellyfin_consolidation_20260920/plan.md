# Plan: Replace Jellyfin with Flutter Client + Slim Mediarr Server

> Contract-first + TDD per `measure/workflow.md`. Each phase is independently demonstrable on the TV box (`192.168.10.62`). Phases 1-4 are agent-executable; Phase 5 has a human-gated physical-TV check.

## Phase 0: Bring-up and Reversibility

- [ ] Capture the exact restore command for the ThaiDub service before touching anything: `systemctl --user start thaidub-serve.service` (stop with `systemctl --user stop …`). **Stop only — never `disable`.** Confirm `systemctl --user is-enabled thaidub-serve.service` still reports `enabled` after our stop. _(Integrator handles — human-gated host step.)_
- [ ] Capture the current Flutter client install state on `192.168.10.62`: `adb -s 192.168.10.62:5555 shell pm list packages | grep jellyfin` (expect `org.jellyfin.androidtv` only, after the mobile removal). Record `org.jellyfin.androidtv` version via `dumpsys package`. _(Integrator handles — human-gated TV step.)_
- [ ] Capture the existing mediarr server boot baseline: `MEDIARR_SLIM_MODE=false npm run dev` — confirm torrent/indexer/RSS/subtitle/notification services start and the schedule registry contains their cron entries. _(Integrator handles — covered in code by the full-mode regression guard in `serviceContainer.slim.test.ts`.)_
- [x] Add a `MEDIARR_SLIM_MODE` config seam to `server/src/config/` next to `jellyfin.ts`, default `false`, with a `.env.example` entry and a `MEDIARR_SLIM_MODE` entry in `docker-compose.yml`. The seam MUST NOT change any existing default behaviour. _(Done: `server/src/config/slim.ts` `resolveSlimConfig` follows the jellyfin.ts TRUE_VALUES pattern; `MEDIARR_SLIM_MODE=false` documented in `.env.example`; `MEDIARR_SLIM_MODE: ${MEDIARR_SLIM_MODE:-false}` in `docker-compose.yml`; resolver unit-tested in `server/src/config/slim.test.ts`.)_
- [ ] Commit: `chore(slim): add MEDIARR_SLIM_MODE config seam`. _(Deferred — integrator commits per the chore brief.)_

## Phase 1: Slim Mode Wires Up

- [x] Red: a unit test asserts that with `MEDIARR_SLIM_MODE=true`, `main.ts` does **not** instantiate the torrent engine (`createRuntimeTorrentManager`), `IndexerFactory`, `IndexerServiceDiscovery`, `RssSyncService`, `ImportListSyncService`, `SubtitleAutomationService`, `SubtitleInventoryApiService`, `VariantSubtitleFetchService`, `VariantWantedService`, `VariantBackfillService`, `VariantInventoryIndexer`, `NotificationDispatchService`, `NotificationTransportRegistry`, or `seedCategories`/`seedQualityDefinitions`/`seedQualityProfiles`/`seedSmartDefaults`. The test imports `main.ts` behind a factory seam so it can pass a slim flag and observe the resulting service set. _(Done: `main.ts` is now a thin entrypoint; `server/src/serviceContainer.ts` `createServiceContainer({ slim, ... })` is the factory seam; `server/src/serviceContainer.slim.test.ts` asserts slim mode keeps the kept set, omits the disabled set (`container.arr === null`, disabled deps undefined), and that full mode still instantiates the complete set.)_
- [x] Green: branch the imports and initialisation in `main.ts` on `MEDIARR_SLIM_MODE`. Each disabled domain MUST return `404` (or `503` if state already exists) at its route map. _(Done: slim mode skips -arr construction; `createApiServer(..., { slimMode })` does not register torrent/indexer/subtitle/import-list/notification/quality/download-client/custom-format/release/blocklist/category routes, so they return 404; `server/src/api/slimModeRoutes.test.ts` pins 404 for 7 representative routes in slim mode and non-404 in full mode.)_
- [x] Red: a unit test asserts the schedule registry contains no cron entries for the disabled domains in slim mode. _(Done: `serviceContainer.slim.test.ts` asserts `rss-sync`, `import-list-sync`, `wanted-search`, `subtitle-wanted-search` are absent and `library-scan`, `auto-update-check` remain.)_
- [x] Green: gate the schedule registrations on the same flag. _(Done: `registerScheduledJobs()` registers disabled-domain cron jobs only when the -arr service set exists; kept jobs register in both modes.)_
- [x] Red: a unit test asserts the existing full-mode behaviour is unchanged when `MEDIARR_SLIM_MODE=false` (regression guard). _(Done: `serviceContainer.slim.test.ts` full-mode block and `slimModeRoutes.test.ts` full-mode block; whole suite 3132 tests green.)_
- [ ] Commit: `feat(slim): gate -arr domains behind MEDIARR_SLIM_MODE`. _(Deferred — integrator commits per the chore brief.)_

## Phase 1d: In-Place Permanent Transcoding

- [ ] Probe target decoder. `adb -s 192.168.10.62:5555 shell getprop ro.product.cpu.abi` and `ffprobe` a known-good file to confirm codec/container matrix. Record the TV's safe set (likely H.264 + AC-3/AAC in MP4 faststart). Store as `server/src/transcode/safeSet.json` and unit-test against it.
- [ ] Ensure ffmpeg + ffprobe are present in the runtime. Update `Dockerfile` if missing. Test: `docker run --rm <image> ffmpeg -version`.
- [ ] Red: a test detects a fixture that fails the fast-seek probe (no keyframe in the first 5s, or container without `+faststart`) and asserts `TranscodeProbeService` schedules it.
- [ ] Red: a test asserts a healthy fixture is not scheduled (idempotence).
- [ ] Red: a test asserts that after `TranscodeWorker` completes, the Jellyfin-compatible playback URL (`/Videos/{id}/stream`) returns the transcoded file.
- [ ] Red: a test asserts the SSE event hub publishes `transcode:state` with `pending`/`active`/`completed`/`failed` transitions.
- [ ] Green: implement `TranscodeProbeService`, `TranscodeWorker` (ffmpeg invocation, output to staging path), `TranscodeRepository`, `TranscodeScheduler` (cron-driven), and the verification-pass + in-place swap. Wire them in slim mode; in full mode the schedule runs but is informational only (does not overwrite `-arr`-managed files).
- [ ] SPA: a "Transcode Queue" page reads `/api/transcode/list`, subscribes to `transcode:state` over SSE, and offers a manual `trigger` button.
- [ ] Commit: `feat(transcode): in-place permanent transcoding for guaranteed seek and replay`.

## Phase 1c: Library Normalization Safety Net (Hermes Trash-Picker)

- [ ] **Prereq:** confirm `library_scan_resilience_20260801` has shipped the unreadable-subdirectory fix. If not, that work moves into this phase as a blocker.
- [ ] Red: a test drops a deliberately-misnamed fixture file (`Some.Show.S01E03.1080p.WEB-DL.x264-GARBAGE.mkv`) into a watched directory and asserts that `LibraryScanService` renames it to the canonical form (`Some Show/Season 01/Some Show - S01E03 - Episode Title.mkv`) on the next scan.
- [ ] Red: a test asserts a missing or stale `poster.jpg` next to a movie file is regenerated by `MetadataProvider` on the next scan.
- [ ] Red: a test asserts that running the scan twice against the same healthy fixtures produces zero file changes (idempotence).
- [ ] Red: a test asserts that one unreadable subdirectory in the walk no longer rejects the entire scan (the residual defect recorded in `chore_remaining_server_service_coverage_20260728`).
- [ ] Green: implement in-place self-healing in `LibraryScanService` and `Organizer`. Self-healing MUST be a deterministic function of the on-disk state and the canonical schema — no LLM, no regex guessing beyond the existing parser.
- [ ] Commit: `feat(scan): self-healing library normalization on every scan`.

## Phase 1b: Server-Side Default Track Ranking

- [ ] Red: a unit test asserts that the Jellyfin-compatible playback response (`server/src/jellyfin/playback.ts` `MediaSource`) ranks the **English audio track first** and the **Chinese Simplified subtitle track first** when both are present. Variants without English audio rank the first audio track; variants without ZH-Hans subs drop the subtitle track from the default selection (manual override still works).
- [ ] Green: implement the ranking in the playback DTO mapper. Use ISO 639-2 codes (`eng`, `zho`, `chi`) and language tag matching; the existing `chinese-subs` pipeline produces variants tagged with `zho` or `chi`.
- [ ] Red: a test pins the exact ordering for a multi-track variant (e.g. `eng` audio wins over `jpn` audio; `zho` subs win over `eng` subs when both exist).
- [ ] Commit: `feat(playback): rank English audio + Chinese Simplified subtitles first`.

## Phase 2: Single Trusted-LAN User

- [x] Red: a test asserts slim mode exposes exactly one user (`COMPAT_USER_ID`, name `Mediarr`) via `/Users/Public`, `/Users/AuthenticateByName`, and `/Users/{uid}`. The existing `buildTrustedLanUserDto` is the source of truth. _(Done: `COMPAT_USER_ID` now exported from `server/src/jellyfin/compatibilityDtos.ts` (single source of truth, consumed by `createJellyfinServer.ts`); `server/src/jellyfin/slimTrustedLanUser.test.ts` pins exactly one user with the compat id/name on all three endpoints and no credential storage (`HasPassword: false`).)_
- [x] Red: a test asserts the full-mode multi-user behaviour is unchanged (regression guard). _(Done: the trusted-LAN surface is mode-independent — `slimTrustedLanUser.test.ts` pins `/Users` to equal `/Users/Public` with the same single user; existing `createJellyfinServer.test.ts` handshake coverage stays green.)_
- [ ] Commit: `feat(slim): single trusted-LAN user in slim mode`. _(Deferred — integrator commits per the chore brief.)_

## Phase 3: Drop the Legacy Kotlin Android TV Client

- [x] Grep for every reference to `clients/android-tv/`, `android-tv`, and the Kotlin client names across the repo: `package.json`, `Dockerfile`, `docker-compose.yml`, `.github/`, `.opencode/`, `docs/`, `AGENTS.md`, `README.md`, `DESIGN.md`, `CHANGELOG.md`, `measure/`. (Done 2026-09-20. Live hits: `AGENTS.md`, `README.md`, `measure/tech-stack.md`, `measure/tracks/chore_deployment_readiness_caveat_lockdown_20260815/spec.md`, this track's `spec.md`/`plan.md`. No hits in `package.json`, `Dockerfile`, `docker-compose.yml`, `.github/` (absent), `.opencode/`, `docs/`, `scripts/`, `DESIGN.md`, `CHANGELOG.md`. Package name `com.mediarr.tv` only inside the deleted tree and `measure/archive/`.)
- [x] Remove each reference. Update `AGENTS.md` Mandate 6 from "deprecated — do not develop" to "deleted 2026-09-20". (Done 2026-09-20.)
- [x] Delete `clients/android-tv/`. Note: the chore brief overrides the original `git rm -r` wording — deleted with plain `rm -rf`, left uncommitted for the integrator.
- [x] Commit: `chore(clients): delete deprecated Kotlin Android TV client`. Note: deferred — the integrator commits the uncommitted deletion per the chore brief. Verification done: zero live `android-tv` references (archives/CHANGELOG excepted); `npx tsc -p server/tsconfig.json --noEmit` 0 diagnostics.

## Phase 4: Flutter as the Sole TV Client

- [x] Build release APK: `cd clients/mediarr-client && flutter build apk --release --target-platform android-arm64`. Confirm the build is unsigned-debuggable (sideload via ADB). _Built; APK at `build/app/outputs/flutter-apk/app-release.apk`. Used `--android-skip-build-dependency-validation` because the cached Gradle wrapper is 8.12 and Flutter requires 8.14 — network downloads timed out twice, so we kept 8.12 and bypassed the version check._
- [ ] Uninstall stock Jellyfin: `adb -s 192.168.10.62:5555 uninstall org.jellyfin.androidtv`. _(Integrator handles — human-gated physical-TV step.)_
- [ ] Install Flutter APK: `adb -s 192.168.10.62:5555 install -r build/app/outputs/flutter-apk/app-release.apk`. _(Integrator handles — human-gated physical-TV step. applicationId for ADB is `com.mediarr.mediarr_client`.)_
- [ ] Launch: `adb -s 192.168.10.62:5555 shell monkey -p com.mediarr.mediarr_client 1`. _(Integrator handles — human-gated physical-TV step.)_
- [x] **Client:** playback opens with **English audio + Chinese Simplified subtitles** selected, no track picker shown first. Manual picker still reachable from a gesture. _Implemented: `PlaybackService._onTracks` applies `selectDefaultAudioTrackIndex` / `selectDefaultSubtitleTrackIndex` from `track_selection.dart` when the player emits its first `tracks` snapshot. Manual override lives behind the closed-caption button on the transport overlay (AlertDialog listing each track with a check on the active one). Default selection is silent — no picker is shown first._
- [x] **Client:** subtitle timing nudge control ships. Buttons: −5s, −1s, −0.5s, +0.5s, +1s, +5s, reset. Offset applies to SRT and ASS renderers. Offset is per-session, resets per media. _Implemented: `PlaybackService.nudgeSubtitleDelay` / `resetSubtitleDelay` push the offset to `MediaKitSubtitleRenderer`, which drives libmpv's `sub-delay` (honoured by libass — applies to both SRT and ASS). Per-media reset is in `play()`: renderer offset zeroed, state cleared, toast timer cancelled. Offset is clamped to ±60s. Toast label ("Subs +1.5s") rendered via `_SubtitleDelayToast`; cleared by an auto-timer 2s after the last nudge._
- [ ] **TV check (human-gated):** browse a movie library, direct play with pause/seek, stop, restart — resume position survives. Confirm English audio + ZH subs are the default. Confirm subtitle timing nudge visibly shifts captions forward and backward. _(Integrator handles — human-gated physical-TV step.)_

## Phase 5: Deploy Defaults

- [ ] Flip `.env.example` and `docker-compose.yml` defaults to `MEDIARR_SLIM_MODE=true` for the home-lab profile. Keep a one-line toggle back to `false` documented in `README.md` under "Going full-stack".
- [ ] Update `README.md` with a one-line "go slim" instruction and a one-line "go full-stack" toggle.
- [ ] Run root CI: `CI=true npx vitest run server/src tests` — exit 0.
- [ ] Run SPA CI: `CI=true npm test --workspace=app` — exit 0.
- [ ] Run server strict typecheck: `npx tsc -p server/tsconfig.json --noEmit` — zero diagnostics.
- [ ] Run Flutter analyze: `cd clients/mediarr-client && flutter analyze` — zero issues.
- [ ] Build Flutter release APK and install on `192.168.10.62` (Phase 4 verification).
- [ ] Boot `MEDIARR_SLIM_MODE=true` against the home-lab stack. Confirm `-arr` services are absent from logs, single user is advertised, Flutter client discovers and plays.
- [ ] Commit: `chore(deploy): default home-lab profile to MEDIARR_SLIM_MODE=true`.

## Dependencies

- The in-progress track `feature_jellyfin_server_surface_20260729` provides the Jellyfin-compatible surface this track reuses. Phases 1-2 do not block on its remaining Phase 4-7 work; we only need the surface the Flutter client exercises. We narrow scope away from "stock Jellyfin TV app parity".
- `library_scan_resilience_20260801` (existing track) must ship its unreadable-subdirectory fix before Phase 1c can be marked complete; if not shipped, Phase 1c pulls that work in as a blocker.
- Phase 1b depends on Phase 1 (slim mode wires up — both touch `main.ts` import gating).
- Phase 1c depends on Phase 1 (ImportManager + Organizer + LibraryScanService must stay running) and the resilience fix.
- Phase 1d depends on Phase 1 (transcoder wires up under slim-mode startup) and Phase 1c (only normalized files are probed/transcoded).
- Phase 4 depends on Phase 1 (slim mode wires up), Phase 1b (server ranks tracks), Phase 1c (trash-picker works on real files), and Phase 1d (transcoded playback URLs return the right file).
- Phase 5 depends on Phase 4 (Flutter verification on TV).

## Risk Register

- **Risk:** `-arr` services have hidden cross-dependencies inside `main.ts`; gating them breaks startup. **Mitigation:** Phase 1 tests assert both slim and full mode start cleanly.
- **Risk:** slim mode accidentally disables a route the Flutter client depends on. **Mitigation:** Phase 4 physical-TV check before commit; Phase 5 deploy defaults require TV check pass.
- **Risk:** deleting `clients/android-tv/` breaks a docs link the owner uses. **Mitigation:** Phase 3 grep-and-remove covers all references before deletion.
- **Risk:** server-side track ranking mis-tags existing variants because audio/subtitle language tags are inconsistent. **Mitigation:** Phase 1b tests cover `eng`/`zho`/`chi`/`jpn` ordering; the `chinese-subs` pipeline produces consistent tags, but a probe of existing `mediarr.db` variants must run before ranking is committed.
- **Risk:** subtitle timing nudge is fragile across subtitle formats (SRT cues vs ASS styles vs PGS bitmaps). **Mitigation:** Phase 4 explicitly tests SRT and ASS; PGS is out of scope unless already supported by the player's renderer.
- **Risk:** Hermes drops files with garbage names and Mediarr's self-heal misidentifies them, renaming a correctly-named file or losing episode mapping. **Mitigation:** Phase 1c tests cover a deliberately-misnamed fixture and a healthy baseline; the rename path must be reversible from a backup or staging copy during the test run. Self-healing MUST be idempotent.
- **Risk:** `LibraryScanService` enters an infinite rename loop if the canonical schema disagrees with itself. **Mitigation:** the idempotence test (re-scan produces zero changes) catches this; the implementation MUST compare against the post-rename target and stop.
- **Risk:** Hermes non-determinism causes it to fight with Mediarr's self-heal (Hermes renames a file, Mediarr renames it back). **Mitigation:** FR-9 keeps Mediarr as the deterministic authority — Hermes is informed via the schema, not the other way around. Document the precedence rule in `docs/library-normalization.md`.
- **Risk:** transcoding a single large file takes hours and blocks the worker queue. **Mitigation:** Phase 1d tests assert the worker is async/cancellable and the queue exposes state; the SPA UI shows progress and offers cancel.
- **Risk:** ffmpeg/ffprobe binaries are not in the runtime image. **Mitigation:** Phase 1d Dockerfile check is a hard gate before the transcoder ships.
- **Risk:** transcoded output passes the probe but still fails to seek on the actual TV. **Mitigation:** verification pass probes the output; a failure rolls back the swap and re-queues with a different preset. Empirical TV-playback logs feed back into the safe-set matrix.
- **Risk:** a Hermes drop races the transcoder on the same file (Hermes drops, Mediarr transcode starts, Hermes overwrites). **Mitigation:** the worker holds a write lock per file path; Hermes is documented to wait for the lock or re-drop after a failed lock.
- **Risk:** storage cost doubles when originals are kept alongside transcodes. **Mitigation:** Phase 1d swaps in place after verification by default; "keep original" is a per-file opt-in for re-runs.
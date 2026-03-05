# Manual Verification Handoff - 2026-03-05

## Session Scope
- Branch: `track/android_tv_client_20260304`
- Device under test: `emulator-5554` (`AOSP_TV_on_x86`, Android 14 / API 34)
- Local server: running on same host (`0.0.0.0:3001`)
- Goal: execute deferred end-of-track manual verification for Android TV client phases 1-3.

## Environment Notes
- Local Android SDK installed in-project: `clients/android-tv/.android-sdk`
- AVD in use: `MediarrTvApi34`
- Emulator launcher helper added:
  - `clients/android-tv/scripts/launch-emulator.sh`
  - Supports `up/build/install/run/status/down`
  - Added `--safe-mode`, `--balanced-mode`, and `--tune`

## Code Changes Applied During Verification
- `1b811b3a` `chore(android-tv): add local emulator launcher script`
- `d543d59a` `fix(android-tv): add safe-mode launcher flags for emulator stability`
- `b3f6cf7d` `fix(android-tv): add balanced emulator mode and runtime tuning`
- `84aa32f3` `fix(android-tv): load remote catalog by default on emulator`
- `e089c0ce` `fix(android-tv): enable cleartext local api and initialize home with remote repository`

## What Was Verified Working
- Emulator boots and is reachable by `adb`.
- App installs and launches from Leanback launcher.
- App now loads live library content from server (not only mock placeholders).
  - Confirmed by UI hierarchy dump: real titles appear (for example: `The Accountant`, `The Big Bang Theory`, etc.).

## Current Blocking Issues (As Observed in Emulator)
1. Posters are not rendering (cards mostly dark placeholders, text metadata present).
2. Focus/selection state is not visually obvious (no clear highlight/zoom/selection affordance observed).
3. Extended Controls DPAD input appears ineffective for navigation.
4. Clicking/selecting entries does not navigate to detail/playback in current manual run.
5. User reports app interaction lockups in some runs after placeholders/load states.

## Acceptance Criteria Status Snapshot
- [ ] App finds the server automatically on first launch.
  - Partial: app can load server data with current fallback path, but auto-discovery behavior still needs clean validation.
- [~] Users can browse the entire library (Movies/TV) with posters.
  - Partial: text/library rows load; poster images and reliable interaction are currently blocked.
- [ ] 4K Video plays smoothly with user-selected subtitle tracks.
  - Not reached due navigation/input blockers.
- [ ] Stopping playback at 15:00 and resuming later starts the video at 15:00.
  - Not reached due navigation/input blockers.

## Repro State for Next Session
1. Boot emulator with:
   - `clients/android-tv/scripts/launch-emulator.sh up --balanced-mode --tune --timeout 420`
2. Install app:
   - `clients/android-tv/scripts/launch-emulator.sh install`
3. Launch app:
   - `clients/android-tv/.android-sdk/platform-tools/adb -s emulator-5554 shell monkey -p com.mediarr.tv -c android.intent.category.LEANBACK_LAUNCHER 1`
4. Observe:
   - real library text rows appear,
   - posters/focus/input/navigation remain inconsistent or blocked.

## Suggested First Tasks Tomorrow
1. Fix TV focus model and visible selection state in `PosterCard` and row containers.
2. Validate key event handling for DPAD center/enter/back in Compose TV hierarchy.
3. Fix poster image loading path (URL, cleartext, image component behavior, placeholder handling).
4. Re-run manual verification for Home -> Detail -> Playback -> Resume flow and collect evidence.


# TV blank screen after reboot — cause and recovery (2026-11-10)

## What the owner saw

After rebooting the X96Max the screen stayed blank: Android was showing
`com.android.tv.settings/.system.FallbackHome` and the Mediarr process was not
running.

## What we had changed (honest scope)

- **This session:** the only TV-box writes were app installs (`adb install -r`
  of 1.3.72 … 1.3.76), `am force-stop`/`am start`, and remote key events for UX
  verification. No package enable/disable and no launcher/home-setting commands
  were issued.
- **Earlier (2026-11-07/08 kiosk setup):** Mediarr was opted in as an Android
  HOME app and the stock Amlogic launcher was user-disabled (`enabled=3`). The
  manifest comment claims the stock launcher is "never removed", but it was
  disabled in that setup.

## Root cause chain (reproduced from device state)

1. `pm list packages -d` showed `com.amlogic.android.leanbacklauncher` **disabled**, so
   `cmd package resolve-activity … -c android.intent.category.HOME` had no usable
   launcher once the preference was gone.
2. **A package replace clears the app's preferred HOME binding.** Tonight's
   repeated `adb install -r` (1.3.72→1.3.76) plus the app's own updater replaced the
   package and dropped the preference; `resolve-activity` then returned only
   `FallbackHome` (`isDefault=true`).
3. On boot, Android sat in the blank FallbackHome because no enabled HOME app was
   preferred. The app itself was healthy — launching it manually over ADB took
   667 ms, with no crash in any log buffer and no FATAL entries.

This is a launcher-state issue, not a server/network or app-startup defect. The
server was up throughout (`mediarr.service` active since 07:06, 0 restarts,
`0.0.0.0:5174`, health 200 on the LAN IP `192.168.10.65`).

## Recovery performed (2026-11-10 21:53–22:00)

```bash
adb -s 192.168.10.60:5555 shell pm enable com.amlogic.android.leanbacklauncher
adb -s 192.168.10.60:5555 shell cmd package set-home-activity com.mediarr.mediarr_client/.MainActivity
adb -s 192.168.10.60:5555 install -r …/client-updates/mediarr-client-102.apk   # 1.3.78 / code 102
adb -s 192.168.10.60:5555 shell cmd package set-home-activity …                # re-assert after replace
```

Verification:

- `resolve-activity … HOME` → `com.mediarr.mediarr_client/.MainActivity`.
- `mResumedActivity` → Mediarr; HOME key keeps it focused; app runs on 1.3.78.
- Stock launcher is **enabled** again, so even a lost preference boots to the
  Android launcher picker instead of a blank screen.
- Screenshot: `tv-recovered-1.3.78-20261110.png`.

## Prevention

- `automation/scripts/tv-updater.sh` now reads the pre-update HOME target and,
  when Mediarr was the launcher, re-asserts `set-home-activity` after the silent
  `adb install`. Log line: "re-asserted Mediarr as the HOME app after the package
  replace".
- `automation/scripts/tv-launcher-recover.sh` is the one-command manual recovery
  (also usable when only ADB is available).
- The stock launcher stays enabled as the fallback; do not disable it again.

## Known residual risk

The **in-app** updater (`PackageInstaller`) also replaces the package and can
clear the preference; the watcher cannot run `cmd package` itself. Keeping the
stock launcher enabled makes that failure mode a chooser instead of a blank
screen, and the recovery script restores kiosk mode in one command.

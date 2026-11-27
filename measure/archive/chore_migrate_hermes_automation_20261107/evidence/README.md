# Build evidence — 2026-11-07

| Evidence | What it proves |
|---|---|
| `health-20261107.json` | Mediarr API healthy on the real DB, 6 scheduler tasks, recovery after listen |
| `tv-artwork-proxy-20261107.png` | Live X96Max client showing real library **with artwork** after the client image-proxy change |
| `tv-playback-chinese-subtitle-20261107.png` | Live client **playing** an episode streamed from Mediarr **with a Chinese subtitle rendered** |

Measured on the live install:

- Server: `API_PORT=5174`, `DATABASE_URL=file:/config/mediarr.db`, real DB = 550 movies / 28 series / 2 971 episodes. API up in **48 s** after restart (variant backfill only); missed-run recovery now starts **after** `app.listen`.
- Client: built from current source (Flutter 3.47, `--target-platform android-arm`, Gradle wrapper 8.14.3 committed; local build used cached 8.12 + `--android-skip-build-dependency-validation` because the 8.14 download stalled on the VPN). Installed over ADB after uninstall (old APK had a different signature); manual server entry `192.168.10.65:5174`.
- Artwork: TV loads the server proxy; posters/backdrops render.
- Playback: `GET /api/stream/:id` serves the mkv to the client; subtitle sidecar served via `/api/playback/subtitles/:trackId`.
- Aligner: a +10 s shifted `.zho.srt` was corrected in 11 s by ffsubsync; a second verification pass reported offset 0.000 s and scale 1.000 (the source was 0.83 s early).

## Round 2 (2026-11-07, later)

| Evidence | What it proves |
|---|---|
| `tv-continue-watching-20261107.png` | Live TV home shows the featured **Resume 00:32** hero and a **Continue Watching** row (Murderbot S01E02, 2%) populated from real playback progress |

Also verified live:

- Mediarr now runs as an **enabled systemd user service** (`mediarr.service`, Restart=always); restart recovered the API in ~64 s.
- **Chinese subtitle sync is live**: `subtitle-sync` scheduler task (30 min, limit 5) aligned 5/5 The Last of Us sidecars, second-pass residual 0.000 s, `.orig` backups written, no temp leftovers; task history shows success at ~106 s.
- `/api/playback/continue-watching` returns Murderbot E02 at 32 s with `isWatched:false` — the tracking chain server → client is real.

## Round 2b — client self-update (2026-11-07)

| Evidence | What it proves |
|---|---|
| `tv-update-dialog-20261107.png` | In-app prompt: version + notes, **Update now** / **Wait 12 hours**, live countdown ("Updating automatically in 26 s") |
| `tv-update-installer-20261107.png` | After auto-download, Android's installer confirms: "Do you want to install an update to this existing application?" |
| `tv-client-version-20261107.txt` | Installed client after the update: **versionName 1.0.4, versionCode 5** |

Verified live:
- **Server**: `GET /api/client/update` (manifest) + `GET /api/client/download` (APK), published by `automation/scripts/publish-client-update.sh` into `CONFIG_DIR/client-updates/`.
- **In-app path**: v4 (1.0.3) → prompt → countdown → download (59 MB over TV Wi-Fi, ~90 s) → system installer → INSTALL → v5 (1.0.4) running. One remote press is required by Android; the TV is not rooted/device-owner.
- **Silent path**: `automation/scripts/tv-updater.sh` installed v2→v4 over network ADB in **33 s** with sha256 verification and relaunch; daily systemd timer at 04:00. Requires no TV interaction.
- Android 9 gate: the installer needs "Install unknown apps" for the app; granted once via `adb shell appops set com.mediarr.mediarr_client REQUEST_INSTALL_PACKAGES allow` (documented in PROVISIONING/tooling).

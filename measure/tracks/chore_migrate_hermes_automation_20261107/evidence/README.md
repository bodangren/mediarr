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

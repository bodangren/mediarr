# Automation tooling — installed and verified

> Installed 2026-11-07 under the owner's blanket approval ("install whatever tooling you need").
> Verify anything here before relying on it; every row names how to test and update it.

## 1. Pinned inventory

| Tool | Version | Path | Update | Used by |
|---|---|---|---|---|
| yt-dlp | **2026.10.26** | `~/.local/bin/yt-dlp` (standalone binary) | `yt-dlp -U` | YouTube subscriptions, music ingest |
| ffmpeg / ffprobe | **8.0.1** | `/usr/bin/ffmpeg`, `/usr/bin/ffprobe` (system) | distro | audio/video conversion, cover art |
| beets | **2.14.1** | `~/.local/share/mediarr-automation/venv/bin/beet` | `uv pip install -U beets` in that venv | music tagging / filing |
| Python (beets venv) | **3.12.14** | `~/.local/share/mediarr-automation/venv` | `uv python install` | beets runtime |
| uv | **0.13.7** | `~/.local/bin/uv` | `uv self update` | venv/package management |
| pnpm | **12.18.0** | `~/.local/bin/pnpm` | `npm i -g pnpm` | DSH plugin install/management |
| kimi-webbridge | **0.1.3** (`mcp` server) | `~/.nvm/versions/node/v24.18.0/bin/kimi-webbridge` | `npm i -g kimi-webbridge` | browser-use tools for agents |
| Chrome + Kimi WebBridge extension | Chrome 151 / ext **2.0.23** | `/opt/google/chrome/chrome`, profile extension `fldmhceldgbpfpkbgopacenieobmligc` | Chrome UI | the browser the bridge drives |
| sqlite3 / jq | system | `/usr/bin/{sqlite3,jq}` | distro | inspection scripts |

Also present: `python3.14` (system), Node `v26.7.0` (`~/.local/bin/node`), Node
`v24.18.0` (`~/.nvm/...`), `curl`.

## 2. Torrent engine — decided 2026-11-07

**Use Mediarr's built-in WebTorrent engine; do not add an external client.**

Evidence:

- Grabs go through the internal manager: `MediaSearchService` calls `torrentManager.addTorrent`
  (`server/src/services/MediaSearchService.ts:387`, `:794`), and the code says so outright —
  *"downloadClientId is accepted but currently not used since we use the internal torrent manager"*
  (`:902`).
- The engine is WebTorrent **2.8.5** (repo-root `package.json:57`), initialized in
  `server/src/services/TorrentManager.ts:117-133`, with completion → import, stats SSE, and
  `SeedingProtector` already wired.
- `DownloadClientRepository` supports types `transmission | qbittorrent | deluge | rtorrent | …`
  (`server/src/repositories/DownloadClientRepository.ts:10-18`) but **no adapter adds torrents**; it
  is a configuration/UI surface only.

Why this is the right choice: one owner for torrent state, import, seeding and the agent-facing API;
the agent drives `POST /api/releases/grab` / `/api/torrents/*`; no second daemon, no rtorrent, no
torrent MCP/plugin indirection.

**Transmission today (2026-11-07):** `transmission-daemon.service` active, RPC on `:9091`, five
torrents — four complete/idle, one active at **83.4%** (For All Mankind S03). `transmission-remote`
remains the read-only way to inspect it.

**Known unit bug (B2b):** the speed-limit setting is passed as Kbps into a bytes/sec setter
(`downloadClientRoutes.ts:121-125` → `TorrentManager.ts:547-554`), so 1024 means ~8 kbps. Fix before
the validation run.

**Decommission condition (do not disable early):**
1. the active torrent completes (or is deliberately re-added to Mediarr),
2. one real magnet is validated end-to-end through Mediarr (progress → complete → import),
3. the old Hermes jobs are disabled.
Then `systemctl --user disable --now transmission-daemon.service` — disabled, not deleted.

**Risk to validate:** WebTorrent is pure JS; watch throughput, memory and tracker/DHT behaviour on
the first real grab. If it proves unacceptable, the fallback is a Transmission adapter behind the
same Mediarr API — not a different automation interface.

## 2b. Subtitle alignment (2026-11-07)

Chinese subtitles are part of the operation, so alignment tooling is installed:

| Tool | Version | Path | Role |
|---|---|---|---|
| ffsubsync | **0.5.1** | `~/.local/share/mediarr-automation/venv/bin/ffsubsync` | **primary** — audio-based alignment, no reference subtitle needed |
| alass | **2.0.0** | `~/.local/bin/alass` | optional — reference-subtitle alignment when an English `.srt` exists |
| subalign (ASR) | existing | `~/.local/bin/subalign` → `~/tools/subalign/.venv` | verifier / fallback for items ffsubsync cannot lock |

Measured on a real episode (Rick and Morty S09E03, 22 min): a `.zho.srt` shifted +10 s was realigned
in **11 s**; a second pass reported **offset 0.000 s, framerate scale 1.000** (the original sidecar was
0.83 s early, so ffsubsync aligned to the audio). Verification rule: second pass `|offset| ≤ 0.3 s`
and `|scale − 1| ≤ 0.02`. ffsubsync installed cleanly under the Python 3.12 venv despite the advisor's
3.11 warning; keep 3.11 as fallback only if a future dependency break appears.

## 3. DSH MCP mount (the browser-use substrate)

`~/.dsh/profiles/web/cordis.patch.yml` now carries:

```yaml
- insert:
    - id: mcp-webbridge
      name: "@deepseek-ai/dsh-mcp-client"
      config:
        serverName: webbridge
        transport: stdio
        command: /home/daniel-bo/.nvm/versions/node/v24.18.0/bin/kimi-webbridge
        args: ["mcp"]
        failOnStartupError: false
```

Why this works: `@deepseek-ai/dsh-mcp-client` registers an external MCP server's tools as native
tools named `mcp__<serverName>__<tool>`; `kimi-webbridge mcp` is a stdio MCP server that also opens
`ws://127.0.0.1:10086/ws` for the Chrome extension. The bridge's banner goes to **stderr**, so the
JSON-RPC stream on stdout is clean.

**Verified live (2026-11-07):**

- Host spawned the server; `ss -tlnp` shows `10086`; extension connected (`[ws] ✅ 扩展已连接`, v2.0.23).
- Agent-side MCP call: `mcp__webbridge__navigate {url: https://example.com, newTab: true}` →
  `{success:true, tabId:197386329}`; `mcp__webbridge__evaluate {code: document.title}` →
  `"Example Domain"`.
- CLI fallback: `kimi-webbridge navigate/evaluate` also worked before the MCP mount.

**Operational notes:**

- Chrome **must be running** with the extension enabled; otherwise the WS server is up but agents get
  a clear tool error. That must become an alert, not a hang (watchdog item B9).
- The bridge is no longer a separate service: DSH spawns it from the MCP entry and supervises it via
  the host. On a host restart the bridge restarts with it; Chrome/extension reconnect.
- **A failed bridge is not always an error:** after ~151 s of reconnect attempts the MCP client
  unregisters the tools; a run then ends normally without them. Every run must assert the
  `mcp__webbridge__*` tools exist and fail loudly otherwise. The bridge child does auto-respawn
  (verified by killing it) but the extension must reconnect.
- One managed-tab session per bridge process; `navigate ... newTab:true` is the non-disruptive way to
  open a page (do not navigate whatever tab the user has focused).
- `list_tabs`/`close_tab` have returned empty-session quirks in testing; `navigate`+`evaluate` are the
  reliable primitives. Re-check before building UI flows on tab listing.

## 4. System changes applied 2026-11-07

- Passwordless sudo via `/etc/sudoers.d/010-mediarr-agent` (no password stored); validated with
  `visudo -cf`.
- `/data` → 4TB and `/config` → `4TB/mediarr-config` symlinks; config dir + staging + legacy
  `4TB/media` chowned to uid 1000 (they were 100999). The real DB is `/config/mediarr.db`
  (550 movies / 28 series; **0 indexers**, 0 notifications, auth disabled, roots `/data/Movies` +
  `/data/TV`).
- See [`PROVISIONING.md`](./PROVISIONING.md) for the recreate-from-scratch commands.

## 4b. Flutter client builds (installed 2026-11-07)

- `flutter` 3.47 (snap), Android SDK at `~/Android/Sdk`, **OpenJDK 17** (`/usr/lib/jvm/java-17-openjdk-amd64`).
- Project wrapper is now **Gradle 8.14.3** (Flutter 3.47's minimum). The 8.14 download stalled on the
  VPN during the first build; a local build succeeded with the cached 8.12 distribution plus
  `--android-skip-build-dependency-validation`, then the wrapper was restored. Prefer letting the
  8.14 wrapper complete on a healthy network.
- TV target is **armeabi-v7a / Android 9**: `flutter build apk --release --target-platform android-arm`.
- Install: `adb -s 192.168.10.60:5555 install -r <apk>`; the old APK predates this build and had a
  different signature, so the first replacement required uninstall + manual server entry.

## 5. PATH requirements for the systemd host unit (B3)

The agent shell and the MCP child need:

```
/home/daniel-bo/.local/bin
/home/daniel-bo/.nvm/versions/node/v24.18.0/bin
/home/daniel-bo/.local/share/mediarr-automation/venv/bin
/usr/local/bin:/usr/bin:/bin
```

`~/.local/bin` supplies `yt-dlp`, `uv`, `pnpm`; the nvm bin supplies `kimi-webbridge` (and Node 24,
needed by some native modules); the venv bin supplies `beet`. The systemd unit should set
`Environment=PATH=...` explicitly and use absolute paths for `ExecStart`.

## 6. Deliberately not installed yet

| Tool | Why not | Trigger to add |
|---|---|---|
| Playwright-MCP | kimi-webbridge works and is the owner's preferred surface | bridge proves unstable across a week |
| — | (subtitle alignment moved into scope; see §2b) | — |
| Node 24 as default | root suite needs Node 24 for `better-sqlite3`; switching the default is invasive | running the Mediarr test suite / deploying |
| OpenJDK 17 | installed 2026-11-07 for Flutter/Android builds | — (installed) |
| Mediarr node deps | deployment (B1) is a service decision, not a tool install | B1 starts |

## 7. Verification log

```sh
$ ~/.local/bin/yt-dlp --version                 # 2026.10.26
$ ~/.local/bin/yt-dlp --skip-download --no-warnings \
    --print "%(title)s | %(duration)s | %(uploader)s" \
    "https://www.youtube.com/watch?v=jNQXAC9IVRw"
Me at the zoo | 19 | jawed                      # live YouTube metadata OK
$ ~/.local/bin/pnpm --version                  # 12.18.0
$ ~/.local/bin/uv --version                    # 0.13.7
$ .../mediarr-automation/venv/bin/beet version # beets 2.14.1 / Python 3.12.14
$ /usr/bin/ffmpeg -version | head -1           # ffmpeg 8.0.1
$ ss -tlnp | grep 10086                        # bridge listening
```

## 8. TV client updates (self-update)

Two independent paths exist; both use the same server-published artifact:

1. **In-app prompt (Android decides the install).**
   - Client checks `GET /api/client/update` on Home, compares `versionCode` against its build define
     (`CLIENT_VERSION_CODE`). If newer it shows: version/notes, **Update now**, **Wait 12 hours**, and a
     countdown (`UPDATE_COUNTDOWN_SECONDS`, default 30) that auto-starts the update.
   - Downloads `GET /api/client/download?file=...` via `path_provider` temporary dir, then hands the
     APK to Android's PackageInstaller through a `MethodChannel` + `FileProvider` — the user presses
     **Install** (this TV is not rooted/device-owner, so silent in-app install is impossible).
   - Android 9 gate: grant the source app "Install unknown apps" once:
     `adb shell appops set com.mediarr.mediarr_client REQUEST_INSTALL_PACKAGES allow`.
2. **Silent host updater (no TV interaction).**
   - `automation/scripts/tv-updater.sh` compares the installed `versionCode` with the server manifest,
     downloads, verifies sha256, runs `adb install -r`, and relaunches. Timer:
     `mediarr-tv-updater.timer` daily 04:00 (`automation/systemd/`).
   - This is the hands-off path; keep ADB reachable (`adb connect 192.168.10.60:5555`).

**Publishing** a build:

```sh
flutter build apk --release --target-platform android-arm \
  --build-number 4 --build-name 1.0.3 \
  --dart-define=CLIENT_VERSION_CODE=4 --dart-define=MEDIARR_CLIENT_VERSION=1.0.3
CONFIG_DIR=/run/media/daniel-bo/4TB/mediarr-config \
  automation/scripts/publish-client-update.sh build/app/outputs/flutter-apk/app-release.apk 4 1.0.3 "notes"
```

Manifest + APK live in `CONFIG_DIR/client-updates/` (not in git). `flutter build` locally uses the
cached Gradle 8.12 + `--android-skip-build-dependency-validation` when the 8.14 download stalls; the
committed wrapper stays 8.14.3.

**Verified 2026-11-07:** silent v2→v4 in 33 s; in-app v4→v5 through the system installer ending at
1.0.4/code 5; evidence in the track's `evidence/` folder.

# Provisioning — recreate this machine from scratch

> The workstation is dedicated to Mediarr: one user, one server, one client, the libraries, and the
> automation host. Everything below was applied on 2026-11-07. Secrets are **not** in this file;
> they live in gitignored env files and backups.

## 1. Base

- Ubuntu 26.04 LTS, user `daniel-bo` (uid/gid **1000**), home `/home/daniel-bo`.
- Repo: `https://github.com/bodangren/mediarr.git` → `~/Desktop/mediarr`.
- Machine-specific paths:
  - library mount `/run/media/daniel-bo/4TB` (ext4, `/dev/sdb1`)
  - real Mediarr DB/config `…/4TB/mediarr-config`
  - legacy services: jellyfin-go, transmission-daemon, hermes-gateway, fetch-monitor.timer

## 2. Passwordless sudo (no password stored)

`/etc/sudoers.d/010-mediarr-agent` (mode 0440, root:root), validated with `visudo -cf`:

```
daniel-bo ALL=(ALL) NOPASSWD: ALL
```

The owner supplied a password once for this; it is **not** stored in the repo, in AGENTS.md, or in
this document. Recreate with `sudo visudo` and the same line.

## 3. Toolchain

```sh
# yt-dlp (standalone, self-updating)
curl -fL -o ~/.local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
chmod +x ~/.local/bin/yt-dlp

# uv + Python 3.12 venv + beets
curl -LsSf https://astral.sh/uv/install.sh | sh
uv python install 3.12
uv venv --python 3.12 ~/.local/share/mediarr-automation/venv
uv pip install --python ~/.local/share/mediarr-automation/venv/bin/python beets mutagen

# pnpm (DSH plugin manager)
npm install -g pnpm

# ffmpeg/ffprobe (distro)
sudo apt-get install -y ffmpeg
```

Versions installed 2026-11-07: yt-dlp 2026.10.26 · beets 2.14.1 (py3.12) · pnpm 12.18.0 ·
uv 0.13.7 · ffmpeg 8.0.1 · Node 26.7.0 (`~/.local/bin/node`) and 24.18.0 (nvm).

## 4. Browser substrate

- Google Chrome stable, profile `~/.config/google-chrome`.
- Kimi WebBridge extension `fldmhceldgbpfpkbgopacenieobmligc` (v2.0.23).
- `kimi-webbridge` 0.1.3 at `~/.nvm/versions/node/v24.18.0/bin/kimi-webbridge`.
- Astrill VPN autostarts and is required for TPB; the browser profile carries the logged-in sessions
  the music/adult runs use.
- Chrome has **no autostart unit yet** — a reboot keeps the host but loses the browser until Chrome is
  started (open item, G2/B3/B9).

## 5. DSH profile

`~/.dsh/profiles/web/cordis.patch.yml` (append; validated by `dsh --profile web --dump-config`):

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

The `dsh-host.service` unit (pending, B3) must set:

```
Environment=DSH_PERMISSION_MODE=danger-full-access
Environment=PATH=/home/daniel-bo/.local/bin:/home/daniel-bo/.nvm/versions/node/v24.18.0/bin:/home/daniel-bo/.local/share/mediarr-automation/venv/bin:/usr/local/bin:/usr/bin:/bin
```

and **stop any terminal-launched host first** — the bridge binds `*:10086` and a second instance dies.

## 6. Filesystem ownership

The container-era dirs were uid 100999; the login user and all current services are uid 1000.
Applied:

```sh
sudo ln -sfn /run/media/daniel-bo/4TB /data
sudo ln -sfn /run/media/daniel-bo/4TB/mediarr-config /config
sudo chown -R 1000:1000 /run/media/daniel-bo/4TB/mediarr-config   # was 700/100999
sudo chown -R 1000:1000 /run/media/daniel-bo/4TB/downloads        # staging
sudo chown -R 1000:1000 /run/media/daniel-bo/4TB/media            # legacy empty
```

`/data/Movies` and `/data/TV` are the DB's configured roots; `/data` now resolves on the host as well
as in the container. `/config/mediarr.db` is the real DB (550 movies / 28 series at the time of
writing); back it up before any migration.

## 7. Still to provision (tracked in the plan)

- Mediarr server as a service/podman container with `restart: unless-stopped`, pinned `.env`
  (`DATABASE_URL`, `MEDIA_DIR`, `ENCRYPTION_KEY`).
- `dsh-host.service` + `automation-watchdog` as a **system-level** unit.
- Chrome autostart (+ VPN health probe).
- Transmission disable **after** its active torrent finishes (see `TOOLING.md` §2).
- Hermes jobs and `fetch-monitor.timer` disabled (archived `jobs.json` in the track).

## 8. TV client update path (verified 2026-11-07)

Units (copies in `automation/systemd/`):

```sh
systemctl --user enable --now mediarr.service            # API + scheduler, Restart=always
systemctl --user enable --now mediarr-tv-updater.timer   # daily 04:00 silent TV update check
```

One-time TV grant for the in-app installer (Android 9):

```sh
adb shell appops set com.mediarr.mediarr_client REQUEST_INSTALL_PACKAGES allow
```

Publish an APK and let the timer install it:

```sh
automation/scripts/publish-client-update.sh <apk> <versionCode> <versionName> "<notes>"
# or force now:
automation/scripts/tv-updater.sh
```

The TV is not rooted and cannot be device-owner without removing accounts, so the in-app path always
ends at Android's Install confirmation; the ADB updater is the silent path.

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
- The engine is WebTorrent **2.8.5** (`server/package.json`), initialized in
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

**Decommission condition (do not disable early):**
1. the active torrent completes (or is deliberately re-added to Mediarr),
2. one real magnet is validated end-to-end through Mediarr (progress → complete → import),
3. the old Hermes jobs are disabled.
Then `systemctl --user disable --now transmission-daemon.service` — disabled, not deleted.

**Risk to validate:** WebTorrent is pure JS; watch throughput, memory and tracker/DHT behaviour on
the first real grab. If it proves unacceptable, the fallback is a Transmission adapter behind the
same Mediarr API — not a different automation interface.

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
- One managed-tab session per bridge process; `navigate ... newTab:true` is the non-disruptive way to
  open a page (do not navigate whatever tab the user has focused).
- `list_tabs`/`close_tab` have returned empty-session quirks in testing; `navigate`+`evaluate` are the
  reliable primitives. Re-check before building UI flows on tab listing.

## 4. PATH requirements for the systemd host unit (B3)

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

## 5. Deliberately not installed yet

| Tool | Why not | Trigger to add |
|---|---|---|
| Playwright-MCP | kimi-webbridge works and is the owner's preferred surface | bridge proves unstable across a week |
| faster-whisper / subalign | subtitle alignment is deferred to a later item | alignment becomes in-scope |
| Node 24 as default | root suite needs Node 24 for `better-sqlite3`; switching the default is invasive | running the Mediarr test suite / deploying |
| Mediarr node deps | deployment (B1) is a service decision, not a tool install | B1 starts |

## 6. Verification log

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

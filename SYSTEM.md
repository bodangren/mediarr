# Mediarr — one system

Mediarr is **one system with several runtime surfaces**, not a server plus a client plus an
automation toolbox that happen to share a folder. Three layers, one product, one repository, one
owner:

```
                    ┌──────────────────────────────────────────────┐
   living room TV   │  Flutter client  clients/mediarr-client/     │  the interface
   web browser      │  React SPA       app/                        │
                    └───────────────────────┬──────────────────────┘
                                            │ HTTPS + Range/206, same API for both
                    ┌───────────────────────▼──────────────────────┐
   Mediaarr daemon  │  server/ — library, playback, subtitles,     │  the engine
                    │  scanning, scheduling, torrents, wanted      │
                    └───────────────────────┬──────────────────────┘
                                            │ read-only SQLite (/config/mediarr.db) + filesystem
                    ┌───────────────────────▼──────────────────────┐
   DeepSeek Harness │  automation/ — scheduled agent runs, the     │  the brain
                    │  Measure guard plugin, systemd units         │
                    └──────────────────────────────────────────────┘
```

## Rules that follow from being one system

1. **The harness runs code from this repository.** The DSH profile symlinks
   `~/.dsh/profiles/web/plugins/dsh-measure-guard` →
   `automation/dsh-plugins/dsh-measure-guard`. Editing the plugin here *is* the deployment. The same
   applies to scheduled prompts and systemd units: their source lives in `automation/`.
2. **The server owns the state; the harness mutates the world.** The server owns the databases
   (`/config/mediarr.db`), migrations and the file registry. The harness reads that state
   **read-only** (`sqlite3` read-only, never a write) and acts on the real surfaces directly:
   library files under `/data`, torrents and downloads, and the web through the browser bridge. New
   files reach the database through the engine's own scheduled scans, not through an API call. The
   REST API is a client contract for the SPA and the TV client; no layer keeps a shadow copy of
   library, playback or subtitle state.
3. **Judgement lives in agent turns; code handles the deterministic edges.** Anything that needs a
   decision (what to download, which subtitle matches, whether a page changed, why a run failed) is an
   agent run with tools. Scripts are for stable APIs, maintained CLIs (`yt-dlp`, `ffmpeg`, `beets`)
   and bookkeeping (ledger, receipts, retention arithmetic, quarantine manifests). When an agent run
   replaces a script, the script is deleted.
4. **Everything in the tree is owned here.** There is no other session, no external team and no
   "later" for untracked files: commit them or delete them. Nothing in the product is somebody
   else's code.
5. **A change is done when it is proven where it runs.** Server: `/api/health`, logs, database
   queries. SPA: Chrome against the live server. Client: the X96Max over network ADB
   (`192.168.10.60:5555`, 32-bit `armeabi-v7a`). Tests are the floor, not the proof.
6. **The product is in use, so changes are additive by default.** No intentional breakage:
   migrate, don't reset; deprecate, don't delete live data; keep the TV playing while the server is
   being fixed.

## Operator path

The harness is not an API client. It reads state read-only and changes the system on the surfaces
that own the work:

| Surface | What the operator does there | Boundary |
|---|---|---|
| `/data` (symlink to the 4TB USB) | place media, sidecars and downloads; verify the library layout | never write `/config/mediarr.db` |
| `/config/mediarr.db` | read-only SQLite inspection and cross-checks | no `INSERT`/`UPDATE`/DDL; the server owns it |
| Transmission daemon (`transmission-remote`) | inspect and drive the torrent queue | — |
| Browser bridge (`mcp__webbridge__*`) | release search, captchas, discovery and metadata on rendered sites | no DOM scrapers, no `curl` against rendered pages |
| Maintained CLIs (`yt-dlp`, `ffmpeg`, `beets`, `sqlite3`) | deterministic media edges: download, mux, convert, tag, query | scripts only for deterministic edges |
| REST API (`/api/*`) | **client contract** for the SPA and the TV client | not the automation layer |

Judgement lives in agent turns (what to acquire, which release matches, whether a page changed); a
script that exists only to scrape a rendered UI is a defect and is replaced by the operator
playbooks in [`automation/skills/`](./automation/skills/): `media-operator/`, `music-operator/`,
`adult-operator/`, `zimuku-acquire/`. The harness host is `automation/systemd/dsh-host.service`; the
old Hermes gateway is retired.

## Where the parts live

| Path | Role | Runtime |
|---|---|---|
| `server/` | daemon: API, library, playback, subtitles, scheduler, torrents | `mediarr.service` (systemd user unit) |
| `app/` | React SPA (Vite) | served by the daemon |
| `clients/mediarr-client/` | Flutter client for Android TV | APK on the X96Max, `com.mediarr.mediarr_client` |
| `automation/dsh-plugins/` | DSH plugins (Measure guard) | DSH web profile, symlinked to this repo |
| `automation/pi-measure-harness/` | retained Pi orchestration port (reference only) | not on the runtime path |
| `automation/scripts/`, `automation/systemd/` | deploy/update units and thin I/O scripts | systemd timers |
| `measure/` | the workflow, tracks and decisions that govern all of the above | read by humans and agents |
| `device-20261107/` | device captures and triage state | evidence |

## How work happens

`measure/tracks.md` is the scope of record. Each active track has a `spec.md` (what and why) and a
`plan.md` (ordered tasks). A task is `[ ]` → `[~]` while being worked → `[x]` with the 7-character
commit SHA on its line. Phases close with `[checkpoint: <sha>]`. Finished tracks are archived to
`measure/archive/`, never left to rot in the active list. See `measure/workflow.md` and
`measure/lessons-learned.md`.

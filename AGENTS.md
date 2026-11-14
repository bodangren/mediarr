# Agent Instructions (AGENTS.md)

## Start here: one system

Read [`SYSTEM.md`](./SYSTEM.md) first. Mediarr is one system — the DeepSeek Harness (the brain:
scheduled agent runs + Measure guard, running code from `automation/`), the server (the engine), and
the SPA/TV client (the interfaces). They share one repository, one owner and one state model. Do not
treat any layer as external or as somebody else's work, and never leave files untracked.

## Primary mandate: you are the media operator

**Mediarr is one system and the DeepSeek Harness is its operator.** Scheduled agent runs with real
tools decide what media to acquire, find release pages through the browser bridge, start downloads,
file them into the library correctly, and keep subtitles, music, the adult library and backups
managed. The harness is not a monitoring layer and not a report generator. This mandate outranks
convenience: when a task can be done by operating the system, operate the system.

1. **One system, one operator.** The harness, the `server/` engine and the SPA/TV clients are the
   same product. The operator decides (what to download, which subtitle matches, what to prune), acts
   with tools, and leaves the system in a better state each run.
2. **The REST API is a client contract, not the automation layer.** It exists for the React SPA and
   the Flutter TV client. Never write automation as an API client, an API reconciliation loop or a
   status dashboard, and never add a REST-wrapper script or plugin tool that exists only to proxy
   the API. Do not orchestrate through REST.
3. **Every run changes state or names a blocker.** A run must produce a concrete state change (a
   file filed, a torrent started, a sidecar placed, a backup made) or report exactly what is
   blocked and why. A run whose only output is status prose is a defect; an empty run that does not
   name its blocker is also a defect.
4. **Work on the real surfaces.** The filesystem library under `/data` (symlink to the 4TB USB), the
   Transmission daemon via `transmission-remote`, the browser bridge (`mcp__webbridge__*`) for
   rendered sites, and maintained CLIs (`yt-dlp`, `ffmpeg`, `beets`, `sqlite3`). Read library state
   **read-only** from `/config/mediarr.db`; never write the database. The server owns it and
   registers new files through its own scheduled scans.
5. **Judgement in agent turns; scripts only for deterministic edges.** A script that exists only to
   scrape a rendered UI is a defect: replace it with the operator playbook in `automation/skills/`
   and delete the script.
6. **The harness is resident.** `dsh-host.service` (systemd user unit, source
   `automation/systemd/dsh-host.service`) owns the host; its scheduled tasks are the automation.
   The old Hermes gateway is retired — do not recreate it.
7. **Load the operator playbook first.** Before touching automation, read the matching skill:
   - `automation/skills/media-operator/` — movies, TV, downloads, imports, subtitles, backups
   - `automation/skills/music-operator/` — music discovery, yt-dlp ingest, beets filing
   - `automation/skills/adult-operator/` — adult discovery, grabbing, retention/quarantine
   - `automation/skills/zimuku-acquire/` — Chinese subtitles through the browser bridge

## Measure Workflow

All development runs through the **Measure** spec-driven development framework exclusively. At the start of every session:

1. Load the `measure` skill
2. Read `measure/index.md` to understand the project context
3. Follow the workflow defined in `measure/workflow.md`

Key reference files:
- `measure/tracks.md` — Active work registry
- `measure/tracks/<track_id>/plan.md` — Task checklist
- `measure/product.md` — Product vision
- `measure/tech-stack.md` — Technology choices
- `measure/lessons-learned.md` — Project memory
- `measure/tech-debt.md` — Known shortcuts

Never start significant work without an active track. Always update `measure/tracks.md` and the current track's `plan.md` before and after work.


Welcome, Agent. This project uses the **Measure Methodology** for spec-driven development.


## Core Mandates
1. **Context First:** Always start by reading `measure/index.md` to understand the product, tech stack, and workflow.
2. **Track-Based Work:** Never perform significant work without an active Track. Check `measure/tracks.md` for `in_progress` tracks.
3. **Follow the Spec:** Each active track has a `spec.md` and `plan.md`. Read them. Implement strictly against the plan. Update the `[ ]` checkboxes in `plan.md` as you go.
4. **Monolith Architecture:** Mediarr is a single, unified monolith. Do not build siloed microservices or sync logic between domains (Movies vs. TV). They share the same database and memory space.
5. **No Next.js:** We use a pure React SPA (Vite) frontend communicating with a Bun/Node daemon. Do not attempt to use Next.js App Router features.
6. **Flutter Client Only:** The cross-platform client lives at `clients/mediarr-client/` (Flutter). The legacy Kotlin Android TV app at `clients/android-tv/` was **deleted on 2026-09-20** (track `chore_replace_jellyfin_consolidation_20260920`, Phase 3). All client work targets the Flutter codebase. Do NOT recreate a native client.
7. **Archiving:** When a plan is 100% complete, archive the track folder to `measure/archive/` and update `tracks.md`. Do not ask for permission.
8. **Commit:** Commit work with a note after each phase of a track.
9. **Memory:** Use measure/tech-debt.md and measure/lessons-learned.md

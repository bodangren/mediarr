# Mediarr subagent roster

The harness delegates well-scoped work to subagents (and, for long-running collaboration, to durable
teammates). This directory defines the **roles**: one brief per recurring task in the operator
workflow. A brief is the child's contract — scope, inputs, steps, outputs and guardrails — so a
delegated run behaves like the operator without re-reading this conversation.

## How to invoke

```
subagent(
  description: "Nightly library audit",
  prompt: "You are the Mediarr library-audit subagent. Working directory: /home/daniel-bo/Desktop/mediarr.
           Read automation/agents/library-audit.md first and follow it exactly for this task:
           <precise task, inputs, deadline>. Reply with the structured report it asks for.")
```

Rules of thumb:

- **One brief, one task.** Tell the child the exact job; the brief supplies the method.
- **Fresh context for evidence work**, `subagent_fork` only when the task builds on the current
  conversation.
- **Cheap models for read-only audit**, stronger ones for judgement (release choice, subtitle
  matching). Inspect routes with `list_subagent_models` before choosing.
- **Children have tools, not judgement about priorities.** Put the priority in the prompt (e.g. "the
  owner is waiting on Turner & Hooch").
- The parent **must verify** a child's claims (files on disk, DB rows, receipts) before reporting
  them as done.

## Roster

| Role | Brief | Typical use |
|---|---|---|
| Acquisition scout | [`scout-acquire.md`](./scout-acquire.md) | daily picks: decide what is next, find releases on TPB through the bridge, queue in Transmission |
| Import & file | [`import-file.md`](./import-file.md) | file 100 % downloads into `/data`, ffprobe, dedupe against other sessions, register via engine |
| Subtitle operator | [`subtitle-cn.md`](./subtitle-cn.md) | zimuku packs, bilingual sidecars, ASR+translation backlog, repair/audit of sidecars |
| Music picker | [`music-pick.md`](./music-pick.md) | weekly listening-history-driven discovery and yt-dlp/beets ingest |
| Adult picker | [`adult-pick.md`](./adult-pick.md) | weekly adult discovery with studio/title/infoHash dedupe |
| Library auditor | [`library-audit.md`](./library-audit.md) | read-only health report: coverage, gaps, duplicates, dangling rows |
| Error triage | [`error-triage.md`](./error-triage.md) | TV client JSONL triage, P0/P1 fixes in the repo |
| Queue medic | [`queue-medic.md`](./queue-medic.md) | stalled torrents: peers/trackers/duplicates, converge, nudge |
| Backup verifier | [`backup-verify.md`](./backup-verify.md) | verify the newest DB backup really restores (integrity + tables + row counts) |

## Contract shared by every role

- **No Mediarr REST API for automation.** Registration happens through the engine's scheduled scans
  or, when a one-off verification needs it, the same engine tasks the SPA uses — and that must be
  labelled a manual verification, never wired into automation.
- **`/config/mediarr.db` is read-only** (`sqlite3 -readonly`). The server owns writes.
- **Real surfaces only**: `transmission-remote`, browser bridge (`mcp__webbridge__*`), `ffmpeg`/
  `ffprobe`, `yt-dlp`, `beets`, `sqlite3`.
- **Every run records a state change or a named blocker** (`operator_guard_record`) and appends a
  receipt to `/config/orchestrator-receipts.jsonl` when it acts on media.
- **Never delete media or DB rows**; report duplicates/conflicts for the Lead or owner.
- **Report facts with paths and numbers**, not intentions: file paths, sizes, torrent ids, counts.

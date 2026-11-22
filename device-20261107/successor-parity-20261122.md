# Successor parity vs the Hermes artefacts (2026-11-22)

Track `chore_migrate_hermes_automation_20261107`: *create successors first, run each manually once,
diff output against the Hermes artefact.* The Hermes gateway was retired on 2026-11-10; these are the
measured diffs.

## Successors in place

| Hermes job | Successor | Where |
|---|---|---|
| media-orchestrator (daily picks → Transmission → import) | `media-operator` skill + `automation/prompts/media-orchestrator-daily.md`, harness task `schedule-81975ac5…` (daily 03:00) | `automation/skills/media-operator/SKILL.md` |
| music-orchestrator (weekly discovery → yt-dlp → beets) | `music-operator` + `music-ingest-weekly.md`, harness task `schedule-ad2f62de…` (weekly) | `automation/skills/music-operator/SKILL.md` |
| adult-orchestrator (weekly discovery → queue) | `adult-operator` + `adult-discovery-weekly.md`, harness task `schedule-22a8d409…` (weekly) | `automation/skills/adult-operator/SKILL.md` |
| Hermes chinese-subs skill (zimuku via browser) | `zimuku-acquire` skill | `automation/skills/zimuku-acquire/SKILL.md` |
| fetch-monitor.timer | not replaced (deliberate): the engine's `rss-sync` / `youtube-poll` / `wanted` sweeps own fetching | `server/src/serviceContainer.ts` |

## Manual run + artefact diff

### media-operator — same sink, same schema

The strongest diff is on the **same file** Hermes wrote: `~/.local/share/media-recommendations/pass.jsonl`.

| | Hermes era (before 2026-11-10) | Successor era (2026-11-10 → today) |
|---|---|---|
| entries | **55** | **73** |
| field schema | `info_hash, kind, query, queued_date, reason, source, title, torrent_id, ts` | `info_hash, kind, query, queued_date, reason, source, title, torrent_id, ts` |
| sources | media-orchestrator (33), orchestrator-direct (12), fetch-and-queue (6) | media-operator-scheduled-2 (64), media-orchestrator (3), media-operator-manual-2026 (3) |

Identical keys → the successor writes the same artefact shape; the successor-era volume is higher
because the run is scheduled daily rather than Hermes' manual habit. Manual runs are recorded in the
`sources` (`media-operator-manual-*`) and today's `media-operator-scheduled-20261122-0930` entry at
2026-11-22T01:37:05Z. Import/receipt kinds in `/config/orchestrator-receipts.jsonl` (74 lines):
import-and-organize (13), import-organize-20261115 (12), import-organize-20261117 (11), unknown (4), import-organize-20261118 (4).

### music-operator

Manual/scheduled runs are in `/config/music-ingest-receipts.jsonl` (**17 receipts**); the last
weekly run reports `3 filed, 0 failed`. Artefact diff: `/data/Music` now holds **227 audio files** and
the engine registers **227 MusicTrack rows** (Hermes-era folder tree retained, no re-download), so the
successor reproduces the same on-disk layout through beets with the engine as the registrar.

### adult-operator

`/config/orchestrator-receipts.jsonl` carries the preflight and weekly receipts; `/data/Porn` holds
**193 video files**, the engine's `AdultItem` count is **194** (one item was removed with its file), and
`adult-library-scan` (05:05) registers new files without the API. Same layout as Hermes, but queueing
is now deduped against the DB before `transmission-remote --add`.

### zimuku-acquire

`/config/subtitle-acquire-receipts.jsonl` has **205 receipts** (ZIP/RAR → ffmpeg → `.zho.srt`
placements). The library carries **3,392 Chinese subtitle tracks**; the Hermes-era recipe is preserved as
a read-only reference (`~/.config/opencode/skills/chinese-subs/SKILL.md`) and the successor was proven
live on MOVIE 558 and *The Running Man*.

## What is not comparable

`~/.hermes/shared-state.db` / `kanban.db` are task boards of the retired gateway, not receipts; no
machine-readable Hermes receipt file existed for music/adult/subtitles, so those rows diff against the
**artefacts** (files and DB rows) rather than a receipt file. That is recorded here instead of claimed
as a byte-identical diff.

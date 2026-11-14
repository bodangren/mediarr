# Daily media operator — one agent turn that runs the media life

> Owner mandate 2026-11-14: the harness **chooses, downloads, organizes and manages** the library.
> This is not an API reconciliation job and not a report. Playbook:
> `automation/skills/media-operator/SKILL.md` — read it before acting; it owns the commands, the
> naming rules and the checks. The Mediarr REST API is a client contract: **no `/api/` calls in this
> run.** State comes from read-only SQLite + the filesystem; moves come from `transmission-remote`,
> the browser bridge and the maintained CLIs.

## 0. Preconditions (check in order; name the failure and stop)

1. **Bridge.** `mcp__webbridge__navigate` and `mcp__webbridge__evaluate` must be registered this
   turn; probe once with `evaluate` returning `1+1===2`. Missing or wedged:
   `media_automation_alert {level:"critical", code:"BRIDGE_TOOLS_ABSENT"}` and end FAILED — never
   substitute curl or a DOM scraper.
2. **Engine up, read-only.** `systemctl --user is-active mediarr.service` is `active` and
   `sqlite3 -readonly /config/mediarr.db "select count(*) from Series"` returns a number. If not,
   that is a P0 blocker for the whole run — report it, do not try to fix it by restarting.
3. **Operator tools.** `transmission-remote -l` responds, and `~/Downloads` is writable. Record the
   last receipt in `/config/orchestrator-receipts.jsonl` and the last pick in
   `~/.local/share/media-recommendations/pass.jsonl` so nothing is queued twice.

## 1. Decide (1–3 picks today; zero only when every bucket is covered or blocked)

Read watch state read-only (queries in the skill) and pick, in this order:

1. **Owner wanted list** — `~/.local/share/media-recommendations/wanted.jsonl`, if present. Drain
   each line to `wanted-drained-YYYY-MM-DD.jsonl` with `status: "queued"`.
2. **Next missing season** of a show the owner is actively watching: latest `PlaybackProgress`
   episodes → that series → the next season whose episodes have no `MediaFileVariant` on disk
   (example as of 2026-11-14: Lioness S01 is being watched, S02/S03 have zero episode files).
3. **One new title** the owner would plausibly want (TMDB through the bridge, matched to recent
   watching) — only when buckets 1–2 yield nothing.

Write the picks table (title, kind, source, why) **before** grabbing. Hard ceiling: 3 picks.

## 2. Acquire

For each pick: search thepiratebay through the bridge (search URL + `evaluate` extraction, never a
scraper script), score (1080p/x265 WEB-DL, healthy seeders, sane size, the show's usual release
group). **Dedupe against `transmission-remote -l` by infoHash and title first** — a pick already in
the queue (including one another session queued) must be skipped and reported as such, never
re-added. Then:

```bash
transmission-remote --add '<magnet>' --download-dir /home/daniel-bo/Downloads
transmission-remote -t <id> -s
```

Verify it appears in `transmission-remote -l` and that progress moves; a pick that does not appear is
a failure, not a success. Append one JSON line per pick to
`~/.local/share/media-recommendations/pass.jsonl` with `ts, source, query, title, info_hash,
torrent_id, kind, queued_date, reason`.

## 3. Organize (import what finished)

For every torrent at 100 % in an Idle/Seeding state:

1. File its video files into the library using the layout in the skill:
   `/data/TV/<Show (Year)>/Season NN/<Show> - SXXEYY - <Title>.<ext>` or
   `/data/Movies/<Title (Year)>/<file>.<ext>`.
2. Verify each destination with `ffprobe` (non-zero duration, video stream present). A failed verify
   means put it back, not "probably fine".
3. Keep the source files in `~/Downloads` — do not delete a download to "clean up".
4. Record every move in `/config/orchestrator-receipts.jsonl`.

The server owns the database and registers new files on its own scans (`library-scan` 18:00,
`folder-import` 02:40). Do not write the DB and do not trigger scans through REST.

## 4. Manage (same run, in this order)

- **Subtitles:** up to 2 uncovered priority items following
  `automation/prompts/subtitle-acquire-zimuku.md` (bilingual invariant; place `<stem>.zho.srt` beside
  the video; the `subtitle-sync` task aligns it within 15 min). When **no Chinese pack exists** but
  the item has English (even bitmap-only) or none, build the Chinese track instead of skipping it:
  `automation/scripts/subs-bilingual-batch.py` runs ASR (faster-whisper) + MiniMax/Xiaomi translation
  resumably; start it detached for a season.
- **Backup:** if the newest `/config/backups/*.db` is older than 7 days, take one and verify:
  `sqlite3 /config/mediarr.db ".backup '/config/backups/agent_backup_<YYYYMMDDTHHMM>.db'"`.
- **Music:** the weekly run owns discovery. If the last line of
  `/config/music-nightly-receipts.jsonl` is older than 30 h, report it as a blocker.
- **Adult:** the weekly run owns discovery; never delete, never run retention actions.
- **Quarantine / staging tidy:** only inside the quarantine root, only per policy, no bulk deletes.

## 5. Bookkeeping and report

Append one JSON receipt line to `/config/orchestrator-receipts.jsonl` with the real counts
(`picks`, `queued`, `imported`, `subtitles`, `backup`), plus `media_automation_heartbeat` if the ledger
tools are registered. End FAILED if any domain could not be checked; an empty run is not a success.

Report, in this order: picks table (title / source / torrent id / result), imports (files moved,
verified), subtitle items (title, pack, sidecar), backup path and size, then the explicit blocked
list. **Zero picks for a whole week is a pipeline defect** — find out whether the bridge, the
Transmission daemon or the pick logic is broken instead of reporting it as normal.

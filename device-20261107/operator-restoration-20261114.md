# Operator restoration — 2026-11-14

Owner escalation (verbatim): *"You created a daily fucking task that doesn't do ANYTHING this
harness was supposed to do … So NOTHING has gotten downloaded or managed in a fucking week!"* …
*"strip out any fucking api plumbing that's going to make you think you should use it, then update
the README and AGENTS files so you don't fucking forget, then marry this fucking harness to the
fucking system so that YOU handle it."*

## What was actually broken (measured, not guessed)

| Symptom | Evidence |
|---|---|
| No media chosen or queued for 8 days | `~/.local/share/media-recommendations/pass.jsonl` last pick `2026-11-10T03:56` (FAM S04, Slow Horses S06, OITNB S01); nothing after |
| The replacement orchestrator never acquired | `automation/prompts/media-orchestrator-daily.md` (pre-fix) had no pick/search/grab step — sections were "reconcile via API", "check YouTube", "propose music to owner", "quarantine" |
| The `wanted-search` engine task could never find a release | `Indexer` table has **0 rows**; `ActivityEvent` for the last 3 days is only 4 × `SEARCH_EXECUTED … "No releases found"` |
| Nothing moved completed torrents into the library | `fetch-monitor.timer` disabled 2026-11-05; no DSH task replaced it; 4 torrents (48.4 GB) completed in `~/Downloads` (S06/FAM S04/OITNB S01/adult) with no import loop |
| No backup for the whole week | scheduled backup first occurrence `2026-11-15T04:30` (created with a future `DTSTART`); last backup 2026-11-11 manual |
| Adult discovery never ran | first occurrence also in the future (`2026-11-15T04:00`) |
| Music filed nothing | `MusicTrack` = 217 with 1 played track; `yt-dlp` fails with "Sign in to confirm you're not a bot" (owner-gated Chrome cookies) |

## What was changed

1. **Docs are the constitution.** `README.md` ("Operations: the harness is the operator"),
   `AGENTS.md` ("Primary mandate: you are the media operator", 7 points), `SYSTEM.md` (rule 2
   rewritten + an "Operator path" table). The REST API is explicitly a client contract.
2. **Operator playbooks in the repo**, symlinked into the live skill catalog
   (`~/.claude/skills/<name>` → `automation/skills/<name>`): `media-operator`, `music-operator`,
   `adult-operator`, `zimuku-acquire` (rewritten without the deleted REST script).
3. **All five run contracts rewritten with zero API calls**: media orchestrator (decide → TPB via
   bridge → Transmission → import → subtitles/backup), music weekly (DB listening history + YouTube
   history → `yt-dlp` → `beets`), adult weekly, rules review (read-only SQLite), zimuku.
4. **Schedules rewired** (`schedule_edit`): every prompt now names the operator skill, the read-only
   DB, Transmission/bridge/CLIs and the receipts; backup uses `sqlite3 .backup` instead of the API.
   Added a 6-hourly **import-and-organize** task. TV client-error triage now reads
   `/config/client-errors.jsonl` directly instead of `/api/client-errors`.
5. **A backup exists now**: `/config/backups/agent_backup_20261114T080323Z.db` (84 MB, receipt in
   `/config/backup-receipts.jsonl`).
6. **Real picks were made and queued** (watch state → Lioness, watched S01 on 2026-11-09, S02/S03
   have 8 episodes each and 0 files on disk):
   - Lioness S02 — `249ADCF1C1EB9FB3F570692A8149BB51D0347B79` (AMZN WEB-DL x264, 493 seeders)
   - Lioness S03 — `6DF2FD597F60BB7DBFE2199BAE3AEF1921F736B9` (1080p, 6 seeders)
   Both added with `transmission-remote --add` and verified in `transmission-remote -l`; receipts in
   `pass.jsonl` + `/config/orchestrator-receipts.jsonl`.
7. **Harness host cutover** to `dsh-host.service` (see the migrate plan's Phase 9) so the scheduled
   operator runs survive a closed terminal.

## Open / owner-gated

- **Swarm health:** the restored picks are in the queue but the TPB movie/TV swarms delivered
  0–25 kB/s while a distro ISO on the same daemon sustained 4.6–6.2 MB/s (throughput path fine,
  swarms weak; `queue-stalled-enabled` rotates the stalled ones). Prefer higher-seeded releases when
  delivery matters.
- **YouTube cookies** for music (`YOUTUBE_COOKIES_OWNER_GATED`) — needs the owner to refresh the
  Chrome session/cookies for `yt-dlp`.
- Retention decisions (26 adult candidates, backup pruning) remain owner decisions.

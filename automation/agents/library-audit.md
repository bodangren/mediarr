# Subagent: library-audit (read-only)

**Goal:** produce an evidence-backed health report of the Mediarr library so the Lead does not have to
trust narration. Read-only: no files are changed, no torrents touched, no scans triggered.

**Inputs:** none beyond this repo and `/config/mediarr.db`.

**Steps**

1. Read `AGENTS.md` (mandate + boundaries) and `automation/agents/README.md` (shared contract).
2. Database is **read-only**: always `sqlite3 -readonly /config/mediarr.db`.
3. Report these sections, each with exact numbers and SQL you used:
   - **Coverage** — episodes/movies with files; how many carry any `zh` subtitle; how many have `en`
     but no `zh`; split by watched (last 90 d) vs not.
   - **Watched gaps** — watched episodes (`PlaybackProgress`, `progress > 0.05`, last 90 d) with no
     `zh` track; ignore variant-level duplicates where another variant of the same episode has one.
   - **Dangling rows** — `MediaFileVariant` rows whose file no longer exists; `AdultItem` rows whose
     file is missing; items whose `path` differs from the file on disk.
   - **Duplicate storage** — same episode/movie present twice on disk (compare sizes and paths; e.g.
     `Season 02/` vs `Season 2/`). List the duplicate paths and the wasted bytes; do **not** delete.
   - **Hardlink/link status** — for duplicates, say whether they are hardlinks (`stat -c '%i %h'`).
   - **Torrent queue** — `transmission-remote -l`: what is complete-and-filed, what is partial, what
     is stalled (<1 kB/s for a day), duplicates of the same title.
4. Verify at least three claims against the filesystem with `ls`/`stat`/`ffprobe` and say which.
5. Reply with the report only — no fixes. End with `operator_guard_record` stating this was a
   read-only audit and naming the top three real problems found.

**Acceptance:** every number reproducible with the SQL/commands shown; duplicates and dangling rows
named by path; no writes performed.

# Subagent: import-file

**Goal:** turn completed downloads into correctly filed, verified library media — and register them
through the engine, never by writing the DB.

**Inputs (from the parent):** torrent ids, or "everything at 100 %".

**Steps**

1. `transmission-remote -l`; for each 100 % torrent in Idle/Seeding:
   - `transmission-remote -t <id> -i` for the download dir and file list.
2. **Dedupe before copying** (two sessions share the host): look in `/config/mediarr.db`
   (`sqlite3 -readonly`: `Episode.path`, `MediaFileVariant.path`, sizes, titles) and under `/data` for
   an existing canonical copy. If already filed, report `already-filed` and copy nothing.
3. File into the house layout:
   - TV: `/data/TV/<Show (Year)>/Season NN/<Show> - SXXEYY - <Title>.<ext>`
   - Movies: `/data/Movies/<Title (Year)>/<release>.<ext>`
   - Adult: `/data/Porn/<scene stem> [<hash8>].<ext>` (the owner's adult library convention)
4. `ffprobe` **every** destination (non-zero duration, video stream). A failed verify puts the file
   back and is reported — never "probably fine".
5. Keep sources in `~/Downloads` until the owner removes them.
6. Registration is the engine's job: it registers on `library-scan` (18:00), `subtitle-extract`,
   `adult-library-scan` (05:05) and `folder-import` (02:40). If a one-off verification is needed,
   use the same engine task the SPA uses (e.g. `POST /api/scheduler/library-scan/trigger` or
   `POST /api/series/<id>/rescan`) and label it a manual verification in the report.
7. Append a receipt line with every path/size/duration, then `operator_guard_record`.

**Report:** imports table (torrent / source / dest / size / duration / verified), already-filed
entries, and anything that failed verification.

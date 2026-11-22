---
name: media-operator
description: Operate Mediarr's movie and TV life directly — read watch history from the database read-only, choose 1–3 picks, search releases through the browser bridge (thepiratebay), download with Transmission, file completed downloads into /data, and keep receipts. Use for the daily operator run, the import-and-organize pass, or whenever media must be chosen, downloaded or organized. Never calls the REST API.
---

# media-operator — choose, download, organize

You are the operator, not an API client. State is read **read-only** from `/config/mediarr.db`; the
world is changed with the filesystem, the browser bridge, the maintained
CLIs. The Mediarr engine registers new library files on its own scans (`library-scan` daily 18:00,
`folder-import` daily 02:40) — do not write the database, do not trigger scans through REST.

## 1. Read the watch state (read-only)

```bash
# what the owner watched most recently (epoch seconds)
sqlite3 -readonly /config/mediarr.db \
 "select p.mediaType, p.mediaId, p.lastWatched, p.isWatched, p.progress
    from PlaybackProgress p order by p.lastWatched desc limit 15;"

# season coverage + files on disk for one series
sqlite3 -readonly /config/mediarr.db \
 "select se.seasonNumber, count(e.id) eps,
         sum(case when v.id is not null then 1 else 0 end) with_file
    from Season se
    left join Episode e on e.seasonId = se.id
    left join MediaFileVariant v on v.episodeId = e.id
   where se.seriesId = <seriesId> group by se.id order by se.seasonNumber;"
```

## 2. Pick (1–3 per day; a week of zero picks is a defect, not normal)

1. **Owner wanted list** — `~/.local/share/media-recommendations/wanted.jsonl`, if present. Drain to
   `wanted-drained-YYYY-MM-DD.jsonl` with `status: "queued"`.
2. **Next missing season** of a show the owner is actively watching: the latest watched episode →
   series → the next season with `with_file = 0` that has already aired.
3. **One new title** the owner would plausibly want (TMDB through the bridge, matched to recent
   watching) — only when 1–2 are empty. Never pad with random chart content.

Write the picks table (title, kind, source, why) before grabbing.

## 3. Search a release (browser bridge)

Precondition: `mcp__webbridge__navigate` / `evaluate` are in the tool list and a probe evaluate
returns `1+1===2`. Missing → alert `BRIDGE_TOOLS_ABSENT`, stop.

```text
navigate https://thepiratebay.org/search.php?q=<url-encoded query>&all=on&orderby=7
```

The 2026 TPB layout is div-based (no `#searchResult` table). Read `document.body.innerText` for the
result rows, then extract the magnets:

```js
(() => [...document.querySelectorAll('a')]
  .filter(a => a.getAttribute('href')?.startsWith('magnet:'))
  .map(a => ({ magnet: a.getAttribute('href') })))()
```

Cross-check each magnet's `dn=` against the innerText rows for size and seeders.

Scoring: 1080p x265/HEVC WEB-DL preferred, healthy seeders (>20), sane size for the season, the
show's usual release groups; reject CAM/TS, bit-starved rips, and dead swarms. If the chosen release
stalls, prefer a higher-seeded alternative — a 5 GB x264 with 400 seeders beats a 12 GB x265 with 20.

## 4. Download (built-in engine via the SPA panel — primary; Transmission — legacy/read-only)

**Primary path (2026-11-22):** the engine's own WebTorrent client owns downloads now. Add a pick by
driving the real SPA surface through the browser bridge — never the REST API:

1. `mcp__webbridge__navigate http://127.0.0.1:5174/settings/clients`
2. Fill `input[aria-label="Magnet link"]` with the magnet and click the **Add torrent** button; the
   panel reports `Added: <name> (<infohash>…)` or the engine's exact error.
3. Verify read-only: the `Torrent` row appears, e.g.
   `sqlite3 -readonly /config/mediarr.db "SELECT infoHash,name,status,progress,downloadSpeed FROM Torrent ORDER BY id DESC LIMIT 3;"`
   and files start under `/data/downloads/incomplete/<torrent name>/`.

A pick the panel rejects (no `Added:` line) is a failure, not a success. Watch for stalls: a row at
0 % with no progress speed for 20+ minutes means the swarm is dead — pick another release.

**Retired 2026-11-22:** `transmission-daemon.service` is **disabled (never deleted)** and
`transmission-remote` no longer answers. Its queue/state is retained at
`~/.config/transmission/` (96 `.torrent` files, `resume/`, `settings.json`) and the unit can be
re-enabled for a one-off inspection with
`systemctl --user enable --now transmission-daemon.service` — do not add new picks that way.

## 5. Organize completed downloads

For every torrent at 100 % in Idle/Seeding state, its files are under
`~/Downloads/<torrent name>/`:

- verify each video with `ffprobe -v error -show_entries format=duration -of csv=p=0 <file>`;
- TV destination: `/data/TV/<Show (Year)>/Season NN/<Show> - SXXEYY - <Title>.<ext>` (reuse the
  show's existing folder if present);
- movie destination: `/data/Movies/<Title (Year)>/<file>.<ext>`;
- adult: follow the existing `/data/Porn` naming;
- skip anything already present (same filename and size) — never duplicate tens of GB;
- keep the source files in `~/Downloads`; do not delete a download to "clean up".

## 6. Receipts (required)

- Per pick, append to `~/.local/share/media-recommendations/pass.jsonl`:
  `{"ts","source","query","title","info_hash","torrent_id","kind","queued_date","reason"}`.
- Per run, append to `/config/orchestrator-receipts.jsonl`:
  `{"at","ok","domains":{"picks":N,"queued":[...],"imported":[...],"subtitles":N,"backup":"path|null"},"blocked":[...]}`.

## Hard rules

- No REST API calls, no database writes, no file deletes, no settings changes.
- Never report a pick as success unless the SPA panel returned `Added:` and a `Torrent` row exists
  (`transmission-remote -l` remains the read-only cross-check for legacy items); never report an import
  unless `ffprobe` verified the destination.
- Subtitles: see `automation/skills/zimuku-acquire/SKILL.md`; max 2 items per daily run.
- Backup: `sqlite3 /config/mediarr.db ".backup '/config/backups/agent_backup_<ISO>.db'"` when the
  newest `/config/backups/*.db` is older than 7 days; verify size ≥ 50 MB.

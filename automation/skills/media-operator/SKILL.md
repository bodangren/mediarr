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

The bridge stalls when Chrome has **no page target**: with `list_tabs` empty, a tab-scoped `navigate`
(without `newTab`) and `evaluate` both hang until their timeout — measured 15-40 s per call on
2026-11-27 (three consecutive hangs, then `navigate ... newTab: true` succeeded first try). Check
`list_tabs` first; when it is empty, open the search with `newTab: true` and never retry a
tab-scoped call blind.

```text
navigate https://thepiratebay.org/search.php?q=<url-encoded query>&all=on&orderby=7   (newTab: true)
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

## 4. Download (verified surface 2026-11-27: `transmission-remote`)

**Live surface (verified 2026-11-27):** `transmission-daemon` is **running** — pid 1265685, up since
2026-11-22 20:00; `systemctl --user is-active` = `active`, `is-enabled` = `disabled`, **not masked**
(the runtime-mask note that used to live here is stale: there is no runtime unit symlink). Its RPC
answers on `127.0.0.1:9091`, it holds the entire download queue (132 torrents), and every receipt
since the migration was made from `transmission-remote`. Add picks with it:

```bash
transmission-remote --add "magnet:?xt=urn:btih:<hash>&dn=<name>&tr=<tracker>&tr=<tracker>"
transmission-remote -t <id> --start
transmission-remote -t <id> -i     # verify: State downloading, Availability > 0, peers > 0
```

**Trackers are mandatory on every add (root cause found 2026-11-27).** All four season-fill picks
that day were added from tracker-less magnets: they sat DHT-only for hours at 0 peers / <1 %
availability while the release index listed seeders (torrent 133: 3 h dead at 39 MB; 88/134/135
crawling). Put the index's announce list on the magnet, or right after the add run
`transmission-remote -t <id> -td <tracker>` for each line below plus `--reannounce`, then confirm
peer discovery with `-it`:

```text
udp://tracker.opentrackr.org:1337/announce
udp://open.stealth.si:80/announce
udp://tracker.torrent.eu.org:451/announce
udp://tracker.dler.org:6969/announce
udp://opentracker.i2p.rocks:6969/announce
udp://47.ip-51-68-199.eu:6969/announce
```

A pick counts as **queued** only when the torrent shows Availability > 0 and peers > 0. A DHT-only
add still at 0 peers after 20+ minutes is a dead pick, not a slow one — prefer a higher-seeded
release. Do **not** restart, enable, or mask the daemon: it is the live queue and a restart drops
every peer (a 2026-11-22 restart stalled the TWD fills). If it is ever down, record it as a blocker
and escalate; do not rewire the pipeline around it in a run.

**Engine WebTorrent panel** (`SPA /settings/clients`): intended long-term owner, but **not a usable
path on 2026-11-27** — the engine `Torrent` table has 0 rows (never used for a pick) and the bridge
cannot load the SPA: `navigate http://127.0.0.1:5174/...` times out at 30 s although the engine
answers `HTTP 200` on the same URL (reproduced twice). Do not spend a pick run driving that panel
until it is repaired; add through `transmission-remote`.

## 5. Organize completed downloads

For every torrent at 100 % in Idle/Seeding state, its files are under
`~/Downloads/<torrent name>/`:

- also check `transmission-remote -t <id> -f`: a file at 100 % inside a **still-partial** season pack
  is complete (renamed off `.part`) and importable now — a torrent-level-only rule misses it;
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
- Never report a pick as success unless `transmission-remote -t <id> -i` shows it started with
  Availability > 0 and peers > 0 (read-only `transmission-remote -l` as the cross-check); never report
  an import unless `ffprobe` verified the destination.
- Subtitles: see `automation/skills/zimuku-acquire/SKILL.md`; max 2 items per daily run.
- Backup: `sqlite3 /config/mediarr.db ".backup '/config/backups/agent_backup_<ISO>.db'"` when the
  newest `/config/backups/*.db` is older than 7 days; verify size ≥ 50 MB.

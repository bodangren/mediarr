# Hermes automation inventory — what actually runs today

> Read on 2026-11-07 against the live install, not from skill prose. Every row was
> verified by reading the file or querying the DB named in the **Source** column.

## 1. Runtime

| Piece | What it is | Source |
|---|---|---|
| `hermes-gateway.service` | systemd **user** unit, always on, `ExecStart=…/venv/bin/python -m hermes_cli.main gateway run`; hosts the cron ticker | `systemctl --user cat hermes-gateway.service` |
| Cron ticker | reads `jobs.json`, claims a due job, spawns a transient `hermes-worker-cron-<job>.scope` and runs one agent turn per job | `systemctl --user list-unit-files` (transient scope observed), `~/.hermes/cron/*.lock` |
| Job definitions | 4 jobs, JSON, with full prompt text + skill list per job | `~/.hermes/cron/jobs.json` |
| Run history | 167 executions, 7 incidents | `~/.hermes/cron/executions.db` |
| Per-run transcripts | one `.md` per run, prompt included, under `output/<job_id>/` | `~/.hermes/cron/output/` |

Hermes is a general assistant with a cron feature. The media automation is **four agent
prompts + one systemd timer**, not a bespoke service.

## 2. The four cron jobs

| Job | id | Schedule | Runs | OK / fail | Avg wall time | Last run |
|---|---|---|---|---|---|---|
| `media-orchestrator` | `10344d2d6939` | `0 3 * * *` daily | 72 | 52 / **20** | 27.8 min | 2026-11-07 03:00 |
| `downloads-tidy` | `338e8fac52cb` | `30 3 * * *` daily | 65 | 48 / **17** | 5.6 min | 2026-11-07 03:30 |
| `music-orchestrator` | `219788274d43` | `0 2 * * 0` Sundays | 8 | 6 / **2** | 10.6 min | 2026-11-01 02:00 |
| `adult-orchestrator` | `253214b3818d` | `0 4 * * 0` Sundays | 22 | 19 / **3** | 13.7 min | 2026-11-01 04:00 |

Every recorded failure in `executions.db` is the same error:
`RuntimeError: Hermes can't reach the model provider. You may be offline.`
25% failure rate overall; `adult-orchestrator` is on a 3-run failure streak.

### What each job does

**`media-orchestrator`** — 11 numbered steps in the prompt: drain `wanted.jsonl` → predict
next watch → emit `recommend.py --emit-json` → fetch 1–3 picks → (monitor is a separate
timer) → consume sentinels → publish favourites via `inject-recommendations.sh` → Chinese
subs → `subalign` → per-item refresh → prune-candidates artifact → write
`~/media-reports/YYYY-MM-DD.md`.

**`downloads-tidy`** — per-folder audit of `~/Downloads/`: delete a completed folder only
when a matching file exists in the 4TB library; remove 100%-done torrents whose source is
gone (`-rad`); leave partials and orphans; write `~/media-reports/downloads-tidy-*.md`.
Explicitly forbidden from writing new scripts.

**`music-orchestrator`** — wanted entries → YouTube picks via kimi-webbridge →
`fetch-from-youtube.py` → `music-tidy.py` (beets/MusicBrainz) → library refresh → report.

**`adult-orchestrator`** — TPB top100 browse (cats 500/501, 48h and all-time) → dedup →
queue 1–3 → refresh → auto-delete one prune candidate by SQL against jellyfin-go's DB →
report.

## 3. The one systemd timer

`fetch-monitor.timer` → `fetch-monitor.service`, `OnBootSec=5min`,
`OnUnitActiveSec=10min`, `Persistent=true`, `ExecStart=…/fetch-monitor.py --cleanup --no-rescan`.
This is the only **non-LLM** automation in the set, and the only one already wired to a
real timer rather than to hermes.

## 4. External surfaces the jobs drive

| Surface | Where | Used by |
|---|---|---|
| Transmission RPC | `localhost:9091` (`transmission-remote`) | all fetch steps, downloads-tidy |
| jellyfin-go REST | `localhost:8097` — **not** the 8096 in its `config.json` | refresh, publish, recommendations |
| jellyfin-go SQLite | `/run/media/daniel-bo/4TB/jellyfin-go/data/jellyfin.db` | `recommend.py`, `daily-prune.py`, availability, adult prune SQL |
| The Pirate Bay | via `kimi-webbridge` (Chrome + extension), needs USA VPN endpoint | tpb-search, adult |
| YTS / EZTV | via `kimi-webbridge` | fetch-from-source |
| YouTube | via `kimi-webbridge` | music |
| TMDB | HTTP API (key hard-coded in `acquire-posters.py`, env-overridable) | recommend, posters, .nfo, predictions |
| SubHD | via `chinese-subs.py` helpers | subs |
| MusicBrainz | via beets | music autotag |
| faster-whisper | `~/tools/subalign/.venv` | sub alignment |

## 5. Filesystem contract

| Path | Role |
|---|---|
| `/run/media/daniel-bo/4TB/{Movies,TV,Porn,Music,imports}` | libraries (owned by uid **100999**, not the login user) |
| `~/Downloads/` | transmission staging; folders deleted only after library match |
| `~/media-reports/` | `<date>.md`, `downloads-tidy-*.md`, `music-*.md`, `adult-*.md`, `recommendations-*.json`, `recommendations-injected-*.md`, `prune-candidates-*.txt`, `sub-priority-*.md` |
| `~/.local/share/media-recommendations/wanted.jsonl` | user-supplied wanted queue; drained to `wanted-drained-<date>.jsonl` |
| `~/.local/share/acquire-posters/runs.jsonl` | poster acquisition log |
| `~/tools/jellyfin-tools/` | 15 scripts, 4,966 LOC |

## 6. Scripts (4,966 LOC) and the doctrine around them

`fetch-monitor.py` 799 · `chinese-subs.py` 980 · `recommend.py` 589 · `acquire-posters.py` 341 ·
`inject-recommendations.sh` 315 · `fetch-from-source.py` 313 · `media-daily.py` 302 ·
`daily-prune.py` 270 · `prioritize-subs.py` 247 · `fetch-episode-nfo.py` 224 ·
`dedupe-movies.py` 219 · `fetch-from-youtube.py` 136 · `music-tidy.py` 130 ·
`fetch-monitor-log.py` 82 · `find-orphan-aligned-subs.sh` 19

`media-daily.py` and the `media-daily.service` chain are **deprecated since 2026-08-30** —
the skill says so, and the systemd unit is gone. Treat the file as dead code to be deleted,
not ported.

`media-pipeline-invariants` encodes the doctrine that governs any port:

- **Decision scripts are banned; pure-I/O scripts are fine.** Four decision scripts were
  deleted after silent failures (`fetch-and-queue.py` hung on RPC stall,
  `acquire-new-show.py` refused an existing show, `acquire-new-movie.py` left torrents
  stopped, `tpb-search.py` broke on a TPB skin change). The test: *"if the script's failure
  is silent and the user has to notice manually, it shouldn't exist."*
- **"LLM in every decision loop."** The pipeline is one reasoning agent per run, not a
  `&&` chain.
- **Cron may own reports and deterministic I/O only.**
- **jellyfin-go stability is the user's problem.** Never restart it (11-min OOM cliff);
  per-item refresh only.
- **No `clarify` forms, ever.** Act, then report.

## 7. Skills that carry the specs (32 media skills + 3 top-level)

`~/.hermes/skills/media/`: acquire-music, acquire-new-movie, acquire-new-show, acquire-porn,
acquire-posters, adult-orchestrator, chinese-subs, daily-prune, decide-next-watch,
dedupe-movies, downloads-tidy, fetch-episode-nfo, fetch-from-source, fetch-monitor,
fetch-pipeline, gif-search, library-availability, media-daily (deprecated), media-library-survey,
media-orchestrator, media-pipeline, music-orchestrator, recently-watched, recommend,
recommend-publish, songsee, sub-align, tpb-search, transmission-control, youtube-content
(+`DESCRIPTION.md`).
Top-level: `media-pipeline-invariants`, `torrent-acquisition-llm-direct`, `cron-run-review`.

## 8. What Mediarr already does on its own

`server/src/serviceContainer.ts` registers six scheduler tasks:

| Mediarr task | Cadence | Overlaps hermes |
|---|---|---|
| `rss-sync` | every 12 min | acquisition from indexers |
| `import-list-sync` | every 6 h | — |
| `wanted-search` | every 60 min | PREDICT / FETCH |
| `subtitle-wanted-search` | every ~5 min | SUBS step |
| library scan | daily 02:00 | fetch-monitor's move + rescan |
| auto-update check | daily 04:00 | — |

So the mechanical half of the hermes pipeline is already implemented natively and does not
need an LLM job. The genuinely LLM-shaped remainder is: what to acquire next, which torrent
to pick, which sub pack is the right cut, whether a sub needs alignment, and what to prune.

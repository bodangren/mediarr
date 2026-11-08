# jellyfin-go watched-status import (2026-11-08)

Source: `/run/media/daniel-bo/4TB/jellyfin-go/data/jellyfin.db` (jellyfin-go SQLite, 10.3 MB,
single user `admin`; `user_data` 263 rows, 190 `played=1`).
Target: `/run/media/daniel-bo/4TB/mediarr-config/mediarr.db` (backed up first to
`backups/mediarr-pre-jellyfin-watched-20261108-143017.db`).

Mapping used: jellyfin item paths normalised `/run/media/daniel-bo/4TB` → `/data`, matched to
`MediaFileVariant.path` (Movie/Episode), `AdultItem.path`, `YoutubeVideo.path`, `MusicTrack.path`;
exact path first, unique-basename fallback. Aggregate rows (Season/Series/Folder) skipped because they
are derived from episodes. Imported state:
- Movies/Episodes → `PlaybackProgress` (`isWatched`, `position`, `progress`, `lastWatched`, user
  `lan-default`); duplicate jellyfin rows for one file reconciled to the most-progressed state.
- Adult `Video` rows → `AdultItem.isWatched/position/duration/lastPlayedAt`.
- Audio rows → `MusicTrack.isPlayed/playCount/position/lastPlayedAt`.
- YouTube `Video` rows → `YoutubeVideo.isWatched/position/lastPlayedAt`.

## Result (verified by an audit pass that re-read jellyfin and the mediarr rows)
| Group | jellyfin | imported |
|---|---|---|
| Episodes watched | 103 | 103 (audit: 0 missing) |
| Movies watched | 10 | 10 (audit: 0 missing) |
| Episodes with resume position | 3 | 8 rows carry resume positions |
| Adult videos watched | 41 | 41 |
| Adult videos with resume position | 22 | 20 (2 rows already watched) |
| Music tracks played | 13 | 13 (playCount sum 13) |
| YouTube videos watched | 1 | 1 |
| Unmapped | 1 | `/AA-Z各类资源/Level D/Peggy老师讲解raz.../01 Raz D 精讲...mp4` — outside the Movies library, not imported |

Zero-progress rows created for never-touched items were pruned, so Continue Watching is not polluted.

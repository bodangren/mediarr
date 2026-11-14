# Subtitle coverage audit — 2026-11-15 (read from `/config/mediarr.db` read-only)

Scope: TV episodes that exist as files, their subtitle tracks, and what the owner actually watched.

## Library-wide

| Metric | Count |
|---|---|
| Episodes with a file variant | **2,701** |
| Episodes with any `zh` track (embedded or external) | **1,361** (50.4%) |
| Episodes with an `en` track but no `zh` track | **644** |

The 644 are the translation backlog the nightly task drains (4 episodes/night) — they are mostly
unwatched.

## Watched coverage (the number that matters)

`PlaybackProgress` rows with progress > 5% in the last 90 days:

| Metric | Count |
|---|---|
| Watched episodes with files | **116** |
| … with a `zh` track | **110** → **94.8%** |

## Remaining watched gaps (all being acted on)

| Show | Episodes | State |
|---|---|---|
| American Dad! S01 | E04, E05, E06 | ASR+translation batch running (E01–E03 shipped and registered) |
| Archer S04 | E02, E03, E04 | queued in the sequential subtitle chain (after American Dad S01) |

## False positives worth knowing about

Three "missing" watched entries turned out to be **variant-level duplicates**, not real gaps:
`The Last of Us S01E01` (9/9 S01 sidecars registered), `Rick and Morty S08E08` and `S08E10` (the
episode's primary variant carries a registered `zh` sidecar; a phantom/moved second variant points at
a deleted file). The audit query joins per-variant, so an episode looks uncovered when a *duplicate*
variant has no sidecar of its own. Check for a registered track on any variant of the episode before
treating it as a gap.

## Live proof

`Rick and Morty S08E08` was played at 2026-11-14 22:06 — the same episode carries the registered
bilingual `zh` sidecar the operator placed (pack 217083), so the owner watched with Chinese subtitles
available.

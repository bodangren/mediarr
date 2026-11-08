# Phase 0 — ratified scope, live inventory, filename grammar

> Evidence for `feature_adult_library_20261107` Phase 0. Measured on the live tree and the live
> database on 2026-11-08 07:30 CST. Nothing here is estimated.

## 1. The tree as it actually is

`/run/media/daniel-bo/4TB/Porn` (reachable as `/data/Porn`):

| Measure | Value |
|---|---|
| Total files | **246** |
| Video files | **196** (188 `.mp4`, 8 `.mkv`) |
| Sidecar images | 49 `.jpg` |
| Metadata | 1 `.nfo` |
| Size on disk | **298 GB** |
| Layout | flat at the root (196 videos) plus 8 sub-directories (`Little Asians`, `Asian Sex Diary`, `Holed`, `Tuk Tuk Patrol`, `Asian Anal [2021]`, `Asian.Schoolgirls.Vol.3…`, `BFFs`, …) |

Consequence for FR-2: the scanner must preserve the flat layout (no reorganisation, no rename) and
must walk sub-directories without flattening them.

## 2. Filename grammar matrix (decision A3)

Every basename ends in a bracketed tag: **137 hex hashes** and **22 text tags**. Six grammar classes
cover all 196 videos:

| Class | Count | Example | Parseable metadata |
|---|---|---|---|
| `quality-tagged` — `<studio> - <title> <quality> [hash]` | **142** | `Team Skeet - Little Chicks With Tiny Tits 17 Scene 1 1080p [0332f957].mp4` | studio, title, quality |
| `plain-title` — `<title> [hash]` | 19 | `Big tits Asian girl squirting compilation #1 [64fa20e9014e3].mp4` | title only |
| `studio-dash-title` — `<title> - <studio> [hash]` | 10 | `Asians Love Anal Compilation - Evil Erotic [675da51561367].mp4` | title, studio (heuristic) |
| `underscore-title` — `<Title_With_Underscores> [hash]` | 9 | `Cheerleaders_In_Heat_Vol_6_4K [b66c8473].mp4` | title, quality |
| `date-prefixed` — `<studio>.<YY>.<MM>.<DD>.<scenes> [hash]` | 8 | `officepov.26.08.31.compilation [aef072b0].mp4` | studio, release date |
| `seq-only` — `<NNN> [hash]` | 8 | `004 [1c6d5a2b].mp4` | **nothing** — review bucket |

**Rule adopted:** a file whose stem reduces to a bare sequence number goes to the review bucket with
its path intact; it is scanned, listed and playable, but carries no derived title. Everything else
gets a best-effort title/studio/quality/date from the matrix. No filename is ever used as a
"confident match" against an external provider — there is no metadata provider in Phase 1 (A3 option
two was rejected: it would need per-file network calls for 196 files with no reliable identifiers).

## 3. Decisions ratified (Phase 0 gate)

| # | Decision | Chosen | Why |
|---|---|---|---|
| A1 | Visibility | **Visible section, separate from Movies** (owner, 2026-11-08) | "easily accessible, not folded into Movies" — matches the earlier D2 decision |
| A2 | Root | **Keep `4TB/Porn`** | 298 GB re-organised for a rename is pointless risk; the root becomes configurable (`adultRootFolder`) so a move stays possible |
| A3 | Metadata | **Filename grammar matrix above + review bucket**; no metadata provider | Matrix covers 95.9 % of files with at least a title; 8 hash-only files are honestly unparseable |
| A4 | Discovery cadence | **Weekly (Sun 04:00)** | mirrors the retired `adult-orchestrator`; content volume does not justify daily |
| A5 | Retention profile | **Agent proposes candidates, quarantine executes** | no hard age/size cap; destructive actions only through the quarantine engine (gate G6) |

## 4. Isolation contract for Phase 1

The failure mode to prevent: adding an adult library silently changes what Movies/TV return.

- A shared `Library` registry (G10: "library kinds + arbitrary roots") is the only thing that learns a
  new kind. Existing movie/series queries keep filtering `Media.mediaType IN ('MOVIE','TV')`, so an
  `ADULT` row is invisible to them by construction.
- Adult items live in their own table keyed by path; they are **not** `Movie` rows (Movie requires
  `tmdbId NOT NULL UNIQUE`, which adult files cannot supply).
- Tests assert isolation from both sides: adult rows are not returned by the movie/series list
  queries, and the adult scan does not touch `Movie`/`Series`/`Episode` counts.

## 5. Out of scope here (tracked in spec, not Phase 0)

Discovery via kimi-webbridge (Phase 3) needs the automation substrate (gates G1–G3, G5, G6) and the
shared quarantine engine (B8); the migration of the 196 files (Phase 4) needs the scanner from
Phase 1. Neither blocks the domain/API/UI work.

# Spec — Adult section: sections per series, plus tag filters

**Track:** `feature_adult_sections_tags_20261121`
**Owner request (2026-11-21, verbatim):** *"Improve Adult section with sections per 'series' and maybe tagging with tag filters."*

## What exists (measured against the live DB, 2026-11-21)

- `AdultItem` columns: `id, libraryId, path, fileName, title, studio, quality, releaseDate, needsReview, sizeBytes,
  added, lastSeenAt, position, duration, isWatched, lastPlayedAt, keep, decidedAt`.
- **208 items, 32 distinct studios**, and 67 items with **no studio**. No series, no tags, no grouping.
- TV screen `lib/features/library/adult_library_screen.dart` (558 lines): a flat paginated grid, a search box, and a
  "watched — keep/delete?" decision strip. No sections, no filters beyond search.
- The API exposes a paginated items list plus decisions; nothing groups items by anything.

So "sections per series" cannot be answered from data that does not exist yet: the domain knows studio and title, and
nothing else. Tags do not exist at all.

## Intent

1. **Browse by series**: group items into series-like sections so the library reads as shelves, not one long grid.
2. **Filter by tags**: derive useful tags from what files already say (studio, quality, year, review state) and let the
   owner filter the grid with a few D-pad presses; later, allow owner-assigned tags.

## Requirements

### R1 — A series key exists and is honest
- Derive `seriesKey` per item from the strongest available signal, in order: an explicit `studio + series` pattern in
  the filename, a repeated title stem (everything before scene/copy markers such as `xxx`, `4k`, `scene 2`,
  `part N`, dates), otherwise the studio itself, otherwise null.
- The derivation is a pure function (`adultSeriesKey(title, fileName, studio)`) with a test per rule and per
  non-match; null means "no shelf", never "miscellaneous pile".
- Stored on the row by the adult scan (`AdultItem.seriesKey`), so listing and grouping are a cheap query.

### R2 — Tags are derived, filterable, and not a settings surface
- Derived tags per item: `studio:<name>`, `quality:<1080p|4k|…>`, `year:<yyyy>`, `review` (needsReview),
  `watched`/`unwatched`, `kept`. Stored as a JSON array on the row (`AdultItem.tags`) by the scan.
- `GET /api/adult/tags` returns the tag list with counts; `GET /api/adult/items?tags=a,b` filters (AND).
- TV: a single row of filter chips above the grid, reachable with Down from the grid's first row (or Up from the
  header), Select toggles; the active filter is shown once, no settings screen, no new rail item.
- SPA: the same filters in the existing Adult library page (chips + section headers).

### R3 — Sections per series on the TV
- "Series" view: horizontal rows per `seriesKey` (most-populated first, then alphabetical), each row a poster strip
  with the series name as its header; a toggle to "All" (the current flat grid) is a single control, not a screen.
- Empty/odd data is honest: an item with `seriesKey = null` appears only in All, never under a guessed shelf.

### R4 — Nothing the owner has to explain
- No new rail destinations, no settings page, no dialogs. Filter chips and a view toggle live inside the existing
  Adult screen; the decision strip behaviour (keep/delete) is unchanged.

## Non-goals
- Metadata scraping from external adult databases (out of scope; the owner's filenames are the source).
- Renaming files; the scan only derives keys/tags.
- New retention rules (those live in the existing adult retention track).

## Acceptance
1. After a scan, every item has `seriesKey` (or an honest null) and `tags`; a report shows how many items landed in
   each series and how many are null.
2. The TV Adult screen groups items into series rows with headers, and one Select switches to All / back.
3. Selecting a tag filters the grid; Select again clears it. Verified on the device with presses recorded.
4. The SPA shows the same sections/filters for parity.
5. Tests: series-key derivation (≥ 6 cases), tag derivation, API filter semantics, client section/filter widgets.

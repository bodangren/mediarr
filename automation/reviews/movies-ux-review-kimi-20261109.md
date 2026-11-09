# TV movies UX review — Kimi K3.1 Pro (2026-11-09)

*Scope: `movies_screen.dart`, `movie_detail_screen.dart`, `poster_grid.dart`. Owner complaint: weak search/filter/play-all, unclear focus, no normal media-manager behaviour.*

## 1. What exists now
- A single `FutureProvider` fetches the complete movie list; screen watches it and invalidates after context-menu watched changes (`movies_screen.dart:16-19`, `:268-279`).
- 72 px header with Collections and a 320×48 search field; search is local, case-insensitive title substring only (`movies_screen.dart:91-187`, `:69-73`).
- Loading spinner, raw error text, plain empty/no-match text (`:192-219`). Cards show year/quality/monitored/watched; OK opens details; first card autofocuses; one global `_gridFocused` flag drives Up to Collections (`:227-253`, `:282-287`, `:53-67`).
- Target is 1920×1080 physical = 1280×720 logical (DPR 1.5): six columns, two complete rows, 165×285 tiles, 16 px gaps (`poster_grid.dart:3-40`).
- Detail loads resume/subtitles, shows watched/progress chip, Play, watched toggle, upgrade search and Delete; Back (not Play) autofocuses (`movie_detail_screen.dart:31-51`, `:95-106`, `:168-192`, `:201-230`).

## 2. Gaps
**P0:** no sort/filters/pagination/server search (title-only does not scale); no explicit Resume vs Start over; playback return does not refresh resume; detail watched mutation can disagree with grid snapshot; no focus-restoration contract on Back (single grid-Up boolean is fragile); search lacks TV keyboard/clear UX; errors need focused Retry and empty states need Clear search; watched/resume failures are silent and errors raw; Delete has no confirmation; upgrade search is fire-and-forget (`movie_detail_screen.dart:78-93`, `:139-149`).

**P1:** filters (unwatched/in-progress/missing/monitored/genre/year/quality), counts, Recently added/Title/Year sorts, active-filter chips; Play filtered/Play collection with ordered playback; missing-file detail needs Monitor/Search; destructive actions need TV-native confirmation and job status.

**P2:** shuffle, recently-added/in-progress entry points, richer metadata, personal recommendations without reducing 6×2 density.

## 3. Design + remote
Keep 240 px rail, 6×2 density. One 108 px toolbar: title/count, Search, Sort, Filter (badge), overflow (Collections, Play filtered). Posters get high-contrast focus outline + title/status overlay, watched check, progress bar (never colour alone). Default focus first poster; detail focus Resume/Play, not Back.
Arrows: spatial grid; Up row-one enters last-used toolbar control; Down scrolls preserving column; Left column-one enters rail. OK poster→detail, action→activate; Menu/long-OK context; Play/Pause on poster resumes; Back closes keyboard/menu first, otherwise restores originating poster, scroll and refreshed state. Search has on-screen keyboard with clear/submit. Resume reads “Resume · 38% · 52 min left”, Start over separate; empty/error actions focusable.

## 4. Phases/tests/APIs
1. **Query + focus foundation:** persistent query; server contract for text, sort/order, filters, cursor/page/total; widget/device tests at 1280×720: 12 cards, every direction, keyboard/Back, focus restoration, loading/error/empty actions.
2. **Detail/playback truth:** fetch detail by ID; return result or targeted invalidation on exit; await playback and reload resume. Test Resume/Start over, watched consistency, failures, Delete confirmation; verify ordered queue manifest/end-of-item advance.
3. **Play filtered + management:** queue/shuffle, upgrade job status, missing-file actions; contract tests for combined search/filter/sort/pagination (current call sites do not demonstrate them).

## 5. Friction
Whole-list `FutureProvider` + local search fights server queries/pagination; refetch invalidation resets scroll/focus. `Navigator.push` passes a stale `Movie` snapshot and is not awaited; detail mutates `_resume` separately, so grid/detail/playback have no shared invalidation/return contract (`movies_screen.dart:290-294`, `movie_detail_screen.dart:108-137`). First-card autofocus, detail-Back autofocus and the ancestor Up interceptor will get more fragile with toolbar controls — replace implicit geometry/state with an explicit focus-and-refresh model.

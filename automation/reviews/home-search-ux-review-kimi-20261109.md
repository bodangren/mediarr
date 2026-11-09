# TV home + search UX review — Kimi K3.1 Pro (2026-11-09)

*Scope: `home_screen.dart`, `search_screen.dart`, `continue_watching_section.dart`.*

## 1. What exists now
- **Home** watches continue-watching, recently-added, movie and series `FutureProvider`s; Recently Added requests 20, Movies/TV fetch complete lists (`home_screen.dart:37-57`, `:119-122`).
- **Hero** picks the first CW item watched within 7 days, else newest addition; autofocused Resume/Play + Details in a 220–300 px band (`home_screen.dart:218-241`, `:603-620`, `:779-800`).
- Vertical ListView of horizontal rails with focusable cards and See All (`home_screen.dart:155-215`, `:387-455`). CW: four-across artwork, progress, resume/time left; Select resumes; episode resume builds an autoplay queue (`continue_watching_section.dart:74-100`, `:237-249`, `home_screen.dart:341-371`).
- **Search** autofocuses 560 px TextField, loads both libraries, case-insensitive substring match, movies before series, empty query returns everything; Select fetches/opens detail (`search_screen.dart:16-20`, `:102-153`, `:162-186`).

## 2. Gaps
**P0 — trust/basic operation:** recently-added **series hero has a dead Play CTA** (only movie/episode types play, `home_screen.dart:243-260`). Search has no TV keyboard/filters/episode results/relevance/visible Play All; loading/error/empty collapse to the same blank grid via `dataOrNull`, detail failures silent (`search_screen.dart:58-84`, `:131-154`). No screen-local Back policy.
**P0 — first screen/focus:** Home conditionally mounts CW so its loading UI is normally unreachable; Recent/CW errors become “Welcome”/“No recent media” without retry (`home_screen.dart:124-179`, `continue_watching_section.dart:28-58`). Nested scroll views have no explicit traversal/focus restoration/ensure-visible.
**P1:** series/season/filtered Play All, unwatched controls, remove-from-Continue, deterministic sort/filter, ranked Movies/Series/Episodes sections, counts/pagination. Cards discard result year/type (`search_screen.dart:189-225`). Align rails/Search/library grids on actions/focus/See All/retry; add always-discoverable Search entry to Home (none here).
**P2:** recent searches, voice input, editorial rails, non-disruptive hero rotation.

## 3. Design + remote
**Home:** 64 px side margins; 72 px top nav with visible Search; 340 px hero with 48 px title, two-line synopsis, 56 px Resume/Play + Details + Play All (where valid). CW four 430 px cards, 24 px gaps; Recently Added header/card peek within 1080 px. Keep last-focused item per rail; 3 px focus ring, subtle scale, auto horizontal/vertical reveal. Do not asynchronously replace the focused hero.
**Search:** 64 px query row; left 520 px custom A–Z/0–9 keyboard with Space/Clear/Backspace; right ranked results in four columns with All/Movies/Series/Episodes and genre/year/unwatched chips. Empty query shows recents + browse rails. Debounce 250–300 ms; cancel stale requests.
**Remote:** spatial arrows without wrapping; OK activates; Play/Pause resumes focused playable; Menu item actions but never hides essential Play All; Down from hero enters CW; vertical movement preserves index; Back from detail restores exact originating focus/scroll. In Search, Right crosses keyboard→results, Left returns; Back dismisses IME first, then pops.

## 4. Phases/tests/APIs
1. **Foundation:** explicit focus graph/memory, Back, skeleton/error/retry/empty, hero CTA fix, CW refresh/removal.
2. **Core manager:** server search/ranking/filter/pagination, episodes, visible Play All, shared cards/actions.
3. **Polish:** recents, voice, personalisation.
Test 1920×1080 and 1280×720 goldens; scripted arrow/OK/Back traversal incl. route return and focused-item visibility; every provider state; debounce/cancellation/ranking/filter combinations; series/season queue order/resume/completion; slow/failed detail; server pagination/filter integration.
APIs needed (not proven absent): paginated multi-type search with prefix/fuzzy relevance, totals/facets, type/genre/year/quality/watch-state filters and sort; ordered series/season play-all queues with progress; CW dismiss/reset and freshness/invalidation; paged Home rails and richer hero/result metadata.

## 5. Friction
Global `FutureProvider`s model one-shot whole-library fetches, not query-dependent cancellable pages or invalidation (`search_screen.dart:228-236`). Async hero inputs can change content/focus after entry. Mixed `MaterialPageRoute(rootNavigator)` pushes and `context.go` complicate Back/focus restoration (`home_screen.dart:181-205`, `:278-383`). Four item shapes with per-click detail fetches encourage inconsistent episode-play vs detail behaviour; introduce shared media actions/query state and one navigation/focus-restoration policy.

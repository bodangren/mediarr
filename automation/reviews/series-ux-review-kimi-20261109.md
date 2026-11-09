# TV series UX review — Kimi K3.1 Pro (2026-11-09)

*Scope: `series_detail_screen.dart`, `series_screen.dart`, `continue_watching_section.dart`.*

## 1. What exists now
- **Library:** cached `FutureProvider` fetches all series; 320×48 text field does local case-insensitive substring filtering; six-column grid intent, first-card autofocus, monitored/file/watched badges, loading spinner, basic empty text, non-retryable error (`series_screen.dart:13-17`, `:40-46`, `:58-160`). Context menu open + series-wide watched; success invalidates, failure silent (`:169-183`).
- **Detail:** two independently scrolling panes; artwork, synopsis, size, watched count/progress, season/episode data, per-episode progress/watched, episode/series watched toggles, episode release search (`series_detail_screen.dart:301-362`, `:469-583`). Primary CTA resumes the in-progress episode with greatest position, otherwise the first downloaded episode anywhere; autofocus on CTA (`:106-159`, `:428-468`). Playback gets a series queue from the selected episode (`:191-210`). Loading, raw-error+Retry, custom Down focus hops (`:59-104`, `:262-296`).
- **Continue Watching:** four-across cards, artwork, progress %, resume timestamp/time left, select-to-resume; inline loading, hidden when empty (`continue_watching_section.dart:15-107`, `:121-249`).

## 2. Gaps
**P0:** next/resume correctness — greatest position is neither recently watched nor next unwatched; after progress clears/all watched CTA can restart the first episode. Define ordered Resume, Next up, Play from beginning incl. specials/missing. No Play Season/Play All/next-episode action; “Search All Missing”/episode search only report counts, no results/grab/job status (`series_detail_screen.dart:183-251`, `:302-338`). Delete Series has no confirmation/visible completion (`:339-347`). Watched failures silent; no downloaded episodes removes CTA without explanation; Continue Watching has no error/retry; deterministic initial/restored focus and Back behaviour missing beyond two Down overrides.

**P1:** filters/sort (Continuing/Unwatched/Missing/Monitored; title/recently added), season watched toggles, conditional episode actions, actionable empty/missing states, SxxEyy/title in Continue Watching, Play from start/remove, visible autoplay next-up countdown with Cancel and a setting.

**P2:** skeletons, polished focus motion/sound, recently aired/returning rows, richer monitoring preferences.

## 3. Design + remote
Library: 88 px header, 420×56 search, 56 px filter/sort chips, six columns/two fully visible rows; focused card 4 px outline, 1.04 scale, title + watched/next-up label, always scrolled fully into view.
Detail: fixed 520 px left summary, flexible right episode pane; 64 px primary `Resume S02E03 · 18:24`, secondary `Play next S02E04`, then Play Season/Play All. Right: 56 px season chips, 112 px rows with SxxEyy, title, watched, progress, downloaded/missing; six rows visible; default season follows resume/next-up. No-files disables playback with “No downloaded episodes” and focuses Search/Acquire.
Remote: D-pad spatial with edge rules; OK activates; long-OK/Menu context; Back closes menu/keyboard then detail→library→previous; Play/Pause resumes focused/current; restore focused series/season/episode/scroll on return; rail-edge and list wrap rules consistent.

## 4. Phases/tests/APIs
1. **P0 semantics/state/focus:** table-test target selection across in-progress, season boundaries, all-watched, specials, missing files; 1920×1080 golden/widget D-pad tests entry/every exit/Back/focus restoration/empty/loading/error/retry; route-return freshness.
2. **P1 browsing:** filters/sorts, watched optimistic rollback, season/series queues, release result/grab flows, delete confirmation.
3. **Autoplay/up-next:** fake-clock tests countdown, cancel, setting persistence, missing/watched skipping, queue exhaustion.
Confirm/add server contracts: canonical next-up incl. last-activity, per-season loading/pagination, season batch watched, release details/grab/job status, progress mutation responses/versioning. Existing client queue may suffice for Play All if filter semantics are specified.

## 5. Friction
`seriesListProvider` invalidated only by bulk-watch; detail watch changes and playback return do not refresh; detail route not awaited (`series_screen.dart:177-190`). Detail reloads whole screen after each toggle → spinner flashes, lost season/scroll/focus; playback return no reload (`series_detail_screen.dart:83-104`, `:170-210`). Resume computation mutates `_episodeSeasonMap` which `_buildEpisodeData` later clears; selection depends on build ordering (`:112-145`, `:554-560`). Autofocus CTA, custom header Down, `onExitDown` hard-wire today’s two-pane hierarchy; whole-series-from-selected queue must reconcile with season/unwatched Play All semantics. Continue Watching is Home-only and separately cached, so it can disagree.

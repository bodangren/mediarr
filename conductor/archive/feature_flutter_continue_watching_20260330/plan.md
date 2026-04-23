# Implementation Plan: Flutter Continue Watching & Calendar

## Phase 1 — Home Screen

- [x] Task: Create `HomeScreen` — vertical scrollable layout with section headers and horizontal card rows
- [x] Task: Implement Continue Watching section — call `GET /api/playback/continue-watching` via ApiClient; render as horizontal `ListView` of cards with progress bar, poster, title; one-tap navigates to `PlaybackScreen` with resume offset
- [x] Task: Implement Recently Added section — call `GET /api/activity?types=download,import&limit=10`; render as horizontal card row
- [x] Task: Implement Upcoming section — call `GET /api/dashboard/upcoming`; render as horizontal card row with air date badge
- [x] Task: Set `HomeScreen` as default route in `app_router.dart`; update `LeanbackScaffold` nav to include Home
- [x] Task: Write tests for `HomeScreen` — renders all 3 sections, handles empty states, cards are tappable
- [x] Task: Conductor - Checkpoint Phase 1

## Phase 2 — Calendar Screen

- [x] Task: Create `CalendarScreen` — monthly grid using `TableCalendar` or custom grid; days with releases show a dot indicator; D-pad navigable with focus ring
- [x] Task: Add `getCalendarData(month, year)` method to `ApiClient` — calls `GET /api/dashboard/upcoming?range=month&month=<month>&year=<year>`; returns map of date → releases
- [x] Task: Implement day tap → bottom sheet showing release list for that day (episode title, series name, air time; movie title, release date)
- [x] Task: Add `CalendarScreen` to router at `/calendar` and to `LeanbackScaffold` nav
- [x] Task: Write tests for `CalendarScreen` — renders grid, shows dot indicators, day tap opens sheet
- [x] Task: Run `cd clients/mediarr-client && flutter test` — all pass
- [x] Task: Conductor - Checkpoint Phase 2

# Spec: Flutter Continue Watching & Calendar

## Context

After the playback resume sync (Phase A3) provides the server endpoint and the
Flutter client auto-resumes playback, the client needs a home screen that surfaces
in-progress and upcoming content. The current Flutter app has no home/dashboard
screen — it opens directly to Movies or Series lists.

For a living-room leanback experience, the home screen should be the first thing
users see: "Continue Watching" at the top, "Upcoming" below, and quick access to
recently added content.

## Requirements

### Home Screen
1. New `HomeScreen` as the initial route (replacing direct Movies list).
2. **Continue Watching** section — horizontal scrollable row of media cards with
   progress bars and one-tap resume (navigates to `PlaybackScreen` with resume offset).
   Data from `GET /api/playback/continue-watching`.
3. **Recently Added** section — horizontal row of recently added movies and series.
   Data from `GET /api/activity?types=download,import&limit=10`.
4. **Upcoming** section — horizontal row of upcoming releases (next 7 days).
   Data from `GET /api/dashboard/upcoming`.

### Calendar View
5. New `CalendarScreen` — monthly calendar grid showing release dates for episodes
   and movies. Data from `GET /api/dashboard/upcoming?range=month`.
6. Tapping a day shows a detail list of releases for that day.
7. Leanback-friendly: D-pad navigation between days, focus ring on selected day.

### Navigation
8. Home screen is the default route in the `LeanbackScaffold` shell.
9. Bottom nav: Home, Search, Library (Movies + Series combined), Activity, Settings.

## Acceptance Criteria

- Home screen shows Continue Watching, Recently Added, and Upcoming sections.
- Continue Watching items have progress bars and one-tap resume.
- Calendar shows monthly grid with release indicators on days.
- Tapping a calendar day shows release list.
- Home screen is the default route.
- All new screens have widget tests.
- `cd clients/mediarr-client && flutter test` — all pass.

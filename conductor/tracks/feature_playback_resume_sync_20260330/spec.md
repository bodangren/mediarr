# Spec: Playback Resume & Continue Watching

## Context

The server already stores playback progress via `PlaybackProgress` (position, duration,
isWatched) and the manifest endpoint (`GET /api/playback/:id`) returns a `resume` object
with `{ position, progress, isWatched }`. The Flutter client reports progress every 10s
via `POST /api/playback/progress`.

The gap: the Flutter client's `PlaybackService.play()` always starts from
`Duration.zero`. It never reads the `resume` field from the manifest. Similarly, the
React SPA dashboard has no "Continue Watching" widget — once you leave a movie/show,
you have to navigate back to its detail page to resume.

## Requirements

### Flutter Client
1. `PlaybackService.play()` must read `manifest.resume.position` and start playback
   from that offset.
2. A "Continue Watching" section on the home screen (new `HomeScreen` or widget on
   existing screens) showing in-progress media with progress bars and one-tap resume.
3. Playback progress must mark media as "watched" when `isWatched` is true from the
   server (hide from continue watching).

### React SPA
4. A "Continue Watching" widget on the dashboard showing in-progress media with
   progress bars, clicking navigates to detail page with resume position.
5. Server endpoint `GET /api/playback/continue-watching` returning media with
   active playback progress, sorted by most recently updated.

### Server
6. Add `GET /api/playback/continue-watching` endpoint — returns list of media with
   non-zero, non-watched playback progress, joined with media metadata.

## Acceptance Criteria

- Flutter client auto-resumes from saved position on playback start.
- Flutter home screen shows "Continue Watching" with progress bars.
- SPA dashboard shows "Continue Watching" widget with progress bars.
- Marking media as watched removes it from continue watching.
- `CI=true bun test` — server tests pass.
- `cd clients/mediarr-client && flutter test` — client tests pass.
- `cd app && npm run build` — SPA builds clean.

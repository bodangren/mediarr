# Track: SPA management surfaces

> Opened 2026-11-11 at the owner's direct request: *"We need to improve the usability / UX of the SPA.
> There's no way to manage the youtube / music / adult collections. No way to manage youtube
> subscriptions. No way to manage wanted. No way to manage tv / movie media — missing subs, wrong
> version, delete, wanted list, etc. It still mostly reflects the 'half-implemented Sonarr clone'
> mode."*

## Problem

The SPA can browse but not manage. `library/movies`, `library/tv`, `adult`, `youtube`, `wanted` are
read-mostly screens; the server already exposes most of the mutating routes (movie/series delete +
rescan, youtube subscription PATCH/DELETE, retention restore/purge, adult quarantine/decision, music
scan/ingest/tag, wanted add) but the SPA never surfaces them. Result: the owner must go to curl or the
TV client for housekeeping, and the product reads like a Sonarr clone with a viewer bolted on.

## Requirements

- **FR-1 Movies/TV:** each detail page gains a manage panel: rescan, search releases, grab a specific
  release, replace/delete a file ("wrong version"), delete the item (with confirmation), open the
  subtitle panel (existing) and add/refresh wanted.
- **FR-2 YouTube:** subscriptions screen (list/add/edit/remove/poll), queue management (retry/cancel/
  remove), video actions (delete file, keep/restore), retention list (restore/purge) — every action
  mirrors an existing API route.
- **FR-3 Music:** a Music section (artists/albums/tracks) with library management: scan now, ingest a
  YouTube URL, retag, delete a track file, plus the listening profile summary.
- **FR-4 Adult:** collection management on the existing adult page: scan/import, generate thumbnails,
  quarantine list with restore/purge, and the keep/delete decision (track
  `feature_adult_retention_keep_delete_20261111`).
- **FR-5 Wanted:** one manage screen for media wanted + subtitle wanted: filter, sort by priority,
  re-search one/all, remove, and mark satisfied.
- **FR-6 UX rules:** every destructive action confirms and names the exact item/path; every action
  reports success/failure inline with the server's error text; no silent failures; no dead buttons for
  routes that do not exist (build them server-side or omit the action).
- **FR-7 Shared language:** one consistent action bar + confirm dialog + toast pattern across pages,
  so the console does not read like five different apps.

## Acceptance

1. Each requirement above is reachable in the SPA without curl, and every button hits a real route.
2. Destructive actions require an explicit confirm that shows the target path/title.
3. Failures show the server error verbatim.
4. `npx vitest run` for the touched SPA files is green; `tsc` for the server/app is clean where touched.
5. Browser-verified against the live server once the server restart loads the new routes.

## Out of scope

Flutter TV client (its own tracks), a full visual redesign, and any new server endpoint that a route
already covers. Copy/UX wording should match the domain names the owner uses (Movies, Series, Music,
YouTube, Adult, Wanted).

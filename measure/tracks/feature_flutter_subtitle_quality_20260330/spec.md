# Spec: Flutter Subtitle & Quality Control

## Context

The Flutter client can play media with subtitle tracks (the playback manifest returns
subtitle tracks, and the playback screen supports subtitle selection). But there is
no way to search for, download, or manage subtitles from the client. Users must use
the React SPA for subtitle management.

Similarly, quality upgrades — requesting a better release for already-imported media —
are only available in the SPA. The Flutter client should let users trigger quality
upgrades from the couch.

## Requirements

### Subtitle Management
1. From the media detail screen (movie or series), a "Subtitles" section showing
   available subtitle tracks with language and provider badges.
2. "Search Subtitles" button — opens a search sheet querying the server's subtitle
   providers for the specific media.
3. Search results show: language, provider, hearing-impaired badge, download count.
4. One-tap download — calls server subtitle download endpoint, subtitle appears in
   the track list.
5. During playback, the subtitle selection overlay shows downloaded tracks and
   allows switching.

### Quality Upgrade
6. From the media detail screen, a "Quality Upgrade" section showing the current
   quality and a "Search for Upgrade" button.
7. "Search for Upgrade" triggers the server's wanted search for that specific media,
   returning available releases of higher quality.
8. User selects a release → grabs it → server handles import and replacement.

## Acceptance Criteria

- Media detail screen shows subtitle tracks with language badges.
- "Search Subtitles" opens a sheet with search results from providers.
- Downloading a subtitle adds it to the track list and is available during playback.
- "Quality Upgrade" shows current quality and search button.
- Searching for upgrade returns higher-quality releases.
- Grabbing an upgrade release triggers download and import.
- All new UI has widget tests.
- `cd clients/mediarr-client && flutter test` — all pass.

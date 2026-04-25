# Specification: Subtitle Management

## Overview
Implement a complete subtitle management pipeline in the Mediarr monolith, using shared movie/TV services and a unified database. The feature set includes multi-provider subtitle search/download, global wanted language settings, automated fetch flows, and UI subtitle status badges.

## Functional Requirements
- **Provider Foundation**
  - Support OpenSubtitles with real search and download flow.
  - Add one Chinese-capable provider and one Thai-capable provider for Phase 1 rollout:
    - Chinese: ASSRT.
    - Thai: SubDL.
  - Use `SubtitleProviderFactory` for provider resolution and consistent provider naming.
  - Provider failures must be isolated (one provider failing must not crash overall subtitle workflows).
- **Scoring and Candidate Selection**
  - Implement deterministic subtitle candidate scoring (release-name, language fit, forced/HI fit, quality hints).
  - Use scoring in both manual search ordering and automated "best candidate" selection.
- **Wanted Language Management**
  - Add global `wantedLanguages` in app settings as a list of language codes.
  - Global wanted languages are the baseline for all media when no item-specific override exists.
- **Automated Subtitle Search**
  - On import success (`MOVIE_IMPORTED`, `SERIES_IMPORTED`), trigger subtitle automation for the imported media.
  - Add periodic scheduler job to scan for missing wanted subtitles and trigger fetch.
  - Persist wanted subtitle state transitions (`PENDING`, `SEARCHING`, `DOWNLOADED`, `FAILED`).
- **Subtitle API Surface**
  - Implement subtitle endpoints required by current app clients for:
    - Providers management/status.
    - Wanted subtitles lists/search/count.
    - Subtitle history and summary stats.
    - Subtitle blacklist listing/removal/clear.
    - Movie/series subtitle sync/scan/search convenience flows.
- **Frontend Integration**
  - Settings page supports `wantedLanguages` and provider status/credentials.
  - Movie and episode UI surfaces display per-language subtitle badges.
  - Series/season surfaces display aggregate partial/complete status.
  - Media detail headers expose detailed subtitle status.
  - Manual subtitle search and download flow uses live provider data.

## Non-Functional Requirements
- **Monolith Constraint**: All subtitle logic remains inside the existing backend/frontend monolith; no new service boundaries.
- **Data Integrity**: Downloaded/uploaded subtitle file paths follow existing subtitle naming conventions and persist in `VariantSubtitleTrack`/`SubtitleHistory`.
- **Rate Limiting and Resilience**: Provider integrations implement request throttling/backoff behavior and graceful degradation.
- **Contract Safety**: Backend route map and frontend route map must remain aligned for subtitle endpoints.

## Acceptance Criteria
- Users can configure `wantedLanguages` and read/write them via settings APIs and UI.
- Manual subtitle search returns provider results and manual download writes/persists subtitle tracks.
- Importing media triggers subtitle search for missing wanted languages.
- Periodic subtitle automation runs and updates wanted subtitle states.
- Movie/Episode rows and detail pages render subtitle language badges with correct status mapping.
- Series/Season aggregate subtitle status shows partial vs complete correctly.
- Existing subtitle API clients in `app/src/lib/api/*subtitle*.ts` can call implemented backend endpoints without contract mismatch.

## Out of Scope
- Subtitle timeline synchronization/retiming tools.
- Subtitle editing/translation workflows.
- OCR for image-only subtitle formats.

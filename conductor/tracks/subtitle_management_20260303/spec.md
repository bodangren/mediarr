# Specification: Subtitle Management

## Overview
Implement a comprehensive subtitle management pipeline, similar to the media download pipeline. This includes support for subtitle indexers (providers), wanted language profiles, and both manual and automated searches. Visual feedback will be provided through status badges on media items.

## Functional Requirements
- **Subtitle Indexers (Providers):**
    - Integrate with subtitle providers including OpenSubtitles, Addic7ed, and Chinese/Thai specialized sites (e.g., SubHD, Zimuku).
    - Leverage the existing `SubtitleProviderFactory` to manage multiple providers.
- **Language Management:**
    - Global "Wanted Languages" list in Settings.
    - Ability to mark specific languages as "Wanted" for a piece of media.
- **Automated Subtitle Search:**
    - **On-Import Trigger:** Automatically search for missing subtitles immediately after a media file is imported.
    - **Background Task:** A periodic task that scans the library for media missing wanted subtitles and triggers searches.
- **UI Integration (Badges):**
    - **Media Item Badges:** Display `[en]`, `[th]`, `[zh]` badges on Movie rows and Episode rows.
        - **Green:** Subtitle grabbed/available.
        - **Gray/Disabled:** Subtitle wanted but missing.
    - **Collection Badges:** Display status on Series and Seasons.
        - **Yellow/Partial:** Some but not all wanted subtitles are available for that collection.
    - **Media Detail:** Show detailed subtitle status in the header or a dedicated "Subtitles" tab.
- **Manual Search:**
    - A "Manual Search" modal for subtitles allowing users to pick specific results from different providers.

## Non-Functional Requirements
- **Data Integrity:** Subtitles should be stored in the same directory as the media file, following standard naming conventions.
- **API Rate Limiting:** Respect rate limits for subtitle providers (e.g., OpenSubtitles).

## Acceptance Criteria
- Users can configure a list of wanted languages in Settings.
- Media detail pages display badges for all wanted languages with correct color coding.
- Importing a new movie automatically triggers a search for configured wanted subtitles.
- A "Manual Search" modal for subtitles returns results from at least one configured provider.

## Out of Scope
- Subtitle synchronization/retiming tools.
- Subtitle editing/translation within the UI.

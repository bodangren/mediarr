# Specification: Automated Search and Download

## Overview
Implement an automated search and download pipeline for missing media (Movies and Episodes). This track extends the current manual search by introducing an algorithm-driven selection process that automatically identifies, scores, and grabs the best release candidate from configured indexers.

## Functional Requirements
- **Automated Search Engine:**
    - Perform searches across all enabled indexers for "monitored" media with missing files.
    - Implement a "Best Candidate" scoring algorithm considering:
        - **Confidence (Match):** How well the parsed title matches the target media (title, year, season, episode).
        - **Quality Match:** How well the release matches the assigned `QualityProfile`.
        - **Indexer Priority:** User-defined indexer priority scores.
        - **Availability:** Seeders/Leechers count.
        - **Size/Protocol:** Release size and protocol (Torrent/Usenet).
- **Automation Triggers:**
    - **RSS Monitor:** Automatically grab matching releases found in the RSS feed (improving `RssMediaMonitor`).
    - **Background Task:** A periodic task (e.g., "Wanted Search") that searches for all missing monitored media.
    - **On-Add Search:** Automatically trigger an automated search when a new Series or Movie is added to the library.
    - **Manual Trigger:** An "Auto-Search" button on Movie/Series detail pages and a bulk "Search Missing" button on the Dashboard.
- **Selection Threshold:**
    - Define a minimum score threshold for automatic grabbing.
    - If no candidate meets the threshold, skip the download and log the reason in the Activity history.
- **Manual Override:**
    - Maintain the existing manual "Search" modal for users to inspect results and override the automated choice.

## Non-Functional Requirements
- **Performance:** Automated searches should be performed in the background to avoid blocking the UI.
- **Idempotency:** Ensure the same release is not grabbed multiple times for the same media.

## Acceptance Criteria
- A "Search Missing" button on the Dashboard triggers a background search for all wanted media.
- An "Auto-Search" button on the Movie/Series detail page successfully grabs the highest-scoring candidate.
- Adding a new movie to the library automatically initiates a search and download if a suitable candidate is found.
- The scoring algorithm correctly prioritizes higher-quality, well-seeded releases from preferred indexers.

## Out of Scope
- Support for "Upgrade" logic (replacing existing files with better quality ones).
- Custom scoring logic for external scripts (only internal scoring engine).

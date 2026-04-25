# Specification: Library Visibility & Dashboard

## Overview
This track focuses on surfacing the backend state of the media library to the user interface. It addresses three critical areas of visibility:
1. **Series Status:** Providing clear visual indicators for Series, Seasons, and Episodes regarding their availability (Missing vs. Available vs. Downloading).
2. **Calendar:** Implementing a fully functional calendar view showing upcoming episode air dates and movie release dates (physical/digital).
3. **Dashboard:** Building a central landing page that gives an at-a-glance overview of the system: Recently Added media, Upcoming releases, Active Downloads, and Disk Space utilization.

## Scope
*   **Backend:** Add or enhance APIs to serve aggregated statistics, calendar events, and dashboard widget data.
*   **Frontend:** 
    *   Update the Series Detail page components with season progress bars and episode status badges.
    *   Build the Calendar page with a default Monthly view, showing only monitored items, and including a quick "Search" button for items whose release date has passed.
    *   Build the Dashboard landing page with a fixed layout showing Recently Added (to library), Upcoming, Active Downloads, and Disk Space.

## Out of Scope
*   Adding new media sources or indexers.
*   Modifying the core import or download pipelines.
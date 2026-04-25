# Specification: Existing Library Import

## Overview
This track provides the capability for users to point the application at their existing, pre-organized media folders (e.g., `/data/media/movies` or `/data/media/tv`) and have the system scan, identify, and import those files into the database without needing to download them again.

## Scope
*   **Backend:**
    *   Directory scanning utility to recursively find media files.
    *   Filename parsing to identify Series/Episode or Movie titles and years.
    *   Integration with TMDB/TVDB search to resolve parsed names to official metadata IDs.
    *   Bulk import endpoint to create database records for discovered media and link the existing files.
*   **Frontend:**
    *   "Import Existing Library" flow (likely from the Add New media pages or Settings).
    *   Review screen to show matched media, unmatched files, and allow users to manually correct mismatches.
    *   Options to set monitoring status and quality profiles during import.

## Out of Scope
*   Renaming or reorganizing existing files during the initial import (unless explicitly requested as an optional toggle, but primarily we just ingest them as-is).
*   Importing from other applications' databases (e.g., migrating an actual Sonarr.db file). This is purely a filesystem-based import.
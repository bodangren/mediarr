# Product Definition

Mediarr is a unified, all-in-one media management powerhouse designed to replace the fragmented "arr" stack (Sonarr, Radarr, Bazarr, Prowlarr) with a single, modern interface and a high-performance integrated backend.

Unlike the ecosystem it replaces, Mediarr is a **true monolith**. It does not use microservices or application sync logic. All domains (Movies, TV Shows, Subtitles) share a single pool of indexers, a single database, and a unified settings interface.

### Core Features
- **Integrated Torrent Engine:** A built-in downloading service (WebTorrent) that eliminates the need for external clients.
- **Unified Indexer Management:** Standardized support for Torznab, Newznab, and scraping-based indexers (using a monolith-native Cardigann runtime). No "syncing" indexers to different apps—add it once, use it everywhere.
- **Unified Media Management:** Comprehensive tracking, scanning, and automated "wanted" list logic for both TV Shows and Movies in a single library.
- **Automated Lifecycle:** From RSS discovery to download management, subtitle fetching, and final file organization.
- **Modern Interface:** A sleek, pure React SPA (Single Page Application) dashboard for central control over the entire system.
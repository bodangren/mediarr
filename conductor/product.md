# Product Definition

Mediarr is a unified, all-in-one media management powerhouse designed to replace the fragmented "arr" stack (Sonarr, Radarr, Bazarr, Prowlarr) with a single, modern interface and a high-performance integrated backend.

Unlike the ecosystem it replaces, Mediarr is a **true monolith**. It does not use microservices or application sync logic. All domains (Movies, TV Shows, Subtitles) share a single pool of indexers, a single database, and a unified settings interface.

### Core Features
- **Integrated Torrent Engine:** A built-in downloading service (WebTorrent) that eliminates the need for external clients.
- **Unified Indexer Management:** Standardized support for Torznab, Newznab, and scraping-based indexers (using a monolith-native Cardigann runtime). No "syncing" indexers to different apps—add it once, use it everywhere.
- **Unified Media Management:** Comprehensive tracking, scanning, and automated "wanted" list logic for both TV Shows and Movies in a single library.
- **Automated Lifecycle:** From RSS discovery to download management, subtitle fetching, and final file organization. Features an intelligent, unified scoring algorithm that automatically evaluates releases based on custom formats, title confidence, indexer priority, and seeders.
- **Modern Interface:** A sleek, pure React SPA (Single Page Application) dashboard for central control over the entire system. Core library workflows (browse, detail, interactive search & grab), all critical settings sections (indexers, download clients, quality profiles, subtitles, general), and production serving via the Bun backend are fully wired and integration-tested.
- **Native TV Client:** Includes a dedicated, 10-foot Android TV application for browsing the library and playing media directly on the big screen, featuring automatic local network discovery, robust 4K/HDR playback, and seamless playback state syncing with the server.
# Mediarr

Mediarr is a unified, all-in-one media management powerhouse designed to replace the fragmented "arr" stack (Sonarr, Radarr, Bazarr, Prowlarr) with a single, modern interface and a high-performance integrated backend.

## Vision

Built for home lab enthusiasts, Mediarr eliminates the complexity of wiring together separate services. It provides a "Modern Dark" dashboard for managing Movies, TV Shows, Subtitles, and Indexers, all powered by a built-in torrent engine and local DLNA streaming.

## Tech Stack

- **Frontend:** Vite + React 19 + TypeScript + Tailwind CSS
- **Backend:** Node.js + Fastify (API) + tsx (runtime)
- **Database:** SQLite + Prisma ORM
- **Testing:** Vitest
- **State Management:** TanStack React Query
- **Routing:** React Router v7
- **Clients:** Android TV (Kotlin + Jetpack Compose)
- **Deployment:** Docker & Docker Compose (migration from Next.js to Vite in progress)

## Development

### Prerequisites

- Node.js 20+
- npm (workspaces)

### Running locally

```bash
npm install
npm run dev
```

This starts both the Vite dev server (frontend on `:5173`) and the Fastify API server (backend on `:3001`).

### Testing

```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

## Development Workflow

This project follows the **Conductor Workflow**. All major features and fixes are organized into **Tracks**.

- **Project Context:** [conductor/index.md](./conductor/index.md)
- **Tracks Registry:** [conductor/tracks.md](./conductor/tracks.md)

To contribute or implement features, please refer to the active track plans in `conductor/tracks/`.

## API Utilities

Shared backend utilities live in `server/src/api/utils/`:

- **playbackHelpers** — Playback state serialization and latest-progress mapping.
- **episodeStatusHelpers** — Unified episode/movie status determination (downloaded, missing, airing, unaired).
- **queryHelpers** — Library filter parsing (monitored, status, search) used across movie and series endpoints.
- **safePath** — Path-traversal protection for file operations, ensuring resolved paths stay within allowed root directories.

## Roadmap

1. **Foundation:** Monorepo scaffolding and reverse engineering reference projects.
2. **Indexer Engine:** Unified indexing and proxying (Prowlarr features).
3. **Torrent Engine:** Integrated downloader and queue management.
4. **TV & Movies:** Full series and movie lifecycle management.
5. **Subtitle & Audio:** Advanced multi-language tracking and fetching.
6. **Unified UI:** The final high-density "Modern Dark" dashboard.
7. **DLNA Server:** Local network streaming with native subtitle support.
8. **Android TV Client:** Native Kotlin client with Jetpack Compose UI.

## License

[MIT](./LICENSE)

# Mediarr

Mediarr is a unified, all-in-one media management powerhouse designed to replace the fragmented "arr" stack (Sonarr, Radarr, Bazarr, Prowlarr) with a single, modern interface and a high-performance integrated backend.

## 🚀 Vision
Built for home lab enthusiasts, Mediarr eliminates the complexity of wiring together separate services. It provides a "Modern Dark" dashboard for managing Movies, TV Shows, Subtitles, and Indexers, all powered by a built-in torrent engine and local DLNA streaming.

## 🛠 Tech Stack
- **Frontend:** Next.js (React) + TypeScript + Tailwind CSS
- **Backend:** Node.js (Background Services) + Fastify (API)
- **Database:** SQLite + Prisma ORM
- **Automation:** BullMQ / node-cron
- **Deployment:** Docker & Docker Compose

## 🏗 Development Workflow
This project follows the **Conductor Workflow**. All major features and fixes are organized into **Tracks**. 

- **Project Context:** [conductor/index.md](./conductor/index.md)
- **Tracks Registry:** [conductor/tracks.md](./conductor/tracks.md)

To contribute or implement features, please refer to the active track plans in `conductor/tracks/`.

### Prowlarr UI Track Docs (Phase 10.4)

- Component usage: `app/docs/prowlarr-ui/component-usage.md`
- API integration contracts: `app/docs/prowlarr-ui/api-integration.md`
- Deployment + migration notes: `conductor/tracks/prowlarr_ui_cloning_20260214/artifacts/phase10.4-deployment-notes.md`

## 🛣 Roadmap
1. **Foundation:** Monorepo scaffolding and reverse engineering reference projects.
2. **Indexer Engine:** Unified indexing and proxying (Prowlarr features).
3. **Torrent Engine:** Integrated downloader and queue management.
4. **TV & Movies:** Full series and movie lifecycle management.
5. **Subtitle & Audio:** Advanced multi-language tracking and fetching.
6. **Unified UI:** The final high-density "Modern Dark" dashboard.
7. **DLNA Server:** Local network streaming with native subtitle support.

## ▶ Running With Compose

Mediarr runs as two containers:
- `api` on `:3001` (Fastify + Prisma)
- `mediarr` on `:3000` (Next.js UI)

Start or rebuild:

```bash
podman-compose up --build -d
```

Stop:

```bash
podman-compose down
```

Notes:
- The frontend depends on Next.js rewrites for `/api/*` routing to the backend.
- `API_INTERNAL_URL` must be available at image build time so rewrites are included in the production build.
- If API requests in the UI fail with `Expected JSON response payload`, rebuild images to refresh rewrite config:

```bash
podman-compose down
podman image rm -f mediarr_api mediarr_mediarr || true
podman-compose up --build -d
```

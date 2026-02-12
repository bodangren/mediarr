# Mediarr Technology Stack

> Last reconciled: 2026-02-11

**Frontend & API:**
- **Framework:** Next.js (React) — App Router, used as the UI host. Does **not** run backend domain logic in route handlers; the Next.js process proxies or fetches from the dedicated backend service.
- **Language:** TypeScript (strict mode).
- **Styling:** Tailwind CSS v4 with a "Modern Dark" design token system.
- **State Management:** TanStack Query (React Query) for server-state; no global client-state library — local React state for UI ephemera only.

**Backend & Background Services:**
- **Runtime:** Node.js — single long-lived process hosting all domain services, the torrent engine, and the task scheduler. This singleton process model is required because WebTorrent, the scheduler, and in-memory torrent state must persist across requests.
- **HTTP Framework:** Fastify for the dedicated backend API server.
- **Real-Time Transport:** Server-Sent Events (SSE) for push updates from backend to frontend (queue progress, activity events, health alerts). SSE chosen over WebSockets for simplicity — unidirectional server-to-client push covers all current use cases without requiring a full-duplex protocol.
- **Torrent Engine:** WebTorrent (integrated, no external client needed).
- **Metadata Engine:** Integrated SkyHook proxy for TVDB/TMDB data acquisition.
- **Task Scheduling:** `node-cron` for managing RSS syncs, availability checks, and torrent monitoring.
- **Communication:** Next.js frontend fetches from the Fastify backend API over HTTP. SSE streams provide real-time push for queue, activity, and health events.

**Data & Storage:**
- **Database:** SQLite (standard for *arr apps — portability and simplicity).
- **ORM:** Prisma with typed client generation.
- **Migrations:** Prisma Migrate — all migrations are additive-only in production. Destructive changes require explicit migration notes and rollback documentation.
- **Storage Architecture:**
    - **Config Volume (`/config`):** Persistent storage for the SQLite database (`mediarr.db`) and application configuration.
    - **Data Volume (`/data`):** Unified storage for media and downloads to enable Atomic Moves and Hard Linking.
        - `/data/downloads/incomplete`: Temporary storage for active downloads.
        - `/data/downloads/complete`: Storage for finished downloads awaiting import.
        - `/data/media/tv`: Final destination for organized TV series.
        - `/data/media/movies`: Final destination for organized movies.

**Deployment:**
- **Containerization:** Docker & Docker Compose (targeting home-lab environments).
- **Build-time API rewrite requirement (2026-02-11):** In containerized production builds, `API_INTERNAL_URL` must be set during `next build` so `/api/*` rewrites are compiled into the frontend server config.
- **Authentication:** None currently. App assumes trusted local network. Auth may be added as a future track if needed.

## 7A Process Model Spike Validation (2026-02-11)

- Implemented a minimal Fastify spike service exposing:
  - `GET /api/health` returning `{ ok: true, uptime }`
  - `GET /api/events/stream` SSE heartbeat with monotonic `counter`
- Default spike binding:
  - Backend: `127.0.0.1:3001`
  - Frontend (Next.js): `127.0.0.1:3000`
- Validation result: singleton in-memory state persists across repeated SSE client requests in the same backend process, satisfying the process model prerequisite for Track 7B real-time contracts.

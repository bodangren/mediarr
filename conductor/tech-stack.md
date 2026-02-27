# Mediarr Technology Stack

> Last reconciled: 2026-02-26

**Frontend & API:**
- **Framework:** React SPA (Single Page Application) built with Vite. No SSR, no Next.js.
- **Routing:** React Router (client-side routing).
- **Language:** TypeScript (strict mode).
- **Styling:** Tailwind CSS v4 with a "Modern Dark" design token system.
- **State Management:** TanStack Query (React Query) for server-state; local React state for UI ephemera.

**Backend & Background Services:**
- **Runtime:** Bun (replacing Node.js) — single long-lived process hosting all domain services, the torrent engine, and the task scheduler. This singleton process model is required because WebTorrent, the scheduler, and in-memory torrent state must persist.
- **HTTP Framework:** Fastify for the dedicated backend API server.
- **Real-Time Transport:** Server-Sent Events (SSE) for push updates from backend to frontend (queue progress, activity events, health alerts).
- **Torrent Engine:** WebTorrent (integrated, no external client needed).
- **Metadata Engine:** Integrated SkyHook proxy for TVDB/TMDB data acquisition.
- **Task Scheduling:** `node-cron` for managing RSS syncs, availability checks, and torrent monitoring.
- **Communication:** React frontend fetches from the Fastify backend API over HTTP. In development, Vite proxies `/api` calls to the Bun backend. In production, the Bun backend serves the Vite static build directly.

**Data & Storage:**
- **Database:** SQLite (standard for *arr apps — portability and simplicity).
- **ORM:** Prisma with typed client generation (using standard engine, no better-sqlite3 adapter for Bun compatibility).
- **Migrations:** Prisma Migrate — all migrations are additive-only in production.
- **Storage Architecture:**
    - **Config Volume (`/config`):** Persistent storage for the SQLite database (`mediarr.db`) and application configuration.
    - **Data Volume (`/data`):** Unified storage for media and downloads to enable Atomic Moves and Hard Linking.
        - `/data/downloads/incomplete`: Temporary storage for active downloads.
        - `/data/downloads/complete`: Storage for finished downloads awaiting import.
        - `/data/media/tv`: Final destination for organized TV series.
        - `/data/media/movies`: Final destination for organized movies.

**Deployment:**
- **Single Process:** The frontend is built into static files (`dist/`) and served directly by the Fastify backend. The user only needs to execute the single Bun backend script.
- **Containerization:** Docker & Docker Compose (targeting home-lab environments).
- **Authentication:** None currently. App assumes a trusted local network.
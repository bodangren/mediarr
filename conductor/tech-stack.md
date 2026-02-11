# Mediarr Technology Stack

**Frontend & API:**
- **Framework:** Next.js (React).
- **Language:** TypeScript.
- **Styling:** Tailwind CSS with a focus on "Modern Dark" aesthetics.
- **State Management:** TanStack Query (React Query) for efficient data fetching from the backend.

**Backend & Background Services:**
- **Runtime:** Node.js.
- **Framework:** Fastify or Express for the dedicated background service.
- **Torrent Engine:** WebTorrent (Integrated, no external client needed).
- **Metadata Engine:** Integrated SkyHook proxy for TVDB/TMDB data acquisition.
- **Task Scheduling:** BullMQ or `node-cron` for managing RSS syncs, availability checks, and torrent monitoring.
- **Communication:** Internal API/WebSockets between the background service and the Next.js frontend.

**Data & Storage:**
- **Database:** SQLite (Standard for *arr apps for portability and simplicity).
- **ORM:** Prisma or Drizzle ORM for type-safe database access.
- **Storage Architecture:**
    - **Config Volume (`/config`):** Persistent storage for the SQLite database (`mediarr.db`) and application configuration.
    - **Data Volume (`/data`):** Unified storage for media and downloads to enable Atomic Moves and Hard Linking.
        - `/data/downloads/incomplete`: Temporary storage for active downloads.
        - `/data/downloads/complete`: Storage for finished downloads awaiting import.
        - `/data/media/tv`: Final destination for organized TV series.
        - `/data/media/movies`: Final destination for organized movies.

**Deployment:**
- **Containerization:** Docker & Docker Compose (Targeting Home Lab environments).

# Mediarr Technology Stack

> Last reconciled: 2026-03-14

**Frontend & API:**
- **Framework:** React SPA (Single Page Application) built with Vite. No SSR, no Next.js.
- **Routing:** React Router (client-side routing).
- **Language:** TypeScript (strict mode).
- **Styling:** Tailwind CSS v4 with a "Modern Dark" design token system (CSS custom properties in `index.css`).
- **Component Library:** shadcn/ui — Radix UI headless primitives styled with Tailwind. Components are copied into `app/src/components/ui/` and owned by the project. The existing design token CSS variables (`--surface-*`, `--accent-*`, `--text-*`, `--status-*`, `--border-subtle`) are bridged to shadcn's expected variables (`--background`, `--primary`, etc.) in `index.css`. shadcn/ui is the canonical source for: Button, Dialog (Modal), Input, Select, Checkbox, Switch, Form (with react-hook-form), Table, DropdownMenu, Tooltip, Badge, Progress, Separator.
- **State Management:** TanStack Query (React Query) for server-state; local React state for UI ephemera.
- **Forms:** react-hook-form + zod, wired through shadcn/ui's `<Form>` component. All settings pages and modals use this pattern — manual `useState` form patterns are deprecated.
- **Drag and Drop:** `@dnd-kit/core` + `@dnd-kit/sortable`. Replaces the abandoned `react-dnd`. Used for quality profile item ordering.
- **Virtualization:** `@tanstack/react-virtual`. The only virtualization library; `react-window` is removed.
- **Class Utility:** `cn()` helper in `app/src/lib/cn.ts` (wraps `clsx` + `tailwind-merge`). Used for all conditional class merging — raw string interpolation is deprecated.

> **Removed:** `react-dnd`, `react-dnd-html5-backend`, `react-window`. No `'use client'` directives (meaningless in Vite SPA).

**Backend & Background Services:**
- **Runtime:** Bun — single long-lived process hosting all domain services, the torrent engine, and the task scheduler. Development uses `bun --watch src/main.ts` (not `tsx watch`). This singleton process model is required because WebTorrent, the scheduler, and in-memory torrent state must persist.
- **HTTP Framework:** Fastify for the dedicated backend API server.
- **Real-Time Transport:** Server-Sent Events (SSE) for push updates from backend to frontend (queue progress, activity events, health alerts).
- **Torrent Engine:** WebTorrent (integrated, no external client needed).
- **Metadata Engine:** Integrated SkyHook proxy for TVDB/TMDB data acquisition.
- **Task Scheduling:** `node-cron` for managing RSS syncs, availability checks, and torrent monitoring.
- **Communication:** React frontend fetches from the Fastify backend API over HTTP. In development, Vite proxies `/api` calls to the Bun backend. In production, the Bun backend serves the Vite static build directly.

**Data & Storage:**
- **Database:** SQLite (standard for *arr apps — portability and simplicity).
- **ORM:** Drizzle ORM with `bun:sqlite` driver. Replaces Prisma — Drizzle has first-class Bun compatibility, no binary engine, and typed queries without a generation step at runtime. Schema defined in `server/src/db/schema.ts`. Migrations managed with `drizzle-kit`.
- **Migration Strategy:** Drizzle Kit `generate` + `migrate` — all migrations are additive-only in production.
- **Storage Architecture:**
    - **Config Volume (`/config`):** Persistent storage for the SQLite database (`mediarr.db`) and application configuration.
    - **Data Volume (`/data`):** Unified storage for media and downloads to enable Atomic Moves and Hard Linking.
        - `/data/downloads/incomplete`: Temporary storage for active downloads.
        - `/data/downloads/complete`: Storage for finished downloads awaiting import.
        - `/data/media/tv`: Final destination for organized TV series.
        - `/data/media/movies`: Final destination for organized movies.

> **Removed:** Prisma, `@prisma/client`. No `prisma generate` step required.

**Testing:**
- **Framework:** Vitest v4 (app workspace), `@testing-library/react` + `@testing-library/jest-dom` for component and integration tests.
- **Environment:** `jsdom` for the app workspace; `node` for the server workspace.
- **Mocking:** `vi.hoisted()` for module-level mock factories; MSW (Mock Service Worker) available for network-level mocking where needed.
- **Integration test pattern:** `<MemoryRouter>` wrapping `<App>` with all API clients mocked via `vi.mock('@/lib/api/client', ...)`. Test files colocated with source (`*.test.tsx` / `*.test.ts`).
- **Coverage targets:** ≥80% for new/changed code in each track. CI runs with `CI=true` to prevent watch mode.
- **Key integration test suites:** `library-routes.test.tsx`, `settings-routes.test.tsx`, `App.test.tsx`; component-level suites for interactive search modals, view components, and settings forms.

**Clients (New):**
- **Android TV App:** Native Kotlin application built with Jetpack Compose for TV (`androidx.tv.material3`), ExoPlayer (`androidx.media3`) for 4K/HDR hardware-accelerated playback, and Coil for image loading. Connects to the fastify backend via OkHttp, utilizing mDNS for automatic server discovery on the local network.

**Deployment:**
- **Single Process:** The frontend is built into static files (`dist/`) and served directly by the Fastify backend. The user only needs to execute the single Bun backend script.
- **Containerization:** Docker & Docker Compose (targeting home-lab environments).
- **Authentication:** None. This is an intentional product decision for trusted household LAN use.
- **Security Scope (2026-03-05):** Additional hardening work (auth, network boundary controls, and broad security retrofits) is out of scope for the current project phase.
- **Dependency Updates:** Vulnerability-related package upgrades are optional maintenance ("nice to have"), not a release blocker for the current scope.

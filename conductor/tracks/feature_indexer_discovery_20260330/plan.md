# Implementation Plan: Indexer Auto-Discovery

## Phase 1 — Curated Catalog & One-Click Add

- [x] Task: Create `server/src/data/popular-indexers.json` — top 15 indexers with name, type, baseUrl, categories, requiresApiKey, signupUrl, description; include public (1337x, RuTracker), semi-private (NZBgeek, Drunkenslug), private (broadcasTheNet, HDBits)
- [x] Task: Add `GET /api/indexers/catalog` endpoint — returns the curated catalog with `isConfigured: true/false` flag per entry (checks if matching indexer already exists)
- [x] Task: Add `POST /api/indexers/catalog/:id/add` — creates an indexer from the catalog entry, using default field values; accepts optional `apiKey` body parameter
- [x] Task: Write tests for catalog endpoints — returns catalog, marks configured entries, one-click add creates correct indexer
- [x] Task: Conductor - Checkpoint Phase 1

## Phase 2 — SPA: Catalog UI

- [x] Task: Refactor `AddIndexerModal.tsx` (or create new `IndexerCatalogPanel`) — show catalog as card grid grouped by type (Public / Semi-Private / Private); each card shows name, description, requiresApiKey badge, signup link
- [x] Task: Implement one-click "Add" button for public indexers — calls `POST /api/indexers/catalog/:id/add`, shows success toast, refreshes indexer list
- [x] Task: Implement API key flow for private indexers — inline key input, "Add" button calls catalog add with key
- [x] Task: Write tests for catalog panel — renders groups, one-click add calls API, API key input renders when required
- [x] Task: Conductor - Checkpoint Phase 2

## Phase 3 — LAN Prowlarr/Jackett Detection

- [x] Task: Create `server/src/services/discovery/IndexerServiceDiscovery.ts` — probe common ports (9696 Prowlarr, 9117 Jackett) on the LAN subnet via HTTP GET with 2s timeout; returns detected services with URL and type
- [x] Task: Add `GET /api/indexers/detect` endpoint — runs detection scan and returns found services
- [x] Task: Add `POST /api/indexers/import-from/:type` — fetches indexer list from detected Prowlarr/Jackett API, maps to Mediarr indexer schema, creates them
- [x] Task: Write tests for `IndexerServiceDiscovery` — mock HTTP probes, Prowlarr detected, Jackett detected, nothing detected, timeout
- [ ] Task: Conductor - Checkpoint Phase 3

## Phase 4 — SPA: Detection Banner

- [ ] Task: Add detection check to SPA settings indexers page — call `GET /api/indexers/detect` on mount (or after setup wizard completion)
- [ ] Task: Show banner when Prowlarr/Jackett detected: "Prowlarr detected at <url> — Import <N> indexers?" with "Import" button
- [ ] Task: Import button calls `POST /api/indexers/import-from/prowlarr`, shows progress, refreshes list on completion
- [ ] Task: Write tests for detection banner — renders when service detected, hidden when none, import button calls API
- [ ] Task: Run `cd app && npm run build` — zero TS errors
- [ ] Task: Run `CI=true npm test` — all tests pass
- [ ] Task: Run `CI=true bun test` — all server tests pass
- [ ] Task: Conductor - Checkpoint Phase 4

# Frontend Parity Findings (Opus 4.6 Independent Evaluation)

> Evaluator: Claude Opus 4.6
> Date: 2026-02-12
> Repository state: master branch, commit b36dc341

## Methodology

Static analysis of all Next.js App Router pages, components, API client layer, and MSW handlers. Findings are based on reading actual source code with file paths and line numbers.

---

## Surface-by-Surface Classification

### 1. Dashboard (`/`)
**File:** `app/src/app/(shell)/page.tsx`

**Functional Status:** PARTIALLY FUNCTIONAL

**What works:**
- Fetches real data from `torrentApi.list()` and `healthApi.get()`
- Displays 4 metric cards (queue count, downloading, seeding, indexer health)
- Proper loading/error/empty states via QueryPanel

**What's missing vs Sonarr/Radarr dashboards:**
- No calendar view of upcoming episodes/movies
- No recent activity feed
- No disk space metrics
- No media count summaries (total series/movies/episodes)
- No health warnings (missing root folders, indexer errors, etc.)
- Comment at line 32-33 acknowledges "7E dashboard enhancements pending"

**Severity:** P2 (functional but minimal)

---

### 2. Indexers (`/indexers`)
**File:** `app/src/app/(shell)/indexers/page.tsx`

**Functional Status:** PARTIALLY FUNCTIONAL

**What works:**
- Full CRUD: list, create, edit, delete indexers
- Protocol-specific form fields (torrent: URL + API key; usenet: host + API key)
- Enable/disable toggle with optimistic mutations
- Priority adjustment with inline editing
- Test connectivity with diagnostic display
- Health status badges per row

**What's missing vs Prowlarr:**
- No dynamic config fields from Cardigann definitions (hardcoded form)
- No definition browser/picker (users can't see available indexer definitions)
- No capability display (search types, categories)
- No indexer stats (query count, grab count, failure rate)
- No bulk operations (enable/disable all, test all)
- Protocol selector limited to torrent/usenet — no Cardigann-specific UI

**Severity:** P1 (core add/edit flow works but lacks definition-driven UI)

---

### 3. Add Media (`/add`)
**File:** `app/src/app/(shell)/add/page.tsx`

**Functional Status:** MOSTLY FUNCTIONAL

**What works:**
- Metadata search with debounced input (300ms)
- Media type toggle (Movies/Series)
- Search results displayed in card grid
- Duplicate detection via tmdbId/tvdbId comparison and 409 CONFLICT response
- Quality profile selector (hardcoded: HD-1080p, UltraHD)
- Monitored and search-on-add checkboxes
- Conflict dialog with link to existing media

**What's missing:**
- Quality profiles are hardcoded (not fetched from API)
- "Add anyway" button in conflict dialog is non-functional (line 226-230)
- No poster/banner images in search results
- No root folder selection
- Movie search degrades silently when TMDB key is missing (backend issue surfaces here)

**Severity:** P1 (backend TMDB key issue makes movie search unreliable)

---

### 4. Library — Series (`/library/series`)
**File:** `app/src/app/(shell)/library/series/page.tsx`

**Functional Status:** FULLY FUNCTIONAL

**What works:**
- Paginated table (25 per page)
- Search filtering
- Sortable columns (title, year, status)
- Monitored toggle with optimistic mutation
- File status badges (missing/wanted/completed)
- Delete with confirmation
- Links to detail pages

**Severity:** P3 (minor polish: no poster thumbnails, no bulk select)

---

### 5. Library — Series Detail (`/library/series/[id]`)
**File:** `app/src/app/(shell)/library/series/[id]/page.tsx`

**Functional Status:** PARTIALLY FUNCTIONAL

**What works:**
- Season/episode breakdown with expandable details
- Episode file path display
- File status badges

**What's missing:**
- Episode monitored state is LOCAL ONLY (line 96-98: "Per-episode persistence API is planned in a follow-up")
- No episode search/grab from detail view
- No season pack search
- No manual import
- No rename/organize

**Severity:** P1 (episode monitoring is a core Sonarr feature)

---

### 6. Library — Movies (`/library/movies`)
**File:** `app/src/app/(shell)/library/movies/page.tsx`

**Functional Status:** FULLY FUNCTIONAL

Same pattern as series library. Full CRUD with pagination, search, sort, monitored toggle.

**Severity:** P3 (minor polish)

---

### 7. Library — Movie Detail (`/library/movies/[id]`)
**File:** `app/src/app/(shell)/library/movies/[id]/page.tsx`

**Functional Status:** FULLY FUNCTIONAL

**What works:**
- Metadata display
- "Search Releases" button calls `releaseApi.searchCandidates()` (though backend search is broken)
- Delete with confirmation
- File variant display

**Severity:** P2 (functional but release search is broken due to backend)

---

### 8. Wanted (`/wanted`)
**File:** `app/src/app/(shell)/wanted/page.tsx`

**Functional Status:** MOSTLY FUNCTIONAL

**What works:**
- Unified wanted list (movies + episodes)
- Type filter buttons (all/movie/episode)
- Per-item release search
- Release candidate display with sort (seeders/size/age)
- Grab button with queue handoff and navigation
- Toast notifications for success/error

**What's broken:**
- Release search returns empty results at runtime (backend `indexer.search()` method missing)
- Dependent on definition wiring (P0 backend issue)

**Severity:** P1 (UI is well-built but unusable due to backend gaps)

---

### 9. Queue (`/queue`)
**File:** `app/src/app/(shell)/queue/page.tsx`

**Functional Status:** SCAFFOLD ONLY

**What works:**
- Lists torrents with name, status badge, progress bar
- Pagination

**What's missing:**
- No pause/resume/remove buttons (backend endpoints exist but UI doesn't expose them)
- No speed limit controls
- No priority adjustment
- No file management
- Line 61: "Live torrent queue updates (full controls in Track 7D)"

**Severity:** P1 (read-only queue is not operationally useful)

---

### 10. Activity (`/activity`)
**File:** `app/src/app/(shell)/activity/page.tsx`

**Functional Status:** PARTIALLY FUNCTIONAL

**What works:**
- Paginated activity log
- Shows event type, source module, summary, relative dates

**What's missing:**
- No filtering by event type, source module, or date range (API supports these)
- No detail drill-down
- No status/success filtering
- Line 39: "expanded insights in Track 7E"

**Severity:** P2 (basic logging works but lacks operator tools)

---

### 11. Settings (`/settings`)
**File:** `app/src/app/(shell)/settings/page.tsx`

**Functional Status:** SCAFFOLD ONLY

**What exists:**
- Reads torrent monitoring interval from API
- Save button exists

**What's broken:**
- Save button always sends the same hardcoded payload (`pathVisibility` flags)
- No form inputs for any actual settings
- No quality profile management
- No download client configuration
- No general settings (naming, root folders, etc.)
- Line 43: "Settings surface is expanded in Track 7E"

**Severity:** P1 (settings page is non-functional as a settings editor)

---

### 12. Subtitles (`/subtitles`)
**File:** `app/src/app/(shell)/subtitles/page.tsx`

**Functional Status:** PLACEHOLDER ONLY

17 lines of code. Shows EmptyPanel with message: "Subtitle operations are staged — Track 7D adds live variant inventory, manual search, and download controls."

No API calls, no state, no interactivity.

**Severity:** P1 (entire Bazarr parity surface missing)

---

## API Client Layer Assessment

**Architecture:** Well-designed. `ApiHttpClient` with Zod response validation, typed domain APIs, centralized query keys, proper error classes.

**Strengths:**
- Zod schemas enforce response contracts
- `ApiClientError` and `ContractViolationError` provide structured error handling
- `useOptimisticMutation` provides good UX for toggle operations
- Centralized `routeMap.ts` keeps endpoint definitions consistent

**Weaknesses:**
- No request body validation before sending
- Zod schemas use `.passthrough()` allowing unexpected fields
- No request/response interceptors for auth, logging, or retry

---

## MSW Layer Assessment

MSW handlers in `app/src/lib/msw/handlers.ts` provide 34 handlers covering all API endpoints. Data is stateful (mutations persist in-memory), which is good for development but:
- Some handlers are shallow (pause/resume don't change state meaningfully)
- Subtitle handlers return hardcoded single results
- Release search always returns exactly 2 hardcoded results
- No simulation of error states or edge cases
- Conditionally enabled via `NEXT_PUBLIC_USE_MSW=true` (correctly isolated)

---

## Cross-Cutting Issues

1. **Track reference leakage:** Multiple pages contain user-visible text like "Track 7D", "Track 7E" which are internal project references, not user-facing messages.

2. **Backend dependency:** Several frontend surfaces appear functional in MSW mode but fail at runtime due to backend gaps (definition loading, TMDB key, search method missing).

3. **Control asymmetry:** Backend supports pause/resume/delete/speed-limits for torrents, but the queue UI only displays status. Settings API supports many fields but the UI only saves hardcoded values.

---

## Summary Table

| Surface | Status | Severity |
|---|---|---|
| Dashboard | PARTIALLY_FUNCTIONAL | P2 |
| Indexers | PARTIALLY_FUNCTIONAL | P1 |
| Add Media | PARTIALLY_FUNCTIONAL | P1 |
| Library — Series | FULLY_FUNCTIONAL | P3 |
| Series Detail | PARTIALLY_FUNCTIONAL | P1 |
| Library — Movies | FULLY_FUNCTIONAL | P3 |
| Movie Detail | FULLY_FUNCTIONAL | P2 |
| Wanted | PARTIALLY_FUNCTIONAL (backend-blocked) | P1 |
| Queue | SCAFFOLD_ONLY | P1 |
| Activity | PARTIALLY_FUNCTIONAL | P2 |
| Settings | SCAFFOLD_ONLY | P1 |
| Subtitles | PLACEHOLDER_ONLY | P1 |

**Fully functional:** 3 surfaces
**Partially functional:** 6 surfaces
**Scaffold only:** 2 surfaces
**Placeholder only:** 1 surface

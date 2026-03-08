# Specification: Subtitle Code Deduplication & Performance Refactor

## Overview
The security audit (March 5, 2026) identified multiple instances of duplicated code across subtitle providers and the frontend UI, along with sequential async loops that should use `Promise.all`. This track addresses the highest-impact code quality findings from that audit.

## Problem
1. **Provider utilities duplicated 3×** — `deriveReleaseName`, `extractExtension`, and `readNumericProviderData` are copied verbatim into `AssrtProvider`, `OpenSubtitlesProvider`, and `SubdlProvider`.
2. **`ALLOWED_UPLOAD_EXTENSIONS` defined twice** — identical `Set` in `subtitleRoutes.ts` and `SubtitleInventoryApiService.ts`.
3. **Subtitle UI helpers duplicated** — `subtitleStatusLabel` and subtitle coverage logic exist in both `App.tsx` and `MovieOverviewView.tsx` with different names but identical semantics.
4. **Raw string provider IDs** — `'opensubtitles'`, `'assrt'`, `'subdl'`, `'embedded'` are scattered throughout with no shared constant or type.
5. **Sequential async loops** — `SubtitleInventoryApiService.mapVariantInventory` uses `for...await` over independent operations instead of `Promise.all`.

## Scope

### Phase 1: Server-side Provider Utilities
- Extract `deriveReleaseName`, `extractExtension`, and `readNumericProviderData` to `server/src/services/providers/providerUtils.ts`.
- Export `ALLOWED_SUBTITLE_EXTENSIONS` from `providerUtils.ts` and import it in both `subtitleRoutes.ts` and `SubtitleInventoryApiService.ts`.
- Export `PROVIDER_IDS` constant and `ProviderId` type from `providerUtils.ts`.
- Update all three providers to use these shared utilities.

### Phase 2: Frontend Subtitle Coverage Utilities
- Create `app/src/lib/subtitles/coverage.ts` exporting:
  - `SubtitleCoverageStatus` type (single canonical definition).
  - `summarizeSubtitleCoverage(available, missing)` function.
  - `subtitleStatusLabel(status)` function.
- Remove the duplicate definitions from `App.tsx` and `MovieOverviewView.tsx`.

### Phase 3: Performance — Parallel Async Loops
- Replace the `for...await` loop in `SubtitleInventoryApiService.mapVariantInventory` with `Promise.all`.

## Out of Scope
- Full subtitle provider type safety (settings `apiKeys` type widening is a larger change).
- UI state restructuring (`useMemo` for derived state — Q1 from audit).
- Route-level `prisma as any` cleanup (requires repository layer changes).

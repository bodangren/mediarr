# Backend Parity Findings (Gemini)

**Date:** 2026-02-12
**Executor:** Gemini Agent

## Summary
Runtime verification confirms critical regressions in Prowlarr and Radarr parity paths.

## Critical Findings (P0)

### 1. Indexer Definition Loading (Prowlarr)
**Status:** REGRESSION
**Evidence:** `server/src/main.ts` initializes `IndexerFactory` with an empty array `[]`.
**Impact:** No Cardigann indexers can be created or used at runtime, rendering the indexer management feature effectively broken for scraping indexers.
**Remediation:** `main.ts` must use `DefinitionLoader` to load definitions from disk and pass them to `IndexerFactory`.

### 2. Movie Metadata API Key (Radarr)
**Status:** MISSING
**Evidence:** `MetadataProvider` defaults to `demo` key.
**Impact:** Users cannot configure their own TMDB API key, likely hitting rate limits or demo restrictions quickly.
**Remediation:** Expose API key configuration via Settings API and inject it into `MetadataProvider`.

## Major Findings (P1)

### 1. Indexer Contract Schema
**Status:** PARTIAL_IMPLEMENTATION
**Evidence:** `POST /api/indexers` schema requires `settings` to be a `string`.
**Impact:** API clients sending JSON objects for settings (standard behavior) will fail validation.
**Remediation:** Update route schema to allow `object` type for `settings` or handle serialization transparently.

# Remediation Roadmap (Opus 4.6 Independent Evaluation)

> Evaluator: Claude Opus 4.6
> Date: 2026-02-12
> Repository state: master branch, commit b36dc341

---

## Severity Distribution

| Severity | Count | Description |
|---|---|---|
| P0 | 3 | Blocks core clone workflow — system cannot function |
| P1 | 6 | Major operator impairment — features exist but don't work |
| P2 | 4 | Important but non-blocking — degraded experience |
| P3 | 2 | Polish/consistency debt |

---

## Gap Register

| ID | Finding | Domain | Status | Severity | Confidence |
|---|---|---|---|---|---|
| OPUS-001 | Definition array empty at boot | Prowlarr | REGRESSION | P0 | high |
| OPUS-002 | TMDB key falls back to 'demo' silently | Radarr | MISSING | P0 | high |
| OPUS-003 | indexer.search() method does not exist | Core | SCAFFOLDED_ONLY | P0 | high |
| OPUS-004 | No dynamic indexer config fields | Prowlarr | MISSING | P1 | high |
| OPUS-005 | Subtitle provider is a stub | Bazarr | SCAFFOLDED_ONLY | P1 | high |
| OPUS-006 | No background scheduler wired | Core | SCAFFOLDED_ONLY | P1 | high |
| OPUS-007 | Queue UI has no controls | Core | SCAFFOLD_ONLY | P1 | high |
| OPUS-008 | Settings UI is non-functional | Core | SCAFFOLD_ONLY | P1 | high |
| OPUS-009 | Episode monitoring not persisted | Sonarr | PARTIAL | P1 | high |
| OPUS-010 | Dashboard minimal vs clone targets | Core | PARTIAL | P2 | high |
| OPUS-011 | Activity has no filters | Core | PARTIAL | P2 | medium |
| OPUS-012 | TV search lacks resilience | Sonarr | PARTIAL | P2 | medium |
| OPUS-013 | WebTorrent may silently fallback to stub | Core | PARTIAL | P2 | medium |
| OPUS-014 | Series library needs poster thumbnails | Sonarr | PARTIAL | P3 | low |
| OPUS-015 | Movies library needs poster thumbnails | Radarr | PARTIAL | P3 | low |

---

## Remediation Backlog (Execution Order)

### RMD-001: Wire Definition Loader at Boot (P0)
**Blocks:** OPUS-001, OPUS-003, OPUS-004

**Changes required:**
1. In `server/src/main.ts`, before line 204:
   ```typescript
   const definitionLoader = new DefinitionLoader();
   const definitions = await definitionLoader.loadFromDirectory(
     process.env.DEFINITIONS_DIR ?? path.join(__dirname, '../definitions')
   );
   const indexerFactory = new IndexerFactory(definitions);
   ```
2. Add definitions directory with YAML files (or download from Prowlarr source)
3. Add error handling for missing/corrupt definition files
4. Log loaded definition count at startup

**Verification criteria:**
- `indexerFactory.availableDefinitions.length > 0` at runtime
- Cardigann indexer creation does not throw "Definition not found"
- Release search returns results when an enabled Cardigann indexer exists

**Dependencies:** None
**Estimated effort:** Small (wiring change + definition files)

---

### RMD-002: Implement indexer.search() Method (P0)
**Blocks:** OPUS-003

**Changes required:**
1. Add `search(query: SearchQuery): Promise<SearchResult[]>` to `BaseIndexer` as abstract method
2. Implement in `TorznabIndexer`:
   - Build search URL via `buildSearchUrl(query)`
   - Make HTTP request via `HttpClient`
   - Parse response via `TorznabParser`
   - Return structured results
3. Implement in `ScrapingIndexer`:
   - Build search URL from definition paths
   - Make HTTP request
   - Parse HTML via `ScrapingParser`
   - Return structured results

**Verification criteria:**
- `MediaSearchService.getSearchCandidates()` returns real results
- Wanted page search shows indexer results
- No more silent empty results from catch block

**Dependencies:** RMD-001 (for Cardigann definitions)
**Estimated effort:** Medium (new method implementation)

---

### RMD-003: Harden TMDB Key Management (P0)
**Blocks:** OPUS-002

**Changes required:**
1. In `MetadataProvider`, remove `'demo'` fallback (line 182)
2. Throw explicit error when TMDB key is missing:
   ```typescript
   if (!this.tmdbApiKey) {
     throw new Error('TMDB_API_KEY is required for movie search. Set it in environment or settings.');
   }
   ```
3. Add key validation at boot time with clear log message
4. Add settings UI for TMDB API key entry
5. Store key in AppSettings table

**Verification criteria:**
- Movie search fails with clear, actionable error when key is missing
- Movie search works correctly with valid key
- Settings UI allows entering/updating the key

**Dependencies:** None
**Estimated effort:** Small-Medium

---

### RMD-004: Wire Background Scheduler (P1)
**Blocks:** OPUS-006

**Changes required:**
1. In `main.ts`, after service initialization:
   - Instantiate Scheduler with cron intervals from settings
   - Register RSS sync service for periodic execution
   - Register torrent manager sync loop
   - Register availability check service
2. Ensure scheduler respects settings changes
3. Add health endpoint reporting scheduler status

**Verification criteria:**
- RSS sync runs on configured interval
- Torrent status updates periodically
- Scheduler status visible in health endpoint

**Dependencies:** RMD-001, RMD-002 (RSS sync needs working indexer search)
**Estimated effort:** Medium

---

### RMD-005: Implement Queue Controls UI (P1)
**Blocks:** OPUS-007

**Changes required:**
1. Add row actions to queue DataTable: Pause, Resume, Remove
2. Wire to existing backend endpoints (`PATCH /api/torrents/:hash/pause`, etc.)
3. Add speed limit controls
4. Add priority adjustment
5. Implement real-time progress updates via SSE

**Verification criteria:**
- Pause/resume/remove buttons appear and function
- Speed limits can be set from UI
- Queue updates without manual refresh

**Dependencies:** None (backend endpoints already exist)
**Estimated effort:** Small-Medium

---

### RMD-006: Implement Real Subtitle Provider (P1)
**Blocks:** OPUS-005

**Changes required:**
1. Replace stub provider in `main.ts:213-220` with real OpenSubtitles integration
2. Implement subtitle search with language, type (forced/HI), and media matching
3. Implement subtitle download with file placement and naming
4. Wire variant tracking to download results
5. Build subtitles UI page with variant inventory, manual search, download, and history

**Verification criteria:**
- Subtitle search returns real results from provider
- Downloaded subtitles are saved to correct paths
- History records are created
- UI shows variant inventory with search/download controls

**Dependencies:** RMD-004 (scheduler for automatic subtitle checking)
**Estimated effort:** Large

---

### RMD-007: Build Real Settings UI (P1)
**Blocks:** OPUS-008

**Changes required:**
1. Build settings form with sections: General, Quality Profiles, Download Client, Indexers, Subtitles
2. Read all settings from `GET /api/settings`
3. Submit real form values via `PATCH /api/settings`
4. Remove hardcoded save payload
5. Add TMDB API key configuration field

**Verification criteria:**
- All settings can be viewed and modified
- Changes persist across page reloads
- Validation errors displayed for invalid values

**Dependencies:** RMD-003 (TMDB key management)
**Estimated effort:** Medium

---

### RMD-008: Persist Episode Monitoring State (P1)
**Blocks:** OPUS-009

**Changes required:**
1. Add `PATCH /api/episodes/:id/monitored` endpoint
2. Wire frontend toggle to real API call
3. Remove local-only state management for episode monitoring

**Verification criteria:**
- Episode monitored state persists after page refresh
- Wanted list reflects episode monitoring changes

**Dependencies:** None
**Estimated effort:** Small

---

## Execution Order

```
Phase 1 (P0 - Unblocks everything):
  RMD-001 → RMD-002 → RMD-003  (sequential, each builds on prior)

Phase 2 (P1 - Core functionality):
  RMD-004  (scheduler, depends on Phase 1)
  RMD-005  (queue UI, independent)
  RMD-007  (settings UI, depends on RMD-003)
  RMD-008  (episode monitoring, independent)

Phase 3 (P1 - Complex features):
  RMD-006  (subtitles, depends on RMD-004)

Phase 4 (P2/P3 - Polish):
  Dashboard enhancements
  Activity filters
  TV search resilience
  Library polish
```

---

## Hardening Gate Policy

### GATE-PARITY-CRITICAL
Track 7F (hardening) MUST NOT be marked complete until:
- RMD-001 through RMD-003 are verified (all P0 items resolved)
- RMD-004 through RMD-008 are verified (all P1 items resolved)
- At least one non-mocked integration test exists for each critical workflow

### GATE-CLAIM-PARITY
No capability may be promoted to `PARITY_IMPLEMENTED` unless:
- It has at least one non-mocked test proving runtime correctness
- The backend handler, service, and repository layers all function with real data
- The frontend surface exercises real API calls (not just MSW)

---

## Comparison with Previous Evaluation's Remediation

| Previous RMB | This RMD | Key Difference |
|---|---|---|
| RMB-001 (definition wiring) | RMD-001 | Same finding, same fix |
| RMB-002 (metadata hardening) | RMD-003 | Same finding. I also identified the 'demo' fallback specifically |
| RMB-003 (indexer contract) | Subsumed by RMD-001 + RMD-002 | Previous eval missed that `search()` method is entirely absent |
| RMB-004 (release lifecycle) | RMD-002 + RMD-004 | I separated the search method fix from the scheduler wiring |
| RMB-005 (subtitle console) | RMD-006 | Same scope |
| — | RMD-005 (queue UI) | Previous eval noted as gap but didn't include in backlog |
| — | RMD-007 (settings UI) | Previous eval noted as gap but didn't include in backlog |
| — | RMD-008 (episode monitoring) | Not in previous backlog |

**Key disagreement:** The previous evaluation identified 5 remediation items. This evaluation identifies 8, because the previous eval bundled frontend gaps with backend gaps and missed the `search()` method absence as a distinct P0 issue.

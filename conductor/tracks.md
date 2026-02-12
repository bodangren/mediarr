# Project Tracks

This file tracks all major tracks for the project. Each track has its own detailed plan in its respective folder.

---

## Execution Order and Dependencies

**Primary sequence:** `7D -> 7E -> 7F -> 8`
**Cross-cutting audit gate:** `9` (run in parallel now; use outputs to gate hardening and parity claims)

### Parallelization Opportunities

While the primary sequence defines hard dependencies, several phases across tracks can overlap to reduce wall-clock time:

- **7C Phase 1** (design tokens, data architecture, MSW fixtures) has **zero backend dependency** — it can start as soon as 7B Phase 1 scaffolds the route map (so MSW handlers match real routes). It could even begin during late 7A if fixture shapes are estimated.
- **7B Phase 1** (API harness, pagination conventions, route scaffolds) can start as soon as **7A Phase 2** completes (serializers and error taxonomy exist).
- **7D** and **7E** are independent of each other — they can run in parallel once 7C is complete. 7D needs the queue/subtitle APIs from 7B; 7E needs the activity/settings/health APIs from 7B. Both need the UI foundations from 7C.
- **7F** depends on all UI being complete (7C + 7D + 7E), so it must be last among the UI tracks.
- **9** is an investigation/governance track that should begin immediately and run in parallel. Its parity findings and remediation backlog should gate claims of completion for 7F and readiness for 8.

### Dependency Graph

```
7A Phase 1-2 (baseline, spike, serializers, errors)
    |
    v
7A Phase 3-5 (torrent stats, subtitle factory, settings, health, activity)
    |                          \
    v                           v
7B Phase 1-4 (API harness,     7C Phase 1 (design tokens, data arch,
  route handlers)                 MSW fixtures — can overlap with 7B)
    |                           |
    v                           v
7B Phase 5-6 (SSE, SDK)        7C Phase 2-4 (shell, indexers, add-media)
    |                           |
    v                           v
    +--- both required ---->  7C Phase 5-6 (library, wanted/release)
                                |
                    +-----------+-----------+
                    |                       |
                    v                       v
              7D (queue +              7E (dashboard +
              subtitles)               activity + settings)
                    |                       |
                    +-----------+-----------+
                                |
                                v
                          7F (E2E hardening)
                                |
                                v
                          8 (DLNA & Streaming)

7C/7D/7E/7F/8 ---------------> 9 (clone parity audit & remediation gate)
```

### Parity Gating Outcomes (Track 9 - 2026-02-12)

- **Hard gate for Track 7F completion:** unresolved Track 9 `P0/P1` parity blockers must be zero before 7F can be marked complete.
- **Current parity-critical blockers:** `prowlarr.indexer.definition-ingestion`, `radarr.metadata.movie-search`, `prowlarr.indexer.contract-shape`, `sonarr.metadata.tv-search`, `core.release.search-grab-side-effects`, `bazarr.variant.subtitle-operations`, `sonarr.series.lifecycle`, `radarr.movie.lifecycle`.
- **Required follow-up execution order before 7F closeout:**
  1. `track9-followup-prowlarr-definition-runtime`
  2. `track9-followup-metadata-provider-hardening`
  3. `track9-followup-indexer-contract-normalization`
  4. `track9-followup-release-lifecycle-stabilization`
  5. `track9-followup-subtitle-variant-console`

---

## Tracks

- [ ] **Track 7D: Queue Console & Subtitle Operations**
  *Description: Deliver torrent queue monitoring with SSE-driven live updates and variant-aware subtitle management UI.*
  *Phases: 2 | Link: [./tracks/ui_operational_hardening_20260211/](./tracks/ui_operational_hardening_20260211/)*

- [ ] **Track 7E: Dashboard, Activity & Settings**
  *Description: Deliver centralized dashboard with live metric cards, health feed, cross-module activity timeline, and persisted settings management.*
  *Phases: 3 | Link: [./tracks/ui_dashboard_settings_20260211/](./tracks/ui_dashboard_settings_20260211/)*

- [ ] **Track 7F: E2E Journeys & Quality Hardening**
  *Description: Playwright desktop/mobile E2E journeys, axe-core accessibility audit, performance budget validation, and final UX consistency pass.*
  *Phases: 3 | Link: [./tracks/ui_e2e_hardening_20260211/](./tracks/ui_e2e_hardening_20260211/)*

- [ ] **Track 8: DLNA & Local Streaming**
  *Description: Implementing the internal media server for local streaming with subtitle support.*

- [~] **Track 9: Clone Parity Gap Investigation & Recovery Plan**
  *Description: Perform an evidence-based parity audit against Prowlarr, Sonarr, Radarr, and Bazarr; classify all gaps; and produce prioritized remediation and gating guidance.*
  *Phases: 5 | Link: [./tracks/clone_parity_gap_investigation_20260212/](./tracks/clone_parity_gap_investigation_20260212/)*

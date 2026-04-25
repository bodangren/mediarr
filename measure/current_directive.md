# Current Strategic Directive

> **STATUS: ACTIVE** — Setup Wizard complete. Next: Phase C Zero-Config Setup tracks.
> **Updated: 2026-04-10**

---

## Directive: Complete Phase C Zero-Config Setup

Track `feature_setup_wizard_20260330` is complete (1672 tests green; SPA build clean). Proceed to next Phase C tracks:

1. `feature_smart_defaults_20260330` — Smart Defaults Engine (Phase C priority)
2. `feature_indexer_discovery_20260330` — Indexer Auto-Discovery

### What Was Completed

| Subsystem | Tests | Bugs Fixed |
|----------|-------|-----------|

---

## Directive: Comprehensive Corner-Case Testing for Core User Workflows ✅ COMPLETE

All priority subsystems have been thoroughly tested with TDD:

| Subsystem | Tests | Bugs Fixed |
|-----------|-------|------------|
| WantedSearchService | 77 | 3 (movie title validation, season grace period, multi-episode regex) |
| ImportManager | 20 | 1 (movie year mismatch fallback) |
| SearchAggregationService | 42 | 1 (AI batch parsing crash) |
| Pipeline Integration | 25 | 0 |
| CustomFormatScoringEngine | 72 | 0 |
| TorrentManager + importGuard | 39 | 1 (seed-limit race condition) |
| RssMediaMonitor + RssSyncService | 32 | 0 |
| LibraryScanService | 34 | 0 |
| Organize Services | 67 | 1 (missing absoluteEpisodeNumber) |
| MediaService & MediaRepository | 56 | 0 |
| SeriesMonitoringService | 39 | 0 |
| MediaSearchService | 19 | 0 |

**Total: ~600+ tests, 7 bugs found and fixed across the automated media acquisition pipeline.**

### Next Directive Needed

The corner-case testing directive is complete. Awaiting new strategic direction.

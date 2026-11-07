# Spec — Subtitle coverage + viewing-priority wanted queue

**Track:** `feature_subtitle_coverage_priority_20261108`
**Opened:** 2026-11-08 · **Status:** ACTIVE (Phase 0 measured on the live server). Owner-raised
2026-11-08: *"You have tools to generate dual language subs, too, don't you? But have you automated
that in order to make sure subs exist for all high-priority videos? Looking at the SPA, I do not see
the wanted list as a high-priority list based on recent viewing habits the way it should be."*

## Context

Ten video domains are not equally interesting. A household watches a handful of shows and a few
movies; the rest of the library is a long tail. Today the app treats the whole library as one
undifferentiated backlog:

- **Subtitle acquisition** — `WantedSubtitle` holds **1,740 rows, every one in `FAILED`**, because no
  subtitle provider is configured. The queue is honest about being idle (Settings → Subtitles says
  so), but there is no notion of which rows matter. When a provider is added, the cycle will walk the
  queue in insertion order, not in the order the household needs it.
- **Bilingual generation** — the pipeline exists (`BilingualSubtitleService` merges an English track
  and a Chinese track into one EN+ZH sidecar, `MiniMaxTranslator`/`XiaomiTranslator`/
  `FallbackTranslator` supply the translation, `bilingual-subs` runs every 2 hours with a **limit of
  3 files per cycle**). Three per two hours is 36/day — order matters enormously, and today the order
  is "whatever the candidate query returns first".
- **Coverage is unmeasured** — nobody can answer "do the shows we actually watch have dual-language
  subtitles?" The DB can: 1,513 external `zho` tracks, 402 embedded `chi`, 1,353 embedded `en`
  exist, but there is no per-item coverage number and no high-priority denominator.
- **The SPA wanted list** is a flat table sorted by whatever the API returns (id order). The owner
  reads it as "everything is equally wanted", which is both true to the code today and wrong for the
  product.

## Goal

Every item the household is actually watching either has dual-language subtitles, or is listed with
an honest, prioritised reason it does not — and both the subtitle fetch queue and the bilingual
generation order work that list top-down.

## Scope

**In:** one shared priority model computed from playback state; subtitle coverage reporting; wanted
APIs ordered and grouped by that model; subtitle fetch + bilingual cycles consuming the order; SPA
wanted page surfacing priority and coverage; the TV client showing the same grouping (read-only).

**Out:** new subtitle providers (owner-gated credentials); ASR-based generation for items with no
English track at all (the `subalign` tool exists but generating from scratch is a separate decision);
changes to the acquisition (`/api/wanted` movie/series) semantics beyond ordering.

## Requirements

- **FR-1 Priority model.** One deterministic classification of every movie/episode with a file:
  1. `continue-watching` — has `PlaybackProgress` and is not finished, most recent first;
  2. `recently-watched` — finished or progressed within the last 14 days;
  3. `recently-added` — added within the last 30 days, no playback;
  4. `backfill` — everything else.
  Ties break by recency (`lastPlayedAt` / `added`), then id, so the order is stable.
- **FR-2 Coverage report.** `GET /api/subtitles/coverage` returns per-bucket totals and the number of
  items with: an external `zho` sidecar, a bilingual sidecar, EN-only, none. The high-priority
  denominator is buckets 1–2.
- **FR-3 Ordered queues.** `GET /api/subtitles/wanted/series|movies` returns items ordered by
  priority bucket with a `priority` field, and accepts a `bucket` filter so the SPA can render groups.
  `GET /api/media/wanted` keeps its shape but sorts by the same model.
- **FR-4 Automation consumes the order.** The subtitle fetch cycle and the bilingual cycle process
  candidates in priority order (bucket then recency), not insertion order. Both keep their existing
  safety bounds (provider guard, per-run cap, in-flight guard, 120 s translation deadline).
- **FR-5 SPA.** The Wanted page renders grouped sections — *Continue watching*, *Watched recently*,
  *New*, *Backfill* — with counts, plus a coverage summary card ("12 of 14 continue-watching items
  have EN+ZH"). No new route.
- **FR-6 Honest gaps.** An item in bucket 1–2 without EN+ZH is never silently omitted: it is listed
  with the reason (`no-provider`, `no-chinese-track`, `bilingual-pending`).
- **FR-7 No regressions.** Existing dynamic-video suites and SPA build stay green; no change to how
  movies/series are listed elsewhere.

## Acceptance criteria

1. With no provider configured, the coverage endpoint reports bucket counts and the SPA shows the
   grouped queues; every bucket-1–2 item appears with its reason.
2. Ordered queues are deterministic and match the priority model on a seeded fixture (continue
   watching beats recently watched beats recently added beats backfill).
3. With a provider simulated in tests, the fetch cycle picks the highest-priority missing item first.
4. With translation simulated in tests, the bilingual cycle processes the highest-priority
   non-bilingual item first.
5. On the live library, bucket 1–2 coverage is reported as a number and the remaining gaps are
   explainable (provider credentials are owner-gated; the report says so).
6. `npm test` server suite green, SPA tests green, `tsc` clean.

## Open decisions

None — the model and bucket boundaries above are the decision. Provider credentials remain
owner-gated and are reported, not worked around.

## Provenance

Live measurements 2026-11-08 07:36 CST: `WantedSubtitle` 1,740 rows / all `FAILED`;
`VariantSubtitleTrack` 1,513 `zho` EXTERNAL, 402 `chi` EMBEDDED, 1,353 `en` EMBEDDED; `bilingual-subs`
schedule `15 */2 * * *` with `limit: 3` (`server/src/serviceContainer.ts:756`); services
`BilingualSubtitleService`, `MiniMaxTranslator`, `XiaomiTranslator`, `FallbackTranslator`; SPA
[`app/src/pages/WantedPage.tsx`](../../../app/src/pages/WantedPage.tsx) loads
`wantedApi.listMissingMovies` without any priority ordering.

# MiMo 2.6 — SPA YouTube Library Review

**Verdict:** Structurally sound archive grid, but hard-truncated titles and near-invisible duration badges make cards hard to scan.

## Problems & fixes

1. **Titles truncate to one line** ("Next.js 15 Tutorial - 36 - Handling G…"), hiding the actual episode topic. **Fix:** 2-line `-webkit-line-clamp: 2` with a shared min-height so cards stay aligned, plus a `title`/hover tooltip with the full string.
2. **Duration badges are tiny and low-contrast**, fading into the dark thumbnails (several read as "0:00"-style specks). **Fix:** solid `rgba(0,0,0,.75)` pill, bottom-right, 12px+ text, 4px/6px padding.
3. **Cards lack context meta and casing drifts**: no channel/date per card, and header "YouTube" vs breadcrumb "Youtube". **Fix:** muted meta line (channel · date) under the title; normalize breadcrumb to "YouTube".

## Priorities

- **P0:** One-line title truncation — apply 2-line clamp + full-title tooltip.
- **P1:** Duration badge contrast/size — solid pill, larger type.
- **P2:** Breadcrumb casing mismatch and missing per-card channel/date meta.

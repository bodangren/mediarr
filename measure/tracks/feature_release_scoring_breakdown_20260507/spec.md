# Release Scoring Breakdown Panel

## Overview

Add a scoring breakdown panel to the interactive search and release detail views that shows exactly how the unified scoring algorithm computed a release's final score. This demystifies the "intelligent, unified scoring" mentioned in the product vision and helps users debug why a particular release was or was not grabbed.

## Problem Statement

The unified scoring algorithm evaluates releases based on custom formats, title confidence, indexer priority, and seeders, but users have no visibility into the computation. When auto-search grabs an unexpected release or skips a preferred one, users cannot determine whether the issue is a custom format, indexer weighting, or low seed count. This opacity makes the scoring engine feel like a black box.

## Solution

Add an expandable "Score Breakdown" section to every release row/card in:
1. Interactive Search modal results
2. RSS discovery preview (if applicable)
3. Release detail view (if one exists)

### Breakdown UI
- Total score displayed prominently
- Section: Custom Formats
  - Each matching format name + its score contribution
  - Non-matching formats listed as "did not match" (collapsible)
- Section: Indexer Priority
  - Indexer name + priority weight
- Section: Title Confidence
  - Match percentage or confidence score
  - Link to parsed title components
- Section: Seeders / Peers
  - Raw seeder count + weight contribution
- Section: Penalties
  - Any negative scores applied (e.g., wrong audio, hardcoded subs)

### Raw Data Toggle
- JSON view of the full scoring context object for power users
- Copy-to-clipboard button

### Backend Enhancement
- Extend the release response DTO to include a `scoringBreakdown` field
- Compute breakdown during scoring without affecting performance

## Acceptance Criteria

- [ ] Every release in interactive search shows a "Score Breakdown" expandable row
- [ ] Breakdown displays custom format contributions with names and scores
- [ ] Indexer priority, title confidence, and seeder contributions are visible
- [ ] Penalties (negative scores) are clearly marked
- [ ] Total score matches the value used for ranking
- [ ] Raw JSON toggle works and copies valid JSON
- [ ] Panel gracefully handles releases scored before this feature (no breakdown = hidden)
- [ ] No measurable performance regression on search result rendering
- [ ] Tests cover breakdown component rendering and score arithmetic
- [ ] TypeScript typecheck passes; build succeeds

## Out of Scope

- Editing scores from the breakdown panel (use Custom Format Editor)
- Historical score tracking over time
- Comparative score charts across multiple releases
- Breakdown in the Flutter client (SPA-only for now)

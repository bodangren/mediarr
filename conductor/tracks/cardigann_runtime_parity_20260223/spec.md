# Spec: Cardigann Runtime Parity (Monolith-Native)

## Overview

Mediarr currently imports Cardigann definitions but executes only a limited subset of Cardigann semantics. This creates silent incompatibilities (templating, filters, path/input handling, row parsing, and category behavior) and makes imported definitions unreliable.

This track delivers a monolith-native Cardigann runtime suitable for Mediarr's Prowlarr-equivalent indexer layer, with test-first conformance gates and explicit compatibility reporting.

## Problem Statement

- Imported definitions are accepted even when unsupported features are present.
- The current parser/translator supports only a subset of Cardigann templates and filters.
- Edit flows can corrupt Cardigann settings when schema resolution falls back incorrectly.
- There is no conformance harness showing parity progress per definition and per feature.

## Functional Requirements

### FR-1: Reference Sync and Provenance
- Add/update `reference/` material for Cardigann behavior and filters used by imported definitions.
- Capture source commit/version provenance in track docs or fixtures metadata.
- Record which imported definition features are in scope for parity.

### FR-2: Test-First Cardigann Conformance Harness
- Build a server-side Cardigann conformance test harness before implementation changes.
- Provide feature-level tests (templating, filters, row extraction, category mapping, URL resolution).
- Provide definition-level fixture tests for currently imported definitions.
- Emit measurable parity progress: pass/fail counts by feature and by definition.

### FR-3: Template Runtime Parity (Required Subset)
- Support template interpolation used in imported definitions:
  - Query fields (`Keywords`, `Season`, `Ep`, `IMDBID`, `TMDBID`)
  - Config values (`.Config.*`)
  - Categories and conditional branches used in paths/fields
- Support conditional template logic required by imported definitions.
- Ensure unresolved templates are detected and surfaced as errors (not silently executed).

### FR-4: Filter Pipeline Parity (Required Subset)
- Implement filters used by imported definitions, including currently missing forms such as:
  - regex extraction variants (`regexp`, `re_replace`)
  - time/date transforms required by fixtures (`timeago`, `fuzzytime`, relevant `dateparse` forms)
  - selector/value shaping required by fixtures (`remove`, `case` mapping)
- Keep filter behavior deterministic and covered by fixture-backed tests.

### FR-5: Search Path/Input/Response Parity
- Support path-level and search-level inputs required by imported definitions.
- Support request headers required by definitions.
- Support response type differences required by fixtures (HTML and JSON extraction flows).
- Preserve path inheritance behavior where definitions rely on it.

### FR-6: Parsing, Categories, and Result Normalization
- Support row-level behaviors required by fixtures (selector derivation, row filtering semantics used by definitions).
- Complete category mapping behavior needed for standard category filtering.
- Keep result normalization consistent (`title`, `guid`, `downloadUrl`, `magnetUrl`, size/date parsing).

### FR-7: Schema Safety and UI Round-Trip
- Ensure Cardigann indexers resolve schema via backend definition lookup.
- Prevent edit/save flows from dropping required Cardigann settings (`definitionId` and required definition fields).
- Validate definition compatibility before runtime usage where feasible.

### FR-8: Compatibility Diagnostics and Operational Safety
- Return actionable diagnostics when a definition uses unsupported features.
- Distinguish hard failures (cannot execute) from degraded behavior (partial support).
- Expose compatibility status in a way usable by API and UI surfaces.

## Non-Functional Requirements

- Test-first workflow for each implementation unit.
- New/changed Cardigann runtime code target >=80% coverage.
- Definition execution should fail fast on unsupported mandatory features.
- No silent fallback that masks unsupported Cardigann semantics.

## Acceptance Criteria

1. A Cardigann conformance harness exists and runs in CI/local test workflow.
2. The harness reports feature and definition parity progress with clear counts.
3. All currently imported indexer definitions required by presets have passing execution-path tests, or are explicitly blocked with actionable diagnostics.
4. Template and filter features used by those definitions behave as expected in fixtures.
5. Search path/input/header/response handling required by those definitions is implemented and covered.
6. Edit/save flow preserves Cardigann configuration fields without data loss.
7. Unsupported definition features are surfaced clearly via API diagnostics.

## Out of Scope

- Full parity for every upstream Cardigann feature not exercised by current Mediarr definitions.
- Building Sonarr/Radarr sync orchestration behavior.
- Replacing Mediarr-native indexer CRUD model with an external service.

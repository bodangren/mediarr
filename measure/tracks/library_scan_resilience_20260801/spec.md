# Specification: Library Scan Resilience

## Overview

Mediarr's live `LibraryScanner` can reject an entire movie or series scan when one nested directory is unreadable. Because traversal currently gathers paths before parsing, a late traversal error can also discard files that were already found in readable directories. This track makes scans fail-soft per directory while preserving explicit diagnostics and preventing unsafe traversal loops.

## Problem

- A single `EACCES` or equivalent filesystem error currently rejects the whole scan.
- Readable media discovered before a later directory failure is not committed as usable partial progress.
- Recursive traversal has no pinned protection against symlink loops or repeated directory visits.
- The defect is production-wired and already characterized in `measure/tech-debt.md`; it is not a speculative cleanup.

## Goals

1. Continue scanning readable directories when an individual directory cannot be accessed.
2. Preserve and report usable results from readable portions of the library.
3. Make traversal terminate safely for symlink loops and repeated directory visits.
4. Emit structured, actionable diagnostics for skipped paths without exposing raw filesystem details to API consumers.
5. Keep existing movie and series import semantics unchanged for fully readable libraries.

## Non-goals

- Rewriting the organizer, parser, importer, or metadata resolution pipeline.
- Implementing incremental library self-healing, rename correction, metadata sidecars, or artwork generation.
- Silently treating malformed media files as valid entries.
- Changing the project's trusted-LAN authentication or deployment model.

## Acceptance Criteria

- [ ] A Red test reproduces an unreadable nested directory and proves readable sibling media still reaches the scan result; the test does not require running the suite as root.
- [ ] A Red test proves a traversal error is isolated to the failing directory, is surfaced through the existing diagnostic/logging seam, and does not become an unhandled scan rejection.
- [ ] Red tests cover symlink loops and repeated directory references; traversal either does not follow symlinks or uses a visited-directory guard with deterministic termination.
- [ ] The implementation makes all focused tests Green while preserving existing behavior for readable movie and series libraries.
- [ ] Partial-scan behavior is documented at the owning service/API boundary, including how skipped paths are represented and when a caller should retry.
- [ ] The focused suite and strict server typecheck pass, and the final verification records the exact commands and results.

## Out of Scope

- Automatic permission repair or changing ownership/mode bits.
- Retrying inaccessible paths indefinitely.
- Background rescan scheduling beyond the existing scanner entry points.

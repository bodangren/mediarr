# Implementation Plan: Track 6 - Subtitle & Audio Engine (Bazarr Layer)

## Phase 1: Bazarr Parity Rules & Domain Contracts
Codify Bazarr-compatible subtitle/audio decision behavior as testable domain rules.

- [x] Task: Write Tests: Add parity tests for language profile rules (`always_include`, `audio_only_include`, `audio_exclude`) and cutoff behavior based on Bazarr-derived fixtures.
- [x] Task: Implement a subtitle requirement rule engine that reproduces Bazarr parity behavior for desired vs existing subtitle states.
- [x] Task: Write Tests: Add multi-variant requirement tests proving decisions are isolated per file variant.
- [x] Task: Implement variant-scoped requirement evaluation contracts used by wanted generation.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Bazarr Parity Rules & Domain Contracts' (Protocol in workflow.md)

## Phase 2: Schema, Migration, and Repository Layer
Introduce first-class entities for file variants and per-track inventory.

- [x] Task: Write Tests: Add Prisma schema tests for file variant, audio track, subtitle track, and wanted subtitle entities with required relations and constraints.
- [x] Task: Implement Prisma schema and migration for variant/audio/subtitle/wanted models.
- [x] Task: Write Tests: Add repository tests for creating, updating, and querying variant records and nested track inventory.
- [x] Task: Implement repository/services for variant and track persistence.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Schema, Migration, and Repository Layer' (Protocol in workflow.md)

## Phase 3: Probe Parsing and Inventory Indexing
Populate variant audio/subtitle inventory from local media files.

- [x] Task: Write Tests: Add parser tests for ffprobe/mediainfo fixtures covering multi-audio tracks, duplicate language tracks, undefined languages, commentary flags, and embedded subtitles.
- [x] Task: Implement probe parser and normalization service for audio/subtitle tracks with cache-aware invalidation and commentary-track tagging.
- [x] Task: Write Tests: Add library scanner tests for detecting multiple file variants under the same movie/episode and refreshing inventory on file changes.
- [x] Task: Implement scanner/indexer integration to upsert variants and associated track inventory.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Probe Parsing and Inventory Indexing' (Protocol in workflow.md)

## Phase 4: Missing Subtitle Computation and Wanted Generation
Generate accurate missing-subtitle state and wanted jobs per variant.

- [x] Task: Write Tests: Add missing-subtitle computation tests for HI/forced logic, cutoff semantics, and audio-aware profile filters per variant.
- [x] Task: Implement missing-subtitle computation service that writes variant-scoped missing state.
- [x] Task: Write Tests: Add wanted queue tests ensuring deduplication by `(variant, language, subtitle type)` while allowing parallel variants of the same media item.
- [x] Task: Implement wanted job generation and state transitions for variant-scoped subtitle jobs.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Missing Subtitle Computation and Wanted Generation' (Protocol in workflow.md)

## Phase 5: Subtitle Fetching, Processing, and History
Fetch and process subtitles with variant-aware audio context.

- [x] Task: Write Tests: Add fetch pipeline tests verifying provider calls and processing context include target variant and relevant audio track metadata.
- [x] Task: Implement variant-aware subtitle fetch/download flow and job worker integration.
- [x] Task: Write Tests: Add subtitle storage/history tests ensuring subtitle artifacts and history records are associated with the correct file variant and remain collision-free across sibling variants.
- [x] Task: Implement subtitle persistence/history integration with deterministic variant-safe subtitle naming.
- [x] Task: Conductor - User Manual Verification 'Phase 5: Subtitle Fetching, Processing, and History' (Protocol in workflow.md)

## Phase 6: API Surface and Manual Operations
Expose variant inventory and allow explicit variant targeting for manual workflows.

- [x] Task: Write Tests: Add API tests for listing variant inventory (audio tracks, subtitle tracks, missing state) for movies and episodes.
- [x] Task: Implement API endpoints/DTOs for variant inventory and backward-compatible summary fields.
- [x] Task: Write Tests: Add manual search/download API tests requiring explicit variant selection when multiple variants exist (and validating rejection when omitted).
- [x] Task: Implement manual subtitle search/download API updates with strict explicit variant selection and variant-aware processing.
- [x] Task: Conductor - User Manual Verification 'Phase 6: API Surface and Manual Operations' (Protocol in workflow.md)

## Phase 7: Backfill, Performance, and End-to-End Validation
Safely migrate existing installs and verify end-to-end behavior.

- [x] Task: Write Tests: Add migration/backfill tests converting existing single-file records into variant-aware records without data loss.
- [x] Task: Implement backfill job and migration utilities for existing media data.
- [x] Task: Write Tests: Add integration tests for multi-variant movie/episode scenarios and single-file multi-audio scenarios.
- [x] Task: Execute quality gates (`CI=true npm test`, coverage, lint/typecheck as configured) and resolve regressions.
- [x] Task: Conductor - User Manual Verification 'Phase 7: Backfill, Performance, and End-to-End Validation' (Protocol in workflow.md)

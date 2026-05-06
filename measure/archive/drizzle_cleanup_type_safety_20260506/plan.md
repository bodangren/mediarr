# Implementation Plan: Drizzle Cleanup & Type Safety

## Phase 1: File Renames & Shim Removal
- [x] Task: Rename and clean db module
  - [x] Write tests to verify Drizzle client exports
  - [x] Rename prismaClient.ts → drizzleClient.ts
  - [x] Update all imports across server workspace
  - [x] Remove $executeRawUnsafe shim entirely

## Phase 2: Type Safety Fixes
- [x] Task: Fix seedSmartDefaults
  - [x] Write tests for seed default values
  - [x] Replace JSON round-trip with explicit typed objects
  - [x] Validate against Drizzle schema types
- [x] Task: Remove as any casts
  - [x] Write type-check tests for affected components
  - [x] Add proper typed interfaces for SeriesDetailPage data
  - [x] Add proper typed interfaces for AddIndexerModal form state

## Phase 3: Verification
- [x] Task: Full test and build verification
  - [x] Run `CI=true npm test` — all green (1802 tests passed)
  - [x] Run app typecheck — zero errors
  - [x] Manual smoke test: series detail and add indexer flows

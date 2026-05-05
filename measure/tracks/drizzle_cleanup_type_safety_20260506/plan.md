# Implementation Plan: Drizzle Cleanup & Type Safety

## Phase 1: File Renames & Shim Removal
- [ ] Task: Rename and clean db module
  - [ ] Write tests to verify Drizzle client exports
  - [ ] Rename prismaClient.ts → drizzleClient.ts
  - [ ] Update all imports across server workspace
  - [ ] Remove $executeRawUnsafe shim entirely

## Phase 2: Type Safety Fixes
- [ ] Task: Fix seedSmartDefaults
  - [ ] Write tests for seed default values
  - [ ] Replace JSON round-trip with explicit typed objects
  - [ ] Validate against Drizzle schema types
- [ ] Task: Remove as any casts
  - [ ] Write type-check tests for affected components
  - [ ] Add proper typed interfaces for SeriesDetailPage data
  - [ ] Add proper typed interfaces for AddIndexerModal form state

## Phase 3: Verification
- [ ] Task: Full test and build verification
  - [ ] Run `CI=true npm test` — all green
  - [ ] Run app typecheck — zero errors
  - [ ] Manual smoke test: series detail and add indexer flows

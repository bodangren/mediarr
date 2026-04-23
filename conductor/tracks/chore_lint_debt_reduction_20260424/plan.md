# Plan: Lint Debt Reduction

## Phase 1: Audit and Triage

- [ ] Task: Categorize all lint errors
    - [ ] Run `npm run lint` and capture full output
    - [ ] Group errors by file and error type
    - [ ] Prioritize: unused-vars first (safe removals), then no-explicit-any

## Phase 2: Fix Unused Variables and Imports

- [ ] Task: Remove dead code
    - [ ] Write test that lint passes after each file fix
    - [ ] Remove unused imports across all affected files
    - [ ] Remove unused variables and function parameters
    - [ ] Verify no runtime breakage via test suite

## Phase 3: Fix Explicit Any Casts

- [ ] Task: Add proper type annotations
    - [ ] Write tests for type-critical functions
    - [ ] Replace `any` types with proper interfaces/types in API response handlers
    - [ ] Replace `any` types in form handlers and component props
    - [ ] Fix SeriesDetailPage `as any` casts with typed API response interface

## Phase 4: Fix Warnings

- [ ] Task: Address remaining 10 warnings
    - [ ] Fix each warning category
    - [ ] Verify zero warnings in lint output

## Phase 5: Verification

- [ ] Task: Full suite validation
    - [ ] Run `npm run lint` — zero errors, zero warnings
    - [ ] Run `npm run test` — all tests pass
    - [ ] Run `npm run build` — clean build

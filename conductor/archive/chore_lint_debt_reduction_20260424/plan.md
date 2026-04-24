# Plan: Lint Debt Reduction

## Phase 1: Audit and Triage

- [x] Task: Categorize all lint errors
    - [x] Run `npm run lint` and capture full output
    - [x] Group errors by file and error type
    - [x] Prioritize: unused-vars first (safe removals), then no-explicit-any
    - [x] Auto-fix 6 trivial errors with eslint --fix

**Audit Results:**
- 185 errors, 13 warnings remaining
- Breakdown: 83 unused-vars, 69 no-explicit-any, 10 exhaustivedeps, 9 setstateineffect, 3 nonnullassertedoptionalchain, 3 reacthooks/refs, 3 incompatiblelibrary, 1 immutability

## Phase 2: Fix Unused Variables and Imports

- [x] Task: Remove dead code
    - [x] Remove unused imports across all affected files
    - [x] Remove unused variables and function parameters
    - [x] Verify no runtime breakage via test suite

## Phase 3: Fix Explicit Any Casts

- [x] Task: Add proper type annotations
    - [x] Replace `any` types with proper interfaces/types in API response handlers
    - [x] Replace `any` types in form handlers and component props
    - [x] Fix SeriesDetailPage `as any` casts with typed API response interface

## Phase 4: Fix Warnings

- [x] Task: Address remaining warnings and errors
    - [x] Fix no-empty-pattern errors (11)
    - [x] Fix no-non-null-asserted-optional-chain errors (3)
    - [x] Fix @next/next/no-img-element errors (4)
    - [x] Fix remaining no-unused-vars errors (4)
    - [x] Fix react-refresh/only-export-components errors (14)
    - [x] Fix react-hooks/set-state-in-effect errors (9)
    - [x] Fix remaining render errors (3)
    - [x] **ACHIEVED: Zero lint errors** (14 react-hooks/exhaustive-deps warnings remain)

## Phase 5: Verification

- [x] Task: Full suite validation
    - [x] Run `npm run lint` — zero errors, 14 warnings (exhaustive-deps)
    - [x] Run `npm run test` — all tests pass (216 test files, 0 failures)
    - [x] Run `npm run build` — clean build
    - [x] Run `npm run typecheck` — zero errors

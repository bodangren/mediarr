# Spec: Lint Debt Reduction

## Overview

The app workspace has 201 lint errors (191 errors, 10 warnings), predominantly `no-explicit-any` and `unused-vars`. This track systematically reduces lint debt to improve code quality and enable stricter CI enforcement.

## Functional Requirements

1. Audit all 201 lint errors and categorize by type and file
2. Fix `unused-vars` errors by removing dead imports and variables
3. Fix `no-explicit-any` errors by adding proper type annotations
4. Fix remaining warnings (10 total)
5. Ensure `CI=true npm run lint` passes with zero errors

## Non-Functional Requirements

- Fixes must not change runtime behavior
- Type annotations must be accurate (not just `as any` workarounds)
- Each file fix must be independently verifiable

## Acceptance Criteria

- [ ] `npm run lint` reports zero errors and zero warnings
- [ ] No `as any` casts introduced as fixes
- [ ] All existing tests pass unchanged
- [ ] Lint config remains unchanged (no rule disabling)

## Out of Scope

- Enabling `exactOptionalPropertyTypes` or `noUncheckedIndexedAccess` (separate track)
- Server workspace lint errors
- New feature code lint compliance

# Spec: Wire SeedingProtector into main.ts runtime

## Problem Statement

`SeedingProtector` was added and fixed in `bug_seeding_protector_grab_corner_cases_20260312`
with a critical import-guard (skips removal when linked episode/movie has `path=null`).
However, the service is **never imported or started** in `main.ts`, making the entire
import-guard a dead code path at runtime.

Additionally, `SeedingProtector.test.ts` carries an unused `activityEvent.create` mock
that was scaffolded during development but removed from the implementation — it adds noise.

## Acceptance Criteria

- [ ] `SeedingProtector` is imported in `main.ts`.
- [ ] It is instantiated with `torrentManager`, `torrentRepository`, and `prisma`.
- [ ] It is started after the torrent manager is initialized.
- [ ] It is stopped as part of the graceful shutdown sequence.
- [ ] The unused `activityEvent.create` mock is removed from `SeedingProtector.test.ts`.
- [ ] All 14 existing `SeedingProtector` tests continue to pass.
- [ ] Production build succeeds.

## Subsystem Scope

- `server/src/main.ts`
- `server/src/services/SeedingProtector.test.ts`

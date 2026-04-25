# Phase 1 Baseline: App Workspace Build and Typecheck

Date: 2026-02-27
Track: `vite_parity_recovery_20260226`

## Commands Executed

1. `npm run build --workspace=app`
2. `npm run typecheck --workspace=app`

Both commands exited with code `1`.

## Build Failure Categories (`npm run build --workspace=app`)

1. Missing matcher typings in tests (`TS2339`)
   - e.g. `toBeInTheDocument`, `toHaveClass`, `toHaveTextContent`
2. Missing test globals/types (`TS2593`, `TS2304`)
   - e.g. `describe`, `it`, `expect` unresolved
3. Unused declarations/imports (`TS6133`, `TS6192`, `TS6196`)
4. Module resolution failures (`TS2307`)
   - e.g. stale import path into removed Next app tree
   - e.g. missing `msw/browser` and `msw/node`
5. Implicit `any` typing issues (`TS7006`, `TS7031`)
6. Type contract mismatches (`TS2322`, `TS2352`)
7. Environment typings missing (`TS2591`)
   - e.g. `process` unresolved in app code paths
8. Vite plugin/version type mismatch (`TS2769`)
   - mixed plugin typing identity across root/app `vite` trees
9. Additional strict-type failures in tests and UI contract checks

## Typecheck Failure Categories (`npm run typecheck --workspace=app`)

1. Missing Vitest/Jest-DOM matcher typings (`TS2339`)
2. Missing test-runner globals/types (`TS2593`, `TS2304`)
3. Unused declarations/imports (`TS6133`, `TS6192`, `TS6196`)
4. Module/type resolution failures (`TS2307`)
5. Missing environment typings (`TS2591`)
6. API/schema shape mismatches (`TS2322`)
7. Implicit `any` typing (`TS7006`, `TS7031`)
8. Toolchain type incompatibility in `vite.config.ts` (`TS2769`)
9. Isolated strict-type mismatches (`TS2322`, `TS2352`)

## Baseline Conclusion

The current app workspace failure profile is broad but clustered around three critical blocker groups required by this track:

- matcher/test typing setup gaps,
- router/module typing mismatches from migration fallout,
- Vite toolchain type identity/version mismatch.

These baselines are now captured and reproducible for Phase 2 remediation.

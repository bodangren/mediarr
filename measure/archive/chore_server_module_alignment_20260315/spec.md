# Spec: Server Package/Module Alignment

## Problem Statement

`server/package.json` declares `"type": "commonjs"` but `server/tsconfig.json` uses
`"module": "nodenext"` + `"verbatimModuleSyntax": true`. The source code uses ESM
`import/export` throughout. This mismatch causes 1,567 TypeScript errors when running
`tsc --noEmit`, making the TypeScript quality gate completely unusable.

The majority of errors (≥1,313) are spurious TS1295/TS1287 "ECMAScript imports not
allowed in CommonJS file" messages that vanish the moment the module type is corrected.
The remaining real errors must be reduced to zero so `tsc --noEmit` can catch genuine
type regressions in the services being tested under the current directive.

## Acceptance Criteria

1. `npx tsc --noEmit -p server/tsconfig.json` exits with **zero errors**.
2. The full test suite (`CI=true npx vitest run`) still passes with no new failures.
3. The server dev script (`tsx watch src/main.ts`) is unaffected at runtime.
4. All resolved tech-debt entries from 2026-03-14 are marked `Resolved` in `tech-debt.md`.

## Subsystem Scope

- `server/package.json` — module type field
- `server/tsconfig.json` — strictness settings
- `server/src/**/*.ts` — targeted import-type fixes and type narrowing

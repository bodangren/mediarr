# Spec: Clear Server Strict Typecheck Debt

## Problem

`npx tsc -p server/tsconfig.json --noEmit` has 21 diagnostics in four test files,
preventing a clean release static-analysis gate.

## Goal

Correct fixture types and indexed assertions without changing production behavior.

## Acceptance Criteria

- [ ] All affected tests remain green.
- [ ] `npx tsc -p server/tsconfig.json --noEmit` passes with zero diagnostics.

## Scope

`TorrentRepository.test.ts`, `FilterService.test.ts`, `SubtitleRequirementEngine.test.ts`,
and `VariantInventoryIndexer.test.ts` only.

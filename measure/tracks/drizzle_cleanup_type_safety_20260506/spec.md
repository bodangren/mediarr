# Track: Backend Drizzle Migration Cleanup & Type Safety

## Overview
Complete the Prisma→Drizzle transition by renaming files, removing shims, and eliminating unsafe casts.

## Goals
- Rename prismaClient.ts to Drizzle-native naming
- Remove mixed Bun/Node $executeRawUnsafe shim
- Fix seedSmartDefaults JSON.parse(JSON.stringify) fragility
- Eliminate as any casts in SeriesDetailPage and AddIndexerModal

## Acceptance Criteria
- [ ] No files reference "prisma" in server/src/db
- [ ] All raw query shims removed; only Drizzle query API used
- [ ] seedSmartDefaults uses typed defaults, not JSON round-trip
- [ ] Zero `as any` casts in SeriesDetailPage and AddIndexerModal
- [ ] All server tests pass (CI=true npm test)

## Non-Goals
- Schema changes or migrations
- Client-side refactoring

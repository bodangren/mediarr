# Plan: Remove Prisma $executeRawUnsafe Shim

## Phase 1: Audit & Catalog (TDD)
- [ ] Write audit script/test to find all `$executeRawUnsafe` call sites
- [ ] Document each usage with suggested Drizzle replacement
- [ ] Commit audit findings

## Phase 2: Backend Replacement (TDD)
- [ ] Write tests for each replaced query to ensure identical behavior
- [ ] Replace `$executeRawUnsafe` in db/index.ts with Drizzle-native queries
- [ ] Remove mixed Bun/Node branching logic

## Phase 3: Route Verification (TDD)
- [ ] Write integration tests for affected routes (torrent, indexer, system)
- [ ] Verify all routes return correct data after shim removal

## Phase 4: Cleanup & Regression
- [ ] Delete PrismaClient shim file if no longer referenced
- [ ] Run full test suite: `CI=true npm test`
- [ ] Run typecheck and lint

## Phase 5: Finalize
- [ ] Update tech-debt.md to mark item resolved
- [ ] Update tracks.md and commit

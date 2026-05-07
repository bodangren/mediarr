# Spec: Remove Prisma $executeRawUnsafe Shim

## Goal
Eliminate the defensive `$executeRawUnsafe` shim in `server/src/db/index.ts` that branches on `sqlite.query` vs `sqlite.prepare` at runtime. Standardize on Drizzle's native query interface now that the Drizzle migration is complete.

## Acceptance Criteria
- [ ] Audit all usages of `$executeRawUnsafe` across the codebase
- [ ] Replace with type-safe Drizzle equivalent or parameterized raw queries
- [ ] Remove the mixed Bun/Node SQLite API branching logic
- [ ] All existing tests pass after removal
- [ ] No runtime regressions in torrent or indexer routes

## Out of Scope
- Migrating remaining Prisma schema references (tracked separately)

# Prisma Raw-Method Audit Catalog

Automated scan of `server/src/` for `$executeRaw`, `$executeRawUnsafe`, `$queryRaw`, and `$queryRawUnsafe` references.

**Total files with raw-method references:** 4
**Type declaration files:** 0
**Production code files:** 1
**Test mock files:** 3
**Comment-only files:** 0

---

## Type Declarations

- ~~`server/src/types/prisma.ts`~~ *(S4 Green: PrismaClient type shim deleted)* — The shim that declared `$queryRaw` and `$executeRawUnsafe` on the extended PrismaClient interface was removed in close_drizzle_migration Phase S4. No type-declaration raw-method references remain.

## Production Code

### server/src/api/routes/statsRoutes.ts

Uses `$queryRawUnsafe` for dynamic SQLite `pragma` calls (database page count, page size, freelist count).

**Drizzle replacement:** Replace `$queryRawUnsafe` calls with `db.execute(sql.raw(...))` or parameterized Drizzle queries.

### ~~server/src/services/SystemHealthService.ts~~ *(S2 Green: raw SQL replaced with Drizzle)*

All `$queryRaw` call sites were replaced with `db.all(sql\`...\`)` in the S2 Green phase. No raw-method references remain.

## Test Mocks

- `server/src/api/routes/manualTestFindings.regression.test.ts` — Mocks `$executeRawUnsafe` in Prisma client fakes.
- `server/src/api/routes/stats.integration.test.ts` — Mocks `$queryRawUnsafe` for stats route integration tests.
- `server/src/api/routes/statsRoutes.test.ts` — Mocks `$queryRawUnsafe` for stats route unit tests.
- ~~`server/src/services/SystemHealthService.test.ts`~~ *(S2 Green: raw-method mocks removed)*

## Comment-Only

*(No comment-only files remain after S2 extracted `repairMalformedJsonColumns` from main.ts.)*

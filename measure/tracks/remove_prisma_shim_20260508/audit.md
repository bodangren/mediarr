# Prisma Raw-Method Audit Catalog

Automated scan of `server/src/` for `$executeRaw`, `$executeRawUnsafe`, `$queryRaw`, and `$queryRawUnsafe` references.

**Total files with raw-method references:** 8
**Type declaration files:** 1
**Production code files:** 2
**Test mock files:** 4
**Comment-only files:** 1

---

## Type Declarations

- `server/src/types/prisma.ts` — Defines `$queryRaw` and `$executeRawUnsafe` on the extended PrismaClient interface.

## Production Code

### server/src/services/SystemHealthService.ts

Uses `$queryRaw` for health-check queries (`SELECT 1`, `pragma sqlite_version`, `pragma user_version`).

**Drizzle replacement:** Replace `$queryRaw` template literals with `db.execute(sql\`...\`)` from Drizzle ORM.

### server/src/api/routes/statsRoutes.ts

Uses `$queryRawUnsafe` for dynamic SQLite `pragma` calls (database page count, page size, freelist count).

**Drizzle replacement:** Replace `$queryRawUnsafe` calls with `db.execute(sql.raw(...))` or parameterized Drizzle queries.

## Test Mocks

- `server/src/api/routes/manualTestFindings.regression.test.ts` — Mocks `$executeRawUnsafe` in Prisma client fakes.
- `server/src/api/routes/stats.integration.test.ts` — Mocks `$queryRawUnsafe` for stats route integration tests.
- `server/src/api/routes/statsRoutes.test.ts` — Mocks `$queryRawUnsafe` for stats route unit tests.
- `server/src/services/SystemHealthService.test.ts` — Mocks `$queryRaw` for SystemHealthService unit tests.

## Comment-Only

- `server/src/main.ts` — Contains a documentation comment mentioning `$executeRawUnsafe` (not an actual call site).

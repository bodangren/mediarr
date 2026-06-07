# Audit Results: Close Drizzle Migration (chore_close_drizzle_migration_20260607)

Raw-method reference scan of `server/src/**/*.ts` — consolidates raw-SQL shim + naming residue scope.

## Summary

- **Total files with raw-method references:** 8
- **Type declaration files:** 1
- **Production code files:** 2
- **Test mock files:** 4
- **Comment-only files:** 1

### Production call-site counts

- **Production `$queryRaw` call sites:** 4
- **Production `$queryRawUnsafe` call sites:** 3
- **Production `$executeRawUnsafe` call sites:** 0

## Type Declarations

### `server/src/types/prisma.ts`

The `PrismaClient` type shim declares `$queryRaw` and `$executeRawUnsafe` on the interface. This file will be deleted in Phase S4 when all references are migrated to `DatabaseClient`.

| Line | Method | Snippet |
|------|--------|---------|
| 28 | `$queryRaw` | `$queryRaw: <T = unknown>(...args: any[]) => Promise<T>;` |
| 29 | `$executeRawUnsafe` | `$executeRawUnsafe: (...args: any[]) => Promise<any>;` |

## Production Code

### `server/src/api/routes/statsRoutes.ts`

Three `$queryRawUnsafe` call sites in the stats aggregation routes.

**Drizzle replacement:** Replace `prisma.$queryRawUnsafe(sql)` with `db.all(sql\`...\`)` using Drizzle's tagged template. Each call is a simple SELECT aggregation — no dynamic column names.

| Line | Method | Snippet |
|------|--------|---------|
| 272 | `$queryRawUnsafe` | `const result = await prisma.$queryRawUnsafe?.(` |
| 284 | `$queryRawUnsafe` | `const result = await prisma.$queryRawUnsafe?.(` |
| 296 | `$queryRawUnsafe` | `const result = await prisma.$queryRawUnsafe?.(` |

### `server/src/services/SystemHealthService.ts`

Three `$queryRaw` call sites for database health checks (SELECT 1, sqlite_version, migration list).

**Drizzle replacement:** Replace `this.prisma.$queryRaw\`...\`` with `db.all(sql\`...\`)` using Drizzle's `sql` tagged template from `drizzle-orm`. Must guard `_drizzle_migrations` vs `_prisma_migrations` table name — Drizzle uses `_drizzle_migrations` whereas the legacy Prisma setup used `_prisma_migrations`.

| Line | Method | Snippet |
|------|--------|---------|
| 58 | `$queryRaw` | `private readonly prisma: Pick<PrismaClient, '$queryRaw'>,` |
| 116 | `$queryRaw` | `await this.prisma.$queryRaw\`SELECT 1\`` |
| 118 | `$queryRaw` | `const versionRows = await this.prisma.$queryRaw<Array<{ sqlite_version: string }>>\`` |
| 123 | `$queryRaw` | `const migrationRows = await this.prisma.$queryRaw<Array<{ migration_name: string }>>\`` |

## Test Mocks

Four test files contain raw-method mock declarations that will need updating when the production interfaces change in S2/S4/S5.

### `server/src/api/routes/manualTestFindings.regression.test.ts`

| Line | Method | Snippet |
|------|--------|---------|
| 174 | `$executeRawUnsafe` | `$executeRawUnsafe: vi.fn(),` |
| 202 | `$executeRawUnsafe` | `$executeRawUnsafe: vi.fn(),` |
| 247 | `$executeRawUnsafe` | `$executeRawUnsafe: vi.fn(),` |

### `server/src/api/routes/stats.integration.test.ts`

| Line | Method | Snippet |
|------|--------|---------|
| 25 | `$queryRawUnsafe` | `$queryRawUnsafe: vi.fn().mockResolvedValue([{ total: 0, avg: 0, size: 0 }]),` |
| 66 | `$queryRawUnsafe` | `prisma.$queryRawUnsafe` |

### `server/src/api/routes/statsRoutes.test.ts`

| Line | Method | Snippet |
|------|--------|---------|
| 27 | `$queryRawUnsafe` | `$queryRawUnsafe: vi.fn().mockResolvedValue([{ total: 0, avg: 0, size: 0 }]),` |
| 213 | `$queryRawUnsafe` | `prisma.$queryRawUnsafe` |
| 243 | `$queryRawUnsafe` | `prisma.$queryRawUnsafe.mockResolvedValue([{ size: 10485760 }]);` |

### `server/src/services/SystemHealthService.test.ts`

| Line | Method | Snippet |
|------|--------|---------|
| 31 | `$queryRaw` | `return { $queryRaw: impl ?? vi.fn().mockResolvedValue([{ '1': 1 }]) };` |
| 108 | `$queryRaw` | `$queryRaw: vi.fn()` |
| 125 | `$queryRaw` | `$queryRaw: vi.fn()` |
| 140 | `$queryRaw` | `$queryRaw: vi.fn().mockRejectedValue(new Error('SQLITE_CANTOPEN')),` |

## Comment-Only

### `server/src/main.ts`

Line 350 contains a documentation comment mentioning `$executeRawUnsafe` — not a live call site.

| Line | Method | Snippet |
|------|--------|---------|
| 350 | `$executeRawUnsafe` | `// Column names cannot be bound as parameters in SQL, so we use $executeRawUnsafe` |

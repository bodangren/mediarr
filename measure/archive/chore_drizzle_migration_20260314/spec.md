# Spec: Drizzle ORM Migration

## Context

Prisma has documented friction with Bun: the server `package.json` runs `tsx watch` (Node.js)
rather than `bun --watch` specifically because of Prisma's binary engine and `verbatimModuleSyntax`
incompatibility. Drizzle ORM solves this:

- **No binary engine** — Drizzle is pure TypeScript; queries compile directly
- **`bun:sqlite` driver** — Drizzle has a first-class adapter for Bun's built-in SQLite; no
  `better-sqlite3`, no C++ bindings to compile
- **No generation step** — schema is TypeScript; the client is typed at compile time without
  a `prisma generate` pre-step
- **Additive migrations** — `drizzle-kit generate` produces SQL migration files that match
  the current Prisma Migrate workflow

## Migration Approach

1. Keep the existing SQLite database file (`mediarr.db`) and data intact.
2. Define Drizzle schema in `server/src/db/schema.ts` that matches the current Prisma schema
   exactly (same table names, column names, types, and foreign keys).
3. Generate a baseline migration from the Drizzle schema that mirrors the current DB structure.
4. Rewrite each repository file to use Drizzle queries instead of `prisma.*`.
5. Replace `import { PrismaClient } from '@prisma/client'` with a Drizzle `db` singleton.
6. Remove Prisma packages and switch dev to `bun --watch`.

## Drizzle Schema Notes

- SQLite has no native `enum` type — Prisma enums are stored as `TEXT`. Drizzle uses
  `text('col', { enum: [...] })` to model these — same wire format, typed in TypeScript.
- `DateTime` in Prisma maps to Drizzle `integer('col', { mode: 'timestamp' })` for SQLite.
- `@default(now())` maps to Drizzle `defaultNow()` or `default(sql\`(strftime('%s','now'))\`)`.
- Prisma `@relation` foreign keys map to Drizzle `references(() => table.id)`.
- Existing migrations in `prisma/migrations/` are not deleted — they are the history. Drizzle
  takes over from the current schema state, not from scratch.

## Repository Layer

All 20 repository files in `server/src/repositories/` must be migrated. Each repository
currently takes a `PrismaClient` in its constructor; after migration it takes the Drizzle
`db` instance (`BunSQLiteDatabase`).

Key Drizzle query equivalents:
| Prisma | Drizzle |
|---|---|
| `prisma.model.findMany({ where, orderBy, include })` | `db.select().from(table).where(...).orderBy(...)` |
| `prisma.model.findUnique({ where: { id } })` | `db.select().from(table).where(eq(table.id, id)).limit(1)` |
| `prisma.model.create({ data })` | `db.insert(table).values(data).returning()` |
| `prisma.model.update({ where, data })` | `db.update(table).set(data).where(eq(table.id, id)).returning()` |
| `prisma.model.delete({ where })` | `db.delete(table).where(eq(table.id, id))` |
| `prisma.$transaction([...])` | `db.transaction(tx => { ... })` |
| `prisma.$executeRawUnsafe(sql, ...args)` | `db.run(sql\`...\`)` |

## Acceptance Criteria

- `server/src/db/schema.ts` defines all tables matching the current Prisma schema.
- `server/src/db/index.ts` exports a `db` singleton using `drizzle(new Database(dbPath))`.
- `drizzle/` directory contains the generated migration SQL.
- All 20 repository files use Drizzle queries; no `PrismaClient` imports remain.
- `@prisma/client` and `prisma` are removed from all `package.json` files.
- Dev server starts with `bun --watch src/main.ts` (updated in `server/package.json`).
- Full server test suite passes (pre-existing 4 failures only).
- `cd app && npm run build` is unaffected.
- The application boots and all API endpoints respond correctly against the existing DB file.

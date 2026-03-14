# Plan: Drizzle ORM Migration

## Phase 1 — Schema Definition and Baseline Migration

- [ ] Install `drizzle-orm`, `drizzle-kit` into root `package.json`; install `bun:sqlite` type stubs if needed
- [ ] Create `server/src/db/` directory
- [ ] Read `prisma/schema.prisma` in full; translate every model, enum, and relation to Drizzle TypeScript schema in `server/src/db/schema.ts`
- [ ] Create `server/src/db/index.ts` — exports `db` singleton: `drizzle(new Database(process.env.DATABASE_URL!))`
- [ ] Create `drizzle.config.ts` in root with `dialect: 'sqlite'`, pointing at `server/src/db/schema.ts`
- [ ] Run `bunx drizzle-kit generate` — produces baseline SQL migration in `drizzle/`
- [ ] Verify generated SQL matches existing Prisma migration structure (same tables, columns, indexes)
- [ ] Run `bunx drizzle-kit migrate` against a copy of `mediarr.db` — confirm no errors
- [ ] Commit schema + migration files

## Phase 2 — Migrate Read-Heavy Repositories

- [ ] Migrate `AppSettingsRepository.ts` to Drizzle
- [ ] Migrate `MediaRepository.ts` to Drizzle (largest — contains complex joins)
- [ ] Migrate `MovieRepository.ts` to Drizzle
- [ ] Migrate `SeriesRepository.ts` to Drizzle
- [ ] Migrate `QualityProfileRepository.ts` to Drizzle
- [ ] Migrate `IndexerRepository.ts` to Drizzle
- [ ] Migrate `TorrentRepository.ts` to Drizzle
- [ ] Migrate `PlaybackRepository.ts` to Drizzle
- [ ] Migrate `CollectionRepository.ts` to Drizzle
- [ ] Update `main.ts` to pass `db` (Drizzle) instead of `prisma` to the repositories migrated so far
- [ ] Run `CI=true bun test` — confirm migrated repositories pass their tests

## Phase 3 — Migrate Remaining Repositories and Transactions

- [ ] Migrate `ActivityEventRepository.ts` to Drizzle
- [ ] Migrate `BlocklistRepository.ts` to Drizzle
- [ ] Migrate `CustomFormatRepository.ts` to Drizzle
- [ ] Migrate `DownloadClientRepository.ts` to Drizzle
- [ ] Migrate `ImportListRepository.ts` to Drizzle
- [ ] Migrate `IndexerHealthRepository.ts` to Drizzle
- [ ] Migrate `NotificationRepository.ts` to Drizzle
- [ ] Migrate `SubtitleVariantRepository.ts` to Drizzle
- [ ] Migrate any `$transaction` blocks to `db.transaction(tx => { ... })`
- [ ] Migrate any `$executeRawUnsafe` call sites to Drizzle `sql` tagged template
- [ ] Remove all `import { PrismaClient }` and `import { Prisma }` from the entire server
- [ ] Update `main.ts` — create `db` once and pass to all services/repositories; remove `new PrismaClient()`
- [ ] Run `CI=true bun test` — full server suite; confirm only pre-existing 4 failures

## Phase 4 — Runtime Switch, Prisma Removal, and Final Verification

- [ ] Update `server/package.json` dev script: `"dev": "bun --watch src/main.ts"`
- [ ] Update root `package.json` dev script to use `bun --watch` for server
- [ ] Remove `prisma` and `@prisma/client` from root `package.json` and `server/package.json`
- [ ] Delete `prisma/` directory (schema and migration history no longer needed; DB state is owned by `drizzle/`)
- [ ] Run `bun install` — confirm no Prisma references remain in lock file
- [ ] Boot the server with `bun --watch src/main.ts` — confirm startup log, no errors
- [ ] Hit at least 5 API endpoints manually (or via existing integration tests) — confirm correct responses
- [ ] Run `CI=true bun test` — final full suite; confirm only pre-existing 4 failures
- [ ] Run `cd app && npm run build` — confirm frontend build unaffected

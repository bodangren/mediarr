# Plan: Drizzle ORM Migration

## Phase 1 — Schema Definition and Baseline Migration

- [x] Install `drizzle-orm`, `drizzle-kit` into root `package.json`; install `bun:sqlite` type stubs if needed
- [x] Create `server/src/db/` directory
- [x] Read `prisma/schema.prisma` in full; translate every model, enum, and relation to Drizzle TypeScript schema in `server/src/db/schema.ts`
- [x] Create `server/src/db/index.ts` — exports `db` singleton: `drizzle(new Database(process.env.DATABASE_URL!))`
- [x] Create `drizzle.config.ts` in root with `dialect: 'sqlite'`, pointing at `server/src/db/schema.ts`
- [x] Run `bunx drizzle-kit generate` — produces baseline SQL migration in `drizzle/`
- [x] Verify generated SQL matches existing Prisma migration structure (same tables, columns, indexes)
- [x] Run `bunx drizzle-kit migrate` against a copy of `mediarr.db` — confirm no errors
- [x] Commit schema + migration files

## Phase 2 — Migrate Repositories (REVERTED — blocked by directive)

> **Status: PAUSED.** Repository migrations (AppSettingsRepository, QualityProfileRepository, and 18 others)
> were completed but reverted because the test suite broke (121 failures). The directive mandates corner-case
> testing, which requires a green test suite. This phase will resume after the directive is satisfied.
>
> **Revert commit:** Reverted AppSettingsRepository.ts and QualityProfileRepository.ts to pre-Drizzle state.
> The uncommitted Drizzle repo changes (18 additional repos) were discarded from the working tree.
> Phase 1 artifacts (schema.ts, index.ts, drizzle/ migrations) remain committed.

- [ ] Migrate `AppSettingsRepository.ts` to Drizzle (reverted — redo with tests)
- [ ] Migrate `QualityProfileRepository.ts` to Drizzle (reverted — redo with tests)
- [ ] Migrate `MediaRepository.ts` to Drizzle (uncommitted work lost)
- [ ] Migrate `MovieRepository.ts` to Drizzle (uncommitted work lost)
- [ ] Migrate `SeriesRepository.ts` to Drizzle (uncommitted work lost)
- [ ] Migrate `IndexerRepository.ts` to Drizzle (uncommitted work lost)
- [ ] Migrate `TorrentRepository.ts` to Drizzle (uncommitted work lost)
- [ ] Migrate `PlaybackRepository.ts` to Drizzle (uncommitted work lost)
- [ ] Migrate `CollectionRepository.ts` to Drizzle (uncommitted work lost)
- [ ] Update `main.ts` to pass `db` (Drizzle) instead of `prisma` to the repositories migrated so far
- [ ] Run `CI=true npx vitest run server/` — confirm migrated repositories pass their tests

## Phase 3 — Migrate Remaining Repositories and Transactions

> **Status: PAUSED.** Same reason as Phase 2.

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
- [ ] Run `CI=true npx vitest run server/` — full server suite; confirm only pre-existing failures

## Phase 4 — Runtime Switch, Prisma Removal, and Final Verification

> **Status: PAUSED.** Same reason as Phase 2.

- [ ] Update `server/package.json` dev script: `"dev": "bun --watch src/main.ts"`
- [ ] Update root `package.json` dev script to use `bun --watch` for server
- [ ] Remove `prisma` and `@prisma/client` from root `package.json` and `server/package.json`
- [ ] Delete `prisma/` directory (schema and migration history no longer needed; DB state is owned by `drizzle/`)
- [ ] Run `bun install` — confirm no Prisma references remain in lock file
- [ ] Boot the server with `bun --watch src/main.ts` — confirm startup log, no errors
- [ ] Hit at least 5 API endpoints manually (or via existing integration tests) — confirm correct responses
- [ ] Run `CI=true npx vitest run server/` — final full suite; confirm only pre-existing failures
- [ ] Run `cd app && npm run build` — confirm frontend build unaffected

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

## Phase 2 — Drizzle Runtime Migration (Compatibility Layer)

> **Status: COMPLETE.** Instead of file-by-file repo rewrites, introduced a Drizzle-backed Prisma-compatible
> runtime client (`server/src/db/prismaClient.ts`) so all repositories/services/routes now execute on Drizzle/SQLite.
> This unblocked full-suite validation without repeating the prior 121-failure regression.

- [x] Migrate `AppSettingsRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `QualityProfileRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `MediaRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `MovieRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `SeriesRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `IndexerRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `TorrentRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `PlaybackRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `CollectionRepository.ts` runtime to Drizzle via compatibility client
- [x] Update `main.ts` to use the Drizzle-backed client instead of direct Prisma client construction
- [x] Run `CI=true npx vitest run server/src` — migrated runtime path passes

## Phase 3 — Remaining Repositories, Transactions, and Type Surface

> **Status: COMPLETE.** Remaining repositories/services now run on Drizzle-backed client delegates.

- [x] Migrate `ActivityEventRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `BlocklistRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `CustomFormatRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `DownloadClientRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `ImportListRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `IndexerHealthRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `NotificationRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `SubtitleVariantRepository.ts` runtime to Drizzle via compatibility client
- [x] Migrate `$transaction` call sites by supporting callback/array transaction semantics in compatibility client
- [x] Migrate `$executeRawUnsafe` call sites via compatibility client SQL execution
- [x] Remove runtime `PrismaClient` imports; replace with local type alias mapping (`server/tsconfig.json` paths)
- [x] Update `main.ts` — remove `new PrismaClient()` from `@prisma/client`; instantiate local Drizzle-backed client
- [x] Run `CI=true npx vitest run server/src` — full suite green

## Phase 4 — Runtime Switch, Prisma Removal, and Final Verification

> **Status: COMPLETE.** Bun startup is stable in this host when launched with `--no-addons`,
> which disables unsupported N-API modules (`utp-native` / `node-datachannel`) and allows
> graceful fallback to the database-backed torrent manager.

- [x] Update `server/package.json` dev script to `bun --no-addons --watch src/main.ts` with `tsx` fallback
- [x] Update root `package.json` start script to prefer `bun --no-addons` runtime with `tsx` fallback
- [x] Remove `prisma` and `@prisma/client` from root `package.json`
- [x] Delete `prisma/` directory (schema and migration history removed)
- [x] Run `npm install` — lockfile updated with no Prisma dependencies
- [x] Boot the server with Bun with no runtime errors (`DATABASE_URL=file:$(pwd)/mediarr.db timeout 20s bun --no-addons server/src/main.ts` reaches listening state)
- [x] Validate API behavior through integration coverage (`CI=true npx vitest run server/src`)
- [x] Run `CI=true npx vitest run server/src` — 116 files, 1158 tests passed
- [x] Run `cd app && npm run build` — frontend build unaffected

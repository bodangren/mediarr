# Plan: Prisma Naming Residue Cleanup

## Phase S1: Remove PrismaClient type shim

- [ ] Read `server/src/types/prisma.ts` to understand the PrismaClient type definition
- [ ] Read `server/src/db/drizzleClient.ts` to understand the DatabaseClient type
- [ ] Search all files importing from `types/prisma`:
  ```bash
  grep -r "from.*types/prisma" server/src/ --include="*.ts" | grep -v test
  ```
- [ ] For each non-test file importing PrismaClient:
  - Replace `import { PrismaClient } from '../types/prisma'` with `import { DatabaseClient } from '../db/drizzleClient'`
  - Replace all usages of `PrismaClient` type with `DatabaseClient`
  - Verify the file compiles: `npx tsc --noEmit --project server/tsconfig.json`
- [ ] For each test file importing PrismaClient:
  - Replace import with `DatabaseClient`
  - Replace type annotations
- [ ] Delete `server/src/types/prisma.ts`
- [ ] Verify no remaining references:
  ```bash
  grep -r "PrismaClient" server/src/ --include="*.ts" | grep -v node_modules | grep -v archive
  ```
  Expected: zero hits (excluding archived tracks)
- [ ] Run `CI=true npm test` — expect GREEN
- [ ] Commit: `refactor(types): remove PrismaClient type shim, use DatabaseClient`

## Phase S2: Rename test mock helpers from Prisma to Drizzle

- [ ] List all files with Prisma-named mock helpers:
  ```bash
  grep -rl "createPrismaMock\|createMockPrisma\|makePrisma\|makeMoviePrisma" server/src/ tests/ --include="*.ts"
  ```
- [ ] For each file (do one at a time, commit per file):
  - Rename `createPrismaMock` → `createDbMock`
  - Rename `createMockPrisma` → `createMockDb`
  - Rename `makePrisma` → `makeDb`
  - Rename `makeMoviePrisma` → `makeMovieDb`
  - Update all call sites in the same file
  - Run the file's tests: `npx vitest run <file>`
  - Commit: `test: rename Prisma mock helpers to Db in <filename>`
- [ ] After all files are renamed, verify no remaining Prisma-named helpers:
  ```bash
  grep -r "createPrismaMock\|createMockPrisma\|makePrisma\|makeMoviePrisma" server/src/ tests/ --include="*.ts"
  ```
  Expected: zero hits
- [ ] Run `CI=true npm test` — full suite GREEN
- [ ] Commit: `test: rename all Prisma mock helpers to Drizzle/Db naming`

## Phase S3: Remove stale OPENAI_API_KEY from .env

- [ ] Read `.env` and confirm `OPENAI_API_KEY` is present
- [ ] Verify `AI_GATEWAY_BASE_URL` is configured (the replacement)
- [ ] Remove the `OPENAI_API_KEY` line from `.env`
- [ ] Verify the app starts: `bun run src/main.ts` (should start without errors)
- [ ] Verify `.env` is in `.gitignore` (should already be)
- [ ] Commit: `chore(env): remove stale OPENAI_API_KEY`

## Phase S4: Verification & Handoff

- [ ] Run `CI=true npm test` — full suite GREEN
- [ ] Run `npm run typecheck` — zero errors
- [ ] Run `npm run lint` — zero errors
- [ ] Verify zero grep hits for Prisma naming in non-archived code
- [ ] Update `tech-debt.md`:
  - Mark "Old OPENAI_API_KEY still in .env" as Resolved
  - Mark "PrismaClient type shim" as Resolved
- [ ] Update `lessons-learned.md` with Drizzle mock naming convention
- [ ] Final commit and push

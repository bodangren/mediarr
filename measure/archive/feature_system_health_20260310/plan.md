# Plan: Real System Health & Disk Space Monitoring

## Phase 1 — SystemHealthService Implementation
- [x] Create `server/src/services/SystemHealthService.ts`
  - [x] Constructor takes `{ prisma, startTime?: Date }`
  - [x] `getDiskSpace(paths: string[])` — fs.statfs per path, graceful fallback on ENOENT
  - [x] `getProcessInfo()` — process.uptime(), process.version, process.platform, startTime
  - [x] `checkDatabase()` — prisma.$queryRaw`SELECT 1`, catch and return error status
  - [x] `checkRootFolders(paths: string[])` — fs.access() per path, return health status
  - [x] `detectFFmpeg()` — exec `ffmpeg -version`, parse first line, return version + status

## Phase 2 — Wiring into Routes
- [x] Add `systemHealthService?: Pick<SystemHealthService, ...>` to `ApiDependencies` in `server/src/api/types.ts`
- [x] Update `systemRoutes.ts` `/api/system/status` to use `deps.systemHealthService` when available
  - [x] Replace disk space stubs with real `getDiskSpace()`
  - [x] Replace start time stub with real `getProcessInfo()`
  - [x] Replace database version stub with real `checkDatabase()`
  - [x] Replace FFmpeg stub with real `detectFFmpeg()`
  - [x] Replace health checks with real root folder + database checks
- [x] Wire `SystemHealthService` into `server/src/main.ts`

## Phase 3 — Tests & Verification
- [x] Create `server/src/services/SystemHealthService.test.ts` (14 tests, all passing)
  - [x] Mock `fs.statfs`, `fs.access`, `child_process.exec` via `vi.hoisted()`
  - [x] Test `getDiskSpace()` happy path and ENOENT fallback
  - [x] Test `checkDatabase()` ok and error paths
  - [x] Test `checkRootFolders()` with accessible and inaccessible paths
  - [x] Test `detectFFmpeg()` found and not-found cases
- [x] All 14 new tests pass; 0 new route test failures introduced
- [x] Production build succeeds

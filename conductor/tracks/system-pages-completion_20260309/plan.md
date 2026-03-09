# Implementation Plan: System Pages Completion

## Phase 1: SystemTasksPage

- [x] Create `app/src/components/system/SystemTasksPage.tsx`
  - Scheduled tasks section with table and "Run Now" buttons
  - Queued tasks section with cancel buttons
  - Task history section with status/name filters and pagination
  - Auto-refresh every 30 seconds
- [x] Wire `system/tasks` route in App.tsx to `<SystemTasksPage />`

## Phase 2: SystemLogsPage + SystemBackupPage

- [x] Create `app/src/components/system/SystemLogsPage.tsx`
  - File list sidebar with size and modified date
  - Log content viewer with line coloring (ERROR/WARN/INFO/DEBUG)
  - Line limit selector (50/100/500/All)
  - Clear, Download, Delete actions
- [x] Create `app/src/components/system/SystemBackupPage.tsx`
  - Backup list table with restore/download/delete per row
  - "Back Up Now" button
  - Schedule configuration panel with save
- [x] Wire both routes in App.tsx

## Phase 3: Tests + Build Verification

- [x] Write `SystemTasksPage.test.tsx` — renders scheduled tasks, run now triggers API
- [x] Write `SystemLogsPage.test.tsx` — renders file list and log content
- [x] Write `SystemBackupPage.test.tsx` — renders backup list and schedule
- [x] Run `cd app && npx vitest run --reporter=verbose` — all new tests pass (22/22)
- [x] Run `cd app && npm run build` — production build succeeds
- [x] Also fixed pre-existing TS errors: RouteScaffold `actions` prop, ToastInput `title` optional

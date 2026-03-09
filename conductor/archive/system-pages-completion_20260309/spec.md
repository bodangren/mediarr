# Track Spec: System Pages Completion

## Overview

Three System section pages in App.tsx currently render as `<StaticPage>` placeholders. This track replaces them with fully functional React components that consume the existing backend API routes.

## Pages to Implement

### 1. `system/tasks` → `SystemTasksPage`

Display and manage background scheduled tasks.

**Features:**
- Scheduled tasks table: name, interval, last run, duration, next run, status badge
- "Run Now" button per task → triggers `POST /api/tasks/scheduled/:taskId/run`
- Queued/running tasks section with progress indicator and cancel button
- Task history table with paginated results, status filter, task name filter
- Auto-refresh scheduled tasks every 30s

**API:**
- `GET /api/tasks/scheduled` → list scheduled tasks
- `GET /api/tasks/queued` → list currently running tasks
- `POST /api/tasks/scheduled/:taskId/run` → trigger task
- `DELETE /api/tasks/queued/:taskId` → cancel task
- `GET /api/tasks/history` → paginated history

### 2. `system/logs` → `SystemLogsPage`

Browse and download application log files.

**Features:**
- File list sidebar: filename, size, last modified, select active file
- Log content viewer: monospace text area, colored lines (ERROR=red, WARN=yellow, INFO=green, DEBUG=gray)
- Line limit control: show last 50/100/500/All lines
- Clear button → `POST /api/logs/files/:filename/clear`
- Download button → `GET /api/logs/files/:filename/download` then navigate to raw URL
- Delete file button with confirmation

**API:**
- `GET /api/logs/files` → list files
- `GET /api/logs/files/:filename` → get contents (with ?limit=N)
- `POST /api/logs/files/:filename/clear` → clear contents
- `DELETE /api/logs/files/:filename` → delete file
- `GET /api/logs/files/:filename/download` → get download URL

### 3. `system/backup` → `SystemBackupPage`

Manage database backups and schedule.

**Features:**
- Backup list table: name, type badge, size, created date, restore/download/delete actions
- "Back Up Now" button → `POST /api/backups`
- Schedule configuration panel: enabled toggle, interval select, retention days input, save
- Restore confirmation dialog
- Delete confirmation dialog

**API:**
- `GET /api/backups` → list backups
- `POST /api/backups` → create manual backup
- `GET /api/backups/schedule` → get schedule
- `PATCH /api/backups/schedule` → update schedule
- `POST /api/backups/:id/restore` → restore
- `POST /api/backups/:id/download` → get download URL
- `DELETE /api/backups/:id` → delete

## Acceptance Criteria

- All three routes render functional UIs (no StaticPage placeholders)
- Each page fetches real data from the API
- Actions (run, cancel, clear, backup, restore, delete) call the correct endpoints and refresh data
- Basic error states and loading states are handled
- Tests cover the primary render and at least one action per page
- Production build passes

## Component Structure

```
app/src/components/system/
├── StatsPage.tsx          (existing)
├── SystemTasksPage.tsx    (NEW)
├── SystemLogsPage.tsx     (NEW)
├── SystemBackupPage.tsx   (NEW)
└── SystemTasksPage.test.tsx  (NEW)
└── SystemLogsPage.test.tsx   (NEW)
└── SystemBackupPage.test.tsx (NEW)
```

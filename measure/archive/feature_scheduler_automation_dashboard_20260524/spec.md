# Scheduler & Automation Dashboard

## Overview

Add a dedicated React SPA settings page for configuring and monitoring the automated lifecycle tasks that drive Mediarr's hands-off media pipeline. The backend already runs RSS syncs, wanted searches, and import monitoring via `node-cron`, but users have no visibility into schedule configuration, execution history, or task health from the dashboard. This closes a critical UX gap in the "Automated Lifecycle" product pillar.

## Problem Statement

The automated pipeline (RSS discovery → wanted search → download → import → subtitle fetch → file organization) runs on hard-coded or default intervals set during smart-defaults initialization. Users cannot:
- View or edit RSS sync frequency, wanted search intervals, or import scan cadence
- See when a task last ran, whether it succeeded, or how long it took
- Manually trigger a task ad-hoc (e.g., "run RSS sync now")
- Receive or configure alerts when a scheduled task fails repeatedly

This forces power users to edit config files or restart the Bun process to change schedules.

## Solution

### Automation Settings Page
- **Task Scheduler Table:** List all scheduled tasks (RSS Sync, Wanted Search Movies, Wanted Search Series, Library Scan, Subtitle Sync) with current interval, last run time, next run time, and health status
- **Interval Editor:** Inline editing of cron expressions or preset intervals (15m, 30m, 1h, 6h, 12h, 24h) with validation
- **Manual Trigger:** One-click "Run Now" button per task with confirmation and progress toast
- **Task History Log:** Paginated list of recent executions with timestamp, duration, success/failure status, and error summary
- **Enable/Disable Toggle:** Per-task on/off switch with persistent storage in AppSettings

### Backend Integration
- Extend existing scheduler service to expose task metadata (name, interval, lastRun, nextRun, enabled)
- Add `POST /api/scheduler/:taskId/trigger` for ad-hoc execution
- Add `PUT /api/scheduler/:taskId/interval` to update cron expression with validation
- Add `GET /api/scheduler/history` with pagination for execution log
- Store task history in SQLite (new `taskExecutions` table via Drizzle)

### Shared Components
- `TaskSchedulerTable`: sortable table with status badges, interval picker, action menu
- `CronIntervalPicker`: preset buttons + custom cron input with inline validation
- `TaskHistoryPanel`: paginated log with filter by status and date range
- `TaskStatusBadge`: color-coded badge (healthy / warning / error / disabled)

## Acceptance Criteria
- [ ] Automation settings page accessible from Settings sidebar under "Automation"
- [ ] Task scheduler table renders all scheduled tasks with live status
- [ ] Interval changes persist across server restarts and take effect immediately
- [ ] Manual trigger executes the task asynchronously and surfaces success/failure in UI
- [ ] Task history log shows last 50 executions with pagination
- [ ] Ad-hoc trigger and interval update endpoints have integration tests
- [ ] Widget-level tests for TaskSchedulerTable, CronIntervalPicker, and TaskHistoryPanel
- [ ] `CI=true npm test` green; app build + typecheck clean

## Out of Scope
- Creating new custom tasks beyond the built-in scheduled jobs
- Distributed scheduling or multi-node coordination
- Task execution graphs / DAG dependencies
- Real-time push updates for task status (polling every 30s is acceptable)

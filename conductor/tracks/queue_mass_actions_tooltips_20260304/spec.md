# Specification: Queue Mass Actions + Action Tooltips

## Overview
Add one-off queue UX improvements on `/activity/queue`:
1. Multi-item mass actions for torrents that mirror existing per-row actions.
2. Hover tooltips for icon-only action buttons so users can identify each action without guesswork.

## Functional Requirements

### FR1 — Queue Selection + Mass Actions
- Users can select multiple torrents from the queue list.
- A bulk action bar appears when at least one torrent is selected.
- Bulk actions include:
  - Pause selected torrents.
  - Resume selected torrents.
  - Retry import for selected torrents.
  - Remove selected torrents.
- Bulk actions call existing torrent endpoints already used by per-row actions.
- After bulk actions complete, queue data refreshes and selection is cleared.

### FR2 — Delete Confirmation
- Bulk remove requires explicit confirmation before deleting.
- Confirmation UI is consistent with existing queue remove behavior.

### FR3 — Action Tooltips
- Every icon-only queue action button (row-level + bulk-level) includes a hover tooltip text (`title`) that clearly explains the action.

## Non-Functional Requirements
- Existing polling and pagination behavior remains intact.
- Existing per-row actions continue to work unchanged.
- UX remains mobile-safe and keyboard accessible via checkbox and button semantics.

## Acceptance Criteria
- [ ] On `/activity/queue`, selecting torrents reveals bulk action controls.
- [ ] Bulk pause/resume/retry/remove execute against selected items and refresh data.
- [ ] Bulk remove requires confirmation and removes selected torrents.
- [ ] Icon-only queue buttons expose clear hover tooltip text.
- [ ] Existing queue tests pass and new tests cover selection + mass action behavior.

## Out of Scope
- Backend API changes for new bulk endpoints.
- Changing queue pagination model.
- Reworking queue status model or speed-limit workflows.

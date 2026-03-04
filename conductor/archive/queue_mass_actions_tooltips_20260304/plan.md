# Implementation Plan: Queue Mass Actions + Action Tooltips

## Phase 1: Queue UX Enhancements
> Goal: Add multi-select bulk actions and clear icon tooltips to the queue page.

- [x] Task: Add queue row selection model and bulk action toolbar
    - [x] Sub-task: Add per-row checkboxes and select-all support on `/activity/queue`
    - [x] Sub-task: Render bulk action controls when one or more torrents are selected
- [x] Task: Wire bulk action handlers to existing torrent APIs
    - [x] Sub-task: Implement bulk pause and bulk resume behavior
    - [x] Sub-task: Implement bulk retry import behavior
    - [x] Sub-task: Implement bulk remove flow with confirmation
    - [x] Sub-task: Refresh queue and clear selection after bulk operation completion
- [x] Task: Add tooltip text to icon-only queue actions
    - [x] Sub-task: Add `title` on row-level pause/resume, retry, and remove buttons
    - [x] Sub-task: Add `title` on bulk icon action buttons
- [x] Task: Extend frontend tests for queue mass actions and tooltip affordance
- [x] Task: Conductor - User Manual Verification 'Phase 1: Queue UX Enhancements' (Protocol in workflow.md)

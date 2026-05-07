# Custom Format Editor & Live Tester

## Overview

Build a visual editor for custom formats in the React SPA, allowing users to create, edit, and test scoring rules that drive the unified release scoring algorithm. Custom formats are the primary mechanism for release preference in the *arr ecosystem, but currently lack a first-class UI surface in mediarr.

## Problem Statement

Custom formats define the scoring rules that determine which release wins during auto-search and RSS sync. Today, users can only configure them indirectly or via raw configuration. There is no UI to define conditions (e.g., "title contains 'Remux' AND source is 'BluRay'"), assign scores, or preview which existing releases in the library would match a given rule. This makes tuning the scoring engine opaque and error-prone.

## Solution

Create a dedicated `/settings/custom-formats` settings page with a full CRUD editor:

### Format List View
- Table of existing custom formats (name, score, condition count)
- Clone, edit, delete actions
- Toggle to enable/disable a format without deleting it
- Search/filter by name

### Format Editor (Modal or Drawer)
- Name and score input
- Condition builder with AND/OR groups
- Condition types:
  - Release title (regex or contains)
  - Source (WEB-DL, BluRay, Remux, etc.)
  - Resolution (1080p, 2160p)
  - Codec (x264, x265, AV1)
  - Audio codec/channels
  - Indexer name
  - Release group
  - Season pack vs single episode
- Negation toggle per condition (NOT)
- Required toggle (must match vs optional bonus)

### Live Tester
- Input field for a raw release title
- "Test" button runs the format conditions against the title
- Visual match indicator: which conditions passed/failed
- Score preview: total score this release would receive
- History of recent test strings (session-only)

### Integration
- Form validation with zod + react-hook-form
- Save updates the database and invalidates the scoring cache
- Changes take effect on next search/RSS sync

## Acceptance Criteria

- [ ] Custom formats list loads from `/api/settings/custom-formats`
- [ ] Create new format with conditions and score
- [ ] Edit existing format — changes persist and reflect in scoring
- [ ] Delete format with confirmation dialog
- [ ] Live tester shows per-condition pass/fail for a given release title
- [ ] Negation and required toggles affect match logic correctly
- [ ] Form validation prevents empty names, invalid regex, or zero-score formats
- [ ] Integration tests cover CRUD operations and live tester
- [ ] TypeScript typecheck passes; build succeeds

## Out of Scope

- Import/export custom formats from Sonarr/Radarr
- Community format sharing/gallery
- AI-assisted format generation
- Condition types beyond the listed set (extend later)

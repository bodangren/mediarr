# Specification: Measure Housekeeping Cleanup

## Overview

Measure governance artifacts have drifted out of sync. Recent archived plans still contain open or in-progress checklist items, which distorts status accounting, and `measure/lessons-learned.md` exceeds its 50-line budget. This track cleans up the documentation state so future status reports and track selection start from reliable repo artifacts.

## Functional Requirements

1. Create a dedicated Measure track for the cleanup work and register it in `measure/tracks.md`.
2. Normalize the recent archived plan residue identified during the status review so archived tracks read as closed historical records.
3. Trim `measure/lessons-learned.md` to 50 lines or fewer while preserving the highest-signal guidance for near-term Mediarr work.
4. Re-run a status audit after the cleanup and confirm the targeted archived-plan anomalies are no longer reported.
5. Archive this cleanup track after verification and update the registry accordingly.

## Non-Functional Requirements

1. Preserve the historical meaning of archived work; do not rewrite implementation facts, only normalize stale checklist state and clarify deferred or non-actionable outcomes.
2. Do not modify unrelated product code or active roadmap plans.
3. Keep all edits ASCII and auditable.

## Acceptance Criteria

1. `measure/tracks.md` contains an active cleanup track during the work, then an archived cleanup track when the work is complete.
2. The archived plans touched by this track no longer contain misleading active `[~]` items or dangling archive-only follow-up items.
3. `measure/lessons-learned.md` is at or below 50 lines.
4. A follow-up status audit can distinguish live roadmap work from the cleaned-up archived history without the issues called out in the prior report.

## Out of Scope

1. Creating or implementing the user's upcoming urgent track.
2. Rewriting the entire archive; this track only normalizes the current high-signal status residue.
3. Changing product behavior, tests, or runtime architecture.

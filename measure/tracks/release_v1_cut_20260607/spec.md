# Spec: v1.0 Release Cut — Define the Line

## Why this track exists

Per the 2026-06-07 direction & scope review: the project core is demonstrably stable (dozens
of corner-case tracks closed "no bugs found"; ~1,800 tests green; TS strictness re-enabled;
shared contracts in place). The risk is no longer instability — it is **never shipping a
v1.0** because there is always one more subsystem to test or clean.

This track draws the line. It does not add product features. It ratifies what v1.0 *is*,
confirms the gates are met, tags it, and pushes everything else explicitly to post-v1.0.

## Goal

Produce a tagged, documented v1.0 with an unambiguous scope boundary, so the remaining
internal-quality backlog has a clear "after this" home instead of competing for runway now.

## Stories

### S1: Ratify the v1.0 scope checklist
As the maintainer, I want an agreed checklist of what must ship in v1.0, so "done" is
defined.

**Acceptance Criteria:**
```gherkin
Given the current feature set (monolith server, React SPA, Flutter client)
When the v1.0 checklist is written
Then it lists the must-ship capabilities and marks each met/unmet
And the only unmet items are the two user-facing feature tracks still in flight
  (feature_flutter_media_detail, feature_scheduler_automation_dashboard) — or they are
  consciously cut from v1.0
```
**Estimate:** S | **Priority:** Must

### S2: Confirm quality gates
As the maintainer, I want the release gates verified, so v1.0 ships green.

**Acceptance Criteria:**
```gherkin
Given the v1.0 candidate commit
When the gates are run
Then CI=true npm test is GREEN
And npm run typecheck is clean (server + app)
And npm run lint is clean
And the app build and the Flutter build succeed
And chore_close_drizzle_migration_20260607 is complete (no Prisma residue)
```
**Estimate:** S | **Priority:** Must

### S3: Tag and document the v1.0 release
As a user, I want a versioned release with notes, so I know what Mediarr v1.0 delivers.

**Acceptance Criteria:**
```gherkin
Given gates pass
When the release is cut
Then a v1.0.0 git tag exists on the release commit
And a CHANGELOG / release note summarizes the shipped feature set
```
**Estimate:** S | **Priority:** Must

### S4: Publish the post-v1.0 backlog
As the maintainer, I want all deferred work collected in one place, so post-v1.0 planning
starts from a clear list.

**Acceptance Criteria:**
```gherkin
Given the deferred tracks (import-list UI tests, frontend+MSW coverage, the deferred
  half of untested-server-services, indexer health monitoring if not in v1.0)
When tracks.md is updated
Then a "Post-v1.0 / Deferred" section lists each with a one-line rationale
```
**Estimate:** S | **Priority:** Should

## Out of Scope
- Building new features. If a capability is not already substantially done, it is cut from
  v1.0, not added here.
- The deferred test/coverage tracks themselves (they run *after* this line).

## Dependencies
- `chore_close_drizzle_migration_20260607` should complete first (clean migration base).
- The two user-facing feature tracks are the decision point for S1 (ship in v1.0 or cut).

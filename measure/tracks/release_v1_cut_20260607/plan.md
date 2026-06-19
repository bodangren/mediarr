# Plan: v1.0 Release Cut — Define the Line

> Sequenced last among active tracks. Do not start until the user-facing feature tracks
> (`feature_flutter_media_detail`, `feature_scheduler_automation_dashboard`) are either
> shipped or consciously cut, and `chore_close_drizzle_migration_20260607` is complete.

## Phase S1: Ratify the v1.0 scope checklist
- [~] Draft `measure/v1.0-scope.md` listing must-ship capabilities (server domains, SPA workflows, Flutter client screens)
- [~] Mark each capability met / unmet against the current codebase
- [~] Decide per unmet item: ship-in-v1.0 or cut-to-post-v1.0
- [~] Get maintainer sign-off on the checklist

### S1 Red phase log (MID)

- **Targeted Red command:** `./node_modules/.bin/vitest run measure/__tests__/v1.0-scope.test.ts` (single file, `run` mode, no watch, no full suite)
- **Result at HEAD:** **5/5 tests FAIL.** All failures root in the missing S1 deliverable `measure/v1.0-scope.md` (test 1 = `existsSync` false; tests 2–5 = `readScopeOrThrow()` throws ENOENT). No stale-data failures.
- **Tests added (`measure/__tests__/v1.0-scope.test.ts`):**
  1. `v1.0-scope.md exists at the expected path`
  2. `declares a top-level Capabilities section`
  3. `marks every capability with a met ([x]) or unmet ([ ]) checkbox`
  4. `every unmet ([ ]) capability either maps to a flagged in-flight track OR is explicitly cut to post-v1.0` (enforces the spec Gherkin AC that the only valid unmet items are the two flagged feature tracks or conscious cuts)
  5. `contains a maintainer sign-off line`
- **Live-gate owner note (per MID rule that artifact/markdown assertions must be paired with a live-behavior proof or plan note):** the durable maintainer sign-off is the plan checkbox commit message authored by the implementer/maintainer role (test-strategy.md §5: "maintainer sign-off recorded in the plan checkbox commit message"). The artifact's in-file sign-off line is a precondition for the commit. S2 (live CI/typecheck/lint/build) is owned by the implementer role and is the next-role closeout gate.
- **build-graph context probe:** no `release`/`scope`/`v1.0` symbols in `graph.db`; the only `Release*` matches are NZB `ReleaseParserService` (unrelated). Confirms S3 is a git/docs op with no code surface.

## Phase S2: Confirm quality gates
- [ ] `CI=true npm test` — full suite GREEN
- [ ] `npm run typecheck` (server + app) — zero errors
- [ ] `npm run lint` — zero errors
- [ ] App build (`cd app && npm run build`) — clean
- [ ] Flutter build/analyze for the client — clean
- [ ] Confirm `chore_close_drizzle_migration_20260607` archived (no Prisma residue)

## Phase S3: Tag and document the v1.0 release
- [ ] Write release notes / CHANGELOG summarizing the v1.0 feature set
- [ ] Tag the release commit `v1.0.0`
- [ ] Push tag to remote

## Phase S4: Publish the post-v1.0 backlog
- [ ] Add a "Post-v1.0 / Deferred" section to `tracks.md` enumerating every deferred track with a one-line rationale
- [ ] Update `lessons-learned.md` with the release-cut retrospective (what the open-ended testing tail cost; the value-first reordering)
- [ ] Archive this track; final commit and push

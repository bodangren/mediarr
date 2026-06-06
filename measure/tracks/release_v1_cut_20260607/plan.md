# Plan: v1.0 Release Cut — Define the Line

> Sequenced last among active tracks. Do not start until the user-facing feature tracks
> (`feature_flutter_media_detail`, `feature_scheduler_automation_dashboard`) are either
> shipped or consciously cut, and `chore_close_drizzle_migration_20260607` is complete.

## Phase S1: Ratify the v1.0 scope checklist
- [ ] Draft `measure/v1.0-scope.md` listing must-ship capabilities (server domains, SPA workflows, Flutter client screens)
- [ ] Mark each capability met / unmet against the current codebase
- [ ] Decide per unmet item: ship-in-v1.0 or cut-to-post-v1.0
- [ ] Get maintainer sign-off on the checklist

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

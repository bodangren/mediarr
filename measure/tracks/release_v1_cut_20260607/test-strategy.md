# Test Strategy: v1.0 Release Cut

This is a **release-cut chore**, not a feature. Most "tests" here are **artifact/contract checks** (does the doc exist, does the tag resolve, does the gate command return 0). Only the gate executions in S2 prove live behaviour. Be explicit about which is which.

## 1. Testing pyramid (per phase)

| Phase | Unit | Integration / contract | Live-behaviour gate |
|---|---|---|---|
| S1 Scope checklist | n/a | Markdown contract: file exists at `measure/v1.0-scope.md`, headings present, every capability marked met/unmet, unmet items map only to the two flagged feature tracks or are explicitly cut | none — pure ratification |
| S2 Quality gates | none added | none added | **All live**: `CI=true npm test`, `npx tsc -b --pretty false` (server + app via `npm --workspace=app run typecheck`), `npm --workspace=app run lint`, `npm --workspace=app run build`, `flutter analyze` + `flutter build apk --debug` (or `flutter test`) in `clients/mediarr-client` |
| S3 Tag & changelog | n/a | Doc contract: `CHANGELOG.md` (or `RELEASE_NOTES.md`) exists at repo root and lists v1.0 scope | Live: `git tag --list v1.0.0` returns the tag; `git rev-parse v1.0.0` resolves; `git push --tags --dry-run` shows it would push |
| S4 Backlog publish | n/a | Markdown contract: `tracks.md` contains a `## Post-v1.0 / Deferred` section enumerating each currently-`[ ]` track plus any consciously-cut S1 items, each with one-line rationale; `lessons-learned.md` updated; track folder moved to `measure/archive/` | none |

**No new unit tests are written for this track.** This is an existing-suite-pinning exercise. New tests would expand scope and contradict the spec ("does not add product features").

## 2. Shared fixtures / mocks

- **No new fixtures.** The S2 suite (`vitest run`) carries its own MSW handlers (`app/src/lib/msw/factories.ts`, `app/src/lib/msw/handlers/remaining.ts`) and DB fixtures from existing tracks.
- The only new "fixtures" are documentation files (`v1.0-scope.md`, `CHANGELOG.md`) — they are inputs to grep/read assertions, not test fixtures.
- Do **not** introduce a fake/mock release-tagger or fake CI runner; tagging and the test suite must run for real. Fake harnesses are forbidden in S2/S3 because the gates *are* the deliverable.

## 3. Cross-phase edge cases & dependencies

1. **Drizzle chore is already archived** (`measure/archive/chore_close_drizzle_migration_20260607/`) — S2's "no Prisma residue" check must therefore be a verification, not a wait-for. Concrete check: `git ls-files | grep -i prisma` should return only `node_modules` entries; `prisma` mentions inside `server/src/**` are naming residue (`prismaClient.ts` is renamed; verify with `ls server/src/repositories/prisma*` returning nothing). If residue exists, surface as a **High** finding, do not silently pass S2.
2. **No root `npm run typecheck` / `npm run lint` script exists** — the spec's wording is aspirational. Use the workspace forms above; do not invent new root scripts as part of this track (would expand scope).
3. **Server has no `test` script of its own** — root `npm test` (vitest) covers both workspaces. Do not run `npm --workspace=server test`; it errors by design.
4. **Two in-flight feature tracks** (`feature_flutter_media_detail`, `feature_scheduler_automation_dashboard`) gate S1's decision matrix — the only valid S1 outputs are "shipped before tag" or "explicitly cut and listed in S4 backlog".
5. **Tag is single-shot** — `v1.0.0` cannot be re-cut idempotently. Verify gates green *before* `git tag`. If S2 fails after tag, S3's recovery is `git tag -d v1.0.0 && git push --delete origin v1.0.0`, then re-fix and re-tag — document this in plan execution notes.
6. **Flutter toolchain** (`/snap/bin/flutter`) is present but not exercised by `npm test`. S2's Flutter gate must be run separately and its output captured in the commit/git note.

## 4. Architecture guardrails

- **Monolith integrity**: do not introduce a release-only build script that splits server from app; the unified `npm test` must remain the single source of truth.
- **No new product code**: any PR diff under this track touching `server/src/**` or `app/src/**` (other than bumping `version` in `package.json` files) is out-of-scope and must be rejected.
- **Flutter is the only client**: Kotlin TV app is deprecated (AGENTS.md §6) — do not include it in S2 gates or S4 backlog.
- **Track-archival rule**: per AGENTS.md §7, archive at 100% without asking. S4's archive step is not optional.
- **Bounded smoke principle**: every artifact-contract check (S1, S3 doc, S4 markdown) is paired with a live gate (S2 suite, S3 tag resolution). No phase relies on artifact checks alone to claim "done".

## 5. Per-phase test approach notes

- **S1**: Hand-write `v1.0-scope.md`. Verification is a `grep` + human read. Acceptance: maintainer sign-off recorded in the plan checkbox commit message.
- **S2**: Run gates *in this order* (cheapest first): `npm --workspace=app run lint` → `npm --workspace=app run typecheck` → `npx tsc -b --pretty false` (server) → `CI=true npm test` → `npm --workspace=app run build` → `flutter analyze && flutter test` in `clients/mediarr-client`. Capture each command's exit code and tail of output in the commit body. **No retry logic, no flake tolerance** — if a gate is flaky, fix the flake before tagging.
- **S3**: Compose `CHANGELOG.md` from the archive of completed tracks (use `grep -E '^- \[x\] \*\*Track:' measure/tracks.md`). Tag annotated: `git tag -a v1.0.0 -m "..."`. Verify with the live gate below before pushing.
- **S4**: Pure documentation. Verification = `grep '## Post-v1.0 / Deferred' measure/tracks.md` returns 1 hit and each currently-`[ ]` track from §section above appears under it. Then archive this track folder.

## 6. build-graph findings that shaped this strategy

- `build-graph stats`: 7679 nodes, 11272 edges, 904 files, 2 packages (`mediarr`, `root`). No `release`, `tag`, or `version-bumping` symbol exists in code → S3 is intentionally a git/docs operation, not a code change.
- `build-graph search "release"`: only `ReleaseParserService` (NZB release parsing) and `releaseCandidateSchema` matches. No release-orchestration code → confirms no production gate to wire.
- `build-graph search "version"`: matches are runtime update-check schemas (`currentVersionSchema`, `UpdateService.normalizeVersion`). Bumping `package.json` `"version"` does not propagate into runtime version reporting (that comes from `UpdateService` reading git/env at runtime) → S3's CHANGELOG is the canonical version statement, `package.json` version is secondary.
- `build-graph search "changelog"`: zero functional matches → no in-app changelog viewer to update; pure repo-root file.
- `prisma` residue grep (outside graph): server/src files with `prisma` in name still exist as naming residue (e.g. `prismaClient.ts` was renamed but lingering files appear in old paths) — S2's "no Prisma residue" check is therefore a real, catchable assertion, not a no-op.

## 7. Live-proof plan (Red command + Green gate per phase)

| Phase | Red (proves the check exists and currently fails) | Green / closeout gate (proves done) |
|---|---|---|
| S1 | `test ! -f measure/v1.0-scope.md && echo RED` (currently exits RED — file does not exist) | `test -f measure/v1.0-scope.md && grep -q '^## Capabilities' measure/v1.0-scope.md && grep -cE '^- \[(x| )\]' measure/v1.0-scope.md` returns ≥ expected count; maintainer-signoff line present |
| S2 | `CI=true npm test 2>&1 \| tail -5` run *before* fixing any flake — currently passes per latest archive (1802 tests); the Red step here is to record the **baseline output** so any drift during S1/S3/S4 is visible | All six commands listed in §1 S2 row exit 0; outputs captured in the S2 commit body. No fake runner — direct invocation only. |
| S3 | `git tag --list v1.0.0` returns empty (currently true) | `git tag --list v1.0.0` returns `v1.0.0`; `git rev-parse v1.0.0` resolves; `test -f CHANGELOG.md && grep -q 'v1.0.0' CHANGELOG.md`; `git push --tags --dry-run` shows the tag |
| S4 | `grep -c '^## Post-v1.0 / Deferred' measure/tracks.md` returns 0 (currently true) | Same grep returns 1; every currently-`[ ]` track from §3.4 listed below it; `test -d measure/archive/release_v1_cut_20260607` confirms archival |

**Intentionally-red files / aggregate-suite caveats:** none. This track adds zero test files. The existing `*.test.ts` corpus is owned entirely by other (mostly archived) tracks; if any of them is intentionally red and still `[~]`, the responsible track must vendor its exclusion via `vitest.config.ts` `exclude` — this track does **not** add or modify any such exclusion. If `CI=true npm test` reveals a red file owned by an active `[~]` track, S2 halts and the track owner is notified; we do not paper over with `.skip`.

**Fake-harness boundary:** no fake harnesses are introduced. Every gate command in §1 and §7 is the production command, run unmodified, against the real workspace.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: release_v1_cut_20260607
phase: track setup
commits: none
tests_run: build-graph stats ./graph.db (pass, 7679 nodes / 11272 edges / 904 files); build-graph search release/version/changelog (pass, no release-orchestration code found)
files_changed: measure/tracks/release_v1_cut_20260607/test-strategy.md (new)
plan_updates: none — plan.md unchanged; strategy is additive guidance only
known_failures: none — no implementation work performed
handoff: Implementer should note (1) chore_close_drizzle_migration_20260607 is ALREADY ARCHIVED, so S2's Drizzle dependency is a verification (`git ls-files | grep -i prisma` outside node_modules), not a wait; (2) no root `npm run typecheck`/`npm run lint` scripts exist — use workspace-scoped commands as listed in §1/§5; (3) S3 tagging is single-shot, run all S2 gates before `git tag -a v1.0.0`; (4) Flutter gates must be run separately from `npm test`; (5) no new test files are added by this track — any red test surfaced by `CI=true npm test` belongs to another (likely active `[~]`) track and must be triaged there, not silently skipped here.
END_MEASURE_AGENT_RESULT

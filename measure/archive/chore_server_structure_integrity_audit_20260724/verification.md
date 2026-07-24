# Verification Evidence: Comprehensive Server Structure Integrity Audit

## Scope and Inventory

- Current checkout: `/home/daniel-bo/Desktop/mediarr`
- Server tree: 367 files under `server/src`
- Production TypeScript files indexed by repo-graph: 184
- Colocated server test files: 178
- Root test files statically scanned: 110
- Total server-relevant test files inspected: 288
- High-risk subsystems manually reviewed: composition/startup, API routes,
  services, repositories, SQLite/Drizzle, scheduler/history, updates, backups,
  logging, import/organize/filesystem, torrent completion, import lists,
  Cardigann/Torznab RSS, subtitles/variants, deletion, and shared SPA contracts.

## Repo-Graph

Command:

```bash
repo-graph scan . ./graph.db
repo-graph stats ./graph.db --json
repo-graph audit ./graph.db --json
repo-graph inspect ./graph.db createApiServer --json
repo-graph impact ./graph.db ./server/src/services/VariantBackfillService.ts --json --depth 2
repo-graph affected ./graph.db server/src/api/routes/seriesRoutes.ts --json --depth 1 --tests-only
```

Result:

- Fresh graph: 20,615 nodes, 26,462 edges, 928 files.
- Server subset: 3,607 nodes across 367 files; 1,453 functions and 214
  literal route nodes.
- Server edges: 8,358 calls, 1,271 imports, 902 parameter-flow edges.
- All 35 route registrar functions are called by `createApiServer`.
- No server scan errors, missing files, stale symbols, duplicate nodes, or
  orphan edges.
- Runtime route inspection found 221 method/path pairs versus 150 route-map
  entries.
- The audit's graph-wide unaudited-symbol output was dominated by known
  route/field scanner noise and was not classified as application failure.

## Typecheck

Command:

```bash
./node_modules/.bin/tsc -p server/tsconfig.json --noEmit
```

Result: **Pass**, exit 0 with no diagnostics.

## Lint

Command:

```bash
cd server
../node_modules/.bin/eslint src
../node_modules/.bin/eslint src -f json -o /tmp/mediarr-server-eslint.json
```

Result: **Fail**, 1,565 errors and 0 warnings.

- Production: 456 errors in 61 files.
- Tests: 1,109 errors in 96 files.
- Top rules: 1,427 `@typescript-eslint/no-explicit-any`, 108
  `@typescript-eslint/no-unused-vars`, 22 `no-useless-escape`.

## Server-Only Test Suite

Command:

```bash
CI=true ./node_modules/.bin/vitest run server/src
```

Result: **Pass**.

- Test files: 178 passed.
- Tests: 1,739 passed, 11 skipped, 1,750 total.
- Duration: 385.93 seconds.

The pass includes tests proven to encode or vacuously assert defective
behavior; see `review.md`.

## Complete Root Test Suite

Command:

```bash
CI=true npm test
```

Result: **Fail**.

- Test files: 284 passed, 1 failed, 285 total.
- Tests: 2,261 passed, 1 failed, 11 skipped, 2,273 total.
- Duration: 1,016.58 seconds.
- The no-cache Docker build contract passed in 489.74 seconds.
- Failure:
  `tests/clean-workspace-invariant.test.js:201` reports that the Dockerfile
  contains none of the documented deterministic workspace-install/build
  patterns.

The run also regenerated the timestamp in
`conductor/archive/cardigann_runtime_parity_20260223/artifacts/final-phase5-compatibility-matrix.json`;
that test-only mutation was restored and is not part of the audit changes.

## Focused False-Test Proof

Command:

```bash
CI=true npx vitest run \
  server/src/api/routes/manualTestFindings.regression.test.ts \
  server/src/api/routes/filesystemRoutes.test.ts \
  tests/gemini-track9-phase4-test-audit.test.ts \
  --reporter=verbose
```

Result: **Pass**, 3 files and 15 tests. The named cases passed despite never
calling the claimed production validation, accepting traversal success, or
discarding their computed audit failure set.

Default live-test gate:

- Cardigann gating assertions: 2 passed.
- Live Cardigann tests: 11 skipped unless `CARDIGANN_LIVE_TESTS=true`.

## Coverage

Command:

```bash
CI=true ./node_modules/.bin/vitest run server/src \
  --coverage \
  --coverage.include='server/src/**/*.ts' \
  --coverage.exclude='server/src/**/*.test.ts' \
  --coverage.exclude='server/src/**/*.d.ts' \
  --coverage.reporter=text \
  --coverage.reporter=json-summary
```

Result: **Pass execution / fail coverage sufficiency**.

- Test files: 178 passed.
- Tests: 1,739 passed, 11 skipped.
- Duration: 412.01 seconds.
- Statements: 60.62%.
- Branches: 51.05%.
- Functions: 62.93%.
- Lines: 61.43%.
- Production composition root `main.ts`: 0%.
- Route group: 49.46% statements / 40.50% branches.
- Repositories: 29.81% statements / 34.76% branches.
- Import-list services/providers: 0%.
- Notable route statement coverage: image 4.76%, quality profile 5.76%,
  import lists 9.43%, logs 11.26%, library 12.50%, blocklist 12.12%, backup
  15.06%, bulk import 15.09%, updates 18.18%.

Independent graph/source-to-test ownership analysis found:

- 46 of 184 production TypeScript files lack a direct indexed test importer.
- 27 production API endpoints lack direct behavioral coverage.
- Eight route modules lack direct test importers.
- Import-list providers and `ImportListSyncService` have no behavioral tests.

## Workspace Integrity

Commands:

```bash
python3 -m json.tool measure/tracks/chore_server_structure_integrity_audit_20260724/metadata.json
git diff --check
measure/generate.sh
measure/doctor.sh
git status -sb
```

Results:

- Metadata JSON validation: pass.
- `git diff --check`: pass.
- `measure/generate.sh`: unavailable; the repository contains no such script.
- `measure/doctor.sh`: unavailable; the repository contains no such script.
- The root Measure contract tests executed as part of `npm test` passed. The
  one root-suite failure is the Docker invariant documented above, not a
  Measure artifact failure.
- The Cardigann compatibility timestamp regenerated by tests was restored.
- Final pre-archive worktree contained only this track's metadata/plan/report/
  verification changes; the baseline track-registration commit was already
  present on `main`.

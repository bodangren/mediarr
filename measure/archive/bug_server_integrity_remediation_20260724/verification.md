# Verification: Server Integrity Remediation

## Closure Verdict

**Pass with one documented coverage exception.** Every confirmed C1-C3,
H1-H13, and M1-M5 finding from the source audit is fixed or made explicitly
fail-closed. The coverage exception below applies only to whole-file breadth,
not to functional closure. The production graph, strict typechecks, server and
SPA suites, root suite, production SPA build, workspace install, smoke
compilation, lint comparison, and live no-cache container build are green. The
implementation tree and verification runs were clean before these
closeout-document edits.

## Findings-to-Fix Matrix

| Finding | Implemented closure | Commits | Behavioral evidence |
|---|---|---|---|
| C1 — updater could overwrite the runtime | Installation now requires an exact supported asset, mandatory checksum, app-owned target, atomic replacement, and rollback; unsupported layouts fail closed. | `a5ede3c2` | Update success, checksum rejection, unsupported layout, rollback, and production-default target tests pass. |
| C2 — reversed import strategy and broken cross-volume behavior | Replaced destination-existence inference with explicit strategy: same-volume hard links preserve seeding; cross-volume imports use verified copy behavior. | `a5ede3c2` | ImportManager/Organizer filesystem tests cover hard-link, copy, cleanup, and failure paths. |
| C3 — non-atomic “transactions” | Repository writes use real synchronous installed-SQLite transactions rather than async callbacks or `Promise.all`. | `a5ede3c2` | Installed SQLite rollback tests prove partial writes do not survive failure. |
| H1 — backup contract/fabrication/WAL safety | Shared contracts, real list/create/download/restore, an explicit fail-closed schedule response, and SQLite-safe backup behavior replaced fixtures and timestamp-only responses. | `073610ac` | Fastify, service, WAL, restore, download, and explicit unsupported-scheduling tests pass. |
| H2 — fabricated logs | All log operations use the real log buffer and the SPA-compatible schema. | `073610ac` | List/detail/delete/clear/download/raw route tests operate on real injected state. |
| H3 — fake task history, queue, and events | Task/event routes now use persisted scheduler and event repositories; random outcomes and fixtures were removed. | `25ab9848` | Queue, run-now, history, event, restart, and failure-path tests pass. |
| H4 — Cardigann RSS falsely healthy | Cardigann RSS executes through the monolith runtime and unsupported/failing capability is reported truthfully. | `25ab9848` | RSS health and execution tests reject false zero-result success. |
| H5 — packs and multi-episode RSS matching | Matching expands packs and all episode numbers; linked imports persist against every applicable episode. | `25ab9848`, `bc861059` | Pack, partial multi-episode, existing-episode, and linked-import persistence regressions pass. |
| H6 — TMDB TV imports were no-ops reported as additions | Provider IDs are normalized across provider/SPA contracts, persistence is verified before incrementing, and each title receives a unique path. | `ba288fe5`, `474bbe4e` | Movie/series duplicate, unsupported ID, failed persistence, counter, and unique-path tests pass. |
| H7 — empty subtitles marked successful or stuck SEARCHING | Empty content is rejected before mutation; failures transition to retryable state with error metadata. | `ba288fe5` | Empty provider content, disk/DB failure, retry, and success-state tests pass. |
| H8 — torrent completion could move the shared root | Completion resolves containment path-aware, moves only the torrent payload, and handles cross-device copying safely. | `ba288fe5` | Rename arguments, sibling-prefix containment, missing child, EXDEV, and cleanup tests pass. |
| H9 — series variants persisted invalid `TV` | Series imports write `EPISODE`; schema typing, named SQLite `CHECK`, insert/update triggers, and migration normalization enforce `EPISODE`/`MOVIE`. | `8bd29f66`, `053582f8`, `44475abc` | Migration preserves valid children and normalizes legacy `TV`; invalid legacy rows fail transactionally; direct installed-SQLite repository tests reject `TV` before persistence and prove targeted history deletion. |
| H10 — quality-profile fallback hid invalid IDs | Unknown requested IDs and missing defaults return validation errors; literal foreign-key fallback was removed. | `26a1ca70` | Injected production-route tests assert exact status and repository non-invocation. |
| H11 — variant backfill/inventory disconnected | Backfill and inventory indexer are composed into startup/import lifecycle with idempotency and shutdown. | `8bd29f66` | Composition, repeat-run, import, and shutdown tests pass; graph confirms production reachability. |
| H12 — enabled embedded provider was a no-op | Unavailable embedded behavior is explicit; absent/empty download content cannot report success; real inventory path is composed. | `ba288fe5`, `8bd29f66` | Provider capability, empty-content, inventory, and composition tests pass. |
| H13 — one-way/incomplete route map | Contract now compares declared and runtime Fastify routes bidirectionally. | `d6c17340` | **222 production method/path pairs** match exactly; exclusions are only generated `HEAD` routes and the test-only registrar. |
| M1 — deletion suppressed partial failures | Deletion exposes partial cleanup failure and remains retryable instead of reporting false success. | `414b6813` | Database and filesystem failure/retry tests pass. |
| M2 — vacuous, permissive, or mislabeled tests | Self-fulfilling assertions were replaced with exact production behavior; pipeline suites are honestly named as orchestration units; generated conformance evidence is immutable. | `83524208`, `1a03848e`, `ff932e8a` | Traversal/error statuses, event source, required dynamic fields, modal backdrop, cutoff interaction, and artifact immutability tests fail on the former defects. |
| M3 — absent endpoint/subsystem coverage | Added direct Fastify coverage for blocklist, import lists/providers/exclusions, bulk import, quality profiles, image proxy, and library scan. | `b84defc9`, `962f1f77`, `d6c17340` | The implementation found **26**, not 27, absent production handlers: 4 blocklist + 10 import-list + 12 remaining. The audit's category arithmetic overstated import-list handlers by one; all 26 now have direct behavioral tests. |
| M4 — broken quality gates | Restored executable server test/typecheck/lint/smoke/install gates, isolated compiler output, reconciled the invariant, and repaired clean-image dependency preservation. | `12f40df5`, `f3e1ef79`, `53e27adf`, `a2ef176a` | Strict typecheck, smoke, lint comparison, frozen-install dry-run, root suite, and live Docker build are green. |
| M5 — cache watcher not stopped | `CatalogCache.unwatch()` and newly composed lifecycle services run during graceful shutdown. | `8bd29f66` | Lifecycle shutdown tests prove watcher/service cleanup. |

## Integrated Gates

| Gate | Result |
|---|---|
| Repo graph | Fresh graph: **21,092 nodes / 27,227 edges / 953 files**. No stale or missing graph entries. Production composition is visible for the newly wired services. |
| Server coverage suite | **199/199 files**; **1,914 pass / 11 skip**; **543.98s**. Overall production coverage: **67.11% statements / 57.01% branches / 69.47% functions / 68.06% lines**. |
| Touched-module coverage | **33/47** remediation-touched production modules are strictly above 80% statement coverage. The remaining 14 are explicitly accepted below; changed flows have focused success and failure tests. |
| Root suite | `CI=true npm test`: **309/309 files**, **2,491 pass / 11 skip**, **685.71s**. |
| SPA suite | `CI=true npm test --workspace=app` at `b289a467`: **204/204 files**, **1,960/1,960 tests**, **0 skipped**, **860.16s**; clean tree. |
| Type safety | Strict server typecheck and app typecheck pass. |
| SPA build | Production app build passes with **3,028 modules** transformed. |
| Lint | Server result is **1,527** legacy errors versus the locked **1,528** baseline, with **zero increases in changed files**. This track did not claim unrelated legacy lint removal. |
| Smoke/install | Isolated server smoke compilation and `npm ci --dry-run` pass. |
| Container | Live no-cache Docker invariant passes **3/3**; production build assertion completes in **298.667s**. |
| Patch hygiene | `git diff --check` passes; the implementation and authoritative gates began from clean trees. |

The SPA suite emitted existing non-fatal diagnostic classes: React `act(...)`
warnings, Radix Dialog accessibility/description warnings, invalid `<tr>`
nesting, and a duplicate list-key warning. They did not fail the authoritative
suite, are outside this server-integrity scope, and are not conflated with the
separate historical React-hooks lint warnings.

## Deviations and Closeout Residuals

- **H9 database-boundary residual:** Writing `EPISODE` in the route was
  insufficient while SQLite accepted arbitrary text. Closeout therefore added
  the named `CHECK`, compatibility triggers, transactional legacy
  normalization, and direct repository tests. No invalid `TV` row is retained.
- **Docker dependency-loss residual:** The first clean-image closeout run
  correctly exposed Vite's unresolved `@radix-ui/react-label` after
  `node_modules` crossed a Podman overlay layer. The Dockerfile now copies
  manifests, postinstall tooling, and source before one frozen `npm ci` plus
  SPA-build `RUN`; the authoritative root and live Docker gates pass.
- **SPA concurrency/false-test residual:** The initial app closeout run exposed
  worker timeouts plus a permissive enabled-button assertion. Vitest now uses
  bounded isolated forks, and required dynamic fields/backdrop/cutoff tests
  exercise mandatory interactions. The authoritative 1,960-test run is green.
- The July app-failure umbrella is now historically resolved by the
  authoritative suite. Its focused split tracks may still need independent
  registry reconciliation; that bookkeeping is outside this server track.
- No interactive browser, network, or visual verification was required for
  these server integrity contracts. Environment-gated live Cardigann tests
  account for the server suite's 11 skips and were not presented as executed.

## Accepted Coverage Exception

The following 14 touched production modules did not reach the strict
greater-than-80% statement threshold in the bounded server coverage run:

| Module | Statements | Branches | Functions | Lines | Rationale |
|---|---:|---:|---:|---:|---|
| `api/createApiServer.ts` | 57.73% | 40.47% | 33.33% | 58.33% | Large composition/error surface; changed registrars are covered through route and lifecycle integration tests. |
| `api/routeMap.ts` | 0% | 100% | 100% | 0% | Declarative contract data is exercised by the exact bidirectional 222-pair route test, but V8 does not attribute statement execution through the test import shape. |
| `api/routes/mediaRoutes.ts` | 65.06% | 54.26% | 65.21% | 64.41% | Broad legacy route module; changed quality-profile and deletion flows have direct success/failure tests. |
| `api/routes/seriesRoutes.ts` | 40.60% | 30.71% | 17.39% | 41.24% | Broad legacy route module; changed import, ID, path, and `EPISODE` persistence flows are directly covered. |
| `api/routes/subtitleRoutes.ts` | 46.62% | 37.50% | 43.42% | 46.57% | Broad provider surface; changed truthful capability and empty-content paths are directly covered. |
| `db/drizzleClient.ts` | 30.87% | 18.31% | 43.93% | 33.01% | Shared database façade; changed transaction and constraint behavior is proven against installed SQLite. |
| `db/schema.ts` | 63.15% | 100% | 36.36% | 63.15% | Declarative schema; H9 is additionally enforced by real DDL, triggers, migration, and repository tests. |
| `main.ts` | 0% | 0% | 0% | 0% | Process composition root is not directly executed in Vitest; extracted lifecycle/composition contracts and graph reachability cover the changed wiring. |
| `repositories/MediaRepository.ts` | 37.50% | 65.90% | 44.44% | 43.68% | Large repository; changed atomic season/episode transactions have installed-SQLite rollback tests. |
| `repositories/SubtitleVariantRepository.ts` | 7.14% | 23.44% | 5.55% | 7.20% | Snapshot preceded the final direct repository test; `44475abc` subsequently proves invalid `TV` rejection and targeted history deletion against installed SQLite. |
| `services/FfprobeMetadataProbe.ts` | 80.00% | 0% | 66.66% | 80.00% | Misses the specification's strict “greater than 80” wording by equality; exercised through inventory lifecycle tests. |
| `services/SubtitleInventoryApiService.ts` | 68.66% | 45.76% | 54.71% | 69.52% | Broad orchestration module; changed provider/empty-content behavior has focused failure tests. |
| `services/TorrentManager.ts` | 72.34% | 66.21% | 54.79% | 73.71% | Broad torrent runtime; changed containment, payload selection, and EXDEV paths are directly covered. |
| `services/UpdateService.ts` | 78.04% | 66.21% | 72.34% | 78.81% | Near threshold; every safety-critical install decision and rollback path added by this track has focused tests. |

This is a whole-file legacy/composition exception, not an exception for the
remediated behavior. The 47-module denominator is the bounded production-file
set touched from the remediation base through the stable coverage commit.

## Final State

All source-audit findings have traceable implementation and behavioral
evidence. The graph and gates agree with the monolith's production structure,
false tests no longer make the repaired contracts green, and no unresolved
server-integrity blocker remains. The track is ready for plan completion,
metadata closeout, registry reconciliation, and mandatory archival.

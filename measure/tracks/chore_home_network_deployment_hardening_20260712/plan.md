# Implementation Plan: Home Network Deployment Hardening

## Phase 1: Deployment Contracts and Startup Guards

- [x] Add failing focused tests for encryption-key validation and persistent database/config initialization; establish their red result. Evidence: `CI=true npx vitest run server/src/config/startup.test.ts` failed before implementation because `./startup` did not exist.
- [x] Implement fail-closed encryption and persistent-storage startup guards, then prove the focused tests are green. Evidence: `server/src/config/startup.test.ts` is 9/9 green; preflight rejects blank/example keys, inaccessible config storage, out-of-config DB URLs, and no longer falls back to a local DB.
- [x] Record exact Docker/Podman boundary assumptions and update plan evidence. Evidence: README now scopes the supplied Compose file to Docker Engine and explicitly excludes Podman `keep-id`/`:Z` settings.

## Phase 2: Docker Engine and Migration Reliability

- [x] Add failing deployment contract checks for Docker Compose rendering and migration command selection. Evidence: `CI=true npx vitest run tests/deployment-hardening.test.js` was red (4 failures), then green (4/4).
- [x] Replace Podman-only compose settings and destructive/ignored schema push with Docker-compatible identity mapping and failing versioned migration startup. Evidence: Compose uses required `PUID:PGID`; Dockerfile runs preflight then `drizzle-kit migrate` with `&&`; fresh `/tmp` preflight+migration recorded 4 rows in `__drizzle_migrations`. Added missing `0003` journal entry and statement breakpoint.
- [x] Add `.dockerignore` exclusions and a healthcheck; verify image build and compose rendering. Evidence: deployment contract test verifies exclusions and healthcheck; `docker compose config` rendered through this host's Podman alias. Docker Engine image build remains environment-gated (see Phase 4).

## Phase 3: Operational Recovery Documentation

- [x] Document and validate a SQLite-safe host backup/restore rehearsal, upgrade, rollback, filesystem ownership, and LAN smoke procedure. Evidence: README contains host `sqlite3 .backup`, `integrity_check`, restore rehearsal, PUID/PGID ownership, and media-backup boundary commands.
- [x] Correct deployment documentation to match actual health responses, networking, and supported runtime. Evidence: README documents host networking, the no-auth trusted-LAN caveat, Docker-only support, and the `/api/health` success envelope/check predicate.

## Phase 4: Release Verification and Closeout

- [x] Replace the Docker builder's unlocked, nested workspace install with one root lockfile install; prove the Vite dependency graph resolves from it. Evidence: the focused contract was red before the change and is 5/5 green afterward; `podman build --tag mediarr:deployment-check .` is green. The Dockerfile now uses `npm ci --workspaces --include-workspace-root`, so its single root tree is pinned by `package-lock.json` and Vite resolves both `@radix-ui/react-slot` and `msw/browser` without an unlocked `app/node_modules` overlay.
- [x] Run targeted tests, app build/typecheck, Docker Compose render, image build, container mount/identity/persistence smoke checks, and trusted-LAN health check. Evidence: `CI=true npx vitest run server/src/config/startup.test.ts tests/deployment-hardening.test.js` is 14/14 green; `podman build --tag localhost/mediarr:deployment-check .` is green. The apparent runtime failure was rootless Podman UID translation, not Node/Bun incompatibility: direct `--user 1000:1000` made the host-UID-owned `/config` appear unwritable and correctly failed preflight with `EACCES`. A fresh host-network smoke using the separate Podman-only `:U` mount diagnostic ran as `1000:1000`, wrote both mounts, applied 5 migrations, served `/api/health`, then restarted against the same DB and served health again. Retained logs from `mediarr-runtime-final-first` and `mediarr-runtime-final-restart` show migration success and `Mediarr API listening`. Docker Engine compose semantics remain unchanged; README documents the Podman diagnostic boundary. `docker compose config` rendered through this host's Podman alias.
- [x] Reconcile all deployment changes, update Measure evidence, and prepare the track for final acceptance. The runtime issue is resolved as an invocation/UID-namespace diagnosis; no production guard was weakened and no commit was made per user request.

## Phase 5: Migration Upgrade Compatibility Remediation

- [x] Add a versioned, auditable compatibility path for pre-existing valid SQLite databases whose schema was advanced by legacy `drizzle-kit push` or scheduler runtime repair without corresponding journal records; prove fresh and upgrade migration fixtures. Evidence: `migrationCompatibility.test.ts` validates (a) a legacy `AppSettings` database with both scheduler columns but only 0000–0002 journal rows, (b) a legacy shape with neither scheduler column upgraded by tracked 0003/0004, and (c) a valid push-created database with no journal. The reconciliation utility hashes checked-in SQL and records only structurally verified migrations in `__drizzle_migrations`; it rejects out-of-order/mismatched columns and invalid push baselines.
- [x] Remove application-runtime schema DDL and ensure container startup relies only on tracked migrations. Evidence: `AppSettingsRepository` no longer executes `PRAGMA table_info` or `ALTER TABLE`; Docker invokes the compatibility ledger reconciliation before `drizzle-kit migrate`, with all pending schema DDL still applied by Drizzle migration files.
- [x] Update deployment documentation and Measure registry evidence, then run focused migration, build, and runtime smoke verification without changing trusted-LAN/no-auth scope. Evidence: README documents the compatibility/rehearsal path and journal audit record; 50 focused tests are green; app production build and `podman build --tag localhost/mediarr:migration-compatibility-check .` are green. Fresh rootless-Podman `:U` mount smoke applied 5 migrations and returned `/api/health` `ok:true`. No trusted-LAN/no-auth behavior changed. Per the user instruction, this active track remains unarchived and no commits were created.

## Phase 6: Operational Fail-Closed Remediation

- [x] Add failing contract tests for unwritable `/data` paths, torrent-engine initialization failure, unsafe no-journal schema adoption, and host migration target parity. Evidence: the initial focused run was red with 8 failed tests plus the expected missing `createRuntimeTorrentManager` module; failures covered all four configured data-path roles, retained fake fallback code, both migration-target docs, and an all-table-names-present `Category` shape drift.
- [x] Make startup fail before health readiness when configured data paths cannot be written, and remove the fictional database-only torrent fallback. Evidence: `DataDirectoryInitializer` now probes write/delete access; production startup awaits download plus configured movie/TV roots without a swallowing catch; the extracted torrent-manager seam propagates import/initialization failure and the database-only implementation was deleted.
- [x] Strengthen no-journal legacy-schema verification and correct the host migration instructions to use the deployment database. Evidence: no-journal adoption compares normalized table/index SQL for every schema object with a baseline built from checked-in migrations; the adversarial same-table-name/drifted-`Category` fixture is rejected without creating a journal. README uses `DATABASE_URL="file:$CONFIG_DIR/mediarr.db" npm run migrate`, and `.env.example` no longer supplies a conflicting standalone database default.
- [~] Run focused tests, full server/app/Flutter validation, image build, and disposable runtime smoke; record Docker Engine and physical-device checks as human-gated if unavailable. Evidence: full SPA is 204 files / 1952 tests green; root server/integration suite is 283 files / 2257 tests green (11 intentional live-provider skips); Flutter is 290 tests green and `flutter analyze` is clean; `npx tsc -p server/tsconfig.json --noEmit` is clean. Fresh `podman build --layers=false --tag localhost/mediarr:release-acceptance .` passed, and a disposable UID:GID 1000:1000 `--userns=keep-id` runtime applied migrations, reported `/api/health` `ok:true`, and remained healthy after restart. Physical Docker Engine and Android/LAN playback checks remain human-gated because this host's `docker` command is Podman 4.9.3.
- [x] Remediate release-review findings: prove fresh deployments reject an unwritable `/data` mount even before settings are configured, and make scheduler toggles await durable persistence before returning success. Evidence: the TDD red run (`CI=true npx vitest run tests/data-directory-initializer.test.js server/src/services/Scheduler.toggle-persistence.test.ts server/src/api/routes/schedulerRoutes.toggle.test.ts`) failed 5/24 assertions because blank settings had no default-path resolver and toggle persistence failures were swallowed. `resolveRequiredDataDirectories` now fills the four required `MEDIA_DIR` defaults while preserving custom roots, and `DataDirectoryInitializer` accepts an injected filesystem for the fresh/unwritable regression. `Scheduler.toggleEnabled` now awaits persistence before changing live state, and the route awaits it so write failures return an error rather than success. The focused 8-file startup/scheduler/route run is 117/117 green. Server strict typecheck is now clean after correcting the remaining test-fixture diagnostics.
- [~] **Phase 6 architectural fix — STILL OPEN. Root cause narrowed substantially; the attempted fix did NOT resolve it.**

  > **Retraction (2026-07-27, same session).** An earlier version of this entry claimed the defect was resolved on the strength of one green no-cache build. That was wrong. A second no-cache build, run as part of the full root suite **with the split-layer change already in place** (build log confirms `STEP 8/9: RUN npm ci --workspaces --include-workspace-root` then `STEP 9/9: RUN npm run build --workspace=app`), failed again — this time on `@radix-ui/react-dialog` from `command.tsx` rather than `@radix-ui/react-select` from `select.tsx`. **One green run of an intermittent failure is not evidence of a fix.** The split-layer change has been kept (it is harmless and narrows the repro), but it is not the remedy.

  **The defect was misdiagnosed for two weeks.** Every one of the four documented remediation patterns (a)–(d) targets npm's *install layout*, on the assumption that a dependency was missing or unhoisted. Source verification disproved that. An in-layer probe (`Dockerfile.probe`, discarded after use) showed the install was already correct on a clean `--no-cache` build: `node_modules/@radix-ui/react-select` was present and complete (`dist/`, `package.json`), `app/node_modules` held only `@types` and `globals`, and 25 `@radix-ui` packages were hoisted to the root. `npm ci --workspaces --include-workspace-root` was also exonerated directly — reproduced under the container's exact `npm 10.8.2` on `node:20-slim` with only the manifests mounted, and it installed `@radix-ui/react-select` correctly.

  > **Second retraction (2026-07-27, later session).** The paragraph below claimed the root cause was the shared `RUN` layer / overlay write-visibility. **That is disproven.** See "Instrumented investigation" further down: a probe placed *inside the failing build layer* shows every dependency present and resolvable immediately before and after rollup fails, and `tsc -b` resolves the same specifier seconds earlier in the same command. The layer-split change is retained (harmless, and the separation is good practice) but it is **not** the mechanism, and no claim in the paragraph below should be relied on.

  **~~Actual root cause: the install and the SPA build shared one `RUN` layer.~~** *(Superseded — see the retraction above.)* Running `npm run build --workspace=app` from the *committed* install layer transformed 3028 modules and produced `dist/`; running the identical build in the same layer as `npm ci` aborted after 158 modules with `Rollup failed to resolve import "@radix-ui/react-select" from "/app/app/src/components/ui/select.tsx"`. The inference drawn from this — that committing the install layer forces the overlay filesystem to publish written entries before Vite's resolver walks `node_modules` — was an untested explanation for a two-sample difference, and later probing contradicts it.

  **The prior Red gate was locking in the bug.** Commit `53e27adf` ("fix(docker): build SPA in frozen install layer") *moved the build into the install layer* and rewrote `tests/clean-workspace-invariant.test.js` to assert exactly that shape — `expect(npmRuns).toEqual(['RUN npm ci --workspaces --include-workspace-root && npm run build --workspace=app'])`. The registry's claim that this gate was "in place and failing by design" was false: it was **passing** at HEAD and pinning the broken Dockerfile. The test now asserts the real invariant — install and build in separate `RUN` layers, install first.

  **Evidence across three no-cache builds.**

  | Run | Dockerfile shape | Result | Failing module |
  |---|---|---|---|
  | 1 (05:57) | combined `RUN npm ci … && npm run build` | FAIL | `@radix-ui/react-select` from `select.tsx` |
  | 2 (06:16) | split install / build layers | **PASS** (3/3, 623s) | — |
  | 3 (06:27, full suite) | split install / build layers | FAIL | `@radix-ui/react-dialog` from `command.tsx` |

  Runs 2 and 3 used the **same Dockerfile**. The failure is therefore **intermittent and the module varies per run** — consistent with the historical reports in `clean-workspace-build.test.js` (`cookie`, `@radix-ui/react-progress`, `msw/browser`, `@radix-ui/react-dialog`), which is exactly why that test asserts the failure *family* rather than a module name.

  **What is now positively ruled out** (each disproved by direct probe, not reasoning):
  - *Missing/unhoisted dependency.* An in-image probe after a clean `--no-cache` install showed `node_modules/@radix-ui/react-select` complete (`dist/`, `package.json`) and 25 `@radix-ui` packages hoisted to the root. `app/node_modules` contained only `@types` and `globals`.
  - *The `npm ci --workspaces --include-workspace-root` flags.* Reproduced under the container's exact `npm 10.8.2` on `node:20-slim` with only the manifests mounted: `@radix-ui/react-select` installed correctly.
  - *Host disk pressure.* `df -h /` → `233G 171G 51G 78% /` at run time; the strategy §6 escape hatch does not apply.
  - *A Vite/source defect.* `npm run build --workspace=app` run from the **committed** install layer (`podman run` on the probe image) transformed 3028 modules and produced `dist/` successfully.

  ### Instrumented investigation (2026-07-27, later session) — mechanism still UNKNOWN, but the search space is now much smaller

  The overlay hypothesis above was tested and **failed**. The storage driver on this host is
  **kernel-native `overlay`** (`podman info` → `graphDriverName: overlay`, `Native Overlay Diff: true`),
  not `fuse-overlayfs`, which already weakened it. Rather than run the recommended
  `--layers=false` / `--storage-driver=vfs` builds, a cheaper and more direct probe was used:
  resolve every `app` dependency **from inside the failing build layer**, immediately before
  rollup runs and again after it fails.

  **Probe result on two consecutive reproduced failures:**

  ```
  [PROBE-PRE]  deps=47 unresolved=[]   radix_pkgs=37 radix_missing_pkgjson=[]
  ✓ 132 (resp. 143) modules transformed.
  [vite]: Rollup failed to resolve import "@radix-ui/react-dialog" (resp. react-checkbox)
  [PROBE-POST] deps=47 unresolved=[]   radix_pkgs=37 radix_missing_pkgjson=[]
  ```

  All 47 declared `app` dependencies resolve from `/app/app/` **before and after** the failure,
  and all 37 `@radix-ui` packages are complete. Independently, `app`'s build script is
  `tsc -b && vite build`, and `tsc -b` **passes** — it cannot, since `app/src` is in
  `tsconfig.app.json`'s `include` and an unresolvable module would raise TS2307 before vite starts.
  **The files are present, complete, and resolvable by both Node and TypeScript at the moment
  rollup says they are not.**

  **Now positively excluded** (each by direct measurement):

  | Hypothesis | How it died |
  |---|---|
  | Missing / unhoisted dependency | `[PROBE-PRE/POST]` — 47/47 resolvable, 37/37 radix complete |
  | Overlay write-visibility / layer commit | Same probe; also driver is native `overlay`, not fuse |
  | `npm ci` flags | Previously exonerated; re-confirmed |
  | Vite / source defect | Host builds 3/3 green, 3028 modules |
  | Node runtime version | `node:20-slim` (20.20.2) over a bind mount: **5/5 green** |
  | npm version (10.8.2 vs 10.9.8) | Control arm, stock 10.8.2 + added layer: **3/3 green** |
  | File-descriptor exhaustion | `ulimit -n` = 1048576 soft *and* hard, host and container |
  | Disk pressure | 43 GB free at the moment of failure |
  | Memory pressure | Load arm (concurrent host builds, 1.55–1.77 GB available): **3/3 green** |

  **Reproduced twice, then stopped reproducing.** Two clean `--no-cache` builds failed early in
  the session (17:19 and 17:27, at 132 and 143 modules, a different module each time). **Every
  subsequent build passed: 13 consecutive green clean-image builds** (Node 22 ×2, npm 10.9.8 ×2,
  npm 10.8.2 control ×3, true baseline ×3, load arm ×3), plus 5 bind-mount builds and 3 host
  builds. The true baseline — byte-identical layer structure to the production `Dockerfile` — is
  **3/3 green**, so the defect is **not currently reproducible on demand**, and no arm measured
  after the two failures can be read as a fix.

  **Methodological warning for the next role.** The Node 22 and npm 10.9.8 arms both looked like
  fixes. They were not: every passing arm had gained an extra `RUN` layer in the base stage that
  the two failing arms lacked. A control holding Node 20 + stock npm 10.8.2 and changing only that
  layer went 3/3 green, which killed both version hypotheses at once. **Do not accept any arm here
  without a control that changes nothing else** — and note that with a base rate of ~2 failures in
  16 builds, an arm needs far more than 3 green runs to mean anything.

  **What the next role should do — in this order:**
  1. **Do not change the `Dockerfile` chasing this.** Nothing measured supports any of the four
     `test-strategy.md` §3 remediation patterns; all four assume an install-layout defect that is
     disproven. The current split-layer shape is fine on its merits, but it is not a fix.
  2. **Instrument, don't guess.** The one decisive artefact never captured is vite's own resolver
     trace on a failing run. Wrap the SPA build so a failure re-runs it under `DEBUG=vite:resolve`
     and prints the trace for the failing specifier. That converts the next spontaneous occurrence
     into a mechanism instead of another inference. (Note: buildah 1.33 / podman 4.9.3 does **not**
     support Dockerfile heredocs — use single-line `RUN … || ( … )`, escaping `\$` for shell vars.)
  3. **Get the heavy build out of the unit suite.** `tests/clean-workspace-build.test.js` shells out
     to `docker build --no-cache` — 7–13 minutes, and potentially twice — from inside
     `CI=true npx vitest run`. That is why suite runs are slow and why the 06:27 failure got
     entangled with a suite run. Move it to an explicit acceptance script.
  4. **Fix `tests/clean-workspace-invariant.test.js`.** It still pins the exact Dockerfile shape
     (`expect(npmRuns).toEqual([...])`) — the same anti-pattern this track already recorded a lesson
     about, just pinning a different shape. It will reject any future remediation.

  Structural gates remain green: `tests/clean-workspace-invariant.test.js` + `tests/deployment-hardening.test.js` → 10/10.

- [x] Phase 6 Red contract: capture the reproducible clean-image workspace dependency-resolution failure as a durable, falsifiable Red. Evidence: the original `tests/clean-workspace-build.test.js` (commit `13ea7272`) used the heavy `docker build --no-cache` invocation as its Red contract; that proved non-deterministic (exit 0 on the host's podman alias), violating TDD. Remediation: added `tests/clean-workspace-invariant.test.js` as the **deterministic** Red gate. The new test enforces the structural-semantic invariant from test-strategy.md §3 paragraph 5: the Dockerfile (or `app/vite.config.ts`) must include at least one of four documented remediation patterns that make Vite/Node resolution INDEPENDENT of npm's hoisting choices — (a) `RUN npm install --workspace=app` / `RUN npm ci --workspace=app`, (b) per-workspace `RUN npm ci --workspace=app` / `RUN cd app && npm ci`, (c) explicit `resolve.alias` block in `app/vite.config.ts` mapping `app` direct deps (bare or subpath) to specific paths, or (d) `COPY --from=builder /app/app/node_modules`. The test matches each pattern as a FAMILY of regexes (no stale single-phrase assertion), filters option (c) so a placeholder alias block without any `app` dep reference does not satisfy the invariant, and explains in the failure message why each pattern prevents the `Rollup failed to resolve import "<dep>" from "/app/..."` family. The test is bounded (~17 ms; no subprocess, no docker), deterministic (reads `Dockerfile` and `app/vite.config.ts` directly), and family-level (anti-pattern A5 — no specific module name asserted). The heavy `tests/clean-workspace-build.test.js` is preserved as a **Green/acceptance gate** because the live no-cache build is required to verify the actual reproducibility end-to-end; the new Red gate does not need to repeat it. Aggregate Red run on this HEAD with the corrected deterministic contract: `Test Files 1 failed | 7 passed (8); Tests 1 failed | 47 passed (48)`; existing 7 files / 47 tests baseline preserved (47/47 PASS); the 1 new failure is `tests/clean-workspace-invariant.test.js` with the documented invariant-violation message. Verification of all four Green patterns (a)/(b)/(c)/(d) against the new test: each pattern as a family is accepted (option (c) with a placeholder alias block without any `app` dep reference is correctly rejected). Disk pressure snapshot: `df -h /` → `233G 208G 14G 95% /` (labelled integer, anti-pattern A3). Phase 6 remains incomplete: the architectural fix (one of strategy §3 options (a)/(b)/(c)/(d)) is unowned and is the next role's work.

# Plan: Remaining Server Service Test Coverage

## Phase 1: Discovery & Contract Mapping
- [x] Read all 7 remaining service source files (`server/src/services/`) and document public method signatures, constructor dependencies, and external I/O (DB, filesystem, network, other services) in this plan.
- [x] Identify existing test helpers and mock factories to reuse from sibling suites (e.g. `MediaSearchService`, subtitle services).
- [x] Flag any service whose real branch surface lives in a collaborator (cf. the `SettingsService`/`AppSettingsRepository` lesson) and re-target the coverage goal before writing tests.
- [ ] Commit: `docs(measure): map remaining server service contracts for test coverage`

### Measured baseline (2026-07-28) — "no sibling test" is NOT "untested"

Measured with `CI=true npx vitest run server/src tests --coverage` scoped to the 7 target
files, so these are real numbers from the whole suite, not estimates. Suite state at baseline:
**313 files passed / 1 skipped, 2711 passed / 14 skipped, 0 failures.**

| Service | LOC | % Branch | % Stmt | Meets ≥80% branch? | Real gap |
|---|---|---|---|---|---|
| `ActivityEventEmitter` | 19 | **0** | 0 | no | Zero coverage, but only 1 branch exists |
| `MetadataGenerator` | 85 | **38.88** | 40.9 | no | **Largest true gap** (`downloadPoster`, `escapeXml`) |
| `MetadataProvider` | 360 | 60.22 | 76.92 | no | Largest surface; error paths uncovered |
| `LibraryScanner` | 109 | 71.42 | 84 | no | Inaccessible-path branches (22-23, 64-65) |
| `ProbeMetadataParser` | 196 | 75.51 | 88.33 | no | Close; normalisation edge cases |
| `DataDirectoryInitializer` | 65 | **90** | 100 | **already yes** | Only line 22 (`mediaDir` default) |
| `WantedService` | 35 | **100** | 66.66 | **vacuous** | Has zero branches; line 33 uncovered |

**Two re-targets, recorded rather than papered over (the `SettingsService` lesson):**

- **`DataDirectoryInitializer` already satisfies the acceptance criterion at 90% branch**, covered
  indirectly by `tests/data-directory-initializer.test.js` from the deployment-hardening track. A
  sibling test is still worth adding for locality and for the uncovered `mediaDir.trim() || '/data'`
  fresh-install default, but this service must not be counted as "closed a coverage gap".
- **`WantedService` reports 100% branch because it contains no branches at all** — the same
  unfalsifiable target as `SettingsService`. Its real risk lives in the `DatabaseClient` shim.
  `getCutoffUnmetEpisodes` (line 33) is uncovered and is a documented stub that returns
  `getMissingEpisodes()` while its name and API promise cutoff-unmet semantics.

**Work is therefore ordered by measured gap, not by LOC as Phases 2/4 assume:**
`MetadataGenerator` → `MetadataProvider` → `LibraryScanner` → `ProbeMetadataParser` →
`ActivityEventEmitter` → `DataDirectoryInitializer` → `WantedService`.

### Contract map

| Service | Deps (injected) | External I/O | Mock strategy |
|---|---|---|---|
| `ActivityEventEmitter` | `ActivityEventRepository?` | none directly | Plain object stub; assert delegation + the no-repo early return |
| `WantedService` | `prisma: any` (Drizzle `DatabaseClient`) | DB | Stub `episode.findMany`; assert the query shape |
| `DataDirectoryInitializer` | `directories: string[]`, `filesystem` | fs | **Injected fs adapter already exists** — use it, do not mock `node:fs` |
| `MetadataGenerator` | `HttpClient` | fs + HTTP | Stub `HttpClient.get`; temp dirs for fs |
| `LibraryScanner` | `prisma: any` | fs + DB + `releaseParser` | Temp dirs; `vi.mock('./ReleaseParser')` |
| `ProbeMetadataParser` | none | none | **Pure** — no mocks needed |
| `MetadataProvider` | `HttpClient`, `SettingsService` | HTTP (SkyHook + TMDB) | Stub both; `fetchFn` param is already a seam |

**Reusable seams found:** `DataDirectoryInitializer` and `MetadataProvider` already accept
injection points (`filesystem`, `fetchFn`), so neither needs module mocking. `ProbeMetadataParser`
is a pure function object. Only `LibraryScanner` requires `vi.mock` (for `releaseParser`).

### Findings

**RESOLVED BY DELETION (owner decision, 2026-07-28) — `MetadataGenerator` was dead production
code.** Repo-wide grep (`*.ts`/`*.tsx`/`*.js`, excluding `node_modules`) found exactly two
references outside its own definition, both in `tests/metadata-generator.test.js`. It was never
imported by `main.ts`, any route, or any other service, and never constructed in production. An
≥80% branch target on it would have certified unreachable code.

`server/src/services/MetadataGenerator.ts` and `tests/metadata-generator.test.js` are deleted.
**6 services remain in scope, not 7.**

The owner's stated concern was losing artwork. Verified false on three independent grounds
before deleting:

1. **Artwork is never stored locally.** Posters are remote URLs — `movieRoutes.ts:381` writes
   `https://image.tmdb.org/t/p/w500${...}` into `posterUrl` — and are rendered straight from the
   CDN by `<img src={movie.posterUrl}>` (`MovieDetailPage.tsx:206`, `SeriesDetailPage.tsx:419`).
   Nothing reads a local image file.
2. **`downloadPoster` had no callers**, so it never fetched anything; its `poster.jpg` output was
   read by nothing regardless.
3. **Its `.nfo` generation was duplicated** by `Organizer.colocateMovieMetadata`, a generic and
   already-tested equivalent.

What the deletion gives up is not artwork but an unfinished, never-wired feature: local sidecar
files for external scrapers (Kodi/Jellyfin/Plex). That capability was already absent at runtime.

**Related finding, left in place:** `Organizer.colocateMovieMetadata` is *also* never called in
production (`grep` finds it only in `Organizer.ts` and its test). Local metadata-sidecar
generation is therefore entirely unimplemented, not merely duplicated. Not deleted — it is the
better foundation if the feature is ever wanted, and removing it is outside this track's scope.
Logged in `tech-debt.md`.

**Two defects confirmed in the deleted file** — recorded because they were real and because they
must not be reintroduced if sidecar generation is ever built on `Organizer`:

1. `generateSeriesMetadata` guards `overview`/`network` with `|| ''` but passes `series.title` and
   `series.status` to `escapeXml` **unguarded** — `undefined.replace(...)` throws. Inconsistent
   within a single template. The existing test passes only because its fixture supplies every field.
2. `downloadPoster` does `Buffer.from(response.body, 'binary')` where `body` came from
   `HttpClient.toHttpResponse` → `await response.text()`, i.e. **already UTF-8-decoded**
   (`HttpClient.ts:98`). JPEG bytes that are not valid UTF-8 were replaced with U+FFFD during
   decoding, and latin1 re-encoding cannot recover them. **Every poster this method writes is
   corrupt.** The source comment admits the author was unsure; the answer is that it does not work.
   Fixing it needs an `arrayBuffer()` path on `HttpClient`, which is a production change beyond
   this track's scope — route it out if the service is kept.

**Open candidate (not yet confirmed):**

3. `LibraryScanner.getAllFiles` recurses with no error handling — one unreadable subdirectory
   aborts a whole library scan, and a symlink loop recurses without bound. The `fs.access` guard
   covers only the root. This service **is** wired in production, so a confirmed defect here is live.

**Cleared while reading:** `WantedService` takes `prisma` and uses Prisma nested-relation syntax
(`series: { monitored: true }`), which looked like unmigrated residue that would fail against
Drizzle. It does not — the shim implements nested relation filters (`drizzleClient.ts:1190`) and
the service is wired to a live route (`mediaRoutes.ts:142`). Naming residue only, not a defect.

> **Scope note (2026-07-28):** `ReleaseParserProvider` is **claimed and closed** by
> `bug_ai_release_parser_lockdown_20260728`, which rewrote the file and shipped
> `ReleaseParserProvider.test.ts` (73 tests, 100% branch/stmt/func/line). Do not
> re-plan or re-test it here — 7 services remain, not 8.

## Phase 2: Red Tests — Small Services (ActivityEventEmitter, DataDirectoryInitializer, ~~ReleaseParserProvider~~, WantedService)
- [ ] Add failing sibling tests for `ActivityEventEmitter` (emit/subscribe/unsubscribe behaviour).
- [ ] Add failing sibling tests for `DataDirectoryInitializer` (directory creation, idempotency, permission-error path) using temp dirs.
- [x] ~~Add failing sibling tests for `ReleaseParserProvider`~~ — done by `bug_ai_release_parser_lockdown_20260728`.
- [ ] Add failing sibling tests for `WantedService` (wanted-list queries, monitored filtering, empty results).
- [ ] Run the four new suites and confirm they fail for the intended reasons (Red).
- [ ] Commit: `test(server): add red tests for small uncovered services`

## Phase 3: Green Tests — Small Services
- [ ] Make the Phase 2 tests pass — fix genuine defects only; do not reshape services to fit test assumptions.
- [ ] Verify ≥80% branch coverage on each of the four services (or document why the target is unfalsifiable).
- [ ] Commit: `test(server): green small-service coverage suites`

## Phase 4: Red Tests — Large Services (LibraryScanner, MetadataGenerator, MetadataProvider, ProbeMetadataParser)
- [ ] Add failing sibling tests for `LibraryScanner` (path walking, file filtering, error handling) with temp-dir fixtures.
- [ ] Add failing sibling tests for `MetadataGenerator` (sidecar generation, naming, overwrite behaviour).
- [ ] Add failing sibling tests for `MetadataProvider` (provider resolution, response mapping, failure/timeout paths) with injected HTTP mocks.
- [ ] Add failing sibling tests for `ProbeMetadataParser` (well-formed probe output, missing fields, malformed JSON).
- [ ] Run the four new suites and confirm they fail for the intended reasons (Red).
- [ ] Commit: `test(server): add red tests for large uncovered services`

## Phase 5: Green Tests — Large Services
- [ ] Make the Phase 4 tests pass — fix genuine defects only, each with its own regression test.
- [ ] Verify ≥80% branch coverage on each of the four services (or document why the target is unfalsifiable).
- [ ] Commit: `test(server): green large-service coverage suites`

## Phase 6: Regression & Closeout
- [ ] Run `CI=true npx vitest run server/src tests` and confirm no regressions; re-run gates after the last edit, not before.
- [ ] Run `npx tsc -p server/tsconfig.json --noEmit` and confirm zero diagnostics.
- [ ] Record final coverage numbers in this plan (tests start/end, branch % start/end per service).
- [ ] Update `measure/tech-debt.md`: mark the "8 of 55 server services still lack a sibling .test.ts" row Resolved (or amend with verified residuals).
- [ ] Update `measure/tracks.md` to archive this track.
- [ ] Commit: `docs(measure): close out remaining server service coverage track`

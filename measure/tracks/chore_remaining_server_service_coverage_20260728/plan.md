# Plan: Remaining Server Service Test Coverage

## Phase 1: Discovery & Contract Mapping
- [x] Read all 7 remaining service source files (`server/src/services/`) and document public method signatures, constructor dependencies, and external I/O (DB, filesystem, network, other services) in this plan.
- [x] Identify existing test helpers and mock factories to reuse from sibling suites (e.g. `MediaSearchService`, subtitle services).
- [x] Flag any service whose real branch surface lives in a collaborator (cf. the `SettingsService`/`AppSettingsRepository` lesson) and re-target the coverage goal before writing tests.
- [x] Commit: `docs(measure): map remaining server service contracts for test coverage` (`55b03417`)

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

**CONFIRMED BY TEST, and live:**

3. `LibraryScanner.getAllFiles` recurses with no error handling — one unreadable subdirectory
   rejects the whole `scanSeries`/`scanMovie` call, and the `fs.access` guard covers only the scan
   root. Worse than first described: the walk collects every path *before* parsing any, so an abort
   mid-walk links **nothing**, not even files already enumerated from readable directories. This
   service **is** wired in production, so the defect is live — a user migrating a messy library hits
   it on one bad permission bit and sees a silent no-op. Pinned by characterisation tests in
   `LibraryScanner.test.ts` (skipped when running as root, since root ignores the permission bits)
   and logged Medium in `tech-debt.md`. Not fixed: the fix is a production change, and the tests make
   any future fix a deliberate, failing-test change. Unbounded recursion on symlink loops is a
   second hazard in the same function, left unpinned.

**Cleared while reading:** `WantedService` takes `prisma` and uses Prisma nested-relation syntax
(`series: { monitored: true }`), which looked like unmigrated residue that would fail against
Drizzle. It does not — the shim implements nested relation filters (`drizzleClient.ts:1190`) and
the service is wired to a live route (`mediaRoutes.ts:142`). Naming residue only, not a defect.

> **Scope note (2026-07-28):** `ReleaseParserProvider` is **claimed and closed** by
> `bug_ai_release_parser_lockdown_20260728`, which rewrote the file and shipped
> `ReleaseParserProvider.test.ts` (73 tests, 100% branch/stmt/func/line). Do not
> re-plan or re-test it here — 7 services remain, not 8.

## Phases 2-5: Sibling Suites (executed by measured gap, not by LOC)

> **Deviation from the written plan, recorded rather than glossed.** Phases 2-5 specified a
> Red-then-Green split per size bucket. That structure did not survive contact with the work, for
> two reasons. (a) The buckets were sized by LOC; the measured baseline showed the real gaps sit
> elsewhere, so services were taken in gap order. (b) **A Red phase is not meaningful for coverage
> tests over already-working code** — these suites characterise existing correct behaviour, so they
> pass on first run by construction. Writing them to fail first would have meant asserting things
> the code does not do, then "fixing" the test. Genuine Red moments did occur and are noted below.

- [x] `ProbeMetadataParser` — **75.51% -> 100% branch**, 62 tests. Pure function object; no mocks.
- [x] `LibraryScanner` — **71.42% -> 100% branch**, 24 tests. Real temp dirs; only `ReleaseParser`
      mocked (the real one calls a paid LLM provider).
- [x] `MetadataProvider` — **60.22% -> 94.31% branch**, 58 tests, 100% stmt/func/line. Residual
      branches are unreachable, not untested (see the file header): `?? 0` fallbacks on a
      `popularity` field both producers always set, and an `apiKey ? :` ternary below a throw guard.
- [x] `ActivityEventEmitter` — **0% -> 100% branch**, 5 tests. Honest scope: a 1-branch delegation
      shim; the conditional surface is in `ActivityEventRepository`.
- [x] `DataDirectoryInitializer` — **90% -> 100% branch**, 19 tests. Was already above target; this
      adds locality and the fresh-install `mediaDir` default. **Not a closed coverage gap.**
- [x] `WantedService` — 100% branch **at zero tests**, because it has zero branches. 9 tests pin the
      query contract instead, plus a characterisation test showing `getCutoffUnmetEpisodes` returns
      the missing list despite its name promising a cutoff comparison.
- [x] `MetadataGenerator` — **deleted** (dead code, owner decision). See Findings above.

### Genuine Red moments

1. **`LibraryScanner` permission tests failed as predicted** — confirming the Phase 1 defect is real
   and live: one unreadable subdirectory rejects the whole scan, and because the walk collects every
   path before parsing any, *nothing* is linked. Logged Medium in `tech-debt.md`; not fixed, because
   the fix is a production change and the characterisation tests make any future fix deliberate.
2. **`MetadataProvider` collection-id test failed against my assumption** — I asserted
   `tmdbCollectionId` reached search results; it does not. `searchMovies` computes it and every
   `searchMedia` mapping drops it. Converted to a characterisation test and logged.
3. **`tsc` caught a type/runtime mismatch** the tests could not: `SeriesSearchResult` omits
   `popularity` although `searchSeries` always sets it, which is why production reads it back via
   `(result as any)`. Logged.
4. **One failure was mine, not the code's** — a `build(undefined)` helper hit a default parameter,
   so three "missing API key" tests silently supplied a key and asserted nothing. Fixed with an
   options object that distinguishes "unspecified" from "explicitly absent"; the trap is written
   into the helper's comment.

## Phase 6: Regression & Closeout
- [x] Run `CI=true npx vitest run server/src tests` and confirm no regressions; re-run gates after the last edit, not before. **318 files passed / 1 skipped, 2886 passed / 14 skipped, 0 failures** (baseline 313 / 2711). Net +5 files and +175 tests: 6 suites added, `tests/metadata-generator.test.js` deleted with its service.
- [x] Run `npx tsc -p server/tsconfig.json --noEmit` and confirm zero diagnostics. **Exit 0.** It caught one defect the tests could not — `SeriesSearchResult` omits `popularity` although `searchSeries` always sets it.
- [x] Record final coverage numbers in this plan.
- [x] Update `measure/tech-debt.md` — amended, not marked Resolved. See below.
- [x] Update `measure/tracks.md` and archive this track.
- [x] Commit closeout.

### Final coverage (measured at HEAD, after the last edit)

| Service | Branch: start → end | Stmt/Func/Line | Tests |
|---|---|---|---|
| `ProbeMetadataParser` | 75.51% → **100%** | 100% | 62 |
| `LibraryScanner` | 71.42% → **100%** | 100% | 24 |
| `MetadataProvider` | 60.22% → **94.31%** | 100% | 58 |
| `DataDirectoryInitializer` | 90% → **100%** | 100% | 19 |
| `ActivityEventEmitter` | 0% → **100%** | 100% | 5 |
| `WantedService` | 100% → 100% *(vacuous — zero branches)* | 100% | 9 |
| `MetadataGenerator` | 38.88% → **deleted** | — | — |

Aggregate across the six surviving services: **100% stmt/func/line, 97.71% branch.**

### Why the tech-debt row was amended rather than marked Resolved

The originating row reads *"7 of 55 server services still lack a sibling `.test.ts`"*. Marking it
Resolved would assert something false in three ways, so it is amended instead:

1. One of the seven was **deleted**, not covered. The count went down because dead code left the
   codebase.
2. Two of the remaining six **never had a real gap** — `DataDirectoryInitializer` was already at 90%
   branch and `WantedService` reports 100% only because it has no branches. Counting them as closed
   gaps would inflate the result.
3. The row measured the wrong thing. "Has a sibling `.test.ts`" is a filename check, not a coverage
   claim; `DataDirectoryInitializer` and `MetadataGenerator` were both well exercised by non-sibling
   files. **A future row should state a coverage threshold, not a file-naming convention.**

Three new rows were opened rather than absorbed: the live `LibraryScanner` scan-abort defect, the
`MetadataProvider` dropped-collection-id/`popularity`-type pair, and the unimplemented
metadata-sidecar feature left behind by the deletion.

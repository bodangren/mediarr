# Plan: Browser-Verified Web Application

## Phase 1: Real-Browser Acceptance Boundary

- [x] Create a daemon launcher with isolated database/config/media roots and deterministic seed
  fixtures for movie, series, episode, playable variant, subtitle, activity, queue, collection,
  scheduler, and settings state.
- [~] Replace Browser Harness as an acceptance authority with Kimi WebBridge sessions against the
  connected real browser; record live URLs, rendered state, network failures, and screenshots.
- [ ] Retire or reclassify Browser Harness assertions so they cannot be cited as browser or
  performance acceptance evidence.

Historical note: prior Playwright/Browser Harness runs are explicitly not browser or performance
acceptance evidence. They must be replaced by Kimi WebBridge verification in the connected browser.
The daemon's working `tsx server/src/main.ts` start path remains relevant to the isolated interface;
`bun --no-addons server/src/main.ts` cannot load better-sqlite3 before binding, while the root
command falls back to `tsx` and the container already uses `tsx`.

Kimi evidence on 2026-07-29 (isolated interface only, not a completion claim): after correcting the
disposable database's invalid `/data` settings to writable temporary paths, Kimi loaded the rebuilt
daemon at `http://127.0.0.1:5174`. It rendered Dashboard, Movies (the existing Matrix record),
Wanted (the Matrix missing-item row), and Collections (a clean empty state). On
`/settings/notifications`, Kimi opened the real provider modal, saved a local-only configuration,
and confirmed it remained visible after browser reload. ThaiDub remained active on 8096 throughout.

## Phase 2: Production Route Matrix

- [~] Visit every `App.tsx` route in Kimi WebBridge at desktop and mobile widths; assert a
  meaningful route landmark, deep-link reload, no overflow, and no client/internal-request failure.
- [ ] Add route-specific fixtures for all empty/non-empty states needed by the matrix.

Repeatable-matrix boundary on 2026-07-29: the existing 24 configured core route cases remain the
passing regression set. A 68-case expansion covering settings, system, and redirects was run against
the real disposable daemon and produced repeated screenshots/traces from fixture/content mismatches;
it was intentionally not retained as a failing assertion set. Search and unconfigured setup also
remain provider/seed-blocked. Route-specific meaningful-state fixtures and per-route expectations
must be established before the complete matrix can become a reliable gate.
- [x] Repair the Collections Drizzle relation-count contract and Wanted optional-field serialization;
  Kimi then showed Collections' clean empty state and Wanted's real Matrix row without a client crash.
- [~] Harden shared list/detail layouts against narrow-view overflow. Desktop Kimi evidence is clean;
  mobile is now partially verified through Kimi CDP viewport emulation at 390x844. The real
  Movies, Wanted, Calendar, History, and General Settings routes each rendered with zero
  horizontal overflow; remaining route-matrix coverage is still required before this task closes.
- [x] Restore validated notification list/create/update/delete/test Fastify routes over the existing
  encrypted Notification repository and real production transport registry.
- [x] Wire the Notifications settings page to durable add/edit/enable/test/delete controls, including
  explicit provider/test failures and truthful Slack/Pushover support.
- [x] Prove the notification contract with server route tests, API/UI tests, and a seeded real-daemon
  browser visit that rejects console and internal-request failures.

Notification prerequisite evidence: 17 focused Fastify/transport tests and 6 focused app API/UI
tests pass. Strict app and server TypeScript, the production app build, and `git diff --check` pass.
No Browser Harness result may be used as evidence that the connected browser can use Notifications;
that requires a Kimi WebBridge walkthrough.

Kimi evidence on 2026-07-29 (isolated daemon `http://127.0.0.1:43221`, fresh temporary SQLite,
config, media, and backups roots): the production bundle rendered Dashboard, Movies, Wanted,
Calendar, History, and General Settings in the connected browser. At 390x844, Movies, Wanted,
Calendar, and History showed their seeded state after live API requests and had zero horizontal
overflow. General Settings performed a real mutation `15/3/3 -> 17/4/5`, visibly acknowledged
"General settings saved.", persisted through a hard deep-link reload, and was independently
confirmed by `GET /api/settings`. The live browser capture recorded only 200 same-origin requests
for these settled route checks. This is partial evidence only: it does not cover every route,
provider/acquisition recovery, accessibility, keyboard behavior, or reproducible performance
thresholds.

Setup and System Logs browser evidence on 2026-07-29: the reusable disposable daemon can now start
with `setupCompleted: false`, so the real setup wizard is no longer hidden behind a preconfigured
fixture. Kimi at 390x844 completed the guided wizard against isolated roots, showed matching
derived download paths under the same temporary data root, navigated to Dashboard, and retained
Dashboard after a full document reload; both the wizard summary and Dashboard measured zero
horizontal overflow. A focused real-browser setup regression also passes. Kimi separately rendered
the real in-process `mediarr.log` on `/system/logs` at 390x844 with zero horizontal overflow. The
page now has a responsive column layout and a retryable error state rather than presenting a failed
log-list request as an empty list; focused app tests and the new desktop/mobile Logs matrix pass.
This advances setup and one system route only; it does not complete all settings/system workflows.

Deterministic Indexers route evidence on 2026-07-29: `/api/indexers/detect` now receives discovery
through API dependencies. The normal daemon preserves the 2-second LAN scanner, while the isolated
browser fixture supplies an explicit local empty implementation, preventing household-LAN probes
from a settings-page mount. The injected-route test passes and the Indexers page is retained in the
browser matrix at both widths with a verified `{"data":[]}` local response. The expanded core
matrix now has 28 passing production-built SPA cases across desktop and mobile, each with a direct
route load, hard reload, meaningful content, no horizontal overflow, and no captured console/page/
same-origin internal-request failures. This remains a core subset, not evidence for every App route
or all settings/system mutations.

Complete configured-route regression on 2026-07-29: `core-routes.pw.ts` now covers all 32 concrete
`App.tsx` paths and redirect aliases at desktop and 390x844 mobile widths (64 cases). Every case
starts the built production SPA against its own isolated daemon, asserts a meaningful seeded
landmark, hard reload, zero horizontal overflow, and no captured console/page/same-origin request
failure. The initial serial sweep was stopped after 56 cases because the external 6-minute guard
closed its browser; the read-only suite now runs in parallel isolated workers and its complete
parallel result is passed. `/setup` remains separately covered from an unconfigured fixture.

- [ ] Commit: `test(browser): cover production SPA route matrix`

## Phase 3: Durable Core Workflows

- [x] Prove the Notifications create → reload → in-app confirm delete → reload workflow through
  Kimi WebBridge against the isolated real daemon; this uses an accessible app modal rather than a
  native browser prompt.
- [~] Cover setup, movies/TV/collections, wanted/calendar, activity queue/history, and all settings
  CRUD/toggle flows with visible confirmation, API/DB evidence, and hard-reload persistence.
- [~] Cover subtitles, scheduler controls, backup/system operations, and safe destructive flows in
  the disposable environment.

System Events destructive-flow evidence on 2026-07-29: `Clear All` now opens the shared accessible
in-app confirmation modal and sends no DELETE request until the explicit `Clear All Events`
action. Confirmed clears announce the exact persisted count and refetch the real event repository;
failures are caught, announced as an alert, and leave the visible rows intact. The focused app suite
passes 17/17 with `SystemEventsPage.tsx` at 97.14% statements, 88.09% branches, 90.47% functions,
and 98.52% lines; file-scoped ESLint and the production Vite build pass. The focused disposable-
daemon Playwright workflow proves a seeded event exists through the real API, the first click
sends zero DELETEs, the confirmed DELETE count matches the persisted total, the API becomes empty,
and a hard `/system/events` reload remains empty with no captured browser/internal-request
failures. This advances one safe destructive operation only; Kimi acceptance and the remaining
subtitle, scheduler, backup, and system operations are still open. Full-app static gates currently
remain blocked by unrelated existing findings in `ManualEpisodeMatchDialog.tsx:83`,
`SystemTasksPage.tsx:151`, and `useUIStore.ts:15-22`.

Scheduler-control evidence on 2026-07-29: a real-browser red run exposed that toggling a live
scheduled task disabled its persisted scheduler state but left `Run Now` enabled, despite the
production route rejecting disabled task triggers. `TaskSchedulerTable` now disables that action
when its task is disabled, guarded by a focused 9/9 component suite. After a fresh direct Vite
production build, the isolated disposable-daemon browser flow loaded seeded `rss-sync`, toggled it
off, visibly showed the disabled state and disabled Run Now action, verified `GET
/api/scheduler/tasks` returned `enabled: false` and `status: disabled`, and retained that state
after a full Automation-page reload with no captured browser or same-origin request failures. Its
dedicated artifact is `/tmp/terra-scheduler-browser-results-final/.last-run.json` (`passed`). This
advances one scheduler toggle only; interval editing, manual runs, failure/recovery, and Kimi
acceptance remain open.

Scheduler-interval evidence on 2026-07-29: the production Automation page's real `rss-sync`
30-minute preset sent `PUT /api/scheduler/rss-sync/interval`, visibly changed only that task's
cron expression, and marked the active preset. The disposable-daemon browser workflow verified the
live scheduler task now returns `*/30 * * * *`, persisted Settings returns
`schedulerIntervals.rssSyncMinutes: 30`, and a full page reload retains both the selected preset
and the row's interval without browser or same-origin request failures. Its dedicated artifact is
`/tmp/terra-scheduler-interval-results-final/.last-run.json` (`passed`). This advances interval
editing only; safe manual runs, failure/recovery, and Kimi acceptance remain open.

Scheduler Run Now evidence on 2026-07-29: a production-browser red run found that the real
`POST /api/scheduler/:taskId/trigger` succeeded but Automation silently rendered no history because
`schedulerApi.getHistory` parsed the server's paginated success envelope as a non-paginated object.
The client now uses the shared paginated request contract, guarded by a focused envelope regression.
After a fresh Vite build, the isolated browser ran the real local `rss-sync` callback, showed the
`Task triggered` confirmation and resulting `SUCCESS` Task History row, verified the persisted
history API record has a completion timestamp and duration, and retained that row through a full
reload with no browser or same-origin request failures. Its dedicated artifact is
`/tmp/terra-scheduler-run-now-results-final/.last-run.json` (`passed`). This advances the safe
successful manual-run path only; failure/recovery and Kimi acceptance remain open.

Download Client settings evidence on 2026-07-29: the new disposable-daemon production-browser
regression starts from the real persisted limit of 3, changes Max Active Downloads to 4 through the
accessible form, observes the successful `PUT /api/download-client`, and verifies the real API
returns the persisted limit and unchanged `pause` seed action. A full document reload retains 4
with no console, page, same-origin request, or overflow failure. Its dedicated artifact is
`/tmp/root-download-client-settings-20260729/.last-run.json` (`passed`). This advances one
non-destructive Download Client setting only; root-folder selection, validation failure paths, and
the remaining settings workflows are still open.

Kimi Media Root guidance check on 2026-07-29 (isolated daemon `http://127.0.0.1:37295`): the
connected browser rendered Media Management with separate labeled Movie Root Folder and TV Root
Folder inputs, Browse and Validate controls for each, and Save Media Settings. Validating the real
seeded movie root visibly produced Writable with zero horizontal overflow and no captured browser
failures. The repeatable production-browser regression then created a distinct writable isolated
movie root, changed the real form value, observed `GET /api/filesystem` validation and `PUT
/api/settings/media`, confirmed the persisted API response, and retained the changed root through a
full reload with no captured browser or same-origin request failures. Its artifact is
`/tmp/root-media-root-settings-20260729-rerun/.last-run.json` (`passed`). This advances the normal
movie-root path only; TV-root selection and validation failure states remain open.

Live deployment blocker found on 2026-07-30: the requested host directories exist, but the Podman
deployment bind-mounts `/media/daniel-bo/320GB` at container `/data`, so its valid runtime root
values are `/data/media/movies` and `/data/media/tv`. The container is currently crash-looping
before it can persist settings because `/config` is not writable for its rootless runtime UID; port
5174 is instead held by a separate native acceptance daemon whose temporary configuration lists
`/tmp/mediarr-tv-acceptance-config/...` roots. Do not claim host-path validation or durable live
save acceptance until the approved deployment-permission repair and canonical container restart
are complete. The UI also currently collapses every validation failure to Not found and discards
the save error detail; that remains a product repair item.

Live deployment recovery completed on 2026-07-30 with explicit user approval. The temporary
port-5174 daemon was retired; the canonical Podman service now uses the local
`/home/daniel-bo/mediarr/podman-compose.override.yml` `userns_mode: keep-id` mapping because the
320GB drive is FAT32 and cannot store changed Unix ownership. Its durable config volume was restored
to host UID 1000, and an owner-only persistent deployment environment was created at
`/home/daniel-bo/mediarr/.env`. The service is running and healthy after reconciling verified
missing baseline migration ledger entries and applying 0004-0006. Kimi browser acceptance completed
the setup wizard with no optional indexers and the Any quality profile, saved both container-visible
roots, showed Writable for each Validate action, and reloaded Settings > Media with
`/data/media/movies` and `/data/media/tv` still present. Live `GET /api/settings/media` returns the
same values; `GET /api/health` is OK.

Movie-subtitle destructive-flow evidence on 2026-07-29: focused component and production-browser
red runs proved the movie-detail trash action immediately deleted a subtitle without confirmation.
The action now opens the shared accessible `Delete Subtitle` confirmation modal, accurately warns
that both the record and sidecar file are removed, sends zero DELETE requests before confirmation,
and keeps cancellation non-destructive. The focused subtitle integration file passes 5/5 with a
15-second per-test limit for the loaded workspace, file-scoped ESLint passes, and a fresh production
Vite build succeeds. The disposable-daemon Playwright workflow proves the seeded English external
track and real `.srt` file exist, confirmation sends exactly one successful DELETE, the real API
inventory becomes empty, the sidecar disappears from disk, and a hard movie-detail reload retains
that empty state with no captured browser or same-origin request failures. This advances one movie
subtitle mutation only; subtitle download/search/provider flows and Kimi acceptance remain open.

Kimi durable-workflow evidence on 2026-07-29 (isolated daemon `http://127.0.0.1:34701`): the
connected browser disabled the real `rss-sync` task, immediately showed its Disabled state and a
disabled Run Now control, and preserved both after a hard navigation with zero overflow and no
captured failures. On Movie Details, the seeded subtitle delete control opened an accessible dialog
that named the subtitle and warned that both database record and sidecar file are permanent; Cancel
left the external subtitle visible. System Events likewise opened an accessible permanent-delete
warning and Cancel retained the seeded imported-event row. These Kimi checks advance the scheduler
and safe-destructive boundaries; interval/manual-run controls, subtitle download/provider flows,
backup Kimi acceptance, and remaining system workflows remain open.

System Backup create/list/delete evidence on 2026-07-29: focused component and production-browser
red runs proved deletion still used a native browser prompt with no accessible in-app safety
boundary. Backup deletion now uses the shared `Delete Backup` modal, names the exact file, warns
that disk removal is permanent, sends zero DELETE requests before confirmation, and keeps Cancel
non-destructive. At that checkpoint, the focused component suite passed 9/9 without React test
warnings; whole-file coverage was 64.51% statements, 82.85% branches, 60.6% functions, and 70.51%
lines because restore/download/schedule-save branches remained outside that first slice.
File-scoped ESLint and a fresh production Vite build passed. The disposable-daemon Playwright
workflow starts from an empty isolated
backup directory, creates a real manual SQLite backup through the production online-backup path,
verifies its API/UI metadata, positive size, SQLite header, and on-disk location, and retains it
after hard reload. Cancel leaves the file and row intact with zero DELETEs; explicit confirmation
sends exactly one successful DELETE, removes the file and API row, and a second hard reload remains
empty with no captured browser or same-origin request failures. Restore was not invoked in that
first slice.

Kimi backup-create evidence on the same isolated daemon: connected Backup initially rendered its
empty state and accessible Back Up Now control; a real click created a visible named manual SQLite
backup with a 416 KB size and Restore, Download, and Delete actions. The settled page had zero
horizontal overflow and no captured browser failures. On the rebuilt isolated daemon at
`http://127.0.0.1:33177`, a real Download click invoked the visible backup download action and a
real Restore click opened an accessible dialog naming the exact backup and explaining the safety
backup, live-database replacement, and restart requirement; Cancel returned safely to the intact
backup row. The settled page still had zero overflow and no captured failures. Kimi
confirmation/delete and backup failure/recovery remain open even though isolated Playwright now
proves all four backup actions.

Backup download/restore evidence on 2026-07-29: the existing Download action required no product
repair; the production browser emitted a real download with the server-provided backup filename,
no failure, and a valid SQLite header. Focused component and production-browser red runs then
proved Restore still used a native prompt and exposed neither an accessible safety boundary nor
the server's required restart state. Restore now uses the shared `Restore Backup` modal, names the
selected backup, explains the automatic safety backup and live-database replacement, sends zero
restore requests before confirmation and after Cancel, and visibly announces that Mediarr must be
restarted after success. The expanded focused suite passes 10/10; whole-file coverage is now 77.66%
statements, 85.36% branches, 74.28% functions, and 80.68% lines, with the remaining gaps in legacy
download-window and schedule-save/error branches. File-scoped ESLint and a fresh production Vite
build pass.

The two-case disposable-daemon Playwright run passes in 3.2 minutes. Its restore case creates a
real backup while persisted `logging.logLevel` is `info`, changes only the isolated database to
`debug` through the real settings API, proves Cancel sends zero restore requests, then confirms
exactly one real restore. The response requires restart and names a safety backup; both the selected
and safety files exist with valid SQLite headers. The test closes the pre-restart page, explicitly
restarts only the disposable daemon, proves the real setting reverted to `info`, renders both
backup files, and retains the restored state after a hard reload with no captured browser or
same-origin request failures. No non-isolated restore was attempted. Kimi restore/download and
backup failure/recovery acceptance remain open.

- [ ] Commit: `test(browser): prove durable core web workflows`

## Phase 4: Acquisition, Recovery, and Performance

- [x] Serve SPA HTML with mandatory revalidation and content-hashed Vite assets with immutable
  caching; Kimi normal navigation must load the current bundle after an isolated daemon refresh.
- [x] Use deterministic local fakes to prove search → add → grab → queue/SSE → import → library
  lifecycle and failure/recovery paths.
- [~] Add measured browser performance, accessibility, mobile, keyboard/focus, and reconnect gates.
- [ ] Commit: `test(browser): enforce browser workflow resilience and performance`

Quality-gate evidence on 2026-07-29 (repeatable regression only, not Kimi acceptance):
`tests/browser/experience-quality.pw.ts` launches the rebuilt SPA against the isolated daemon and
uses real navigation timing, a Dashboard `main` axe scan, console/internal-request failure capture,
and a real `?` keypress followed by Escape. The first red axe run found a moderate heading-order
defect: Dashboard's H1 was followed by widget H3s. All five Dashboard widget variants now use H2
headings, and the rebuilt two-test quality suite passes. A Kimi-rendered Dashboard sample from a
fresh isolated daemon at `http://127.0.0.1:34219` then showed H1 Dashboard followed by five H2
widgets, 0 horizontal overflow, no captured browser errors, `DOMContentLoaded` 791.3 ms, and load
846.1 ms. A rebuilt-bundle repeat observed 1183.5 ms and 1253.9 ms respectively with the same
outline, zero overflow, `main` landmark, and no captured errors. These connected-browser samples
are diagnostic evidence only; they are not a production budget, multi-sample p95, full
keyboard/focus acceptance, mobile route matrix, or reconnect proof.

Keyboard/focus repair on the same date: the global Keyboard Shortcuts overlay now has modal
semantics, visible label/description wiring, initial close-button focus, Tab/Shift+Tab containment,
Escape/backdrop/button dismissal, and restoration to its invoking element. Eight focused app-shell
tests, app typecheck, targeted lint, and the rebuilt production-browser quality suite pass. The
separate Radix CommandDialog still emits its pre-existing missing title/description warning and is
not covered by this bounded repair.

Search contract repair on 2026-07-29: Kimi exposed a production-browser failure where
`GET /api/search?term=Matrix` returned provider-shaped TVDB records with no local `id`, but the
client required one and rendered "Response did not match success envelope contract". The client
schema now makes the local id optional; a focused real-envelope API regression passes, Vite rebuilt
the SPA, and Kimi rendered 19 results (including Threat Matrix) with zero overflow and no captured
browser errors. This is not FR-4 completion: the supposedly isolated daemon still consulted live
TVDB, so deterministic provider injection remains mandatory before Search/add acceptance can close.

Deterministic Search fixture on 2026-07-29: the disposable daemon now explicitly selects a local
`BrowserAcceptanceMetadataProvider`. Its focused tests pass, and Kimi searched "Browser Search"
through the built SPA and rendered exactly Browser Search Movie and Browser Search Series, both
with local no-poster fixtures. The captured requests were only same-origin HTML/assets/API/SSE;
the search request was `200`, there was zero overflow, and no browser errors. Search-to-add,
grab/import, and failure/restart recovery still remain to be proven.

Wanted durability repair and Kimi evidence on 2026-07-29: the first Search-to-Wanted walkthrough
found a real contradiction: `/api/wanted` gave an unimported movie its eventual root-folder path,
while both the Wanted table and wanted auto-search correctly define missing movies as `path: null`.
The shared create handler now preserves `path: null` only for the Wanted endpoint; ImportManager
continues to derive the configured destination once a real import occurs. The focused route
contract and isolated browser regression pass. In a fresh Kimi-connected disposable daemon,
Search rendered exactly the two local fixtures; clicking Browser Search Movie produced
`POST /api/wanted` 201. The actual Wanted table then showed the movie as WANTED and Monitored
through a second full `/wanted` document navigation. Both reloads fetched
`GET /api/movies/missing?page=1&pageSize=25` with 200; desktop overflow was 0. This is a
completed search-to-add persistence slice only: grab, queue/SSE, import, provider failure,
reconnect, and restart recovery remain open.

Recovery discovery on 2026-07-29: the Wanted-row Search action invoked the real
`POST /api/media/:id/auto-search` path but previously had no browser-visible result, making
success and failure indistinguishable to a user. It now renders an accessible status message for
both outcomes; the focused Wanted-page regression is green. The next deterministic fixture slice
must supply a local approved indexer release and a persisted torrent transition so this action can
be verified through Queue/SSE rather than only by its request.

Deterministic grab-to-Queue evidence on 2026-07-29: the disposable daemon now selects a local
acceptance-only indexer and a real-repository-backed torrent-manager fixture. In the connected
Kimi browser at `http://127.0.0.1:34505`, Search returned the two local records; adding Browser
Search Movie created the Wanted row; its row-specific Search control visibly reported
`Search started for Browser Search Movie`; and Queue rendered
`Browser.Search.Movie.2026.1080p.WEB-DL-BROWSER` as DOWNLOADING at 42%. A full Queue document
reload retained that release with zero horizontal overflow. Kimi's network log recorded the
same-origin `POST /api/wanted` 201, `POST /api/media/3/auto-search` 200,
`GET /api/torrents` 200, and active `/api/events/stream` SSE connection. The repeatable
`acquisition-queue.pw.ts` scenario also passes against a fresh disposable daemon. This closes the
search/add/grab/queue persistence slice only: no fixture completion/import event, provider failure,
SSE transition, daemon restart, or recovery path has yet been proved.

Completion/import extension on 2026-07-29: the acceptance-only torrent manager now copies a valid
local MP4 through isolated incomplete and complete roots, persists the real Torrent as seeding at
100%, then emits the production-shaped `torrent:completed` event for ImportManager and Organizer.
The focused fixture tests (3) and server contracts (12 total) pass. The regression keeps that
fixture at 42% long enough to observe the named release as DOWNLOADING, verifies an active
`/api/events/stream` connection, observes the same Queue row become SEEDING/100% without a
document reload, and then proves both the persisted API variant path and on-disk completed/download
and organized-library files before a hard library reload. The focused four-case production-built
Playwright run (acquisition, System Events, and two quality checks) passed. In the connected Kimi
browser at `http://127.0.0.1:39033`, the same actual UI path rendered the target as SEEDING/100%
at the isolated complete directory, then rendered Browser Search Movie as COMPLETED in Movies and
retained it after a hard navigation with zero overflow and no captured browser failures. This
advanced deterministic completion/import; the provider, restart, and SSE recovery slices are
covered below, while the remainder of the workflow matrix is still open.

Deterministic provider-recovery regression on 2026-07-29: the local-only browser metadata provider
now returns a truthful retryable `PROVIDER_UNAVAILABLE` envelope only for the explicit Browser
Provider Failure fixture term; `GET /api/search` preserves its 502 rather than masking it as an
internal error. The focused provider contract passes 3/3. After a fresh production SPA build,
`search-recovery.pw.ts` used the disposable daemon to show the exact outage message, immediately
re-search Browser Search successfully, render Browser Search Movie, and reject every browser
failure other than that deliberately recorded 502. This closes the provider failure/recovery slice;
the later daemon-restart and SSE reconnect evidence appears below.

Controlled daemon-restart recovery regression on 2026-07-29: browser Search added Browser Search
Movie to Wanted through the real UI, then the disposable daemon stopped and relaunched on the same
origin with the same isolated database and media roots. The harness now waits for both API health
and the production SPA fallback before resuming. A hard navigation to Wanted and a hard reload each
rendered the persisted row with no post-restart browser errors. The focused
`daemon-restart-recovery.pw.ts` regression passes. This closes the daemon-restart persistence
slice.

SSE reconnect recovery regression on 2026-07-29: a real production-browser Queue page held the
app-wide and page-local EventSources open, then the disposable daemon stopped and relaunched on the
same origin and isolated storage. The harness now terminates the detached `tsx` process group, so
the old daemon cannot retain the port or its SSE clients. Both streams re-opened after restart. A
real browser `PATCH /api/torrents/:infoHash/pause` then caused the reconnected stream to receive a
`torrent:stats` payload for the seeded queue item with `status: paused`; Queue visibly rendered the
Paused state with no browser failures. `sse-reconnect-recovery.pw.ts` passes. This closes the
deterministic SSE reconnect recovery slice.

Manual subtitle provider/download recovery on 2026-07-29: a repeat browser run revealed that the
server correctly emits structured missing-subtitle requirements
`{ languageCode, isForced, isHi }`, while the Movie Detail client accepted only strings. The Zod
rejection was swallowed by the page and left Manual Subtitles disabled indefinitely whenever a
startup backfill added a requirement. The client now accepts both truthful shapes and maps either
shape to the language-code coverage summary. The focused app contract suite passes 23/23. After a
fresh production build, `subtitle-manual-download.pw.ts` passed 1/1 in 19.2 seconds: the real
dialog listed the local Thai provider candidate, Download succeeded, the persisted API inventory
contained its external `th` track and the real sidecar contained expected bytes, and a full reload
rendered Available Subtitles with zero browser or same-origin request failures. This closes the
deterministic manual subtitle provider/search/download/persistence slice; Kimi subtitle acceptance
and other subtitle workflows remain open. Kimi acceptance on the rebuilt isolated daemon at
`http://127.0.0.1:38759` then rendered Manual Subtitles enabled, showed its accessible dialog with
the deterministic Thai candidate from `browser-acceptance` (score 99), performed the real Download
click, and retained the Thai external track after a full document navigation with zero overflow and
no captured browser failures.

Kimi provider-recovery evidence on the same date: connected Search visibly rendered the truthful
temporary-provider failure for Browser Provider Failure, then an immediate Browser Search retry
cleared that message and rendered Browser Search Movie without reload. The settled browser had zero
horizontal overflow and no captured browser failures. This is a second, connected-browser proof for
the deterministic provider-recovery contract; it does not itself exercise SSE reconnect.

Build-environment finding on the same date: a bare root TypeScript diagnostic emitted ignored JS,
declaration, and source-map files beside TypeScript source. Vite then resolved stale `.js` before
the `.ts` implementation and failed the SPA build. The generated untracked artifacts were removed,
the root diagnostic config is now non-emitting, and a direct SPA Vite build passes. Repository-wide
`tsc -b` remains blocked by broad pre-existing NodeNext/module-resolution diagnostics and must not
be presented as green evidence for this track.

## Phase 5: Release Acceptance

- [ ] Run the complete browser suite, full regression, and an independent live-browser walkthrough.
- [ ] Record exact coverage boundaries and archive only if browser evidence covers every in-scope
  production route and workflow.

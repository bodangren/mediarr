# Plan: Production SPA Runtime Recovery

## Phase 1: Reproduction and Contract Boundary

- [x] Reproduce the built page failure in a browser: HTTP/assets return 200, `#root` is empty,
  and module evaluation throws `Class extends value #<Object> is not a constructor or null`.
- [x] Write a browser-safe contract regression that proves the scheduler API client does not import
  the server runtime and that a built SPA must render the configured Dashboard with no page,
  console, request, or non-API asset errors.
- [x] Move scheduler status values/types to a dependency-neutral contract and update both sides.
- [x] Commit: `fix(app): keep scheduler runtime out of browser bundle` (`8a619bc`)

## Phase 2: Production Render Gate

- [x] Run the app build, browser-render regression, affected scheduler tests, and strict typecheck.
  Evidence: 1 production browser test passed after a fresh build (133.53s); scheduler client 14/14,
  server scheduler 127/127, and strict server typecheck passed; the bundle contains no `node-cron`
  or `services/Scheduler` marker.
- [x] Verify the live temporary interface at `http://192.168.1.149:5174` renders a shell.
  Evidence: Kimi WebBridge reached `/dashboard` after temporary Just Work setup and read the visible
  Dashboard, Sidebar Navigation, MEDIARR header, and expected empty-state panels.
- [x] Update release verification documentation to require the production page-load gate.
- [ ] Commit: `test(app): require production SPA render before release`

## Phase 3: Closeout

- [ ] Record the prior false-green mechanism in project memory and update the registry.
- [ ] Archive only after the live interface is visibly usable.

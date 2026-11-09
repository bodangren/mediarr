# System report inside the SPA (2026-11-09)

The feature report is now reachable from the web app as well as the direct URL:

- `/settings/report` → “System report” page embeds `/reports/features.html` in an iframe (so the
  five-minute meta refresh keeps it live) and offers “Open in a new tab”.
- Added to the Settings navigation section (“Report”), with a unit test asserting the iframe src and
  the new-tab link.

## Browser verification
`/settings/report` renders the heading, the iframe with `src=/reports/features.html`, and the embedded
report contents starting with “Recent improvements” (YouTube See all, TV subtitle coverage, maintenance
sweep). Evidence: `spa-system-report-20261109.jpg`.

While adding the nav entry, an old shell test proved brittle: it matched the Wanted link only as
`/^wanted$/`, but once the badge count loads the accessible name becomes “Wanted 1516”. The test now
matches by prefix and still asserts `aria-current="page"`.

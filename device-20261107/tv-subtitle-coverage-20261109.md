# Subtitle coverage on the TV (2026-11-09)

Tech-debt: "TV client has no wanted screen; subtitle coverage/priority is SPA-only". The living room now
has the same numbers as the SPA/server.

- New `Wanted` rail destination (subtitles icon) → `WantedScreen`: header "N of M items have EN+ZH",
  one focusable row per viewing-priority bucket (Continue watching / Watched recently / New /
  Backfill) with a colour-coded EN+ZH ratio, `x/y EN+ZH`, and honest `without Chinese` /
  `without either language` counts; a note states that fetching needs a provider API key.
- Reads `GET /api/subtitles/coverage` through a new `SubtitleCoverage` model + API method; graceful
  loading/error/empty states.
- 2 tests (payload parsing with bucket labels; widget rendering of summary and bucket rows).

## Device verification (1.3.51 / code 75)
Rail shows Wanted; screen reports **“1017 of 3162 items have EN+ZH”** with
Continue watching 8/13, Watched recently 8/29, New 2/16, Backfill 999/3104
(`device-20261107/tv-subtitle-coverage-20261109.png`).

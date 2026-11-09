# Report now shows a live system snapshot (2026-11-09)

The owner-facing report was static prose plus evidence links. It now also renders live numbers fetched
from the running server on each 5-minute reload (`fetch(..., {cache:'no-store'})`):

- **Server:** status ok · scheduler **18** tasks · missed **1** · event-loop max lag **10309 ms**
- **Library:** **567 movies · 43 series · 4331 episodes · 3574 GB on disk**
- **Subtitle coverage:** **1017 of 3162 items have EN+ZH · 1511 have Chinese · 790 have neither**
- **Delivery surface:** served no-store · meta refresh 300 s · loaded 9:57:53 AM

Unreachable endpoints degrade to an explicit “unavailable (…)” message, so the page never shows stale
numbers as if they were current.

## Browser verification
`#live-snapshot` cards populated in the open Chrome tab after reload; screenshot
`report-live-snapshot-20261109.jpg`. The honest numbers include a missed scheduler task and a 10 s
event-loop lag sample — surfaced, not hidden.

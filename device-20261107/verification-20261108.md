# System verification — 2026-11-08 (after the Adult library + subtitle-priority work)

## Server
- health: ok | scheduled tasks: 10 | event loop lag ms: 0

## Libraries
id|kind|rootFolder|enabled
1|MOVIES|/data/Movies|1
2|TV|/data/TV|1
3|ADULT|/data/Porn|1

## Adult library (live import result)
items|needsReview|gb
196|8|297.4

## Subtitle coverage
- high priority: {'total': 9, 'covered': 7, 'missing': 2}

## TV client
- installed APK: 1.3.12 (code 36); the Adult TV screen is committed but NOT in that build (no APK rebuild this session), so the device still runs the verified build.

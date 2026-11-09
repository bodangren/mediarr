# TV coverage screen names the reasons, per title (2026-11-09)

The coverage screen showed bucket counts only; the acceptance rule for workstream 1 is “every
continue-watching item has EN+ZH or a prioritised honest reason”. The TV now shows those reasons.

- New `PriorityCoverage`/`PriorityCoverageItem` models + `getPriorityCoverage()` reading
  `/api/subtitles/priority-coverage`.
- `WantedScreen` adds a **Needs attention** list under the buckets: one focusable row per item that is
  not dual-language, with its title and honest reason (“English only — no Chinese”, “Chinese only — no
  English”, “No subtitles” in red). Dual-language items are omitted.
- Widget test asserts the list, an English-only reason, and that a dual item is not shown.

## Device verification (1.3.55 / code 79)
Wanted → Subtitle coverage: buckets then **Needs attention** — “Sacrificial Soldiers — English only —
no Chinese”, “Winter Spring Summer or Fall — No subtitles”. Evidence: `tv-coverage-reasons-20261109.png`.

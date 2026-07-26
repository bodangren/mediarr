# Spec: Subtitle Services Test Coverage

## Problem
Three server-side subtitle services currently have no dedicated unit-test coverage. They were identified in `tech-debt.md` as part of the deferred remainder from `chore_untested_server_services_20260526`:

- `SubtitleNamingService` — builds final subtitle filenames and handles language/tag ordering.
- `SubtitleRequirementEngine` — decides whether a release needs subtitles and which languages are required.
- `SubtitleProviderFactory` — resolves the correct subtitle provider for a given language/source.

## Goal
Add focused, deterministic unit tests for each service, mocking dependencies with `vi.hoisted()` factories per the established Mediarr pattern. Reach ≥80% branch coverage on the new/changed code.

## Acceptance Criteria
- [ ] `SubtitleNamingService` tests cover filename construction, language ordering, and tag sanitization.
- [ ] `SubtitleRequirementEngine` tests cover requirement rules, language matching, and edge cases (unknown language, empty release metadata).
- [ ] `SubtitleProviderFactory` tests cover provider resolution, fallback behavior, and unsupported-language handling.
- [ ] `cd server && bun run test -- <affected-files>` passes.
- [ ] `cd server && bun run typecheck` reports no new errors in affected files.

## Scope
Server workspace only; no UI or API route changes unless a defect is found during testing.

## Notes
- Follow the mock pattern from `bug_variant_subtitle_test_coverage_20260526`: hoist a factory, `vi.mock` the module, and override only the methods the service calls.
- If a test exposes a real bug, open a defect sub-task and fix it within this track before archiving.

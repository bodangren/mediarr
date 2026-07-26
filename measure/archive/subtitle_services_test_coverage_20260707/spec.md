# Spec: Subtitle Services Test Coverage

## Problem
Three server-side subtitle services currently have no dedicated unit-test coverage. They were identified in `tech-debt.md` as part of the deferred remainder from `chore_untested_server_services_20260526`:

- `SubtitleNamingService` — builds final subtitle filenames and handles language/tag ordering.
- `SubtitleRequirementEngine` — decides whether a release needs subtitles and which languages are required.
- `SubtitleProviderFactory` — resolves the correct subtitle provider for a given language/source.

## Goal
Add focused, deterministic unit tests for each service, mocking dependencies with `vi.hoisted()` factories per the established Mediarr pattern. Reach ≥80% branch coverage on the new/changed code.

## Acceptance Criteria
- [x] `SubtitleNamingService` tests cover filename construction, language ordering, and tag sanitization. — 18 tests, 100% branch coverage. Covers standard path construction, forced/HI suffix ordering (both individually and combined), extension handling (with/without dot, default `.srt`), language-code lowercasing, directory resolution (explicit vs. dirname fallback), variant-token sanitization (case, special chars, whitespace, leading/trailing dashes, empty-after-sanitize fallback to `variant`), and collision-triggered variant renaming.
- [x] `SubtitleRequirementEngine` tests cover requirement rules, language matching, and edge cases (unknown language, empty release metadata). — 24 tests (21 pre-existing + 3 added this track), 100% branch coverage (up from 89.13%). Covers audio_exclude/audio_only_include rules, cutoff logic (null/specific-id/ANY_CUTOFF_ID, including the previously-untested audio_only_include-skip and audio_exclude-return-true branches inside `isCutoffMet`), HI-satisfies-non-HI fallback, forced-not-satisfied-by-HI, language normalization, commentary-track exclusion, null audio languageCode, and empty-string language code ("unknown language" edge case) never matching audio tracks. Empty profile/empty release metadata covered by the pre-existing "handles empty profile" test.
- [x] `SubtitleProviderFactory` tests cover provider resolution, fallback behavior, and unsupported-language handling. — 14 tests (12 pre-existing + 2 added this track), 100% branch coverage (up from 90.9%). Covers explicit-name resolution, config-fallback resolution, case-insensitive lookup, missing-config error, unregistered-provider error, unavailable-provider rejection (the "unsupported" case for this service, since it has no per-language providers — unavailability is modeled via the `unavailableProviders` reason map), plus newly-added direct coverage of `isProviderAvailable` returning `true` and `getProviderUnavailableReason` returning `null` for a registered/available provider.
- [x] `cd server && bun run test -- <affected-files>` passes. — Verified via `CI=true npx vitest run --coverage` on the three target test files: 56/56 tests pass.
- [x] `cd server && bun run typecheck` reports no new errors in affected files. — Verified via `npx tsc -p server/tsconfig.json --noEmit`: zero errors (server-wide strict typecheck, not just affected files).

## Scope
Server workspace only; no UI or API route changes unless a defect is found during testing.

## Notes
- Follow the mock pattern from `bug_variant_subtitle_test_coverage_20260526`: hoist a factory, `vi.mock` the module, and override only the methods the service calls.
- If a test exposes a real bug, open a defect sub-task and fix it within this track before archiving.

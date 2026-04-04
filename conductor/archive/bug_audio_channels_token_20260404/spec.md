# Bug: {AudioChannels} Token Never Populated

## Problem Statement

`MovieOrganizeService` (and likely `SeriesOrganizeService`) uses a `{AudioChannels}` naming token that never gets populated from variant data. The media analysis that extracts audio channel information is not wired to the variant DTO, so the token always resolves to an empty string.

This means any naming profile using `{AudioChannels}` produces incorrect file paths (e.g., `Movie Name ().mkv` instead of `Movie Name (5.1).mkv`).

## Acceptance Criteria

- [ ] Test confirms `{AudioChannels}` token resolves to empty string (Red phase)
- [ ] Fix wires audio channel data from variant/media analysis into the DTO
- [ ] Test confirms `{AudioChannels}` resolves correctly (e.g., "5.1", "2.0", "7.1")
- [ ] Same fix applied to SeriesOrganizeService if affected
- [ ] Existing organize tests still pass

## Subsystem Scope

- `MovieOrganizeService` — DTO construction, token resolution
- `SeriesOrganizeService` — check for same pattern
- Media analysis → variant data flow

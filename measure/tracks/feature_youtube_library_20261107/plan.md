# Plan — YouTube series library for Mediarr

> Contract-first + TDD per `measure/workflow.md`. **ACTIVE since 2026-11-08** — Y1–Y5 are ratified
> (spec §Open decisions), so Phase 0 may proceed. Migration note: the 786 existing files under
> `/data/Youtube` are 262 videos (133 webm + 129 mkv) with `.nfo` + thumbnail sidecars; they import as
> an unmanaged archive and are never subject to the watched+7d retention rule (gate G9).

## Phase 0: Ratify scope

- [ ] Resolve Y1 representation, Y2 retention, Y3 quality, Y4 cadence, Y5 shorts/live.
- [ ] Confirm `yt-dlp` install/update path and a test playlist.
- [ ] Migration decision: existing 786 files import as unmanaged/keep; per-poll item cap value.

## Phase 1: Domain + subscriptions

- [ ] Contract tests for library type, subscription table, and idempotent download by video id.
- [ ] Schema/type change isolated from `TV|MOVIE`.
- [ ] Subscription CRUD API with enabled/options.
- [ ] `yt-dlp --flat-playlist` poller returning new entries; per-entry failure reporting.

## Phase 2: Download + library

- [ ] Download job (video + metadata + thumbnail) into the YouTube root.
- [ ] Scanner/metadata mapping: channel/playlist → episode, title/date/duration/thumbnail.
- [ ] Dedupe by video id; partial-download cleanup.
- [ ] UI section: playlist → episodes, D-pad navigable.

## Phase 3: Retention

- [ ] Watched-state integration.
- [ ] Eligibility rule: watched + retention days (default 7).
- [ ] Quarantine move/restore/delete with manifest; dry-run first.
- [ ] Nightly retention job + receipt.

## Phase 4: Automation + verification

- [ ] Deterministic subscription poll (plugin/native task) downloads new entries; the agent is used
      only for ambiguity. Reports new downloads and failures; no silent skip.
- [ ] Forced `yt-dlp` failure produces an alert with the tool error.
- [ ] TV device check: subscribe → download → play → watch → retire.
- [ ] Remove all jellyfin-go references.

## Phase 5: Close

- [ ] Acceptance criteria verified on the TV box.
- [ ] Update `tracks.md`, `tech-debt.md`, `lessons-learned.md`; archive.

# Spec: Smart Defaults Engine

## Context

Mediarr already seeds baseline data at startup (`ensureBaselineData` creates quality
definitions, categories, and quality profiles). But many settings still require manual
configuration: download client paths, media management naming patterns, RSS sync
intervals, subtitle languages, and import behavior.

The "Apple-like" zero-config vision means the system should work out of the box with
no manual tuning. The `ensureBaselineData` function is the right place to expand
this convention-over-configuration approach.

## Requirements

### Auto-Configuration at First Run
1. **Download paths**: Auto-create `/data/downloads/incomplete` and
   `/data/downloads/complete` root folders (already done by `DataDirectoryInitializer`).
   Auto-configure the default download client with these paths.
2. **Naming patterns**: Pre-configure standard naming patterns:
   - Movies: `{Movie.Title}.{Release.Year}.{Quality.Full}.{MediaInfo.VideoCodec}`
   - Series: `{Series.Title}.S{season:00}E{episode:00}.{Episode.Title}.{Quality.Full}`
3. **RSS sync interval**: Default to every 15 minutes.
4. **Subtitle languages**: Pre-configure English as the default subtitle language.
5. **Wanted search interval**: Default to every 60 minutes.
6. **Import behavior**: Default to "move" (not copy) when source and destination are
   on the same volume (detected via device ID comparison).

### Settings Inference
7. When a root folder is added at `/data/media/movies`, auto-detect it as a movie folder.
   When at `/data/media/tv`, auto-detect as series folder. No manual "type" selection.
8. When the built-in WebTorrent client is available, auto-configure it as the default
   download client — no manual setup needed.

### Idempotent
9. All auto-configuration is idempotent. Running it again does not overwrite user
   customizations. Only fill in settings that are at their default/unset state.

## Acceptance Criteria

- Fresh install with "Just Work" mode configures all settings automatically.
- System can search, grab, import, and organize media with zero manual configuration.
- Naming patterns are pre-set and match *arr conventions.
- RSS sync and wanted search intervals are pre-configured.
- Built-in WebTorrent is auto-configured as download client.
- Re-running auto-config does not overwrite existing user settings.
- All auto-config logic has tests.
- `CI=true bun test` — all tests pass.

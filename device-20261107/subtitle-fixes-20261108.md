# Subtitle fixes applied (2026-11-08)

Source: `subtitle-audit-20261108.json` (full scan before the fixes).

## Applied
1. **Stale DB row removed.** `VariantSubtitleTrack` row pointed at
   `/data/TV/Firefly/Season 1/Firefly.S01E14.Objects.in.Space....zh.srt.sync.srt`, a file that does
   not exist. Deleted the row (1 row) so playback no longer resolves a missing subtitle.
2. **One mis-encoded subtitle converted to UTF-8.** `/data/Movies/Red (2010)/Red.BluRay.1080p.x264.5.1.Judas.srt`
   was **UTF-16 with BOM** (the audit's strict UTF-8 decode rejected it). Converted with
   `iconv -f UTF-16 -t UTF-8`; the original is kept as `*.bak-utf16-20261108` next to the file.
   Verified: 84,063 characters decode as UTF-8 and the first cue reads `00:00:05,464 --> 00:00:10,924`.

## Result (post-fix scan)
| Metric | Before | After |
|---|---|---|
| Files scanned | 2,879 | 2,878 |
| Not valid UTF-8 | 1 | **0** |
| Missing file | 1 | **0** |
| Traditional Chinese | 169 | 169 (policy decision pending) |
| Variants with Chinese but no English | 762 | 762 (policy: re-download or accept) |

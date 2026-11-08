# YouTube transcode bottleneck — measured (2026-11-09)

## Why the download backlog crawled
`youtube-download` normalises every video for the 32-bit TV (<=30 fps, H.264 high@4.0, AAC,
faststart). On this machine there is **no hardware encoder**: VAAPI fails to initialise the i965
device (`Failed to initialise VAAPI connection`) and QSV has no MFX session, so every encode is
libx264 on an i5-2540M.

Benchmarks (60 s of real 1080p source):
| Setting | Time | Note |
|---|---|---|
| veryfast crf21 | 63.9 s | ~1x realtime |
| ultrafast crf23 | 35.5 s | ~1.7x realtime |
| **remux: -c:v copy + AAC audio** | **75.5 s for a 12-minute file** | video untouched |

A 3-hour course at veryfast needs ~3 h, far beyond the old fixed 30-minute ffmpeg timeout, which is
why long items failed and cycles hung for the whole 20-minute window.

## Policy now in the service
1. **Remux fast path:** probe the downloaded file; when video is already H.264, <=1080p and <=31 fps
   (YouTube 1080p30 avc1) the video stream is copied and only Opus audio is re-encoded to AAC —
   seconds instead of ~1x realtime. `canRemuxToTv` is unit-tested (VP9/AV1, 60 fps, >1080p fall back).
2. **Duration tiers:** <=15 min veryfast crf21; 15–45 min ultrafast crf23 at full resolution;
   >45 min ultrafast crf24 at 720p, with a timeout proportional to duration (capped at 6 h).
3. Batch is 4 per cycle (was 2) and legacy pre-cookie bot failures are requeued once.

## Rejected alternative
Filtering yt-dlp formats with `[fps<=30]` looks attractive but on a spot-check video it selected
**360p** because 1080p is only published at 60 fps; quality loss is worse than transcoding.

## Remaining cost
Many channels publish only 1080p60, so those still take an encode (~1.7x realtime with ultrafast).
The ~260-item backlog will clear in hours rather than weeks only for files that hit the remux path;
60 fps sources remain CPU-bound on this laptop.

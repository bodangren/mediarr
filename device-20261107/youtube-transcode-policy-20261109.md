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

## Stale download claims at boot (fixed 2026-11-09)
Every server restart left the rows that were DOWNLOADING claimed by the dead process; the 30-minute
stale guard in `downloadPending` was the only recovery, so two of my restarts left 3–4 videos stuck
and the library showed them as downloading for half an hour. `serviceContainer` now clears **all**
DOWNLOADING claims once at boot (nothing can own them after a restart) before the scheduler starts.
Measured: `YouTube: reset 3 stale DOWNLOADING claim(s) at boot`, PENDING 258 → 260,
DOWNLOADING 3 → 1 (the scheduler immediately claimed the next real item).

## Throughput measurement and batch size (2026-11-09 02:13–02:51)
- AVAILABLE grew 285 → 288 in ~35 minutes (≈5 videos/hour) with a 4-item batch — each 1080p60
  source needs a full libx264 encode because it is not remux-eligible.
- The batch also **outlived its 20-minute scheduler slot** ("job has been running for 10 minutes"),
  so receipts were rare and history mostly showed rows interrupted by my deploys.
- Decision: batch back to **2 per cycle**. Throughput is unchanged (the scheduler serialises the
  job), but each cycle now fits its slot and reports `attempted/downloaded/failed` honestly.
- Remaining bottleneck is the hardware encoder absence, not batching.

## All-tier ultrafast (2026-11-09 03:5x)
The remaining slow path was 1080p60 videos shorter than 15 minutes: they still used `veryfast`
(63.9 s per source-minute). Since these always need a full encode (60 fps cannot be remuxed to 30),
the short tier is now **ultrafast crf23 at 1080p** as well, same as the 15–45 min tier; long courses
keep ultrafast crf24 at 720p. Expected effect from the measured benchmark: ~1.7x faster encodes
(35.5 s vs 63.9 s per source-minute), i.e. the ~5 videos/hour ceiling should become ~8/hour for
60 fps sources, with crf 23 (visually fine on a 1080p TV) and a bigger file instead of CPU time.

Reversible: the profile lives in `transcodeProfile()` and is unit-tested.

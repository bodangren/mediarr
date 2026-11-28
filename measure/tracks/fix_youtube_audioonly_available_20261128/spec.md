# Spec — Never mark a video-less download AVAILABLE

## Incident (found while triaging 2026-11-28 12:11 HTTP timeouts)

`YoutubeVideo` **1069** (`Svrf688RCWs`, "Elon Pledges Gift Worth… Trillions?!", 892 s) was
`AVAILABLE` and the TV played it — as a **blank picture at ~4.9 fps** (`smoke playback-frames fps=4.7–
5.9`). The file on disk is `ffprobe`-clean but contains **only an AAC audio stream** (161 kb/s,
14:52, `Lavf62.3.100`), 18 MB. So the transcode produced a video-less mp4, exited 0, and the pipeline
marked the row AVAILABLE.

## Root cause

`YoutubeDownloadService.downloadOne` transcodes every accepted file to the TV profile and then
immediately `markAvailable` with the ffmpeg exit status alone — it never checks that the *output*
carries a video stream. When yt-dlp hands back a merged audio-only file (the video stream was
unavailable in that request), ffmpeg happily writes audio-only mp4 and exits 0. The row is then
served to the TV as a playable video with a frozen frame.

## Requirement

A download may only become AVAILABLE when the served file has a video stream. An output without one
must fail the row (retry ladder) and be removed, never served.

## Design

- After the transcode/rename (and before `markAvailable`), probe the final file with the existing
  `probe` seam (ffprobe JSON) and require `videoCodec`; if absent, unlink the bad output and
  `markFailed('transcode produced no video stream')`.
- Unit test: injected probe returns `videoCodec: null` → no `markAvailable`, the file is removed, the
  row gets that error. Existing tests inject a valid video probe (the fake files do not exist on
  disk, so the real ffprobe would otherwise fail them).

## Acceptance

- Red before green: the new test failed against HEAD (row was marked AVAILABLE).
- `npx vitest run server/src/services/YoutubeDownloadService.test.ts` 13/13; server tsc clean.
- Live: the engine reloaded with the guard; video 1069 re-acquired with a real video stream and the
  TV plays it at normal frame rate.

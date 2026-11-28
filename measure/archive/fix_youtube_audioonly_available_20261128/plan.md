# Never mark a video-less download AVAILABLE — Plan

Spec: `spec.md`.

## Phase 1 — Validate the transcode output [checkpoint: 7bf155e]

- [x] Task: Write the failing test — a probe of the output with `videoCodec: null` must not mark the
      row AVAILABLE, must remove the bad file and must record `transcode produced no video stream`;
      existing download tests inject a valid video probe. Red confirmed: 1 test failed against HEAD
      (the row was marked AVAILABLE). — 7bf155e
- [x] Task: Add the post-transcode probe guard in `downloadOne`. — 7bf155e
- [x] Task: Measure — User Manual Verification 'Phase 1': download-service suite and server tsc.
      Evidence: `YoutubeDownloadService.test.ts` 13/13; `npx tsc -p server/tsconfig.json --noEmit`
      clean. — 7bf155e

## Phase 2 — Repair the bad row and close

- [x] Task: Re-acquire YouTubeVideo 1069 with a real video stream at the same library path
      (`yt-dlp` + the TV transcode profile), verify with `ffprobe` that the served file has a video
      stream, and record the frame rate on the TV. Done: the 1080p60 source (format 299, 180 MB)
      exhausted yt-dlp's 10 retries at 78 % on the Astrill tunnel, so the file was re-fetched at
      720p H.264 (format 298 + Opus audio, 108 MB) and transcoded with the pipeline's own profile
      (libx264 ultrafast crf 23, fps=30, high@4.0, AAC 160k, faststart); the result (213 MB,
      892.0 s) was moved over the library path atomically. `ffprobe` now reports `h264 1280x720
      30/1` + `aac LC`, and the stream route serves it (`206 video/mp4`). — 7bf155e
- [~] Task: Record the incident and fix in `device-20261107/friction-ledger.jsonl`, update
      `measure/tracks.md` and the triage ledger, and archive the track.

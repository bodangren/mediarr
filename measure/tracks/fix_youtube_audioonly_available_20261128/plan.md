# Never mark a video-less download AVAILABLE — Plan

Spec: `spec.md`.

## Phase 1 — Validate the transcode output [checkpoint: TBD]

- [ ] Task: Write the failing test — a probe of the output with `videoCodec: null` must not mark the
      row AVAILABLE, must remove the bad file and must record `transcode produced no video stream`;
      existing download tests inject a valid video probe.
- [ ] Task: Add the post-transcode probe guard in `downloadOne`.
- [ ] Task: Measure — User Manual Verification 'Phase 1': download-service suite and server tsc.

## Phase 2 — Repair the bad row and close

- [ ] Task: Re-acquire YouTubeVideo 1069 with a real video stream at the same library path
      (`yt-dlp` + the TV transcode profile), verify with `ffprobe` that the served file has a video
      stream, and record the before/after frame rate on the TV.
- [ ] Task: Record the incident and fix in `device-20261107/friction-ledger.jsonl`, update
      `measure/tracks.md` and the triage ledger, and archive the track.

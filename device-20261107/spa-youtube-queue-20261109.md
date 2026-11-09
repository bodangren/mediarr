# YouTube queue health in the SPA (2026-11-09)

The SPA YouTube page listed downloaded videos but said nothing about the download backlog, so the
owner could not see why new videos were not appearing.

- `youtubeApi.getQueue()` reads the new `/api/youtube/queue`.
- The page renders a status strip above the channel list:
  **299 available · 316 pending · 40 retrying · 1 quarantined · downloads run every 20 minutes**
  (retrying/quarantined highlighted only when non-zero).
- Page test mocks the API and asserts both the queue badges and the channel grouping.

## Browser verification
`/youtube` shows exactly that strip above `DAVE GRAY (55)` etc. Evidence:
`spa-youtube-queue-20261109.jpg`.

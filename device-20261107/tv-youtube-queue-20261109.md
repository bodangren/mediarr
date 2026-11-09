# YouTube queue health on the TV (2026-11-09)

The TV YouTube screen listed downloaded videos but gave no reason why new videos were not appearing.
It now shows the download queue under the header.

- New `YoutubeQueueSummary` model + `getYoutubeQueue()` in the TV client.
- `YoutubeLibraryScreen` loads the queue and renders one muted line:
  **299 available · 316 pending · 40 retrying · 1 quarantined · downloads run every 20 minutes**
  (pending/downloading/retrying/quarantined appear only when non-zero; a failed lookup is ignored so
  the library still renders).
- Widget test covers the line; the first version overflowed at 800 px in the test, so it is a single
  ellipsised line rather than two Texts in a Row.

## Device verification (1.3.56 / code 80)
YouTube screen header: `YouTube · 200 videos` then the queue line above `CodeStoic · 81 videos`.
Evidence: `tv-youtube-queue-20261109.png`.

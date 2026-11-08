# Up Next + autoplay — device verification (2026-11-09)

Workstream 6 requires up-next/autoplay never to regress. Verification on 1.3.49 (code 73):

1. Stored Rick and Morty S02E01 at 1290 s (≈2 min left), played from Home → Continue Watching.
2. The episode completed (DB: position=duration, `isWatched=1`).
3. **Up Next surfaced**: "Up Next — S02E02 — Mortynight Run — Starting in 5" with Play now / Cancel
   (`upnext-countdown-20261109.png`).
4. After the countdown the queue advanced and playback continued; a later HUD shows
   **Rick and Morty S02E05 - Get Schwifty at 22:36/23:02** (`autoplay-next-episode-20261109.png`),
   i.e. the route kept walking the season queue without returning to the library.
5. Bilingual Chinese/English subtitles remained active on the autoplay episodes.

Test-only progress rows were removed/restored for S02E01 (position back to 216 s, unwatched) so the
owner's Continue Watching is unchanged apart from the episodes the queue genuinely auto-played.

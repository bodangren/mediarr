# YouTube "See all" per channel on the TV (2026-11-09)

Owner review 2026-11-08: with 265+ videos some channels hold 90+ items in one horizontal strip, so
browsing a channel was impractical.

- Every channel header now has a focusable **See all** action next to the count.
- It opens a vertical list for that channel (`_ChannelVideosScreen`): Back control, "<channel> · N
  videos" title, and the same video cards in a vertical scroll; selecting a video keeps using the
  screen's existing `onSelect` playback path.
- Widget test: a 40-video channel shows See all; opening it renders the channel list with Back and the
  first video.

## Device verification (1.3.52 / code 76)
YouTube screen shows "CodeStoic · 81 videos" with See all; UP + OK opened "CodeStoic · 81 videos" as a
vertical list with Back focused (`tv-youtube-see-all-20261109.png`, `tv-youtube-channel-list-20261109.png`).

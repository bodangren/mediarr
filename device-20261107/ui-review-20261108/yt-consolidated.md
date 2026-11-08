# Three-model review — YouTube TV section, TV playback, SPA library (2026-11-08)

Screens (downscaled copies in `shots/`): TV section (1280x720 logical, D-pad only), TV playback
(fullscreen, transport hidden), SPA YouTube library (1366 wide, archive imported).
Reviewers: Kimi K3.1 Pro (`yt-kimi-*.md`), MiMo 2.6 (`yt-mimo-*.md`), MiniMax M3.1 Flash
(`yt-minimax-*.md`). One small image per run — multi-image runs remain unstable on these adapters.

## Consensus P0/P1 — implemented (1.3.22, code 46)
1. **TV typography too small for the couch** (all three): card titles 15→19 sp, group headers 14→20 sp,
   counts 16→18 sp; duration moved into an opaque pill on the still (14 sp) so it survives bright frames.
2. **Rows looked empty / one-card groups led the page** (MiMo, MiniMax): the pre-import capture only had
   two videos; the page now shows 200 videos sorted by channel size (CodeStoic 98, Codevelution 63 …),
   with the storage bucket renamed **Unsorted** and sorted last.
3. **No orientation or control hint during playback** (all three): the transport overlay now carries
   `OK · controls   ·   Back · back to library` so a viewer knows how to reach controls.
4. **SPA episode identity lost** (Kimi, MiMo, MiniMax): two-line clamped titles with full-title tooltip,
   duration in an opaque pill on the poster, muted channel meta; SPA subtitle changed to
   "Downloaded channels and videos" (the old copy implied every item was subscription-managed).

## Agreed but still open
- TV: 5 s title card on entry/resume, elevation + stronger scale on focus, "＋ Add channel" affordance.
- SPA: sort/filter/pagination for 63-item channels, archive/subscription chips, breadcrumb casing.
- Playback: persistent slim title/progress chrome; confirm-before-exit after 30 s.

## Notes and noise
- MiniMax flagged the existing 4 px ring/1.02 scale; that was already shipped in the Adult review pass and
  was not re-implemented (their own follow-up confirmed the real gap is elevation, not the ring).
- The frame's upper-left inset graphic is burned into the creator's video, not app chrome — bottom-anchored
  chrome is the safe placement, as MiniMax correctly warned.
- The TV capture after fixes: `device-20261107/youtube-tv-review-fixes.png`.

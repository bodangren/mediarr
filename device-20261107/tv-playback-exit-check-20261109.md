# TV playback exit check (2026-11-09, 1.3.58 / code 82)

Finishing the open Phase 3 remote-only check from `feature_tv_home_redesign_20260924` after the owner's
2026-11-08 decision that **Back toggles the HUD** and **Stop is the deliberate exit affordance**.

## Measured
1. Played *12 Angry Men* from its detail page.
2. Pressed **Back twice**: the video kept playing and only the overlay toggled — matching the designed
   "Back is always consumed" contract (owner report: Back used to end the video instead of closing HUD).
3. Pressed **Stop (media stop key 86)**: playback exited to the movie detail page
   (`tv-stop-exit-20261109.png`), the progress row was written as **position 104 s / duration 5768 s**, and
   three seconds later the position was still **104** — playback genuinely stopped, not backgrounded.
4. Test row deleted afterwards (`count = 0`), so no owner state was left changed.

## Conclusion for the track
The 2026-09-25 finding "Back returns to Home without a confirmed stop" is **superseded by design**: Back
never exits, Stop exits and stops + persists. The remaining item for this track is the owner's perceptual
remote-only sign-off (human-gated).

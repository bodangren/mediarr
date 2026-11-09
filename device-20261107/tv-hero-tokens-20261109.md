# Hero mockup colours moved into theme tokens (2026-11-09, 1.3.59 / code 83)

Closing the recorded deviation in `feature_tv_home_redesign_20260924` Phase 1: the hero CTA gradient
(`#7FB2FF → #4E8DF5`), its foreground (`#0A1424`) and the secondary pill surface (`#1B2430`) were literals
at the call site.

- Added `MediarrColors.heroCtaGradient`, `heroCtaForeground`, `heroSecondarySurface` and used them in
  `home_screen.dart`. No other screen changed, so no regression surface.
- `flutter analyze lib`: clean; home tests: **28 passed**.
- **Pixel-proof of no visual change:** the same Home hero frame before and after the refactor has the same
  MD5 — `6a67ed20c6363d77ea54eae255d8c49e` (`hero-before-tokens-20261109.png`,
  `hero-after-tokens-20261109.png`), i.e. the token indirection is byte-identical in render output.

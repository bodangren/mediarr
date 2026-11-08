# TV UI review — Adult grid, auto-paging

**Verdict:** Auto-paging works but is invisible to the viewer, and the header slices a card row in half.

**1. Header clips a half row with no scroll fade.** The top row is cut through its meta line ("Digital Sin · 1080p" sliced mid-glyph) under the "Adult" header, so the grid looks broken, not scrolled. Fix: opaque header + bottom gradient mask, and snap scrolling to row boundaries.

**2. Auto-page gives zero feedback.** Nothing at the bottom of the grid says a page is loading, or that "196 items · 8 need review" is the end — the headline feature is silent. Fix: a "Loading more…" sentinel row during fetch, then "196 of 196 · End of list", plus a slim right-edge scroll-progress bar.

**3. Thumbnail-less cards look broken.** "HER LIMIT - NEVERENDING ASS FUCKING - The Brunette …" and "Hi, I'm a Slut _PMV Asian Sluts [2023]" have no studio/quality meta and no placeholder, so they read as failed artwork. Fix: render a "No preview" placeholder and anchor titles to one baseline so mixed rows align.

**P0:** Loading + end-of-list indicator for auto-paging.
**P1:** Header fade and row snapping; real "No preview" placeholder for cards with no thumbnail.
**P2:** Make "8 need review" a toggle chip; unify "…" vs "..." truncation in a 2-line clamp; drop the keyboard-only "Search title, filename or studio" field on a remote (sidebar "Search" exists); thicken the 2px focus ring on the selected card.

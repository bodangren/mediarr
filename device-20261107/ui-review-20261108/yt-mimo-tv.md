# MiMo 2.6 — YouTube TV section review

**Verdict:** Correct structure with visible focus, but it wastes most of the 10-foot canvas and its typography is too small for couch distance.

## Problems & fixes
1. **Huge dead space right of the rows.** Only one small card per group renders; ~70% of the width is empty. Fix: scale card width up at 1280x720 (≈240–280px, 16:9) and lay cards out to fill the row so 4–5 fit per group.
2. **Title/duration text too small at 10 feet.** Two-line titles and the "7:21" line are near-microscopic from the couch. Fix: bump card titles to ~20–22sp, duration to ~16sp, and overlay duration as a badge on the thumbnail's bottom-right.
3. **Group headers are faint and cryptic.** "UNCATEGORIZED (1)" is tiny, low-contrast, and jargon-y next to "DAVE GRAY (1)". Fix: raise header size/contrast (~18sp, brighter grey), spell out "Uncategorized", and add channel avatar or "Dave Gray · YouTube" label.

## Priorities
- **P0:** Enlarge cards/rows to fill the empty canvas — current layout looks broken on TV.
- **P1:** Increase title/duration font sizes + duration badge overlay.
- **P2:** Louder, friendlier group headers with channel context.

# Adult grid TV review (1280x720, D-pad)

**Verdict:** Legible 4-column grid with clear focus, but raw filename titles, a phantom "8 need review" count, and a clipped bottom row break 10-foot usability.

**Problems**
1. **Filenames as titles, with broken glyphs and duplicates.** First two rows show raw names — `001 [c6d5a2bl.mp4`, `001 lacc305fbl.mp4`, `002 …`, `003 …`, `004 …` — each appearing twice (two source files per item), and `[`/`l` are mojibake. Fix: sort by parsed title, not filename; strip to a clean ASCII title, fall back to `001 · c6d5a2bl`; one line, ellipsis at card width (260px), 14px/500; merge duplicate pairs or append `· part 2`.
2. **Header says "196 items · 8 need review" but no NEEDS REVIEW badge appears in any of the 16 visible cards.** Fix: pin the 8 flagged items to the first row (after the focused card) or add a "Needs review (8)" filter chip right of the header; badge = 16px inset pill, 24px tall, 12px/700 uppercase, label `NEEDS REVIEW`, high-contrast amber.
3. **Bottom row is clipped at y≈640** — thumbnails cut, titles below the 720px fold, only ~4.5 rows visible. Fix: grid `padding-bottom: 48px`, row gap 16px, title 12px under thumbnail; give focused cards `scroll-margin: 24px` so D-pad focus scrolls the whole card plus title into view.

**P0:** Flagged 8 items must show a visible NEEDS REVIEW badge and be reachable in the first rows.
**P1:** Replace raw/mojibake filenames with parsed, deduped, ellipsized titles.
**P2:** Add 48px bottom scroll padding so the clipped 5th row and its titles are fully readable.

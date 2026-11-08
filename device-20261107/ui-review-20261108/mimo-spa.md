# Adult library SPA review (1366 wide)

**Verdict:** Counts and structure are right — "196 items · 8 need review" matches the 8 visible "Needs review" badges — but the grid looks unfinished: no visible artwork, raw filenames, and a stray sidebar pill.

**Problems**

1. **Thumbnails absent/black.** Cards show only a title, a bare "—" and a badge. Fix: render a fixed 16:9 thumb (220×124px, 8px radius) above the title, or delete the "—" line when metadata is missing; keep card min-height 176px so rows stay even.
2. **Raw filenames as titles.** "001 [1c6d5a2b].mp4" vs "001 [acc305fb].mp4" are indistinguishable. Fix: strip ".mp4", demote `[1c6d5a2b]` to a 10px muted mono chip, and add the parent folder as a 12px subtitle (like "1000Facials" already does).
3. **Unlabeled white pill (~60×22px) floats beside "Wanted"** in the sidebar. Fix: remove it or anchor it with a label + aria-label. Also make "8 need review" in the count line a 12px clickable chip that filters the grid.

**P0:** Fix missing/blank thumbnails on every card before ship.
**P1:** Normalize untitled titles (strip extension, chip the hash, folder subtitle).
**P2:** Remove the floating sidebar pill; turn the review count into a filter.

**Verdict:** The Adult grid is structurally clear, but weak focus, tiny text, and filename-first cards make it unsuitable for reliable 10-foot D-pad browsing.

1. **Remote focus is too subtle.** The selected first card has only a thin blue outline. Use a **4 logical px** high-contrast ring with **4 px offset**, plus **1.04× scale**; keep the whole focused card onscreen. Make navigation deterministic: **Right** from the highlighted **Adult** rail item enters card 1, **Left** returns to the rail, and **Up** from row 1 reaches **Search title, filename or studio**.
2. **Density defeats readability.** “**196 items · 8 need review**,” search text, and card labels are too small at 10 feet. Set card titles to **24 logical px**, secondary text/search to **20 px**, and the search field to **48 px high**. Use **32 px content padding**, **24 px grid gaps**, and **16:9 thumbnails at least 138 px high**; favor two fully readable rows over five cramped/clipped rows.
3. **Card information is in the wrong order.** Labels such as “**001 1c6d5a2bl.mp4**” expose filenames while later cards mix names and quality. Standardize **thumbnail → clean title → studio · quality badge**; move extensions/hash-like filenames to details. Rename the header to “**Adult — 196 videos · 8 need review**” and make “8 need review” a focusable filter.

**P0:** Implement the strong focus treatment and deterministic rail/search/grid navigation.
**P1:** Increase type, thumbnail, and spacing sizes; show fewer complete rows.
**P2:** Normalize card metadata and add the “8 need review” filter.
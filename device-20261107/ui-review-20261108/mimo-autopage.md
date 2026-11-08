# Adult grid — auto-page review (small-adult-tv-autopage.jpg)

**Verdict:** Auto-paging keeps D-pad focus flowing, but newly appended rows render as blank cards and the grid has no artwork, so the Adult shelf is not yet scannable at 10 feet.

**Problems & fixes:**

1. **Freshly appended rows are empty cards** — top row shows boxes with no title, metadata, or art (still loading). Fix: render each card's cached title/filename immediately as a skeleton, and show a spinner/placeholder rather than a blank slot; never move focus onto an unresolved card.
2. **No thumbnails at all** — every card is a dark text box, weak visual anchoring for TV viewing. Fix: fetch poster/still art per item, with a styled title-card fallback so every slot always has a visual.
3. **Inconsistent, overflowing metadata** — one title bleeds past its line; cards mix "Studio · 1080p", "720p · 2024-03-08", and missing fields. Fix: clamp titles to 2 lines with ellipsis and standardize one meta line: `Studio · 720p · 2024-03-08`, hiding absent fields.

**P0:** Blank appended cards — fix loading state so focus never lands on an empty card.
**P1:** Add thumbnails/title-card fallback for every card.
**P2:** Standardize the meta line, clamp titles, add a subtle loading/end-of-grid hint.

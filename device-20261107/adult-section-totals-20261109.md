# Adult library section counts are library-wide (2026-11-09)

The SPA split the loaded page into “Needs review” / “Library” sections, so both headings showed
page-scoped counts while the toolbar above showed real totals (tech-debt 2026-11-08).

- New `adultSectionTotals()` derives `review`/`library` from the server's `totalCount` and
  `needsReview`, with a “showing this page” qualifier only when the filtered library is paginated
  (2 unit tests).
- The server's `needsReview` now counts **within the current search filter** instead of the whole
  library, so a filtered view cannot claim “N need review” for rows it is not showing.

## Live verification
- API without q: `totalCount 197, needsReview 8`; with a nonsense q: `totalCount 0, needsReview 0`.
- SPA `/adult`: headings `Needs review (8) · showing this page` and `Library (189) · showing this page`,
  toolbar `197 items · 8 need review` — the three now agree.

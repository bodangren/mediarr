# YouTube Library SPA — MiniMax

**Verdict:** Dense grid, but episode identity is hidden: truncated titles, low-contrast duration overlays and near-identical posters make 63 episodes hard to tell apart.

## Problems

1. **Titles truncate at one line and lose the episode number.** Cards read `Next.js 15 Tutorial - 38 - Handling PO…` — the number is the only differentiator and the ellipsis cuts exactly there. *Fix:* clamp titles to two lines (`-webkit-line-clamp: 2`) with a tooltip, and show the episode number as a chip above the title.

2. **Duration is burned into the poster with no contrast backing.** The badge overlaps pale code-editor screenshots and is the card's smallest text. *Fix:* move duration into the meta row under the title, or keep it on the poster in an opaque dark pill with white text.

3. **A 63-item channel has no scan aids.** Only ~16 cards render, with no sort, filter or "load more"; the `CODEVELUTION (63)` header is dim. *Fix:* add a sticky filter/sort bar (channel, newest, duration) plus pagination, and label tiles with series + episode number.

## Priorities

- **P0** — Two-line title clamp + episode chip; episode identity is unreadable.
- **P1** — Duration on an opaque pill or meta row; the overlay is illegible.
- **P1** — Sort/filter/pagination for 63-item channels; episodes past 16 are unreachable.
- **P2** — Channel avatar or accent bar to break up identical code-editor posters.
- **P2** — Drop the repeated per-card tag; the sidebar YOUTUBE section adds no value.

# MiniMax M3.1 Flash — YouTube TV section (1280×720, D-pad)

**Verdict:** Works but unfinished — each channel row holds one 288px card, leaving ~70% of the screen black, and the type hierarchy is inverted.

## Problems

**1. Rows of one card waste the screen (P0).** "UNCATEGORIZED (1)" and "DAVE GRAY (1)" each show one card; ~700px of black sits beside both rows.
*Fix:* make rows fill the width (3–4 columns at 1280), not a fixed-288px ListView; fold <2-item channels into one "Latest" row.

**2. Focus and hierarchy are both flat (P1).** Focus adds only a 4px border and a 1.02 scale — no elevation, no dimming of unfocused cards — and the 14sp grey group label is smaller than the 15sp titles beneath it.
*Fix:* keep the ring, add elevation + 1.06 scale + dim unfocused cards; group labels 16sp semibold white; duration 13sp → 16sp.

**3. "UNCATEGORIZED" leads as a fake channel; cards show no state (P1).** `channelName` returns "Uncategorized" for null-channel archive rows, so a storage bucket sorts first like a real channel; cards carry title, duration and watched only.
*Fix:* label it "Unsorted", sort groups by count desc; add a date chip and an "＋ Add channel" tile.

## Priority

- **P0** — Fill the width; no one-card rows.
- **P1** — Focus elevation/scale + dim unfocused; 16sp labels and durations; demote "Uncategorized"; date chip; add-channel tile.
- **P2** — Small grey "2 videos" count; duplicated "(1)" counts; 2-line title clamp.

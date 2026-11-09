# Series Play all / Play next on the TV (1.3.68 / code 92, 2026-11-09)

Series detail for *The 100* (S1–S7): ActionBar now reads
```
▶ Play all     ▶| Play next
🔍 Search All Missing
🗑 Delete Series
```
`tv-series-playall-actions-20261109.png` is the device screenshot at 1920×1080.

- **Play all** starts the first playable episode with the existing season-crossing queue.
- **Play next** appears when the resume target is not the first episode (The 100 resumed S01E04, so both show).
- Destructive Delete remains last; Down past the last episode lands on Play all, never Delete.
- Library suite: 77 tests green; analyzer clean.

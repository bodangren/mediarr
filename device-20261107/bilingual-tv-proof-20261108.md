# Bilingual EN+ZH invariant — TV proof (2026-11-08)

Task B2f (FR-17): restore the bilingual subtitle invariant; Chinese-only with no
English sibling must be flagged, not guessed; TV proof requires two lines visible.

## What exists
- `BilingualSubtitleService` classifies each Chinese subtitle as already-bilingual
  (`ok`), Chinese-only with an English sibling (`merged`, stack EN under ZH per
  cue), English-only translatable (`translated` via MiniMax), or
  `needs_english` when there is no English source (flagged, never guessed).
- Scheduler task `bilingual-subs` runs the cycle every 2 h (limit 3 items).
- State (`/config/bilingual-state.json`), 753 entries:
  **637 ok (already bilingual) + 24 merged + 4 translated = 665 bilingual**,
  **79 needs_english flagged**, 6 gave_up, 3 failed.

## TV proof
Episode: *Rick and Morty* S02E01 (episode id 1327), whose `.zh.srt` was `merged` by
the service; the merged file keeps the Chinese line and stacks the English line
under it for every cue.

Device 1.3.42 (code 66), played from Continue Watching at 0:10:

```
你应该从上到下清干净
You really should be cleaning
from top to bottom.
```

Screenshot: `bilingual-tv-proof.png` — two lines on screen, Chinese first, English
underneath, default TV subtitle selection.

## Note
The audit numbers in the task text (868/54/35/3) are from the older file audit;
the current full-library file audit is 2,878 files with 704 dual-language
variants and 762 Chinese-only variants queued via the priority-wanted endpoint.
The specific B2f requirement — bilingual output verified on the TV, Chinese-only
flagged rather than guessed — is satisfied.

# Traditional → simplified subtitle conversion executed (owner-approved 2026-11-09)

Owner decision: **convert**, not re-download. Ran the tested OpenCC `t2s` normaliser in live mode over every
Chinese sidecar (including newly extracted embedded tracks).

```
dry run: 1,592 scanned · 196 would convert · 0 skipped-trad
live:    1,592 scanned · 183 converted · 1,409 skipped (already simplified/other) · 53 s
re-scan: 0 would convert  (verified immediately after)
backup:  every converted file has <name>.hant-2026-11-09 next to it
sample:  Die Hard (1988).zho.srt
         before: 你不喜歡搭飛機吧  → after: 你不喜欢搭飞机吧
         backup: Die Hard (1988).zho.srt.hant-2026-11-09
```
Atomic replace (temp file + rename) and dated backups were part of the normaliser; nothing was deleted.

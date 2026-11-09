# Embedded Chinese subtitles recovered without a provider (2026-11-09)

## Finding
The playback manifest only serves **external** subtitle tracks (`VariantSubtitleTrack.filePath != null`), but
402 Chinese tracks are embedded in the containers (`source=EMBEDDED`, `filePath` null): 337 `subrip`,
10 `ass` (text → extractable) and 55 bitmap PGS/DVD (need OCR). **119 variants have embedded Chinese as
their only Chinese**, so coverage counted them as covered while the TV could not show Chinese at all.

## What was built
- `EmbeddedSubtitleExtraction.ts`:
  - `isExtractableChineseTrack` (text codecs only; skips bitmap and index-less rows),
  - ffmpeg `-map 0:<streamIndex> -c:s srt` → `<basename>.zho.srt`,
  - adopts an existing sidecar for a second track of the same video instead of overwriting,
  - duplicate-output guard within a run, durable attempt cap (`subtitle-extract-state.json`, 3 attempts)
    so stale/missing-file rows cannot starve the queue.
- Scheduler job `subtitle-extract` every 10 minutes, batch **5** (~10 s per extraction, well inside the slot).
- 7 unit tests (selector, pathing, extraction, duplicate/attempt skip, adoption, failure).

## Live evidence
```
17:00 run: extracted 1, failed 2 (stale video path), state file created
17:20 run: extracted 2, skipped 276, failed 1 (attempt cap now 3 -> skipped next run)
queue: 402 -> 342 extractable embedded Chinese tracks remaining (each run ~5)
movie 19 "A Widow's Game" manifest before: no Chinese subtitle; after:
  subtitles: [('chi', '/api/playback/subtitles/406'), ('chi', '/api/playback/subtitles/407')]
extracted file: /data/Movies/A Widow's Game (2025)/….zho.srt (108,610 bytes, valid SRT with Chinese cues)
```
Full server suite: **302 files / 2,837 tests passed, 11 skipped**.

This turns embedded Chinese into real, realignable, playable sidecars — coverage the owner already paid
for in storage, without needing the provider key.

## Queue-health fixes + sustained drain (17:50)
The first runs exposed two queue-starvation risks, both fixed:
- **Missing video rows** (stale DB variants): a `videoExists` pre-check skips them cheaply and records the
  attempt in the durable state, without consuming an extraction slot.
- **Duplicate outputs across runs**: an existing `.zho.srt` is adopted instead of re-extracted.

Live after the fixes:
```
17:40 run: extracted 5, skipped 530, failed 0  (17:45:45)
17:50 run: extracted 5, skipped 526, failed 0
queue: 402 -> 331 extractable embedded Chinese tracks in ~50 minutes (~10/10-min with stat skips)
every run now reports failed 0; stale rows are skipped, not retried forever
```
The extraction loop walks all embedded-track rows to find work (hence the large skip count), but each
missing/non-text row costs only a stat/lookup.

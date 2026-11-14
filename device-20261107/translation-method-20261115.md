# English → Chinese dual-language subtitles — method and evidence (2026-11-15)

Owner request 2026-11-14: *"We can develop a method to translate available English subs to chinese and
create the dual-language versions."*

This is the implemented method. It runs entirely on the operator surfaces (ffmpeg, faster-whisper,
MiniMax/Xiaomi HTTP APIs) — **no Mediarr REST calls**. The engine registers and aligns the result on
its own scans.

## When it is used

1. **No Chinese pack exists** anywhere (zimuku has none — e.g. Archer S03/S08).
2. **English exists but is bitmap-only** (`dvd_subtitle`: ffmpeg cannot convert to text), or
3. **No subtitle stream at all** (the audio is the only source).

The zimuku path remains preferred whenever a real Chinese/双语 pack exists — a translated track is
the fallback, never a replacement for a genuine pack.

## Pipeline

```text
video ──► English source ──► translate to Simplified Chinese ──► stacked .zho.srt ──► engine scan + sync
           (a) existing <stem>.en.srt
           (b) embedded text track (ffmpeg -map 0:s:0 -c:s srt)
           (c) faster-whisper ASR from the audio (small.en, int8 CPU)
```

```bash
# one episode
python3 automation/scripts/subs-bilingual-batch.py --dir "<season dir>" --pattern "S03E01*.mkv"

# a whole season, detached and resumable
nohup python3 -u automation/scripts/subs-bilingual-batch.py --dir "<season dir>" \
    --batch 12 --parallel 3 > /tmp/<show>-bilingual.log 2>&1 &
```

Per cue the output is the house style: **Chinese line first, English line(s) directly under it**
(existing sidecar preserved as `.orig.bak`).

## Provider notes (measured 2026-11-14/15)

| Provider | Endpoint | Model | Measured latency | Notes |
|---|---|---|---|---|
| MiniMax (primary) | `api.minimaxi.com/anthropic/v1/messages` | `MiniMax-M3.1-Flash` | 13–40 s per 12-line batch | thinking cannot be disabled (HTTP 400); needs a 16k output budget or a thinking block can consume it all and return no text |
| Xiaomi (fallback) | `api.xiaomimimo.com/v1/chat/completions` | `mimo-v2.6-flash` | ~20 s per 12-line batch | OpenAI-compatible, same JSON-array contract |

Both keys already exist in the repo `.env`. A chunk is translated by MiniMax, then Xiaomi, then split
in half once; if it still fails the cue is written **English-only** (no fabricated Chinese) and the
count is printed. Batches run **3 at a time** and every finished batch is **checkpointed** to
`<en>.partial.json` keyed by a hash of the English lines, so an interrupted run resumes instead of
re-paying API calls.

## Cost / time

One 22-minute episode: **ASR ~15 min** (CPU int8) + **translation ~10–15 min** (provider latency
dominated). A 10-episode season therefore takes several hours; run it detached overnight.

## Evidence

- **Archer S03E01 — shipped 2026-11-15 00:00.** Bitmap-only English (DVD subs) → ASR produced 472 cues
  → translated to a **49,932-byte** bilingual sidecar, **0 lines left English-only**; natural Chinese
  (the "valet" pun preserved as 瓦莱/瓦莱特). Engine scan registered the EXTERNAL `zh` (and the ASR
  `en`) track: `subtitlesFound 38 / newSubtitles 2`.
- **Archer S03E02** — ASR 230 cues, translation in progress at the time of writing.
- Library-wide scope: **1,165 variants** have English but no Chinese track; the runner is resumable,
  so the backlog can be worked through episode by episode.

## Limitations (honest)

- Machine translation, **not human-reviewed**; keep the English line so the viewer can check.
- Provider refusals leave individual lines English-only (reported per episode).
- ASR is CPU-bound on this machine and runs at roughly real-time-ish for a 22-minute episode.
- The engine's `subtitle-sync` still verifies timing; ASR-derived cues are aligned by construction.

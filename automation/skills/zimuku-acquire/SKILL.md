---
name: zimuku-acquire
description: Acquire bilingual (简英/中英) Chinese subtitles from zimuku.org by driving Chrome through the browser bridge and placing them as `<video>.zho.srt`. Use when an item has no Chinese subtitle, when the owner says "get Chinese subs", or when a subtitle provider is unavailable. You solve the site WAF captcha with your own vision and verify pack content before placing it.
---

# zimuku-acquire — Chinese subtitles from zimuku.org

The acquisition is an **agent turn**, not a script: you drive Chrome with `mcp__webbridge__*`,
download the signed pack with `curl`, convert with `ffmpeg`, and place the sidecar. The run contract
is [`automation/prompts/subtitle-acquire-zimuku.md`](../../prompts/subtitle-acquire-zimuku.md) — read
it before acting. No subtitle-provider API and no Mediarr REST calls are involved; the engine's own
`subtitle-sync` / `library-scan` tasks register and align the sidecar afterwards.

## Preconditions

- `mcp__webbridge__navigate` / `evaluate` / `screenshot` registered and the Chrome extension
  connected (probe with `evaluate` returning `1+1===2`).
- The Mediarr engine is running and the DB opens read-only.
- `ffmpeg`, `ffprobe`, `curl`, `unzip` (or `unrar`) on PATH; `/config` writable for the receipt.

## The flow

1. **Captcha.** zimuku's WAF may show `网站防火墙` with a 5-digit image. Screenshot `.verifyimg`,
   read the digits with your vision, fill `#intext`, submit. Success shows `字幕库(zimuku,SrtKu)`
   and the `srcurl` cookie returns you to the page you requested. Never guess digits.
2. **Search the home form.** `navigate https://zimuku.org/`, fill `input[name="q"]` with the Chinese
   release title (e.g. `银河护卫队3`), click `button.btn-search`. Never type a `/search?q=` URL —
   direct URL navigation is what trips the WAF.
3. **Choose a pack** from the rendered rows: accept `简英` / `中英` / `双语` / `简体&英文` / `国英双字` in
   `ASS/SSA`/`SRT`; reject `SUP` and `IDX+SUB` (bitmap, ffmpeg cannot convert); prefer `官方译本`,
   high download counts, and a pack whose noted runtime matches the video. Confirm on
   `/detail/<id>.html`.
4. **Download.** Open `/dld/<id>.html`, read the `联通高速下载（新）` href
   (`https://zimuku.org/download/.../svr/l0`), then
   `curl -sL -A "<chrome UA>" -o pack.bin "<href>"`. `file pack.bin` tells you raw ASS/SRT vs a
   ZIP/RAR pack.
5. **Verify content, never the filename.** zimuku ASS headers often name an unrelated film (seen
   live: a Guardians pack titled `Harry.Potter.And.The.Sorcerers.Stone…`). Read the first cues for
   the film's real dialogue and check the last cue against the video runtime (|Δ| > 60 s →
   mismatch).
6. **Convert and clean.** `ffmpeg -y -loglevel error -i sub.ass sub.srt`, then strip the BOM and
   inline font tags: `sed -e '1s/^\xEF\xBB\xBF//' -e 's/<[^>]*>//g' sub.srt > clean.srt`.
7. **Place it.** Write `<video-stem>.zho.srt` next to the video. Bilingual packs keep the Chinese
   line then the English line stacked — the house style the TV renders. Never overwrite an existing
   sidecar without moving it to `<name>.orig.bak` first. Do not run ffsubsync by hand: the
   `subtitle-sync` scheduler task aligns new sidecars within 15 minutes.
8. **Receipt.** Append one JSON line to `/config/subtitle-acquire-receipts.jsonl` with `at`,
   `mediaType`, `mediaId`, `title`, `zimukuId`, `detailUrl`, `packFormat`, `cues`, `placedPath`,
   `runtimeRisk`, `ok`.

## Chinese-only packs (the Archer S07 case, 2026-11-14)

Sometimes the only pack on zimuku is **Chinese-only** (often Traditional) while the videos carry an
**embedded English** track. Do not skip it and do not ask for a translation: build the bilingual
sidecar deterministically.

1. Download the season pack and extract it (one SRT per SxxEyy).
2. Build the bilingual sidecars with the repo script — it extracts the embedded English track,
   converts Traditional→Simplified with OpenCC, and assigns each English cue to at most one Chinese
   cue (Chinese line then English line; existing sidecar kept as `.orig.bak`):

   ```bash
   automation/scripts/subs-merge-bilingual.py --pack-dir /tmp/pack \
       --video-dir "/data/TV/Archer (2009)/Season 07" --dry-run   # review counts first
   automation/scripts/subs-merge-bilingual.py --pack-dir /tmp/pack \
       --video-dir "/data/TV/Archer (2009)/Season 07"
   ```

3. Do **not** call the scan API. The engine's `library-scan` registers external subtitle files and
   `subtitle-sync` (every ~15 min) aligns them with ffsubsync.
4. Verify from the DB: `VariantSubtitleTrack` lists an `EXTERNAL` `zh` track per episode, and the
   sidecar's first cues contain both languages.

Live proof: Archer S07 E01–E10 (10 sidecars, `subtitlesFound 23 / newSubtitles 10`, 392–517 bilingual
cues per episode) built from zimuku detail 192033 + the embedded English tracks on 2026-11-14.

## Hard rules

1. One pack = one item. A wrong-episode/wrong-film file is a **failure**, not a success.
2. Never modify the video, never delete anything, never write outside the sidecar path.
3. Never use provider endpoints (they are disabled by owner decision) and never call the Mediarr
   REST API from this flow — the engine registers the file on its own scans.
4. Bridge missing or wedged → report `BRIDGE_TOOLS_ABSENT` and stop; no DOM-scraper script fallback,
   no guessed URLs.
5. Max 2 items per daily run; zero is a valid outcome when everything watched already has Chinese.

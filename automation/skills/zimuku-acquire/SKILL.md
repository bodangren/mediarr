---
name: zimuku-acquire
description: Acquire Simplified-Chinese (双语) subtitles from zimuku.org through the kimi-webbridge Chrome session and place them as `<video>.zho.srt`. Use when an item is missing Chinese subtitles (priority-coverage status none/en-only), when the owner says "get Chinese subs", or whenever a server subtitle provider is unavailable. Handles the site WAF captcha by handing the agent a PNG to read.
---

# zimuku-acquire — Chinese subtitles from zimuku.org

One command line, no re-derivation. The tool lives in the repo:
[`automation/scripts/zimuku-acquire.mjs`](../../scripts/zimuku-acquire.mjs) and drives the **same
Chrome** the agent uses (via the `kimi-webbridge` CLI), so the site login/WAF cookie is shared with
`mcp__webbridge__*`.

> Why this exists: the flow was re-derived by hand on 2026-11-11 (WAF captcha → home-form search →
> 双语 ASS pack → signed `/download/` href → convert → `.zho.srt` → server scan). It is now a tool.

## Preconditions

- Chrome is running with the Kimi WebBridge extension; `kimi-webbridge evaluate '{"code":"1+1"}'`
  returns `success:true` (`KIMI_WEBBRIDGE_BIN` overrides the binary path).
- Mediarr API healthy on `http://127.0.0.1:5174` (`MEDIARR_API` overrides).
- `ffmpeg`, `ffprobe`, `curl`, `unzip` on PATH (`unrar` only for RAR packs).
- `/config` writable (receipts) — otherwise the receipt field reports `unwritable`.

## The two commands

### 1. Find a pack

```bash
node automation/scripts/zimuku-acquire.mjs resolve --query "银河护卫队3"
```

- Exit **10** + `{"stage":"captcha","image":"/tmp/zimuku-captcha-….png"}`: **read the image with your
  vision** (the tool already converted the site's BMP to PNG) and re-run the same command with
  `--solve <five digits>`. The site's `srcurl` cookie returns Chrome to the search page, so you do
  not redo the search.
- Exit **0** + `{"stage":"results", "chosen":{…}, "results":[…]}`: pick a `chosen` pack or choose
  another by `--index N` / `--id`. Only `bilingual:true, rejected:false` rows are safe (简英/中英/双语/
  国英双字; SUP and IDX+SUB are rejected because ffmpeg cannot convert bitmaps).

Search in the release's **Chinese** title; the English title only as a fallback. Never type a
`/search?q=` URL — the tool submits the home form (direct URL navigation is what triggers the WAF).

### 2. Fetch + install it

```bash
node automation/scripts/zimuku-acquire.mjs acquire --detail 220785 \
  --video "/data/Movies/Guardians of the Galaxy Vol 3 (2023)/Guardians….mkv" \
  --movie-id 558            # or --series-id 12, or --scan-url for a custom endpoint
```

The tool then: opens the detail page (captcha loop as above, `--solve` resumes) → reads the
`联通高速下载` href → downloads with a signed URL (no cookies needed) → extracts ZIP/RAR → converts
ASS/SSA to SRT with ffmpeg → strips inline `<font>` tags and the BOM → checks cue count (≥20) and the
last-cue vs video-runtime delta (fails over 120 s unless `--force`) → backs up an existing sidecar to
`<name>.orig.bak` → writes `<video-stem>.zho.srt` → `POST /api/subtitles/movie|series/:id/scan` →
appends a JSON receipt to `/config/subtitle-acquire-receipts.jsonl`.

Use `--dry-run` to stop after verification and inspect the JSON without touching the library.
Exit codes: `0` ok, `2` verification/usage error, `3` bridge/download failure, `10` captcha needed.

## Hard rules (learned the hard way)

1. **Verify content, never the filename.** On 2026-11-11 a Guardians of the Galaxy pack carried the
   ASS header `Title: Harry.Potter.And.The.Sorcerers.Stone…`; the cues were correct. Read the first
   cues for real dialogue before trusting a pack, and check the last cue against the runtime
   (`--dry-run` prints both).
2. Bilingual packs keep the Chinese line then the English line stacked — that is the house style the
   TV renders; do not split or reorder.
3. One pack = one item. A wrong-episode/wrong-film file is a failure, not a success; report it.
4. Do not run ffsubsync by hand: the `subtitle-sync` scheduler task aligns new sidecars within 15
   minutes (idempotent, keeps a `.orig` backup).
5. Never touch the video file, never delete anything; only a new sidecar is written.
6. If the WAF captcha is unreadable twice or the bridge is wedged: stop and report. No scraping
   fallback, no guessed URLs, no subtitle-provider API keys (providers are disabled by owner decision).

## Episode vs movie

- Movies: `--movie-id <Movie.id>` → `POST /api/subtitles/movie/:id/scan`.
- Series: pass `--series-id <Series.id>` → `POST /api/subtitles/series/:id/scan`; if you only know the
  episode, get its series from `GET /api/subtitles/episodes/:id` first.
- The sidecar stem must match the **video file** (release name), not the library title.

## Automation

The daily orchestrator calls this as its subtitle-acquisition step (max 2 items per run):
[`automation/prompts/subtitle-acquire-zimuku.md`](../../prompts/subtitle-acquire-zimuku.md). The
manual flow documented there is the fallback when the tool cannot run (e.g. bridge CLI missing but
the browser MCP tools work).

## Known limits

- 7z packs are refused (no extractor wired); pick a different pack.
- Archives with several different subtitle files need `--file <name>` (the tool prints the choices).
- Chinese-only packs are accepted by the tool (cue/runtime checks only); the `bilingual-subs` task
  merges them with an English sibling, or flags `needs_english` when there is none.

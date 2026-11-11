# Chinese subtitle acquisition from zimuku.org (agent run)

> Contract for the acquisition leg of `chore_migrate_hermes_automation_20261107` B2c/B2g.
> Owner directive 2026-11-11: **use kimi-webbridge + https://zimuku.org/ — no subtitle-provider API
> keys.** This is an instruction to an agent turn, not a script; the judgement (which pack) stays with
> the agent. The retired recipe is kept read-only at
> `~/.config/opencode/skills/chinese-subs/SKILL.md`; no DOM scraper is ported from it.

## Preconditions (fail loudly)

1. `mcp__webbridge__navigate` / `mcp__webbridge__evaluate` / `mcp__webbridge__screenshot` must be
   registered in this turn. If not: `media_automation_alert {level:"critical",
   code:"BRIDGE_TOOLS_ABSENT"}` and stop — never fall back to curl scraping.
2. `GET /api/health` → `data.status == "ok"`.
3. The zimuku WAF may answer with a captcha page (`title` contains `网站防火墙`). It is a **5-digit
   numeric captcha**: screenshot the `.verifyimg` element, read the five digits (upscale the element
   screenshot if it is too small), fill `#intext`, click `input[type=submit]`. Success shows
   `字幕库(zimuku,SrtKu)` and sets `PHPSESSID`; the site stores the URL you were trying to reach in
   the `srcurl` cookie, so after the captcha you land on the page you asked for. **Never guess the
   digits** — re-screenshot if they are unreadable.

## Inputs

1. `GET /api/subtitles/priority-coverage?days=14` — items already ordered by viewing priority
   (continue-watching → watched in 14 d → recently added → backfill). Take items whose `status` is
   `none` or `en-only` (no Chinese track).
2. `GET /api/subtitles/movie/:id/variants` (or `episode/:id/variants`) — the video `path` and the
   existing sidecars. The sidecar must sit next to the video with the **same stem**.
3. Max **2 items per run**; zero is a valid outcome and must be reported as such.

## Flow (proven live 2026-11-11 on MOVIE 558 Guardians of the Galaxy Vol. 3)

1. `navigate https://zimuku.org/` → solve the captcha if present (above).
2. Search from the home form, **never** by typing a `/search?q=` URL: fill `input[name="q"]` with the
   Chinese release title (the 中文 title works best, e.g. `银河护卫队3`), click `button.btn-search`. If
   the results page shows the captcha, solve it; `srcurl` returns you to the results.
3. Pick a pack from the result rows (title, language tag, format, download count):
   - accept `简英` / `中英` / `双语` / `简体&英文` / `国英双字` packs in `ASS/SSA` or `SRT`;
   - reject `SUP`, `IDX+SUB` (bitmap — ffmpeg cannot convert), and anything without an English line
     when the film's English track is the source of truth for the bilingual invariant;
   - prefer `官方译本` and higher download counts; prefer the pack whose noted runtime matches the file.
4. Open `/detail/<id>.html` (do not trust the list title alone; confirm title, year, format, runtime
   note), then open `/dld/<id>.html` and read a `联通高速下载（新）` href
   (`https://zimuku.org/download/.../svr/l0`).
5. Download with curl under a normal UA (the token is signed; no cookie jar needed):
   `curl -sL -A "<chrome UA>" -o pack.bin "<href>"`. `file pack.bin` tells you whether it is a raw
   ASS/SRT (single file) or a ZIP/RAR pack (`unzip` / `unrar` then pick the file per item).
6. **Verify content, not filenames.** ASS headers on zimuku are often leftover templates naming an
   unrelated film (seen live: a Guardians pack titled `Harry.Potter...`). Read the first cues for the
   film's actual dialogue and check the last cue time against the video runtime (|Δ| > 60 s → treat as a
   mismatch and either pick another pack or record the risk in the receipt).
7. Convert and clean:
   `ffmpeg -y -loglevel error -i sub.ass sub.srt`, then strip the BOM and inline font tags:
   `sed -e '1s/^\xEF\xBB\xBF//' -e 's/<[^>]*>//g' sub.srt > clean.srt`.
8. Place next to the video exactly: `<video-stem>.zho.srt`. Bilingual packs keep Chinese line then
   English line stacked (that is the house style the TV renders). Never overwrite an existing sidecar
   without first moving it to `<name>.orig.bak`.
9. Register the file: `POST /api/subtitles/movie/:id/scan` (or `/api/subtitles/series/:id/scan`).
   Success = `newSubtitles >= 1` **and** the variants response now lists an `external` `zh` track.
10. Timing: do **not** run ffsubsync by hand — the `subtitle-sync` scheduler task aligns new sidecars
    within 15 minutes (it is idempotent by sidecar hash + video size).
11. Receipt (one JSON line each, appended to `/config/subtitle-acquire-receipts.jsonl`):
    `{"at","mediaType","mediaId","title","zimukuId","detailUrl","packFormat","cues","placedPath",
    "scan":{"subtitlesFound","newSubtitles"},"runtimeRisk","ok"}`.
12. Bookkeeping: `media_automation_heartbeat` with the item + result; `media_automation_alert` only for
    failures the owner must know (WAF/captcha unsolvable, wrong content, provider disabled forever).

## Hard rules

- One agenda item = one pack. A wrong-episode/wrong-film file is a **failure to report**, not a success.
- Never modify the video file, never delete anything, never touch `/data` outside the sidecar write.
- Never use the server's subtitle-provider endpoints here: DMHY-era providers are disabled by owner
  decision (`apiKey: null`); zimuku via the browser is the approved acquisition path.
- If the bridge wedges or the captcha cannot be solved after two attempts: stop, alert, report — no
  scraping fallback, no guessed URLs.
- The daily orchestrator runs this once (max 2 items) as its subtitle-acquisition step; a manual run is
  fine at any time with the same rules.

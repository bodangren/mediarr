# Chinese subtitle acquisition from zimuku.org — the operator run

> Owner directive 2026-11-11: **kimi-webbridge + https://zimuku.org/ — no subtitle-provider API
> keys.** Playbook: `automation/skills/zimuku-acquire/SKILL.md`.
> The Mediarr REST API is a client contract: **no `/api/` calls in this run.** You pick the items
> read-only from the database, drive Chrome through the bridge, and place the sidecar; the engine's
> own subtitle tasks register and align it.

## Preconditions (fail loudly)

1. `mcp__webbridge__navigate` / `evaluate` / `screenshot` must be registered this turn. If not:
   `media_automation_alert {level:"critical", code:"BRIDGE_TOOLS_ABSENT"}` and stop — never fall
   back to curl scraping.
2. `systemctl --user is-active mediarr.service` is `active` and the DB opens read-only.
3. The zimuku WAF may answer with a captcha page (`title` contains `网站防火墙`). It is a **5-digit
   numeric captcha**: screenshot the `.verifyimg` element, read the five digits (upscale the element
   screenshot if too small), fill `#intext`, click `input[type=submit]`. Success shows
   `字幕库(zimuku,SrtKu)` and sets `PHPSESSID`; the site stores the requested URL in the `srcurl`
   cookie, so you land on the page you asked for. **Never guess the digits** — re-screenshot if
   unreadable.

## Pick the items (read-only, max 2 per run; zero is valid and must be reported)

```bash
# newest watched episodes -> episode -> variant file on disk
sqlite3 -readonly /config/mediarr.db \
 "select p.mediaId, p.lastWatched from PlaybackProgress p
   where p.mediaType='EPISODE' order by p.lastWatched desc limit 15;"
sqlite3 -readonly /config/mediarr.db \
 "select v.path from MediaFileVariant v where v.episodeId=<id>;"
```

For each candidate video, `ls "<stem>.zho.srt"` (sidecar sits next to the video, same stem). Keep
items **without** a Chinese sidecar; prefer episodes the owner is currently watching (continue-
watching first, then watched in the last 14 days, then recently added). Also check recently-played
movies the same way. Do not pick an item whose English sibling does not exist for a Chinese-only pack
unless the pack itself is bilingual.

## Flow (proven live 2026-11-11 on MOVIE 558 Guardians of the Galaxy Vol. 3)

1. `navigate https://zimuku.org/` → solve the captcha if present (above).
2. Search from the home form, **never** by typing a `/search?q=` URL: fill `input[name="q"]` with the
   Chinese release title (e.g. `银河护卫队3`), click `button.btn-search`. If the results page shows the
   captcha, solve it; `srcurl` returns you to the results.
3. Pick a pack from the result rows (title, language tag, format, download count):
   - accept `简英` / `中英` / `双语` / `简体&英文` / `国英双字` packs in `ASS/SSA` or `SRT`;
   - reject `SUP`, `IDX+SUB` (bitmap — ffmpeg cannot convert) and anything without an English line;
   - prefer `官方译本`, higher download counts, and the pack whose noted runtime matches the file.
4. Open `/detail/<id>.html` (confirm title, year, format, runtime note), then `/dld/<id>.html` and
   read a `联通高速下载（新）` href (`https://zimuku.org/download/.../svr/l0`).
5. Download with curl under a normal Chrome UA (signed token, no cookie jar needed):
   `curl -sL -A "<chrome UA>" -o pack.bin "<href>"`; `file pack.bin` tells you raw ASS/SRT vs
   ZIP/RAR (`unzip` / `unrar`).
6. **Verify content, not filenames.** ASS headers on zimuku are often leftover templates naming an
   unrelated film (seen live: a Guardians pack titled `Harry.Potter...`). Read the first cues for the
   film's actual dialogue and check the last cue time against the video runtime (|Δ| > 60 s → treat
   as a mismatch and pick another pack or record the risk).
7. Convert and clean:
   `ffmpeg -y -loglevel error -i sub.ass sub.srt`, then strip BOM and inline font tags:
   `sed -e '1s/^\xEF\xBB\xBF//' -e 's/<[^>]*>//g' sub.srt > clean.srt`.
8. Place next to the video exactly: `<video-stem>.zho.srt`. Bilingual packs keep the Chinese line
   then the English line stacked (the house style the TV renders). Never overwrite an existing
   sidecar without first moving it to `<name>.orig.bak`.
9. Do **not** call the API to register the file. The engine's `subtitle-sync` task aligns new
   sidecars within 15 minutes and `library-scan` registers external subtitle tracks; verify on the
   next run by reading the DB (or `ls`) and report the registration state.
10. Receipt — one JSON line appended to `/config/subtitle-acquire-receipts.jsonl`:
    `{"at","mediaType","mediaId","title","zimukuId","detailUrl","packFormat","cues","placedPath",
    "runtimeRisk","ok"}`.
11. Bookkeeping: `media_automation_heartbeat` with the item + result; `media_automation_alert` only
    for failures the owner must know (WAF/captcha unsolvable, wrong content).

## Hard rules

- One agenda item = one pack. A wrong-episode/wrong-film file is a **failure to report**, not a
  success.
- Never modify the video file, never delete anything, never touch `/data` outside the sidecar write.
- Never use subtitle-provider endpoints: providers are disabled by owner decision; zimuku through
  the browser is the approved path.
- If the bridge wedges or the captcha cannot be solved after two attempts: stop, alert, report — no
  scraping fallback, no guessed URLs.
- The daily operator runs this as its subtitle step (max 2 items); a manual run follows the same
  rules at any time.

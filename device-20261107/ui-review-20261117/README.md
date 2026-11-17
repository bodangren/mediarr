# TV client UI review — 2026-11-17

Owner report: *"The UI is cluttered and difficult to navigate. It looks like 2001 Yahoo! or a
Japanese website with a million links and no visual hierarchy."*

Method: captured all ten major pages from the TV at 1080p (`adb exec-out screencap`), downscaled to
1280x720 JPEG (`small/`) and had **Kimi K3.1 Pro** (`kimi-coding/k3.1-pro`) review them for obvious
UI errors and simplification proposals. Three of the four review batches failed at the provider
(silent failure, retried three times); the pages covered are Home, Movies, Series, Series detail,
Movie detail, Music and YouTube.

## Obvious errors found

- **Home** — hero duplicates the first Continue Watching card; `S01E01 | 0 | 1h 26m` has a cryptic
  unactionable `0`; Resume/Details/Search carry equal weight; progress shown twice (bar + percent).
- **Movies / Series grids** — six columns force truncation (`2001: A Spa…`, two `The Accoun…`,
  `A Knight of th…`); each card shows a language chip *plus* a green check *plus* an orange dot with
  no legend; `✓ /41` does not say whether it means watched or available; giant letter/`5`
  placeholders; `View` is an ambiguous verb.
- **Series detail** — playback hierarchy triplicated (`Play S01E01`, `Play all`, per-row triangles);
  `Search All Missing` / `Delete Series` at the same weight as Play; `S0 0/9` cryptic;
  *selected season* purple is the same purple as *focused Play*; synopsis clipped with no "More".
- **Movie detail** — Play shares a row with Mark Watched / Search Upgrades / Delete; detached `EN`
  chip is ambiguous (audio or subtitles?); `/data/Movies/…` + `9.2 GB` are unactionable and clipped.
- **Music** — a second vertical rail (Artists/Albums/Recently Add…/Songs) eats ~340 px; two-line text
  tiles with no artwork; "Unknown Artist — 1 album · 0 songs" leads nowhere.
- **YouTube** — header stacks title/count + backend housekeeping ("641 available · 13 on weekly
  retry · 2 quarantined · downloads run every 20 minutes") + three global controls + channel header
  + channel actions before any content; one video row fits.

## Three simplifications (ranked)

1. **One dominant action per screen; everything else in a `Manage` menu.** Detail pages get a single
   primary Play/Resume; Mark Watched, Search Upgrades/Missing and Delete move behind `Manage`. The
   episode list becomes the primary playback surface (whole-row focus).
2. **One status language, one badge.** Delete the unexplained dots/checks; one legible badge per card
   ("6/6 episodes", "中英", "missing"); drop the percent that duplicates the progress bar.
3. **Design for 10 feet.** 4–5 poster columns, two-line titles at TV size, larger rail labels, three
   line synopsis + "More", distinct *focused* vs *selected* styling, no half-cut third row, and fold
   the Music sub-rail into horizontal tabs.

Recommendation: do 1+2 together (same edit on detail pages and cards) and drop **Wanted** from the
viewer rail — it is an operator/audit view, and its useful signal is already the per-item badge.

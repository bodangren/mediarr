# Three-model UI review — Adult library + shared surfaces (2026-11-08)

Screens submitted as device/browser captures (downscaled copies in `shots/`):
`adult-tv-thumbnails`, `adult-tv-autopage`, `adult-tv-player-overlay` (Android TV, 1280x720 logical,
D-pad only) and `adult-library-spa` (web, 1280 wide). YouTube and Music screens do not exist yet.

Reviewers (each wrote its own file, kept verbatim alongside this summary):
- **Kimi K3.1 Pro** (`kimi-coding/k3.1-pro`) — `kimi-grid.md`, `kimi-autopage.md`, `kimi-player.md`, `kimi-spa.md`
- **MiMo 2.6** (`xiaomi/mimo-v2.6-flash`, pro was unstable on image payloads) — `mimo-grid.md`, `mimo-autopage.md`, `mimo-player.md`, `mimo-spa.md`
- **MiniMax M3.1 Flash** (`minimax-cn/MiniMax-M3.1-Flash`) — `minimax-autopage.md`, `minimax-batchB.md`, `minimax-grid.md` (image payloads were unstable; single-image batches used)

Method note: multi-image runs crashed these provider adapters; single small (640-1280 px) images per
run are reliable. That is a harness/provider limitation, not a screen defect.

## Consensus P0 (found by 2+ reviewers, now implemented)
1. **Card badge was clipped** — the header claimed "8 need review" while no visible card showed the
   badge (96 px still + fixed 120 px card). Card height raised to 190, grid bottom padding 48.
2. **Raw ingest filenames as titles** (`001 [1c6d5a2b].mp4`) on TV and SPA. Fallback title now strips
   the hash bracket and extension; parsed titles unchanged.
3. **Auto-paging was silent** — added a "Loading more…" sentinel and an "N of M · end of list" row, and
   prefetch moved from 4 to 8 cards from the end.
4. **SPA cards had no artwork** — SPA now renders the cached 16:9 still (`thumbUrl`) with a "No preview"
   placeholder, so the web grid is no longer text-only.

## Consensus P1 (agreed, open)
5. **Focus is too subtle on the TV** — implemented a 4 px high-contrast ring plus 1.02 scale; reviewers
   also want deterministic rail→grid→search order (verification on device pending).
6. **Player seek bar is overlapped by the right panel and too thin** (Kimi + MiniMax): track 6-8 px,
   inset before the panel, dim unplayed, clear elapsed/remaining labels.
7. **Right panel is unlabeled and the "mute" icon is a bell**; slider has no value readout.
8. **SPA mixes review bucket and library** — split into `Needs review (8)` / `Library`, make the count
   line a filter, and label the Wanted toggle pill.
9. **Metadata is inconsistent** on cards (missing studio/quality; quality duplicated inside titles).

## Consensus P2
10. Remaining-time label in the player, clarify the "Sync" chip, unify CC chrome, 2-line clamps,
    active-nav treatment, end-of-list styling.

## What the reviews got right and what was noise
- Correct: badge clipping, silent paging, seek-bar overlap, unlabeled toggle, raw filenames.
- Noise: MiMo read the two hash-different files as "duplicates" (they are distinct files with the same
  sequence number); MiniMax reported the SPA capture as 1280×668 (correct — it is a browser viewport,
  not a 1366 design width); "missing artwork" on the SPA capture was genuine and is now fixed.

## Follow-up (round 83) — one review finding was a misread, two were real

- **The white right-side panel (bell, vertical slider, music note, gear) is NOT Mediarr UI.** Grep
  across `clients/mediarr-client/lib` finds no such widget in the playback screen; it is the Android
  TV box's own system overlay. Kimi, MiMo and MiniMax all attributed it to the app, and every
  "panel covers the seek bar / bell is not mute" suggestion is therefore dropped — implementing it
  would have "fixed" a launcher panel we do not own.
- **Seek target was genuinely small**: track raised 6→8 px, thumb radius 10→16 px.
- **Time readout lacked remaining time**: now shows `00:10  27:49  -27:39` (elapsed, duration,
  remaining), 148 playback tests green.

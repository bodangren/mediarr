**Verdict:** Adult is separate and playable, but TV auto-paging/playback are not living-room-ready and web layouts bury content under empty cards and repeated chrome.

### Adult TV — thumbnails
- **Previews are centre-cropped into roughly 2.4:1 slots**, cutting subjects in `Ember Snow`; use the existing 480px frames in 16:9 boxes (about 232×130 logical px at this card width), with 16px column gaps, 24px row gaps and 18px titles.
- **The review bucket blocks discovery:** eight raw filenames including `001 [1c6d5a2b].mp4` fill the first two rows before `Best Asian Babes Blowjobs`; order titled items first, then `Needs review (8)`, or use that wording as a D-pad filter with filenames secondary.

### Adult TV — auto-paging
- **Every visible appended card is an empty dark panel**, including `Another Man's Wife 12 Scene 8` and `Willow Ryder Backdoor Sex Swing`; cache/preload thumbnails by item id and render 16:9 `Loading thumbnail…` or `Thumbnail unavailable` placeholders instead.
- **The fixed header clips the preceding row:** stray `Digital Sin · 1080p` fragments sit above half-visible cards; use a 72 logical px opaque header, 96px top scroll padding and 24px focused-card clearance.
- **There is no position or append status:** the header says only `196 items · 8 need review`; add `Showing {start}–{end} of 196` and reserve a 40px footer for `Loading more…`.

### Adult TV — playback
- **The only visible UI is an oversized, featureless grey disk right of centre**, indistinguishable from a fault; replace it with a centred 40 logical px spinner and `Buffering…` in 20px text, 12px below.
- **No title, time, progress or focused transport is visible**, so playback looks stalled; any D-pad press should reveal a 128px bottom overlay with a 24px title, 6px progress bar, `elapsed / duration`, and 56×56px controls at 16px gaps, initially focusing Pause and hiding after four seconds only while playing.

### Adult library — SPA
- **The web grid has no thumbnails at all**, unlike TV’s first page; put the same 480px JPEGs in approximately 220×124 CSS px 16:9 image areas above each title, retaining 16px gutters.
- **The eight `Needs review` filenames consume rows one and two**, delaying titled content; use titled-first ordering and label the filter/section `Needs review (8)`.
- **Metadata is nearly black-on-black**, including `196 items · 8 need review`, studio names and lone `-` lines; use 13px `#A3A3A3` metadata, 14px `#F5F5F5` titles, and omit empty metadata rows.

### Wanted — coverage
- **The summary is ambiguous:** `9 high-priority · 7 covered · 2 missing` counts Chinese (4+3), while the first two rows total 3+3=`6` under `Both languages`; if EN+ZH is required, write `9 high-priority · 6 EN+ZH · 1 Chinese only · 2 without Chinese`.
- **No wanted title fits above the fold at 1366×712**, only `Movies`/`Episodes` tabs and column headings; retain a 72px coverage summary/bar, move the bucket table below the list, and expose at least three rows.
- **The idle notice consumes three lines**; shorten it to `Wanted search idle — no indexers configured (Settings → Indexers).` with 12px vertical margins.

### Wanted — grouped list
- **Sticky layers collide:** `BACKFILL · 25` is clipped and `A Dickens of a Holiday!` reaches the breadcrumb; use an opaque 56px group header below the 64px page header, with 16px content clearance.
- **Every row repeats `WANTED`, `Monitored`, and three empty `Cinema/Digital/Physical: -` values**, while `Can You Feel the Beat: The Lisa Lisa Story` wraps; omit empty dates, show monitoring only when changed, and use 64px rows with a 320px title column.

### Prioritised changes
**P0**
- Fix blank auto-appended TV cards and header clipping before accepting D-pad browsing.
- Replace the playback disk with explicit buffering and D-pad-focused transport state.

**P1**
- Put the eight review items after titled items on both library surfaces.
- Restore 16:9 TV thumbnails and add them to the SPA.
- Reconcile `covered` with dual-language counts and bring wanted titles above the fold.

**P2**
- Add TV range/loading indicators, raise SPA metadata contrast, and remove empty dashes.
- Compact wanted rows and separate sticky headers to keep grouping readable.

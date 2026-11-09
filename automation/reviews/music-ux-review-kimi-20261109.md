# TV music UX review — Kimi K3.1 Pro (2026-11-09)

*Requested by the owner: "The music player UX is awful. There's no real way to search or filter and play from that. No way to go to 'Songs' or whatever and then play all. No way to shuffle order or repeat. Or any of the normal media manager, iTunes kind of functionality." Review performed by Kimi K3.1 Pro over the TV music feature code.*

*Scope: `music_library_screen.dart`, `music_player_service.dart`, `music.dart`.*

## 1. What exists today
- 220 px sidebar: Artists, Albums, Recently Added, Songs. Artist → filtered albums; album → ordered tracks; Recent contains albums only.
- Songs requests `limit: 200`; selecting a song queues the loaded songs from that row. No explicit Play all and no guarantee of the whole library.
- Albums have Play album; tracks have Play now, Play next, Go to album; Continue listening resumes.
- media_kit playback: queue/index, play/pause, previous/next, insert-next, relative seek, completion auto-advance, local resume, server progress. The bottom bar exposes only title, previous, play/pause, next, time.

## 2. Gaps
**P0:** no search/sort/user filtering; no complete-library Play all/Shuffle all; no shuffle or repeat state/control; no repeat-one/all or end-of-queue policy. TV focus is defective: `_loadSongs()` requests `_contentFirstNode`, but `_songList()` assigns neither that node nor autofocus to any row; the now-playing Play button also requests autofocus, risking focus theft after playback starts.

**P1:** no Play artist, queue view/reorder/remove/add-last, full Now Playing screen, visible seek control, artwork/artist/album metadata, or useful previous-at-start (previous does nothing at index zero). Playback errors are stored but never rendered.

**P2:** no playlists, favourites, genre/decade browsing, smart/recently-played views, or play-count sorting. `isPlayed`/`playCount` exist but only the played checkmark is shown.

## 3. TV screen, focus and remote design
Keep the 220 px rail and add **Search**. Songs/Search get an 88 px sticky toolbar: **Play all**, **Shuffle all**, **Filter**, **Sort**; 64 px rows with title, artist, album, duration. Search uses a left on-screen keyboard/filter column and right live results; selecting a track plays all matching results from it. Expand the bottom bar to 104 px with artwork, title/artist, Shuffle, Previous, Play/Pause, Next, Repeat (Off→All→One), Queue; selecting the bar opens full-screen Now Playing + Up Next. Focus order toolbar → results → player; remember focus per section, restore on Back, never autofocus the player when it appears.

Remote: D-pad navigates; Select opens/plays; Back restores prior view/focus; Menu or long-Select opens item actions; Play/Pause toggles globally; Next/Previous skips; Rewind/FF seeks ±15 s. Shuffle preserves the current song; Repeat one replays it, Repeat all wraps, Off stops.

## 4. Phased plan, tests, API gaps
1. **P0 playback + Songs + search:** deterministic seeded shuffle/repeat, paginated full-library playback, search, focus fixes. Test current-track preservation, all repeat boundaries, shuffle with insert-next, empty/single-track queues, rapid next/out-of-order completions. Widget-test at 1920×1080: D-pad entry/return, no focus theft, Play all across pages, search-and-play, all remote actions.
2. **P1 browsing + queue:** filters/sorts, Play artist, full Now Playing, editable queue, versioned resume. Test remove/reorder around current, seek limits, resume with modes/order, pagination failure/retry, playback-error presentation.
3. **P2 media manager:** favourites/playlists/smart views only after server contracts exist.

API not evidenced: track/artist/album search; stable sort + cursor/total pagination; artist/genre/year filters; artist-track retrieval; denormalized track artistName/albumTitle; genre/artwork metadata; playlist/favourite mutations. Play all needs all ordered IDs/pages or a server queue token — `limit: 200` cannot define "all".

## 5. Why today's state will fight the redesign
`queue + index` cannot represent canonical order, shuffled order, stable identity with duplicates, source/filter context, or modes. Use stable queue-entry IDs/current ID, separate canonical vs playback order, explicit repeat/shuffle state and source metadata. `next()`/`previous()` call `playQueue()`, recreating state and reopening media; separate queue mutation from track loading and add generation guards against racing opens. Resume persists only tracks/index/position/savedAt, so order/modes need migration. Screen-local lists plus one loading/error and uncancelled loads cannot support rapid search/filter changes; move querying into request-scoped Riverpod controllers.

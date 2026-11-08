# Music background audio — device measurement (2026-11-08)

Plan item: "Play, seek, queue advance, resume, background audio behavior".

Procedure on the TV (1.3.41 / code 65):
1. Music -> Albums -> "100 Greatest Hair Metal Songs" -> Play album. Bar showed
   **Sweet Child O' Mine 0:08 / 5:56** (`music-bg-t1.png`).
2. Pressed the remote Home key (app backgrounded) and stayed away ~12 s, then
   reopened the app and returned to the Music rail.
3. Bar now showed **Sweet Child O' Mine 0:42 / 5:56** (`music-bg-t2.png`) with the
   pause icon (playing).

## Result
Playback advanced **34 seconds while the app was not in the foreground**, so the
music player keeps running when the user leaves the Music screen or the app, which
is what "background audio" requires on Android TV. The queue stayed intact across
backgrounding and the now-playing bar re-attached on return.

## Still open in this task
Resume of the last track across a full app restart (persisting track id + position)
is not implemented yet; seek/queue advance were verified earlier (media keys,
next/previous, ±15 s).

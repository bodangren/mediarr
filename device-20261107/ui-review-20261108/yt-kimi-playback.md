**Verdict:** Unobstructed playback looks good, but the frame alone neither identifies the video nor teaches remote control; it works only if the viewer already knows what they started.

**Three concrete problems → fixes**

1. **No “what is playing” context.** The talking head and meme cannot confirm the title, channel, or position within a series. **Fix:** show a five-second title card on start/resume, and put a TV-scale title, channel, and episode number/count in the controls summoned by the remote.
2. **Playback state and position disappear.** Playing, paused, and buffering can look identical; there is no elapsed/remaining time or seek destination. **Fix:** let OK toggle Play/Pause and wake the transport; show a large state icon, elapsed/total time, and visible Left/Right seek feedback. Keep buffering and errors visible rather than auto-hiding them.
3. **Remote recovery is undiscoverable and potentially destructive.** A bare frame gives no hint how to reach controls, subtitles, or audio, and Back may abandon playback. **Fix:** provide a dismissible first-run key hint, one clearly focused overlay action, and subtitle/audio/details actions; make Back close controls before exiting and always save resume position.

**Priorities**

- **P0:** One remote keypress must reveal a focused Play/Pause transport with title/channel and elapsed/total time.
- **P1:** Add persistent buffering/error states, seek feedback, safe Back/resume behavior, and subtitle/audio controls.
- **P2:** Add first-run remote hints plus configurable title-card and overlay timing.

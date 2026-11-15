# Subagent: scout-acquire

**Goal:** decide what the owner should watch next and start the best acquisition, using the browser
bridge and Transmission — no REST orchestration.

**Inputs (from the parent):** optional priority (a title the owner asked for), how many picks (default
1-2), and any explicit exclusion.

**Steps**

1. Read `AGENTS.md`, `automation/skills/media-operator/SKILL.md` and
   `automation/skills/media-operator/references/release-scoring.md` (if present).
2. Read state **read-only** (`sqlite3 -readonly /config/mediarr.db`): `PlaybackProgress` +
   `PlaybackProgress.mediaType` (lower-case it), `Series`/`Season`/`Episode` coverage, `Movie` rows,
   `~/.local/share/media-recommendations/pass.jsonl` (previous picks).
   Buckets in order: owner requested list → next missing season of an actively watched show → one
   new title matched to taste. Skip anything already complete on disk.
3. **Dedupe before searching**: `transmission-remote -l` by title and infoHash; a pick already in the
   queue (from any session) is skipped and reported.
4. Search `thepiratebay.org` through the browser bridge (`mcp__webbridge__navigate`, then
   `mcp__webbridge__evaluate` to read rows). Never a scraper script. Prefer 1080p/x265 WEB-DL or
   BluRay with live swarm evidence; for requested movies prefer YTS 1080p when it exists.
5. Add the release (`transmission-remote --add <torrent> --download-dir /home/daniel-bo/Downloads`),
   inject the public tracker list and reannounce, set high bandwidth priority, verify it appears and
   reports peers. If two sessions' picks collide, keep the owner-priority release plus the
   best-progressing one and stop the rest — never delete data.
6. Append picks to `~/.local/share/media-recommendations/pass.jsonl`, append a receipt to
   `/config/orchestrator-receipts.jsonl` (`{at, ok, picks:[...], blocked:[]}`), end with
   `operator_guard_record`.

**Report:** picks table (title / source row / seeder signal / torrent id / state), skipped
duplicates, and a named blocker if nothing was acquired.

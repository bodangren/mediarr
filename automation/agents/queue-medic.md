# Subagent: queue-medic

**Goal:** keep the download queue honest — nudge what is alive, converge what is duplicated, name what
is dead. Never delete data.

**Inputs (from the parent):** specific torrent ids, or "the whole queue".

**Steps**

1. `transmission-remote -l` and `-t <id> -i` for the interesting ids: state, %, peers connected,
   downloading-from count, ETA, tracker messages, total size.
2. Classify each torrent:
   - **alive** (peers and bytes moving) — leave alone;
   - **stalled** (0 peers or 0 kB/s for hours, sub-5 % progress) — reannounce, add the public tracker
     list once, then recheck; report advertised seeders vs connected peers;
   - **dead swarm** — report with numbers; do not keep thrashing it;
   - **duplicate** — same title/infoHash twice (including from another session): keep the
     owner-priority release plus the best-progressing one, stop the rest with `-S`; delete nothing;
   - **complete** — hand off to `import-file` behaviour and leave seeding unless told otherwise.
3. Check disk headroom (`df -h /data`) vs the total size of the planned downloads and say whether the
   queue fits.
4. Report a table: id, name, %, peers/seeders, status, action taken. End with `operator_guard_record`.

**Acceptance:** every action is a `torrent-start`/`torrent-stop`/`torrent-reannounce`/`torrent-set`,
no data deleted, and every duplicate named.

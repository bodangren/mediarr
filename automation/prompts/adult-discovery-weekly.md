# Weekly Adult library discovery — the operator run

> Cadence: weekly, Sunday 04:00. The judgement (what to pick) is the agent's; the mechanics are
> `transmission-remote` and the browser bridge. Playbook: `automation/skills/adult-operator/SKILL.md`.
> The Mediarr REST API is a client contract: **no `/api/` calls in this run.**

## Inputs (read before browsing, all read-only)

1. **Library state.** `sqlite3 -readonly /config/mediarr.db` on `AdultItem` (title, studio,
   sizeBytes, needsReview, isWatched, lastPlayedAt) — what is already owned.
2. **On-disk state.** `ls /data/Porn` — filenames carry the scene stem; use them for duplicates the
   DB has not registered yet.
3. **Queue state.** `transmission-remote -l` — collect every `infoHash`/name; **drop any pick whose
   hash is already present.**
4. Previous receipts in `/config/orchestrator-receipts.jsonl` (do not re-pick last week's titles).

## Browsing

Use the browser bridge (`mcp__webbridge__navigate` → `snapshot`/`evaluate`) against the sources the
owner uses. Read results like a human and extract title, studio, size, seeders and magnet from the
rendered rows. No selectors hard-coded into a script, no curl against a rendered page.

## Selection profile (owner-approved)

- **Asian-dominant** titles and studios; scene-style compilations; avoid plot-driven features.
- Prefer 1080p or better, size ≤ 8 GB unless the title is rare.
- Avoid anything already represented (same studio + title stem) even at a different hash.
- **1–3 picks per run.** Zero is a valid answer when nothing matches — say so with the reason and
  do not pad the list.

## Queue

```bash
transmission-remote --add '<magnet>' --download-dir /home/daniel-bo/Downloads
```

Verify each pick appears in `transmission-remote -l`. When it completes, file it into `/data/Porn`
following the library's existing naming, verify with `ffprobe`, and keep the source. Never delete
files and never run retention/pruning actions from this run.

## Receipt (required)

Append one JSON line to `/config/orchestrator-receipts.jsonl` with: run timestamp, sources browsed,
picks (title / infoHash / size / torrent id / result), dropped duplicates with their hash, and the
reason when zero picks were made. A silent run is a defect.

## Hard rules

- Never write the database, never delete media, never bypass `transmission-remote`.
- Never report success for a pick that does not appear in the Transmission queue.
- If the bridge is missing or wedged, report the exact error and stop — no guessed URLs, no fallback
  to an API that is not approved.

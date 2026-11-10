# Monthly rules review — quality profile / custom format proposals

> Track: `chore_migrate_hermes_automation_20261107` (TARGET-ARCHITECTURE §3, monthly Sun 05:00).
> **This is an agent run, not a script.** It reads the live scoring configuration and recent grab
> outcomes, then writes **proposals only** — it never changes a profile, custom format or setting.

## Preconditions

1. `GET http://127.0.0.1:5174/api/health` → `data.status == "ok"`; otherwise report and stop.
2. Read `automation/prompts/media-orchestrator-daily.md` for the contract on receipts and boundaries.
   The same rules apply here: measurement and proposals are in scope; writes are not.

## Inputs

1. `GET /api/quality-profiles` — current profiles and which one each library uses.
2. `GET /api/custom-formats` — current custom formats, their specifications and scores.
3. `GET /api/scheduler/history?pageSize=50` — task outcomes for the month (scan, RSS, wanted,
   subtitle-wanted-search). Failures that repeat point at a rule mismatch, not a transient.
4. `GET /api/activity?pageSize=100` — recent grab/rejection events; group the rejection reasons.
   `GET /api/torrents` is the live queue (what is downloading/seeding).
5. Any `automation/reports/rules-review-*.md` from previous months, so the same proposal is not
   repeated without new evidence.

## What to look for

- Rejection reasons that repeat: a custom format that rejects releases the owner clearly wanted, or
  a missing format that lets a poor release through.
- A profile that cannot be satisfied by anything the indexers return (no grabs for a whole month).
- Score collisions: two custom formats whose combined score makes the choice arbitrary.
- Settings that contradict observed behaviour (e.g. a size cap excluding the only release found).

## Output (required)

1. Write `/config/rules-review-YYYY-MM.md` with:
   - a table of **proposals**: id, profile/format, exact current value, proposed value, evidence
     (API counts / history rows), expected effect, risk;
   - an explicit "no change proposed" section when the evidence is thin — guessing is worse than
     waiting a month.
2. Append one JSON line to `/config/rules-review-receipts.jsonl`:
   `{"at": "...", "ok": true|false, "proposals": N, "evidenceCounts": {...}}`.
3. Report a short summary plus the receipt path. If a proposal would be destructive or change
   retention/import behaviour, label it **owner approval required** and do not apply it.

## Boundaries

- Never `PUT`/`POST` a quality profile, custom format, indexer, root folder or setting.
- Never delete media, backups or queue items.
- No DOM scraping and no model-generated rule edits: every proposal quotes an API value and a
  measured count. If an input endpoint is missing, say which and mark the run not-ok.

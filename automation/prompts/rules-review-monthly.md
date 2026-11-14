# Monthly rules review — quality profile / custom format proposals

> Cadence: first Sunday, 05:00. Track: `chore_migrate_hermes_automation_20261107`.
> **This is an agent run, not a script.** It reads the live scoring tables read-only and recent grab
> outcomes, then writes **proposals only**.
> The Mediarr REST API is a client contract: **no `/api/` calls in this run.** Read the database with
> `sqlite3 -readonly /config/mediarr.db` and the logs/receipts from the filesystem.

## Preconditions

1. `sqlite3 -readonly /config/mediarr.db "select count(*) from QualityProfile"` returns a number;
   otherwise report `DB_UNREADABLE` and stop.
2. Read `automation/skills/media-operator/SKILL.md` for the receipt/boundary doctrine (proposals are
   in scope; configuration writes are not).

## Inputs (all read-only)

1. `QualityProfile` — current profiles (`name`, `cutoff`, `items`) and which one the library uses.
2. `CustomFormat` — current formats, `conditions`, and their scores (`items` on profiles).
3. `TaskExecution` — task outcomes for the month (`taskName`, `status`, `errorMessage`, `startedAt`).
   Repeating failures point at a rule mismatch, not a transient.
4. `ActivityEvent` — grab/search/rejection events (`eventType`, `sourceModule`, `summary`, `details`);
   group rejection reasons and counts.
5. `Torrent` — the live queue (nothing in it for a month is itself evidence).
6. Previous `automation/reports/rules-review-*.md` and `/config/rules-review-*.md` so the same
   proposal is not repeated without new evidence.

## What to look for

- Rejection reasons that repeat: a format that rejects releases the owner clearly wanted, or a
  missing format that lets a poor release through.
- A profile nothing can satisfy (no grabs for a whole month, or every search ends "no releases").
- Score collisions that make the choice arbitrary.
- Settings that contradict observed behaviour (e.g. a size cap excluding the only release found).

## Output (required)

1. `/config/rules-review-YYYY-MM.md` with a proposals table (id, profile/format, current value,
   proposed value, evidence with counts, expected effect, risk), or an explicit **"no change
   proposed"** section when the evidence is thin — guessing is worse than waiting a month.
2. One JSON line appended to `/config/rules-review-receipts.jsonl`:
   `{"at","ok","proposals","evidenceCounts":{...}}`.
3. Report the summary plus the receipt path.

## Boundaries

- Never modify a quality profile, custom format, indexer, root folder, setting, queue item or media
  file — proposals only.
- Label destructive/retention/import-behaviour proposals **owner approval required**.
- No DOM scraping: every proposal quotes a database value and a measured count. If an input cannot
  be read, say which and mark the run not-ok.

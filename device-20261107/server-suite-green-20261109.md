# Full server suite — failure triage and fix (2026-11-09)

Running `npx vitest run server/src` (2,804 tests) exposed **2 failures in one file**, both in
`server/src/db/migrationCompatibility.test.ts`:

```
adopts only verified scheduler migrations for a legacy database with columns but missing journal entries
leaves a legacy AppSettings shape for Drizzle to upgrade through its tracked migrations
Error: Command failed: ./node_modules/.bin/drizzle-kit migrate
```

## Root cause
The fixture records migrations 0000–0002 as *applied* but only creates the `AppSettings` table. It
therefore depends on all later tracked migrations being additive on tables it provides, or being
`CREATE TABLE`. The new `0016_subtitle_wanted_errors` migration is the first **pure ALTER on a table
from 0000–0002** (`ALTER TABLE WantedSubtitle ADD ...`), so drizzle-kit died with "no such table" in
those two synthetic legacy databases.

This is a **test-fixture gap**, not a production migration defect: on every real database
`WantedSubtitle` exists because migration 0003+ created it. Verified separately that drizzle-kit
migrate itself works (`No config path provided... [✓] migrations applied successfully!`) once run
with the Node version the repo's better-sqlite3 was built for (ABI 137 / Node 24; the default
`/home/daniel-bo/.local/bin/node` is v26 with ABI 147 and fails with `ERR_DLOPEN_FAILED`).

## Fix
`createLegacyAppSettings` now also creates the `WantedSubtitle` table (the shape the legacy DB would
have), so later ALTER migrations apply as they do in production. `migrationCompatibility.test.ts`:
7/7 green.

## Note for the record
The repo's unit suite is `vitest run server/src` — `vitest run` at the root also picks up
`automation/pi-measure-harness/tests/fixtures/green-gate/seeded-regression.test.mjs`, which is a
**deliberately red fixture** for the measure harness gate, not a product test.

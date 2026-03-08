---
name: create-migration
description: Create and validate a Prisma migration with schema checks
disable-model-invocation: true
---

# Create Migration

Scaffold and validate a Prisma schema migration for the mediarr SQLite database.

## Workflow

1. **Edit the schema**: Modify `server/prisma/schema.prisma` with the requested changes
2. **Generate migration**: Run `npx prisma migrate dev --name <descriptive_name>` from the project root
3. **Review SQL**: Read the generated migration SQL file in `server/prisma/migrations/` to verify correctness
4. **Generate client**: Run `npx prisma generate` to update the Prisma client types
5. **Verify**: Run any related tests with `CI=true vitest run <relevant_test_files>`

## Guidelines

- Use descriptive migration names in snake_case (e.g., `add_watchlist_table`, `rename_status_column`)
- Always review the generated SQL before proceeding
- If migration fails, check for data compatibility issues with existing SQLite data
- Never use `prisma migrate reset` without explicit user approval — it drops all data

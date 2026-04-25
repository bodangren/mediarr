# Implementation Plan: AppSettings INT Overflow Bug Fix

## Phase 1: Investigate Schema

- [ ] Task: Examine Prisma schema for AppSettings model and all timestamp fields
- [ ] Task: Identify all models with `createdAt`/`updatedAt` defined as Int instead of DateTime
- [ ] Task: Verify current database type using Prisma Studio or raw SQL query

## Phase 2: Create Migration

- [ ] Task: Create Prisma migration changing INT → BigInt for affected timestamp columns
- [ ] Task: Verify migration file syntax is correct
- [ ] Task: Run `prisma migrate dev` to generate migration

## Phase 3: Apply and Verify

- [ ] Task: Apply migration to development database
- [ ] Task: Confirm `npm run dev` starts without P2023 errors
- [ ] Task: Run test suite to ensure no regressions

## Phase 4: Verify and Archive

- [ ] Task: Run full test suite
- [ ] Task: Archive track and update tracks.md
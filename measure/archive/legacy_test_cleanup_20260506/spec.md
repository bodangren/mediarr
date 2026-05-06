# Track: Legacy Code & Test Infrastructure Cleanup

## Overview
Audit and remove obsolete legacy tests and app_src_backup, strengthen primitive smoke tests, and resolve VirtualTable test coverage.

## Goals
- Delete or restore 300+ disabled legacy tests in app_src_backup
- Remove redundant import-manager.test.js
- Strengthen core-primitives smoke tests for variant contracts
- Resolve VirtualTable.test.tsx mock coverage decision

## Acceptance Criteria
- [ ] app_src_backup directory removed or justified保留
- [ ] Disabled tests either restored with fixes or permanently deleted
- [ ] core-primitives.test.tsx verifies alert/status/label/progress variant mapping
- [ ] VirtualTable test decision documented and implemented
- [ ] CI suite passes with no excluded test files

## Non-Goals
- New features
- Refactoring production code beyond test needs

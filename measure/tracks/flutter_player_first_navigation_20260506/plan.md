# Implementation Plan: Flutter Player-First Navigation

## Phase 1: Default Route Fix
- [ ] Task: Change default route to HomeScreen
  - [ ] Write widget tests for default route
  - [ ] Update AppRouter default location to /home
  - [ ] Override all network-backed providers in router tests
- [ ] Task: Fix Continue Watching visibility
  - [ ] Write tests for continue-watching section rendering
  - [ ] Ensure section only appears when user has history

## Phase 2: Shell Navigation Reorder
- [ ] Task: Reorder navigation shell
  - [ ] Write tests for nav item order
  - [ ] Move Library before Activity in bottom/side nav
  - [ ] Update golden tests if applicable
- [ ] Task: Verify cross-platform
  - [ ] Run widget tests on all target platforms
  - [ ] Manual verification on Android TV emulator

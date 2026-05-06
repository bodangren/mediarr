# Implementation Plan: Flutter Player-First Navigation

## Phase 1: Default Route Fix
- [x] Task: Change default route to HomeScreen
  - [x] Write widget tests for default route
  - [x] Update AppRouter default location to /home
  - [x] Override all network-backed providers in router tests
- [x] Task: Fix Continue Watching visibility
  - [x] Write tests for continue-watching section rendering
  - [x] Ensure section only appears when user has history

## Phase 2: Shell Navigation Reorder
- [x] Task: Reorder navigation shell
  - [x] Write tests for nav item order
  - [x] Move Library before Activity in bottom/side nav
  - [x] Update golden tests if applicable
- [x] Task: Verify cross-platform
  - [x] Run widget tests on all target platforms
  - [x] Manual verification on Android TV emulator

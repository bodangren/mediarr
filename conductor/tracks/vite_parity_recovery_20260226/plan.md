# Implementation Plan: Vite Frontend Parity Recovery

## Phase 1: Baseline and Critical Gap Inventory
> Goal: establish a reproducible failing baseline and lock critical parity scope.

- [x] Task: Capture App Workspace Failure Baseline
    - [x] Sub-task: Run and record `npm run build --workspace=app` failure categories.
    - [x] Sub-task: Add/adjust app workspace typecheck command and capture failing categories.
    - [x] Sub-task: Create baseline tracking doc for current blockers (matcher typings, router typings, Vite type mismatch).
- [x] Task: Build Critical Parity Matrix
    - [x] Sub-task: Inventory current frontend routes/features against monolith parity targets.
    - [x] Sub-task: Classify gaps as Critical / Important / Deferred.
    - [x] Sub-task: Mark critical scope limited to core media operations + settings operability.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Type and Toolchain Stabilization
> Goal: make app build/type tooling coherent and green.

- [x] Task: Fix Matcher Typings and Test Environment Types
    - [x] Sub-task: Write failing tests/type assertions for missing matcher typings.
    - [x] Sub-task: Implement matcher typing/config fixes.
    - [x] Sub-task: Verify affected tests/typecheck pass.
- [x] Task: Fix Router Typing Mismatches
    - [x] Sub-task: Write failing tests/type assertions for route param/navigation typing mismatches.
    - [x] Sub-task: Refactor route helpers/components for type-safe React Router usage.
    - [x] Sub-task: Verify route typing errors are eliminated.
- [x] Task: Resolve Vite Type Version Drift
    - [x] Sub-task: Write failing type/build check reproducing Vite version mismatch.
    - [x] Sub-task: Align `vite` and related type/plugin/compiler versions and configs.
    - [x] Sub-task: Verify `npm run build --workspace=app` succeeds.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Critical Core Media Operations Parity
> Goal: ensure core TV/Movie day-to-day operations are functional.

- [~] Task: Library List/Detail Route Operability
    - [~] Sub-task: Write failing UI/API integration tests for library list + detail paths.
    - [x] Sub-task: Implement/fix route components and API wiring.
    - [~] Sub-task: Verify TV and Movie list/detail workflows function end-to-end.
- [ ] Task: Interactive Search and Grab Operability
    - [ ] Sub-task: Write failing tests for interactive search request/response rendering.
    - [ ] Sub-task: Write failing tests for grab action success/failure handling.
    - [ ] Sub-task: Implement/fix integration for both domains and remove critical stubs.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Critical Settings Operability Parity
> Goal: make critical unified settings sections usable and wired.

- [~] Task: Settings Navigation and Route Integrity
    - [~] Sub-task: Write failing tests for navigation to critical settings pages.
    - [x] Sub-task: Implement/fix route registration and page accessibility.
- [~] Task: Critical Settings API/Form Wiring
    - [~] Sub-task: Write failing tests for load/save flows in indexers, download clients, profiles/quality, subtitles, general.
    - [x] Sub-task: Implement/fix request payload typing and form submission behavior.
    - [x] Sub-task: Remove blocking stubs from critical settings paths.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)

## Phase 5: Backend-Served SPA Validation and App Gate
> Goal: validate production serving path and enforce completion gate.

- [ ] Task: Backend-Served SPA Deep-Link Validation
    - [ ] Sub-task: Write failing integration checks for direct route loads under backend static serving.
    - [ ] Sub-task: Implement/fix backend static fallback behavior and asset path compatibility.
- [ ] Task: App Workspace Completion Gate
    - [ ] Sub-task: Run app workspace lint/type/build/test checks in CI-compatible non-interactive mode.
    - [ ] Sub-task: Document remaining Important/Deferred parity items from the matrix.
    - [ ] Sub-task: Confirm no unresolved Critical parity items remain.
- [ ] Task: Conductor - User Manual Verification 'Phase 5' (Protocol in workflow.md)

# Implementation Plan: Cardigann Runtime Parity (Monolith-Native)

## Phase 1: Baseline Harness and Definition Coverage Map [checkpoint: e6dd9e1]
> **TEST-FIRST GATE** - no runtime feature implementation in this phase.
> **GOAL**: establish measurable parity baseline before coding behavior changes.

- [x] Task: Build Cardigann Conformance Harness Skeleton 151c83c
    - [x] Sub-task: Create test suite structure under `server/src/indexers/` for Cardigann conformance.
    - [x] Sub-task: Write tests - harness reports pass/fail by feature area.
    - [x] Sub-task: Write tests - harness reports pass/fail by definition ID.
    - [x] Sub-task: Add fixture loader for definition snippets and expected normalized outputs.
    - [x] Sub-task: Add summary reporter output format suitable for CI logs.

- [x] Task: Add Definition Feature Inventory Tests c82eeaa
    - [x] Sub-task: Write tests - inventory detects template constructs used by each imported definition.
    - [x] Sub-task: Write tests - inventory detects all filter names used by each imported definition.
    - [x] Sub-task: Write tests - inventory detects path/input/header/response features used by each definition.
    - [x] Sub-task: Write tests - failing assertion if imported definition uses untracked feature.
    - [x] Sub-task: Generate baseline compatibility matrix artifact for current imported definitions.

- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) e6dd9e1

## Phase 2: Template Runtime Parity (Required Subset) [checkpoint: efbd472]
> **ENTRY CRITERIA**: Phase 1 harness and baseline matrix committed.
> **GOAL**: implement template semantics required by imported definitions, with red-green tests per feature.

- [x] Task: Implement Query/Config/Category Template Evaluation 5d289ff
    - [x] Sub-task: Write tests - `.Query.*` substitutions across search paths and fields.
    - [x] Sub-task: Write tests - `.Config.*` substitutions from indexer settings.
    - [x] Sub-task: Write tests - category/template value substitutions used in imported definitions.
    - [x] Sub-task: Implement template evaluator for required variable interpolation.
    - [x] Sub-task: Ensure URL encoding behavior matches fixture expectations.

- [x] Task: Implement Conditional Template Constructs Used by Definitions 68c5499
    - [x] Sub-task: Write tests - conditional branches (`if`/`else`) used by fixtures.
    - [x] Sub-task: Write tests - unresolved template constructs fail with diagnostics.
    - [x] Sub-task: Implement required conditional evaluation in runtime.
    - [x] Sub-task: Add diagnostics for unsupported template nodes.

- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) efbd472

## Phase 3: Filter Pipeline Parity (Definition-Driven)
> **ENTRY CRITERIA**: Template tests green for required subset.
> **GOAL**: implement missing filters required by current definition set.

- [x] Task: Implement Regex and Replace Filter Variants c16f05a
    - [x] Sub-task: Write tests - `regexp` extraction behavior with capture groups.
    - [x] Sub-task: Write tests - `re_replace` replacement semantics.
    - [x] Sub-task: Implement `regexp` and `re_replace` filter handlers.
    - [x] Sub-task: Verify compatibility against fixture expectations per definition.

- [ ] Task: Implement Time/Date and Value-Shaping Filters
    - [ ] Sub-task: Write tests - `timeago` and `fuzzytime` conversion expectations.
    - [ ] Sub-task: Write tests - `dateparse` variants used by definitions.
    - [ ] Sub-task: Write tests - `remove` and `case` mapping behavior.
    - [ ] Sub-task: Implement missing filters with deterministic parsing rules.
    - [ ] Sub-task: Add explicit errors for unsupported filter args/patterns.

- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md) - PENDING

## Phase 4: Path/Input/Response and Parsing Parity
> **ENTRY CRITERIA**: required filter suite green.
> **GOAL**: support path and response behaviors used by imported definitions.

- [ ] Task: Implement Search Inputs, Headers, and Path Inheritance
    - [ ] Sub-task: Write tests - `search.inputs` and per-path `inputs` application.
    - [ ] Sub-task: Write tests - `search.headers` and request header emission.
    - [ ] Sub-task: Write tests - inherited path/input behavior where used.
    - [ ] Sub-task: Implement request builder updates for these features.

- [ ] Task: Implement Response-Type and Row Parsing Behaviors
    - [ ] Sub-task: Write tests - HTML row selector extraction with required row options.
    - [ ] Sub-task: Write tests - JSON response extraction path used by definitions.
    - [ ] Sub-task: Write tests - category mapping and normalization behavior.
    - [ ] Sub-task: Implement parser/runtime support for required row/response semantics.

- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md) - PENDING

## Phase 5: Integration Hardening, UI Safety, and Progress Gates
> **ENTRY CRITERIA**: definition-level conformance for required execution paths is near-complete.
> **GOAL**: ensure operational safety and preserve Cardigann settings through API/UI flows.

- [ ] Task: Enforce Definition Compatibility Validation
    - [ ] Sub-task: Write tests - incompatible definitions are rejected with clear diagnostics.
    - [ ] Sub-task: Wire loader/factory validation to runtime initialization paths.
    - [ ] Sub-task: Ensure diagnostics include definition ID, feature, and remediation hint.

- [ ] Task: Protect Cardigann UI/API Round-Trip
    - [ ] Sub-task: Write tests - edit/save preserves `definitionId` and definition-specific fields.
    - [ ] Sub-task: Write tests - schema lookup for `CardigannSettings` in add/edit paths.
    - [ ] Sub-task: Implement UI/backend schema resolution and payload safeguards.

- [ ] Task: Final Conformance Gate and Coverage
    - [ ] Sub-task: Run full Cardigann conformance harness and capture final matrix.
    - [ ] Sub-task: Ensure required imported definitions are either green or explicitly blocked with diagnostics.
    - [ ] Sub-task: Validate coverage target for Cardigann runtime changes.
    - [ ] Sub-task: Document remaining out-of-scope Cardigann features for future track.

- [ ] Task: Conductor - User Manual Verification 'Phase 5' (Protocol in workflow.md) - PENDING

# Product Definition: Pi Measure Harness

## Overview

Pi Measure Harness is a standalone Pi package that runs Measure's multi-agent development workflow in isolated Pi child processes. It snapshots role definitions, maps models, applies role-level mutation policy, and records provenance receipts.

## Target Users

Developers and teams using Pi who need a repeatable, auditable, sprint-driven workflow for AI-assisted software development.

## Core Problem

Prompt-only multi-agent workflows are difficult to resume, audit, compare, and improve safely. The harness must make orchestration state, evidence, permissions, and quality gates explicit without embedding knowledge of a particular product or repository.

## Product Principles

- Deterministic mechanics belong in extensions and schemas, not solely in prompts.
- Projects provide domain context; the framework provides general process primitives.
- Quality evidence takes precedence over pass rate, speed, and cost.
- Self-improvement is versioned, evaluated, reversible, and independently reviewed.

## Success Metrics

- Every role result is bound to a specific harness version and repository revision.
- Stale, malformed, or unauthorized results cannot advance a workflow.
- Sprint and story state is evidence-backed and resumable.
- Framework improvements reduce verified failure and intervention rates without weakening acceptance gates.

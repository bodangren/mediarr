# Spec: Complete App Regression Suite

## Problem

The release gate `CI=true npm run test --workspace=app` reports 39 failures in 13
suites after the previously scoped API, path-validation, settings, and view-card
tracks are applied. The remaining failures include stale UI expectations, missing
router/query test providers, and state-initialization defects.

## Goal

Restore a green SPA regression suite without weakening functional coverage or
changing the trusted-LAN deployment scope.

## Acceptance Criteria

- [ ] Every currently failing app test suite is either fixed here or reassigned to an existing active track with recorded evidence.
- [ ] Tests use the same routing, query, storage, and accessible UI contracts as production.
- [ ] `CI=true npm run test --workspace=app` passes.
- [ ] `npm run build --workspace=app` passes.

## Scope

SPA regression failures outside the existing focused API-drift, path-validation,
settings-routes, dynamic-form, view-card, and hooks-environment tracks.

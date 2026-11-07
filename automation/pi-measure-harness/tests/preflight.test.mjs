// Contract: measures/tracks/controlled_harness_evolution_20260714/test-strategy.md#phase-s1
//
// Red-phase S1 tests for `lib/preflight.mjs`. The preflight contract is
// the only enforcement gate between an unauthorized run and a dispatched
// child role; its reason codes are the structured signal downstream
// telemetry will correlate. Test only operates on self-contained fixtures.

import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { formatPreflightError, runPreflight } from "../lib/preflight.mjs";

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/s1");

const canonicalPlan = resolve(fixtureRoot, "plans/canonical.md");
const legacyPlan = resolve(fixtureRoot, "plans/legacy.md");
const allTildePlan = resolve(fixtureRoot, "plans/all-tilde.md");
const goodManifest = resolve(fixtureRoot, "manifest.json");

test("runPreflight returns ok: true on a clean fixture set", () => {
  // protects: test-strategy.md "clean state"
  const result = runPreflight({ manifest: goodManifest, plan: canonicalPlan, cwd: fixtureRoot });
  assert.equal(result.ok, true);
  // No blocking reason is allowed in the clean state.
  assert.equal(result.reason, undefined);
});

test("runPreflight blocks with reason 'drift:extension' when the extension hash mismatches", () => {
  // protects: spec.md#story-s1 AC2 + test-strategy.md "drift blocks"
  const result = runPreflight({
    manifest: resolve(fixtureRoot, "manifest-extension-drift.json"),
    plan: canonicalPlan,
    cwd: fixtureRoot,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "drift:extension");
});

test("runPreflight blocks with reason 'marker_grammar:legacy_in_active_run' for legacy [ ] in canonical mode", () => {
  // protects: spec.md#story-s1 AC3 + test-strategy.md "grammar blocks"
  const result = runPreflight({
    manifest: goodManifest,
    plan: legacyPlan,
    cwd: fixtureRoot,
    compatibilityMode: false,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "marker_grammar:legacy_in_active_run");
});

test("runPreflight emits a deterministic 'marker_grammar:legacy_accepted' warning under compatibility mode", () => {
  // protects: test-strategy.md "grammar blocks" + "deterministic diagnostics"
  const first = runPreflight({
    manifest: goodManifest,
    plan: legacyPlan,
    cwd: fixtureRoot,
    compatibilityMode: true,
  });
  const second = runPreflight({
    manifest: goodManifest,
    plan: legacyPlan,
    cwd: fixtureRoot,
    compatibilityMode: true,
  });
  assert.equal(first.ok, true);
  assert.deepEqual(first.warnings, ["marker_grammar:legacy_accepted"]);
  assert.deepEqual(first, second, "compatibility-mode result must be byte-identical across runs (no time, no randomness)");
});

test("runPreflight blocks with reason 'missing_reference:<name>'", () => {
  // protects: test-strategy.md "missing reference"
  const result = runPreflight({
    manifest: resolve(fixtureRoot, "manifest-missing.json"),
    plan: canonicalPlan,
    cwd: fixtureRoot,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /^missing_reference:/);
});

test("formatPreflightError is deterministic: same reason yields byte-identical output", () => {
  // protects: test-strategy.md "deterministic diagnostics"
  const a = formatPreflightError("drift:extension");
  const b = formatPreflightError("drift:extension");
  assert.equal(a, b);
});

test("formatPreflightError emits no timestamps or random/timing fields", () => {
  // protects: test-strategy.md "deterministic diagnostics"
  const formatted = formatPreflightError("marker_grammar:legacy_in_active_run");
  assert.equal(/\b\d{10,}\b/.test(formatted), false, "no unix-epoch-shaped timestamps");
  assert.equal(/\b0\.[0-9a-f]+\b/.test(formatted), false, "no random/timing tokens");
  assert.equal(formatted.includes(new Date().toISOString()), false, "no current ISO timestamp leakage");
});

test("Anti-pattern A4 mirror: all-tilde plan cannot satisfy the all-green preflight contract", () => {
  // protects: anti-patterns.md#A4 + test-strategy.md "anti-pattern A4 mirror"
  // A plan with only [~] tasks has no completed work; the preflight
  // all-green contract must reject it rather than passing vacuously.
  const result = runPreflight({ manifest: goodManifest, plan: allTildePlan, cwd: fixtureRoot });
  assert.equal(result.ok, false, "all-tilde plan must not pass the all-green check");
});

test("Anti-pattern A4 mirror: a plan with at least one [x] + SHA can satisfy the all-green preflight contract", () => {
  // protects: anti-patterns.md#A4 (positive control) + test-strategy.md "clean state"
  const result = runPreflight({ manifest: goodManifest, plan: canonicalPlan, cwd: fixtureRoot });
  assert.equal(result.ok, true);
});

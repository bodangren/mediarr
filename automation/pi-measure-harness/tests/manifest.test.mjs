// Contract: measures/tracks/controlled_harness_evolution_20260714/test-strategy.md#phase-s1
//
// Red-phase S1 tests for `lib/manifest.mjs`. Each assertion names the
// contract section it protects. The Mid Red gate must observe a non-zero
// exit because `lib/manifest.mjs` does not yet exist; Jr Green must make
// every assertion pass without altering the test's contract surface.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  computeStabilityHashes,
  loadManifest,
  validateManifest,
} from "../lib/manifest.mjs";

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/s1");

test("loadManifest returns the documented contract surface for a valid fixture", () => {
  // protects: spec.md#story-s1 AC1 + test-strategy.md "live-behavior"
  const manifest = loadManifest(resolve(fixtureRoot, "manifest.json"));
  assert.equal(typeof manifest.version, "string");
  assert.equal(typeof manifest.extensionHash, "string");
  assert.equal(typeof manifest.agentHashes, "object");
  assert.equal(typeof manifest.skillHashes, "object");
  assert.equal(typeof manifest.contractHash, "string");
  assert.equal(typeof manifest.markerGrammarVersion, "string");
  assert.equal(typeof manifest.compatibility, "object");
});

test("loadManifest throws drift:agent:<file> when an agent's stored hash mismatches the on-disk file", () => {
  // protects: spec.md#story-s1 AC2 + test-strategy.md "drift"
  assert.throws(
    () => loadManifest(resolve(fixtureRoot, "manifest-drift.json")),
    /drift:agent:[^\s]+/,
  );
});

test("loadManifest throws drift:extension when the extension hash mismatches", () => {
  // protects: test-strategy.md "drift"
  assert.throws(
    () => loadManifest(resolve(fixtureRoot, "manifest-extension-drift.json")),
    /drift:extension/,
  );
});

test("loadManifest throws schema_version_mismatch when the requested grammar version differs", () => {
  // protects: spec.md#story-s1 AC1 + test-strategy.md "schema mismatch"
  assert.throws(
    () =>
      loadManifest(resolve(fixtureRoot, "manifest.json"), {
        grammarVersion: "999.999.999",
      }),
    /schema_version_mismatch/,
  );
});

test("loadManifest throws missing_reference:<name> when an agent is declared but absent", () => {
  // protects: spec.md#story-s1 AC2 + test-strategy.md "missing reference"
  assert.throws(
    () => loadManifest(resolve(fixtureRoot, "manifest-missing.json")),
    /missing_reference:[^\s]+/,
  );
});

test("loadManifest throws unmapped_model:<name> when an agent references a model absent from MODEL_MAP", () => {
  // protects: test-strategy.md "unmapped model"
  assert.throws(
    () => loadManifest(resolve(fixtureRoot, "manifest-unmapped-model.json")),
    /unmapped_model:[^\s]+/,
  );
});

test("loadManifest produces byte-identical output across repeated calls", () => {
  // protects: test-strategy.md "deterministic output"
  const first = JSON.stringify(loadManifest(resolve(fixtureRoot, "manifest.json")));
  const second = JSON.stringify(loadManifest(resolve(fixtureRoot, "manifest.json")));
  assert.equal(first, second);
});

test("validateManifest rejects an empty manifest", () => {
  // protects: test-strategy.md "anti-pattern A3 probe"
  assert.throws(() => validateManifest({}), /manifest/);
});

test("computeStabilityHashes is deterministic and emits at least one 64-char hex digest", () => {
  // protects: test-strategy.md "computeStabilityHashes" surface symbol
  const filePath = resolve(fixtureRoot, "agents/fixture-agent.md");
  const a = computeStabilityHashes([filePath]);
  const b = computeStabilityHashes([filePath]);
  assert.deepEqual(a, b, "same input must produce structurally identical output");
  const serialized = JSON.stringify(a);
  assert.match(serialized, /[0-9a-f]{64}/, "output must contain a 64-character hex digest");
  // Outside structural punctuation, every other character must be a hex digit.
  const stripped = serialized.replace(/["{}\[\],\s:]/g, "");
  assert.match(stripped, /^[0-9a-fA-F]+$/, "all hash payloads must be valid hex characters");
});

test("Anti-pattern A3 probe: manifest exposes agent count as a labeled integer, not a bare number", () => {
  // protects: anti-patterns.md#A3 + test-strategy.md "anti-pattern A3 probe"
  const raw = readFileSync(resolve(fixtureRoot, "manifest.json"), "utf8");
  const match = raw.match(/agent\s+count:\s*(\d+)/);
  assert.ok(match, "manifest fixture must contain a labeled-integer 'agent count: <n>' field");
  const count = Number.parseInt(match[1], 10);
  assert.ok(Number.isInteger(count) && count > 0, "labeled integer must parse to a positive integer");
});

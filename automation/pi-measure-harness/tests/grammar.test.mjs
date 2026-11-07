// Contract: measures/tracks/controlled_harness_evolution_20260714/test-strategy.md#phase-s1
//
// Red-phase S1 tests for `lib/grammar.mjs`. Every assertion operates on a
// self-contained fixture line; none of these tests reads or mutates the
// implementation plan in `measure/tracks/.../plan.md`. The user-authorized
// `[ ] = pending` compatibility semantics stay intact during S1; the
// grammar contract surfaces only the *rule* and the *legacy reclassification
// signal*, not the live plan's markers.

import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_REGEX,
  classifyMarker,
  isTaskStructurallyBlocked,
  parseTaskLine,
} from "../lib/grammar.mjs";

test("CANONICAL_REGEX matches [x], [~], [b] and rejects the legacy [ ] marker", () => {
  // protects: spec.md#story-s1 AC3 + test-strategy.md "canonical regex"
  assert.match("- [x] Done (sha:abc1234)", CANONICAL_REGEX);
  assert.match("- [~] In progress", CANONICAL_REGEX);
  assert.match("- [b] Blocked (deferred:phikul)", CANONICAL_REGEX);
  assert.doesNotMatch("- [ ] Pending", CANONICAL_REGEX);
});

test("isTaskStructurallyBlocked returns true only for [b] lines with trailing (deferred:<owner>)", () => {
  // protects: test-strategy.md "structurally blocked"
  assert.equal(isTaskStructurallyBlocked("- [b] Task (deferred:phikul)"), true);
  assert.equal(isTaskStructurallyBlocked("- [b] Task"), false, "[b] without (deferred:<owner>) must not be structurally blocked");
  assert.equal(isTaskStructurallyBlocked("- [~] Task"), false);
  assert.equal(isTaskStructurallyBlocked("- [x] Task (sha:abc1234)"), false);
});

test("classifyMarker emits a structured unmigrated signal for the legacy [ ] marker", () => {
  // protects: spec.md#story-s1 AC4 + test-strategy.md "legacy reclassification"
  const result = classifyMarker("[ ] pending");
  assert.equal(result.status, "b", "[ ] must reclassify to blocked-equivalent");
  assert.equal(result.note, "unmigrated", "structured signal must carry the unmigrated note");
});

test("parseTaskLine returns missing_sha evidence when an [x] task lacks a 7–40 hex SHA", () => {
  // protects: test-strategy.md "complete with SHA" + anti-patterns.md#A5
  const result = parseTaskLine("- [x] Done task");
  assert.equal(result.status, "x");
  assert.equal(result.evidence, "missing_sha");
});

test("parseTaskLine records sha:<hex> evidence when an [x] task contains a 7–40 hex SHA", () => {
  // protects: test-strategy.md "complete with SHA"
  const result = parseTaskLine("- [x] Done task abc1234567");
  assert.equal(result.status, "x");
  assert.equal(result.evidence, "sha:abc1234567");
});

test("parseTaskLine is deterministic across repeated calls on a fixture covering every marker class", () => {
  // protects: test-strategy.md "migration fixture"
  const fixture = [
    "- [x] Done task abc1234567",
    "- [~] In progress task",
    "- [b] Blocked task (deferred:phikul)",
    "- [ ] Legacy pending task",
  ];
  const first = fixture.map(parseTaskLine);
  const second = fixture.map(parseTaskLine);
  assert.equal(first.length, 4);
  assert.deepEqual(first, second, "parser must be stable across calls");
  // structural shape per marker class
  assert.equal(first[0].status, "x");
  assert.equal(first[1].status, "~");
  assert.equal(first[2].status, "b");
  assert.equal(first[3].status, "b", "[ ] reclassifies into blocked-equivalent");
});

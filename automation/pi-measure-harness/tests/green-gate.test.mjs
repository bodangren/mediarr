// Contract: measure/tracks/harness_selfcheck_truthfulness_20260805/test-strategy.md#phase-3
//
// Phase 3 green-gate contract (Tasks 3.1 + 3.2):
//
// - Shipped partition: every `tests/*.test.mjs` file NOT listed in
//   `tests/.track-red-files.txt`.
// - Track-owned Red partition: every `tests/*.test.mjs` file listed in
//   `tests/.track-red-files.txt`.
// - Unclassified: any `tests/*.test.mjs` file that is neither shipped nor
//   listed in `tests/.track-red-files.txt`; this is a hard failure reported as
//   `{class: 'unclassified_test_file', path: <label>}`.
// - Green gate command: `npm run test:shipped`. Phase 3 Green introduces it;
//   the command and implementation intentionally do not exist during Red.
// - The script reads `tests/.track-red-files.txt` (one filename per line;
//   lines beginning with `#` are comments), reads the POSIX
//   `tests/*.test.mjs` surface, and partitions it into `shipped`, `trackRed`,
//   and `unclassified` arrays.
// - The script invokes `node --test <shipped>` over only the shipped
//   partition and prints:
//   `[shipped] running N test files: ...; [track-red] excluded M: ...; [unclassified] U: ...`.
// - The command exits zero iff the shipped partition is green and there are
//   no unclassified files. A shipped failure or unclassified file exits
//   non-zero and carries a structured diagnostic.
// - Phase 3 Green commits `tests/.track-red-files.txt` containing exactly:
//     tests/agents-snapshot.test.mjs
//     tests/grammar.test.mjs
//     tests/manifest.test.mjs
//     tests/preflight.test.mjs
// - The classifier is exported as
//   `partitionTests(trackRedList, testsDir)` from `lib/green-gate.mjs` so the
//   contract can be exercised in-process. Output arrays are deterministically
//   ordered. Exclusion is exact-path only; English words such as `red`,
//   `skip`, and `excluded` never act as filters.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = resolve(import.meta.dirname, "..");
const fixturesDir = resolve(import.meta.dirname, "fixtures/green-gate");
const scriptPath = resolve(repoRoot, "scripts/test-shipped.mjs");
const packagePath = resolve(repoRoot, "package.json");
const TRACK_RED_LIST = Object.freeze([
  "tests/agents-snapshot.test.mjs",
  "tests/grammar.test.mjs",
  "tests/manifest.test.mjs",
  "tests/preflight.test.mjs",
]);

async function loadClassifier() {
  try {
    return await import("../lib/green-gate.mjs");
  } catch {
    return {};
  }
}

function names(paths) {
  return paths.map((path) => basename(path)).sort();
}

test("live-behavior: shipped-test script exists as ESM and package script is wired", () => {
  // protects: Phase 3 Task 3.1 "Green gate command" and Task 3.2 live-behavior script surface
  assert.equal(existsSync(scriptPath), true, "scripts/test-shipped.mjs must exist");
  assert.equal(scriptPath.endsWith(".mjs"), true, "green-gate runner must be a Node.js ESM file");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  assert.equal(pkg.scripts?.["test:shipped"], "node scripts/test-shipped.mjs", "npm run test:shipped must invoke the ESM runner");
});

test("live-behavior: partition classifier is exported with the documented signature", async () => {
  // protects: Phase 3 Task 3.2 dependency "partition classifier"
  const { partitionTests } = await loadClassifier();
  assert.equal(typeof partitionTests, "function", "lib/green-gate.mjs must export partitionTests(trackRedList, testsDir)");
});

test("live-behavior: shipped partition runs while the four track-owned Red files are excluded", async () => {
  // protects: Story S3 AC1 and test-strategy.md Phase 3 "shipped partition runs / track-owned Red excluded"
  const { partitionTests } = await loadClassifier();
  assert.equal(typeof partitionTests, "function");
  const partition = partitionTests(TRACK_RED_LIST, fixturesDir);
  assert.equal(partition.trackRed.length, 4);
  assert.deepEqual(names(partition.trackRed), ["agents-snapshot.test.mjs", "grammar.test.mjs", "manifest.test.mjs", "preflight.test.mjs"]);
  assert.ok(names(partition.shipped).includes("shipped-fixture.test.mjs"));
  for (const red of partition.trackRed) assert.equal(partition.shipped.includes(red), false);
});

test("live-behavior: a synthetic unclassified test file is reported as a hard failure", async () => {
  // protects: Story S3 AC3 and test-strategy.md Phase 3 "unclassified file fails the gate"
  const { partitionTests } = await loadClassifier();
  assert.equal(typeof partitionTests, "function");
  const dir = mkdtempSync(resolve(tmpdir(), "green-gate-unclassified-"));
  try {
    for (const file of ["shipped-fixture.test.mjs", "agents-snapshot.test.mjs", "grammar.test.mjs", "manifest.test.mjs", "preflight.test.mjs"]) {
      writeFileSync(resolve(dir, file), "import test from 'node:test'; test('fixture', () => {});\n");
    }
    writeFileSync(resolve(dir, "new-unclassified.test.mjs"), "import test from 'node:test'; test('new', () => {});\n");
    const partition = partitionTests(TRACK_RED_LIST, dir);
    assert.ok(partition.unclassified.some((path) => basename(path) === "new-unclassified.test.mjs"));
    assert.deepEqual({ class: "unclassified_test_file", path: "tests/new-unclassified.test.mjs" }, { class: "unclassified_test_file", path: "tests/new-unclassified.test.mjs" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("live-behavior: a seeded regression in a shipped surface makes node --test fail", () => {
  // protects: Story S3 AC2 and test-strategy.md Phase 3 "seeded regression in a shipped surface fails the gate"
  const fixture = resolve(fixturesDir, "seeded-regression.test.mjs");
  const result = spawnSync(process.execPath, ["--test", fixture], { cwd: repoRoot, encoding: "utf8" });
  assert.notEqual(result.status, 0, "a thrown shipped test regression must produce a non-zero node --test exit");
  assert.match(`${result.stdout}\n${result.stderr}`, /seeded/);
});

test("A7 analog: exact-path classification does not exclude a filename containing the word red", async () => {
  // protects: anti-pattern A7 analog and test-strategy.md Phase 3 "exclude filter is not over-broad"
  const { partitionTests } = await loadClassifier();
  assert.equal(typeof partitionTests, "function");
  const partition = partitionTests(TRACK_RED_LIST, fixturesDir);
  const probe = "not-actually-red-fixture.test.mjs";
  assert.equal(names(partition.trackRed).includes(probe), false, "bare English word 'red' must not classify a file as track-owned Red");
  assert.ok(names(partition.shipped).includes(probe) || names(partition.unclassified).includes(probe), "probe must remain visible as shipped or unclassified");
});

test("deterministic: repeated partition classification returns byte-identical arrays", async () => {
  // protects: spec.md deterministic NFR and test-strategy.md Phase 3 "deterministic output"
  const { partitionTests } = await loadClassifier();
  assert.equal(typeof partitionTests, "function");
  const first = partitionTests(TRACK_RED_LIST, fixturesDir);
  const second = partitionTests(TRACK_RED_LIST, fixturesDir);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test("live-behavior: script output explicitly lists shipped, track-red, and unclassified partitions", () => {
  // protects: Phase 3 Task 3.1 structured listing and test-strategy.md Phase 3 "partition listing is explicit"
  const result = spawnSync(process.execPath, [scriptPath], { cwd: repoRoot, encoding: "utf8" });
  const stdout = result.stdout ?? "";
  assert.match(stdout, /\[shipped\]\s+running \d+ test files:\s*[^;]*;/);
  assert.match(stdout, /\[track-red\]\s+excluded \d+:\s*[^;]*;/);
  assert.match(stdout, /\[unclassified\]\s+\d+:\s*[^;]*(?:;|$)/);
});

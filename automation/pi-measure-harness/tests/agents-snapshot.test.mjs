// Contract: measure/tracks/controlled_harness_evolution_20260714/test-strategy.md#phase-s1.agents-snapshot
//
// Red-phase S1.agents-snapshot tests for `lib/agents-snapshot.mjs`. The lib
// is verification-only and never touches the live target directories.
// Tests use temporary fixtures under `os.tmpdir()` for synthetic error
// probes (missing/extra/not_hard_link/content_mismatch/symlink/empty) and
// resolve the live source/target directories through env-overridable
// defaults for the live-behavior parity probes. The Mid Red gate must
// observe a non-zero exit because `lib/agents-snapshot.mjs` does not yet
// exist; Jr Green implements the lib and runs the actual hard-link sync,
// but does not edit this test file.

import assert from "node:assert/strict";
import { linkSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  DEFAULT_FULL_MIRROR_DIRS,
  DEFAULT_MEASURE_ONLY_DIR,
  DEFAULT_SOURCE_DIR,
  EXPECTED_AGENT_COUNT,
  EXPECTED_MEASURE_AGENT_COUNT,
  MEASURE_ONLY_PATTERN,
  classifyLinkError,
  compareHardLinkInventory,
  formatSnapshotError,
  verifyHardLinkRelationship,
  verifyHardLinkSnapshot,
} from "../lib/agents-snapshot.mjs";

test("agents-snapshot constants are exported with the user-approved hard-coded counts and patterns", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — constants exported
  assert.equal(EXPECTED_AGENT_COUNT, 29, "EXPECTED_AGENT_COUNT must equal the live source-set count");
  assert.equal(EXPECTED_MEASURE_AGENT_COUNT, 13, "EXPECTED_MEASURE_AGENT_COUNT must equal the user-approved exact-13 measure-only set");
  assert.equal(MEASURE_ONLY_PATTERN.test("measure-strategy.md"), true, "MEASURE_ONLY_PATTERN must accept measure-*.md names");
  assert.equal(MEASURE_ONLY_PATTERN.test("coder-x.md"), false, "MEASURE_ONLY_PATTERN must reject coder-*.md names");
});

test("agents-snapshot default directory constants resolve to the four user-approved live paths", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — default directory constants
  assert.match(DEFAULT_SOURCE_DIR, /\.config\/opencode\/agent$/, "DEFAULT_SOURCE_DIR must point to ~/.config/opencode/agent");
  assert.ok(Array.isArray(DEFAULT_FULL_MIRROR_DIRS), "DEFAULT_FULL_MIRROR_DIRS must be an array");
  assert.ok(Object.isFrozen(DEFAULT_FULL_MIRROR_DIRS), "DEFAULT_FULL_MIRROR_DIRS must be frozen");
  assert.equal(DEFAULT_FULL_MIRROR_DIRS.length, 2, "DEFAULT_FULL_MIRROR_DIRS must contain exactly two full-mirror targets");
  const fullMirrorLabels = DEFAULT_FULL_MIRROR_DIRS.map((p) => p.replace(process.env.HOME ?? "~", "~"));
  assert.ok(fullMirrorLabels.includes("~/.agents/agents"), "DEFAULT_FULL_MIRROR_DIRS must include ~/.agents/agents");
  assert.ok(fullMirrorLabels.includes("~/Desktop/pi-measure-harness/agents"), "DEFAULT_FULL_MIRROR_DIRS must include ~/Desktop/pi-measure-harness/agents");
  assert.match(DEFAULT_MEASURE_ONLY_DIR, /Desktop\/measure\/agents$/, "DEFAULT_MEASURE_ONLY_DIR must point to ~/Desktop/measure/agents");
});

test("verifyHardLinkSnapshot reports full-mirror filename parity across every DEFAULT_FULL_MIRROR_DIRS target", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — live-behavior — full-mirror filename parity
  const result = verifyHardLinkSnapshot({
    sourceDir: process.env.OPENCODE_AGENT_DIR ?? DEFAULT_SOURCE_DIR,
    fullMirrorDirs: process.env.OPENCODE_AGENTS_TARGET_DIRS
      ? process.env.OPENCODE_AGENTS_TARGET_DIRS.split(":").filter(Boolean)
      : DEFAULT_FULL_MIRROR_DIRS,
    measureOnlyDir: process.env.OPENCODE_MEASURE_ONLY_DIR ?? DEFAULT_MEASURE_ONLY_DIR,
  });
  // The two full-mirror targets must be present and pass without missing/extra files.
  assert.equal(result.ok, true, `live snapshot must pass: ${JSON.stringify(result)}`);
  assert.deepEqual(
    result.fullMirror,
    DEFAULT_FULL_MIRROR_DIRS.map((dir) => ({ dir, ok: true })),
    "every full-mirror target must report ok: true with no missing or extra files",
  );
});

test("verifyHardLinkSnapshot reports exact-13 measure-only filename parity and rejects any non-measure .md residue", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — live-behavior — measure-only filename parity
  const result = verifyHardLinkSnapshot({
    sourceDir: process.env.OPENCODE_AGENT_DIR ?? DEFAULT_SOURCE_DIR,
    fullMirrorDirs: DEFAULT_FULL_MIRROR_DIRS,
    measureOnlyDir: process.env.OPENCODE_MEASURE_ONLY_DIR ?? DEFAULT_MEASURE_ONLY_DIR,
  });
  assert.equal(result.ok, true, `live measure-only snapshot must pass: ${JSON.stringify(result)}`);
  assert.equal(result.measureOnly.ok, true);
  assert.equal(result.measureOnly.fileCount, EXPECTED_MEASURE_AGENT_COUNT);
  assert.equal(
    result.measureOnly.everyMatchesPattern,
    true,
    "every .md file in the measure-only target must match MEASURE_ONLY_PATTERN",
  );
});

test("verifyHardLinkRelationship returns sha256 + dev+ino parity for a fresh source/target hard link pair", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — live-behavior — content parity + hard-link relationship
  const tmp = mkdtempSync(join(tmpdir(), "agents-snapshot-rel-"));
  try {
    const source = join(tmp, "source");
    const target = join(tmp, "target");
    mkdirSync(source);
    mkdirSync(target);
    const payload = Buffer.from("# real hard link\nThis file MUST be linked, not copied.\n", "utf8");
    writeFileSync(join(source, "linked.md"), payload);
    // Use the lib's own helper to create the hard link so the test exercises the lib surface.
    linkSync(join(source, "linked.md"), join(target, "linked.md"));
    const relationship = verifyHardLinkRelationship({
      sourcePath: join(source, "linked.md"),
      targetPath: join(target, "linked.md"),
    });
    assert.equal(relationship.ok, true, `hard-link relationship must pass: ${JSON.stringify(relationship)}`);
    assert.equal(relationship.sha256Match, true, "sha256 of source and target must match");
    assert.equal(relationship.devInoMatch, true, "device+inode of source and target must match");
    assert.equal(relationship.isSymlink, false, "shared file must NOT be a symlink");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("verifyHardLinkSnapshot rejects a target file that is a symbolic link via symlink_detected:<path>", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — live-behavior — symlink rejection
  const tmp = mkdtempSync(join(tmpdir(), "agents-snapshot-symlink-"));
  try {
    const source = join(tmp, "source");
    const target = join(tmp, "target");
    mkdirSync(source);
    mkdirSync(target);
    const payload = Buffer.from("# symlinked source\n", "utf8");
    writeFileSync(join(source, "ghost.md"), payload);
    symlinkSync(join(source, "ghost.md"), join(target, "ghost.md"), "file");
    const result = verifyHardLinkSnapshot({
      sourceDir: source,
      fullMirrorDirs: [target],
      measureOnlyDir: join(tmp, "measure-only"),
    });
    assert.equal(result.ok, false, "symlink target must fail verification");
    const reason = result.reason ?? "";
    assert.ok(
      String(reason).startsWith("symlink_detected:") ||
        (Array.isArray(result.fullMirror) && result.fullMirror.some((entry) => String(entry.reason ?? "").startsWith("symlink_detected:"))),
      `reason must include symlink_detected:<path>, got ${JSON.stringify(result)}`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("structured error — missing file: a target missing one expected .md yields missing_file:<path>", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — structured error — missing file
  const tmp = mkdtempSync(join(tmpdir(), "agents-snapshot-missing-"));
  try {
    const source = join(tmp, "source");
    const target = join(tmp, "target");
    mkdirSync(source);
    mkdirSync(target);
    writeFileSync(join(source, "alpha.md"), Buffer.from("a\n", "utf8"));
    writeFileSync(join(source, "beta.md"), Buffer.from("b\n", "utf8"));
    // beta.md is intentionally missing from target
    linkSync(join(source, "alpha.md"), join(target, "alpha.md"));
    const result = verifyHardLinkSnapshot({
      sourceDir: source,
      fullMirrorDirs: [target],
      measureOnlyDir: join(tmp, "measure-only"),
    });
    assert.equal(result.ok, false);
    assert.match(
      String(result.reason ?? ""),
      /^missing_file:/,
      `reason must start with missing_file:, got ${JSON.stringify(result)}`,
    );
    assert.ok(
      String(result.reason ?? "").includes("beta.md"),
      `reason must reference the missing filename, got ${JSON.stringify(result)}`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("structured error — extra file: an unexpected .md in a full-mirror target yields extra_file:<path>", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — structured error — extra file (full mirror)
  const tmp = mkdtempSync(join(tmpdir(), "agents-snapshot-extra-"));
  try {
    const source = join(tmp, "source");
    const target = join(tmp, "target");
    mkdirSync(source);
    mkdirSync(target);
    writeFileSync(join(source, "alpha.md"), Buffer.from("a\n", "utf8"));
    linkSync(join(source, "alpha.md"), join(target, "alpha.md"));
    writeFileSync(join(target, "rogue.md"), Buffer.from("r\n", "utf8"));
    const result = verifyHardLinkSnapshot({
      sourceDir: source,
      fullMirrorDirs: [target],
      measureOnlyDir: join(tmp, "measure-only"),
    });
    assert.equal(result.ok, false);
    assert.match(
      String(result.reason ?? ""),
      /^extra_file:/,
      `reason must start with extra_file:, got ${JSON.stringify(result)}`,
    );
    assert.ok(
      String(result.reason ?? "").includes("rogue.md"),
      `reason must reference the extra filename, got ${JSON.stringify(result)}`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("structured error — extra non-measure file in measure-only target yields extra_file:<path> (never tolerated warning)", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — structured error — extra file (measure-only)
  const tmp = mkdtempSync(join(tmpdir(), "agents-snapshot-extra-monly-"));
  try {
    const source = join(tmp, "source");
    const measureOnly = join(tmp, "measure-only");
    mkdirSync(source);
    mkdirSync(measureOnly);
    writeFileSync(join(source, "measure-foo.md"), Buffer.from("foo\n", "utf8"));
    linkSync(join(source, "measure-foo.md"), join(measureOnly, "measure-foo.md"));
    writeFileSync(join(measureOnly, "coder-deepseek-v4-flash.md"), Buffer.from("c\n", "utf8"));
    const result = verifyHardLinkSnapshot({
      sourceDir: source,
      fullMirrorDirs: [join(tmp, "full-mirror")],
      measureOnlyDir: measureOnly,
    });
    assert.equal(result.ok, false, "extra non-measure file in measure-only target must fail verification");
    assert.ok(
      Array.isArray(result.warnings) === false || result.warnings.length === 0,
      `non-measure extras must NOT surface as tolerated warnings, got ${JSON.stringify(result.warnings)}`,
    );
    assert.ok(
      String(result.reason ?? "").startsWith("extra_file:") ||
        String(result.measureOnly?.reason ?? "").startsWith("extra_file:"),
      `reason must be extra_file:<path>, got ${JSON.stringify(result)}`,
    );
    assert.ok(
      String(result.reason ?? "").includes("coder-deepseek-v4-flash.md") ||
        String(result.measureOnly?.reason ?? "").includes("coder-deepseek-v4-flash.md"),
      `reason must reference the offending non-measure filename, got ${JSON.stringify(result)}`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("structured error — content mismatch: same inode, different content yields content_mismatch:<path>", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — structured error — content mismatch
  const tmp = mkdtempSync(join(tmpdir(), "agents-snapshot-mismatch-"));
  try {
    const source = join(tmp, "source");
    const target = join(tmp, "target");
    mkdirSync(source);
    mkdirSync(target);
    writeFileSync(join(source, "alpha.md"), Buffer.from("a\n", "utf8"));
    writeFileSync(join(target, "alpha.md"), Buffer.from("DIFFERENT\n", "utf8"));
    const result = verifyHardLinkSnapshot({
      sourceDir: source,
      fullMirrorDirs: [target],
      measureOnlyDir: join(tmp, "measure-only"),
    });
    assert.equal(result.ok, false);
    assert.match(
      String(result.reason ?? ""),
      /^content_mismatch:/,
      `reason must start with content_mismatch:, got ${JSON.stringify(result)}`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("structured error — not_hard_link: same content, different inode yields not_hard_link:<path>:<dev>:<ino>", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — structured error — not_hard_link
  const tmp = mkdtempSync(join(tmpdir(), "agents-snapshot-copy-"));
  try {
    const source = join(tmp, "source");
    const target = join(tmp, "target");
    mkdirSync(source);
    mkdirSync(target);
    writeFileSync(join(source, "alpha.md"), Buffer.from("a\n", "utf8"));
    writeFileSync(join(target, "alpha.md"), Buffer.from("a\n", "utf8"));
    const result = verifyHardLinkSnapshot({
      sourceDir: source,
      fullMirrorDirs: [target],
      measureOnlyDir: join(tmp, "measure-only"),
    });
    assert.equal(result.ok, false);
    const reason = String(result.reason ?? "");
    assert.match(reason, /^not_hard_link:/, `reason must start with not_hard_link:, got ${JSON.stringify(result)}`);
    assert.ok(reason.includes("alpha.md"), "reason must reference the offending filename");
    // Reason must carry the target's device and inode so an operator can confirm the lib is comparing the right pair.
    assert.ok(/:\d+:\d+$/.test(reason), `reason must end with <dev>:<ino>, got ${reason}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("classifyLinkError maps EXDEV/EPERM/EROFS to cross_filesystem/permission_denied/readonly_filesystem and 'unknown' otherwise", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — structured error — cross-filesystem failure
  assert.equal(classifyLinkError({ code: "EXDEV" }), "cross_filesystem");
  assert.equal(classifyLinkError({ code: "EPERM" }), "permission_denied");
  assert.equal(classifyLinkError({ code: "EROFS" }), "readonly_filesystem");
  assert.equal(classifyLinkError({ code: "EACCES" }), "unknown");
  assert.equal(classifyLinkError({}), "unknown");
  assert.equal(classifyLinkError(new Error("no code")), "unknown");
});

test("verifyHardLinkSnapshot is deterministic: byte-identical JSON output across repeated calls on the same paths", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — deterministic output
  const args = {
    sourceDir: process.env.OPENCODE_AGENT_DIR ?? DEFAULT_SOURCE_DIR,
    fullMirrorDirs: DEFAULT_FULL_MIRROR_DIRS,
    measureOnlyDir: process.env.OPENCODE_MEASURE_ONLY_DIR ?? DEFAULT_MEASURE_ONLY_DIR,
  };
  const a = verifyHardLinkSnapshot(args);
  const b = verifyHardLinkSnapshot(args);
  assert.equal(JSON.stringify(a), JSON.stringify(b), "verifyHardLinkSnapshot output must be deterministic");
  assert.equal(JSON.stringify(a).includes(Date.now().toString()), false, "output must not embed Date.now()");
});

test("anti-pattern A4 strengthening — empty source set yields empty_source:<path>, never a vacuous {ok: true}", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — anti-pattern A4 strengthening
  const tmp = mkdtempSync(join(tmpdir(), "agents-snapshot-empty-"));
  try {
    mkdirSync(join(tmp, "target"));
    const result = verifyHardLinkSnapshot({
      sourceDir: join(tmp, "source-empty"),
      fullMirrorDirs: [join(tmp, "target")],
      measureOnlyDir: join(tmp, "measure-only"),
    });
    assert.equal(result.ok, false, "empty source must not vacuously report ok: true");
    assert.match(
      String(result.reason ?? ""),
      /^empty_source:/,
      `reason must start with empty_source:, got ${JSON.stringify(result)}`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("anti-pattern A8 strengthening — symlink-only target yields symlink_detected:<path>, not dev+ino inheritance", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — anti-pattern A8 strengthening
  const tmp = mkdtempSync(join(tmpdir(), "agents-snapshot-symlink-only-"));
  try {
    const source = join(tmp, "source");
    const target = join(tmp, "target");
    mkdirSync(source);
    mkdirSync(target);
    writeFileSync(join(source, "alpha.md"), Buffer.from("a\n", "utf8"));
    symlinkSync(join(source, "alpha.md"), join(target, "alpha.md"), "file");
    const result = verifyHardLinkSnapshot({
      sourceDir: source,
      fullMirrorDirs: [target],
      measureOnlyDir: join(tmp, "measure-only"),
    });
    assert.equal(result.ok, false, "symlink-only target must fail verification");
    assert.match(
      String(result.reason ?? ""),
      /^symlink_detected:/,
      `reason must start with symlink_detected:, got ${JSON.stringify(result)}`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("compareHardLinkInventory + formatSnapshotError are exported and produce byte-identical output for the same input", () => {
  // protects: test-strategy.md#phase-s1.agents-snapshot — surface symbols + formatSnapshotError determinism
  assert.equal(typeof compareHardLinkInventory, "function");
  assert.equal(typeof formatSnapshotError, "function");
  assert.equal(formatSnapshotError("drift:extension"), formatSnapshotError("drift:extension"));
  assert.equal(/\b\d{10,}\b/.test(formatSnapshotError("drift:extension")), false, "no unix-epoch-shaped timestamps");
});
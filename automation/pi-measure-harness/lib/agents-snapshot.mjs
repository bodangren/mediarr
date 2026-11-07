// Cross-directory hard-link parity surface for the S1.agents-snapshot
// user-approved contract.
//
// Contract: measure/tracks/controlled_harness_evolution_20260714/test-strategy.md#phase-s1.agents-snapshot
//
// The lib is verification-only: it never writes to the source set, the
// full-mirror targets, the measure-only target, or any other live path.
// It reads the on-disk state, computes structured diagnostics, and emits
// a deterministic result. Hard-link creation is Jr Green's responsibility
// (see strategy §"Implementation/verification command contract"), not
// the lib's.
//
// Constants:
// - `EXPECTED_AGENT_COUNT` (= 29) is the current live source-set count.
// - `EXPECTED_MEASURE_AGENT_COUNT` (= 13) is the exact-13 measure-only
//   subset the measure-only target must hold.
// - `MEASURE_ONLY_PATTERN` matches `measure-*.md` files; rejects
//   `coder-*.md` and any other non-measure residue.

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

export const EXPECTED_AGENT_COUNT = 29;
export const EXPECTED_MEASURE_AGENT_COUNT = 13;
export const MEASURE_ONLY_PATTERN = /^measure-.*\.md$/;

export const DEFAULT_SOURCE_DIR = resolve(homedir(), ".config/opencode/agent");
export const DEFAULT_FULL_MIRROR_DIRS = Object.freeze([
  resolve(homedir(), ".agents/agents"),
  resolve(homedir(), "Desktop/pi-measure-harness/agents"),
]);
export const DEFAULT_MEASURE_ONLY_DIR = resolve(homedir(), "Desktop/measure/agents");

/** Computes a stable 64-char hex SHA-256 digest. */
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Maps a structured link error to a stable diagnostic code.
 *   EXDEV  -> cross_filesystem
 *   EPERM  -> permission_denied
 *   EROFS  -> readonly_filesystem
 *   any other .code (or no .code) -> unknown
 */
export function classifyLinkError(err) {
  if (!err || typeof err !== "object") return "unknown";
  const code = typeof err.code === "string" ? err.code : null;
  if (code === "EXDEV") return "cross_filesystem";
  if (code === "EPERM") return "permission_denied";
  if (code === "EROFS") return "readonly_filesystem";
  return "unknown";
}

/**
 * Compares two hard-link inventory snapshots. Returns `true` iff they
 * are byte-identical. Deterministic: relies on stable JSON serialization.
 */
export function compareHardLinkInventory(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Formats a snapshot reason into a stable, time-free, deterministic
 * operator-facing string. The same reason always produces the same
 * output; no timestamps, no random tokens.
 */
export function formatSnapshotError(reason) {
  return `agents-snapshot error: ${String(reason ?? "unknown")}`;
}

/**
 * Returns a deterministic file listing (absolute paths) for `dir`,
 * filtered to entries ending in `.md`. Missing directories return `[]`.
 */
function listMarkdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => resolve(dir, name));
}

/**
 * Verifies the hard-link relationship between a single source/target pair.
 * Returns `{ok, sha256Match, devInoMatch, isSymlink, ...}` for the pair.
 */
export function verifyHardLinkRelationship({ sourcePath, targetPath } = {}) {
  if (!sourcePath || !targetPath) {
    return { ok: false, sha256Match: false, devInoMatch: false, isSymlink: false, reason: "missing_file" };
  }
  if (!existsSync(sourcePath)) {
    return { ok: false, sha256Match: false, devInoMatch: false, isSymlink: false, reason: `missing_file:${sourcePath}` };
  }
  if (!existsSync(targetPath)) {
    return { ok: false, sha256Match: false, devInoMatch: false, isSymlink: false, reason: `missing_file:${targetPath}` };
  }

  const lstat = lstatSync(targetPath);
  if (lstat.isSymbolicLink()) {
    return { ok: false, sha256Match: false, devInoMatch: false, isSymlink: true, reason: `symlink_detected:${targetPath}` };
  }

  const sourceStat = statSync(sourcePath);
  const targetStat = statSync(targetPath);
  const devInoMatch = sourceStat.dev === targetStat.dev && sourceStat.ino === targetStat.ino;

  const sourceSha = sha256(readFileSync(sourcePath));
  const targetSha = sha256(readFileSync(targetPath));
  const sha256Match = sourceSha === targetSha;

  return {
    ok: devInoMatch && sha256Match,
    sha256Match,
    devInoMatch,
    isSymlink: false,
    sourcePath,
    targetPath,
    sourceDev: sourceStat.dev,
    sourceIno: sourceStat.ino,
    targetDev: targetStat.dev,
    targetIno: targetStat.ino,
  };
}

/**
 * Verifies the cross-directory hard-link parity between a source set and
 * (a) a list of full-mirror targets and (b) one measure-only target.
 *
 * Returns a structured, deterministic result with no timestamps or random
 * tokens. On failure, the top-level `reason` carries the first structured
 * diagnostic, and per-target `reason` fields carry per-target detail.
 *
 * @param {{sourceDir: string, fullMirrorDirs: string[], measureOnlyDir: string}} input
 */
export function verifyHardLinkSnapshot({ sourceDir, fullMirrorDirs, measureOnlyDir } = {}) {
  const sourceFiles = listMarkdownFiles(sourceDir);
  if (sourceFiles.length === 0) {
    return {
      ok: false,
      reason: `empty_source:${sourceDir}`,
      sourceDir,
      fullMirror: [],
      measureOnly: { dir: measureOnlyDir, ok: false, reason: `empty_source:${sourceDir}` },
    };
  }

  const fullMirror = [];
  for (const targetDir of [...fullMirrorDirs].sort()) {
    const targetFiles = listMarkdownFiles(targetDir);
    const sourceNames = new Set(sourceFiles.map((p) => p.split("/").pop()));
    const targetNames = new Set(targetFiles.map((p) => p.split("/").pop()));

    const extra = [...targetNames].filter((n) => !sourceNames.has(n)).sort();
    if (extra.length > 0) {
      fullMirror.push({ dir: targetDir, ok: false, reason: `extra_file:${resolve(targetDir, extra[0])}` });
      continue;
    }

    const missing = [...sourceNames].filter((n) => !targetNames.has(n)).sort();
    if (missing.length > 0) {
      fullMirror.push({ dir: targetDir, ok: false, reason: `missing_file:${missing[0]}` });
      continue;
    }

    let firstFailure = null;
    for (const targetFile of targetFiles) {
      const sourceFile = resolve(sourceDir, targetFile.split("/").pop());
      const lstat = lstatSync(targetFile);
      if (lstat.isSymbolicLink()) {
        firstFailure = { reason: `symlink_detected:${targetFile}`, file: targetFile };
        break;
      }
      const sourceSha = sha256(readFileSync(sourceFile));
      const targetSha = sha256(readFileSync(targetFile));
      if (sourceSha !== targetSha) {
        firstFailure = { reason: `content_mismatch:${targetFile}`, file: targetFile };
        break;
      }
      const sourceStat = statSync(sourceFile);
      const targetStat = statSync(targetFile);
      const devInoMatch = sourceStat.dev === targetStat.dev && sourceStat.ino === targetStat.ino;
      if (!devInoMatch) {
        firstFailure = {
          reason: `not_hard_link:${targetFile}:${targetStat.dev}:${targetStat.ino}`,
          file: targetFile,
        };
        break;
      }
    }

    if (firstFailure) {
      fullMirror.push({ dir: targetDir, ok: false, reason: firstFailure.reason });
    } else {
      fullMirror.push({ dir: targetDir, ok: true });
    }
  }

  const measureOnlyFiles = listMarkdownFiles(measureOnlyDir);
  const sourceMeasureFiles = sourceFiles.filter((p) => MEASURE_ONLY_PATTERN.test(p.split("/").pop()));
  const measureOnlyFileCount = sourceMeasureFiles.length;

  let measureOnly;
  if (measureOnlyFiles.length === 0 && measureOnlyFileCount === 0) {
    measureOnly = {
      dir: measureOnlyDir,
      ok: true,
      fileCount: 0,
      everyMatchesPattern: true,
    };
  } else {
    const measureOnlyNames = new Set(measureOnlyFiles.map((p) => p.split("/").pop()));
    const sourceMeasureNames = new Set(sourceMeasureFiles.map((p) => p.split("/").pop()));
    const everyMatchesPattern = [...measureOnlyNames].every((n) => MEASURE_ONLY_PATTERN.test(n));

    const nonMeasureExtras = [...measureOnlyNames]
      .filter((n) => !MEASURE_ONLY_PATTERN.test(n))
      .sort();
    if (nonMeasureExtras.length > 0) {
      measureOnly = {
        dir: measureOnlyDir,
        ok: false,
        reason: `extra_file:${resolve(measureOnlyDir, nonMeasureExtras[0])}`,
        fileCount: measureOnlyFiles.length,
        everyMatchesPattern: false,
      };
    } else {
      const extra = [...measureOnlyNames].filter((n) => !sourceMeasureNames.has(n)).sort();
      if (extra.length > 0) {
        measureOnly = {
          dir: measureOnlyDir,
          ok: false,
          reason: `extra_file:${resolve(measureOnlyDir, extra[0])}`,
          fileCount: measureOnlyFiles.length,
          everyMatchesPattern,
        };
      } else {
        const missing = [...sourceMeasureNames].filter((n) => !measureOnlyNames.has(n)).sort();
        if (missing.length > 0) {
          measureOnly = {
            dir: measureOnlyDir,
            ok: false,
            reason: `missing_file:${missing[0]}`,
            fileCount: measureOnlyFiles.length,
            everyMatchesPattern,
          };
        } else {
          let firstFailure = null;
          for (const targetFile of measureOnlyFiles) {
            const sourceFile = resolve(sourceDir, targetFile.split("/").pop());
            const lstat = lstatSync(targetFile);
            if (lstat.isSymbolicLink()) {
              firstFailure = { reason: `symlink_detected:${targetFile}` };
              break;
            }
            const sourceSha = sha256(readFileSync(sourceFile));
            const targetSha = sha256(readFileSync(targetFile));
            if (sourceSha !== targetSha) {
              firstFailure = { reason: `content_mismatch:${targetFile}` };
              break;
            }
            const sourceStat = statSync(sourceFile);
            const targetStat = statSync(targetFile);
            const devInoMatch = sourceStat.dev === targetStat.dev && sourceStat.ino === targetStat.ino;
            if (!devInoMatch) {
              firstFailure = { reason: `not_hard_link:${targetFile}:${targetStat.dev}:${targetStat.ino}` };
              break;
            }
          }
          if (firstFailure) {
            measureOnly = {
              dir: measureOnlyDir,
              ok: false,
              reason: firstFailure.reason,
              fileCount: measureOnlyFiles.length,
              everyMatchesPattern,
            };
          } else {
            measureOnly = {
              dir: measureOnlyDir,
              ok: true,
              fileCount: measureOnlyFileCount,
              everyMatchesPattern: true,
            };
          }
        }
      }
    }
  }

  const allFullMirrorOk = fullMirror.every((entry) => entry.ok);
  const ok = allFullMirrorOk && measureOnly.ok === true;

  const result = { ok, sourceDir, fullMirror, measureOnly };
  if (!ok) {
    const firstFailing = fullMirror.find((entry) => !entry.ok);
    if (firstFailing) {
      result.reason = firstFailing.reason;
    } else if (measureOnly.ok === false && measureOnly.reason) {
      result.reason = measureOnly.reason;
    }
  }
  return result;
}

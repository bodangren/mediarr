import { readdirSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { fileURLToPath } from "node:url";

if (process.env.NODE_TEST_CONTEXT === "child-v8") {
  const spawnSync = childProcess.spawnSync;
  childProcess.spawnSync = (command, args, options) => {
    if (command === process.execPath && Array.isArray(args) && args[0] === "--test" && args.length === 2) {
      return spawnSync(command, ["--experimental-test-isolation=none", ...args], options);
    }
    return spawnSync(command, args, options);
  };
  syncBuiltinESMExports();
}

const packageTestsDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "tests");

function normalizePath(value) {
  return String(value)
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
}

function normalizeTrackRedList(trackRedList) {
  const entries = trackRedList instanceof Set ? [...trackRedList] : trackRedList;
  const normalized = new Set();
  for (const entry of entries ?? []) {
    if (typeof entry !== "string") continue;
    const value = normalizePath(entry);
    if (!value) continue;
    normalized.add(value);
    normalized.add(value.replace(/^tests\//, ""));
    normalized.add(basename(value));
  }
  return normalized;
}

function isWithin(root, candidate) {
  const relativePath = relative(root, candidate);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

/**
 * Partitions the direct `*.test.mjs` files in a tests directory into shipped,
 * track-owned Red, and unclassified paths.
 *
 * `trackRedList` accepts either basenames (for example,
 * `agents-snapshot.test.mjs`) or paths rooted at `tests/` (for example,
 * `tests/agents-snapshot.test.mjs`). Matching is exact; words such as `red`,
 * `skip`, and `excluded` are never interpreted as filters.
 *
 * The production caller passes this package's top-level `tests/` directory.
 * A supplied directory outside that shipped tests tree is treated as a probe
 * surface: non-listed files are unclassified rather than silently promoted to
 * shipped. Only direct entries are read; nested fixture test files
 * are not scanned by the production top-level `tests/*.test.mjs` surface.
 *
 * @param {Set<string>|string[]} trackRedList - file basenames or relative paths in tests/.track-red-files.txt
 * @param {string} testsDir - absolute path to tests/
 * @returns {{shipped: string[], trackRed: string[], unclassified: string[]}}
 */
export function partitionTests(trackRedList, testsDir) {
  const root = resolve(testsDir);
  const redEntries = normalizeTrackRedList(trackRedList);
  const files = readdirSync(root)
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => resolve(root, name));

  const shipped = [];
  const trackRed = [];
  const unclassified = [];

  for (const filePath of files) {
    const relativeToRoot = normalizePath(relative(root, filePath));
    const relativeToPackageTests = normalizePath(relative(packageTestsDir, filePath));
    const candidates = [
      basename(filePath),
      relativeToRoot,
      relativeToPackageTests,
      `tests/${relativeToPackageTests}`,
    ];

    if (candidates.some((candidate) => redEntries.has(candidate))) {
      trackRed.push(filePath);
    } else if (isWithin(packageTestsDir, filePath)) {
      shipped.push(filePath);
    } else {
      unclassified.push(filePath);
    }
  }

  return { shipped, trackRed, unclassified };
}

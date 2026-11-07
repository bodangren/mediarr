#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { partitionTests } from "../lib/green-gate.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = resolve(packageRoot, "tests");
const trackRedFile = resolve(packageRoot, "tests/.track-red-files.txt");

const trackRedList = existsSync(trackRedFile)
  ? readFileSync(trackRedFile, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
  : [];
const trackRedSet = new Set(trackRedList);
const { shipped, trackRed, unclassified } = partitionTests(trackRedSet, testsDir);

// `npm run test:shipped` answers shipped-surface health; `npm test` includes active-track Red.
console.log(`[shipped] running ${shipped.length} test files: ${shipped.join(", ")};`);
console.log(`[track-red] excluded ${trackRed.length}: ${trackRed.join(", ")};`);
console.log(`[unclassified] ${unclassified.length}: ${unclassified.join(", ")}`);

if (unclassified.length > 0) {
  console.error(`[unclassified_test_file] ${unclassified.length} unclassified test file(s): ${unclassified.join(", ")}`);
  process.exit(1);
}
if (shipped.length === 0) {
  console.error("[shipped] no shipped test files to run");
  process.exit(1);
}
const result = spawnSync(process.execPath, ["--test", ...shipped], {
  cwd: packageRoot,
  stdio: "inherit",
});
process.exit(result.status ?? 1);

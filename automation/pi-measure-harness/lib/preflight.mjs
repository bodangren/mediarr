// Preflight gate for the S1 versioned harness foundation.
//
// Contract: measure/tracks/controlled_harness_evolution_20260714/test-strategy.md#phase-s1
//
// `runPreflight({manifest, plan, cwd, compatibilityMode?})` returns a
// structured result `{ok, reason?, warnings?}` and never throws. Manifest
// drift, missing references, and grammar-policy violations are surfaced as
// stable `reason` codes; legacy `[ ]` markers are accepted under
// `compatibilityMode: true` with a deterministic warning.
//
// `formatPreflightError(reason)` produces a deterministic, time-free
// string suitable for operator-facing diagnostics.

import { readFileSync } from "node:fs";

import { parseTaskLine } from "./grammar.mjs";
import { loadManifest } from "./manifest.mjs";

/** Matches a task line (e.g. `- [x] ...`, `- [~] ...`, `- [b] ...`, `- [ ] ...`). */
const TASK_LINE_REGEX = /^\s*-\s\[/;

/** Matches a legacy `[ ]` (deprecated pending) marker. */
const LEGACY_PENDING_REGEX = /^\s*-\s\[\s\]/;

/**
 * Runs the preflight gate. Returns a structured result and never throws:
 * the manifest loader's errors are surfaced as `result.reason`.
 *
 * @param {{manifest: string, plan: string, cwd?: string, compatibilityMode?: boolean}} input
 * @returns {{ok: boolean, reason?: string, warnings?: string[]}}
 */
export function runPreflight(input) {
  const { manifest, plan, cwd, compatibilityMode = false } = input ?? {};

  let manifestData;
  try {
    manifestData = loadManifest(manifest, cwd ? { cwd } : {});
  } catch (error) {
    const reason = String(error?.message ?? error);
    return { ok: false, reason };
  }

  const planContent = readFileSync(plan, "utf8");
  const taskLines = planContent.split("\n").filter((line) => TASK_LINE_REGEX.test(line));

  const legacyLines = taskLines.filter((line) => LEGACY_PENDING_REGEX.test(line));
  if (legacyLines.length > 0) {
    if (!compatibilityMode) {
      return { ok: false, reason: "marker_grammar:legacy_in_active_run" };
    }
    return { ok: true, warnings: ["marker_grammar:legacy_accepted"] };
  }

  const hasValidCompletion = taskLines.some((line) => {
    const parsed = parseTaskLine(line);
    if (parsed.status !== "x") return false;
    if (typeof parsed.evidence !== "string") return false;
    return /^sha:[0-9a-f]{7,40}$/.test(parsed.evidence);
  });
  if (!hasValidCompletion) {
    return { ok: false, reason: "no_completed_tasks" };
  }

  return { ok: true, reason: undefined, manifest: manifestData };
}

/**
 * Formats a preflight reason into a stable, time-free, deterministic
 * operator-facing string. The same reason always produces the same output.
 */
export function formatPreflightError(reason) {
  return `preflight error: ${String(reason ?? "unknown")}`;
}

// Marker grammar for the S1 versioned harness foundation.
//
// Contract: measure/tracks/controlled_harness_evolution_20260714/test-strategy.md#phase-s1
//
// - `CANONICAL_REGEX` matches the three canonical markers `[x]`, `[~]`, `[b]`
//   (with their optional trailing ` (sha:<hex>)` and ` (deferred:<owner>)`
//   evidence fields) and rejects the deprecated `[ ]` legacy marker.
// - `isTaskStructurallyBlocked(line)` returns true ONLY for `[b]` lines that
//   carry a trailing `(deferred:<owner>)` field.
// - `classifyMarker(marker)` returns a structured `{status, note}` shape.
//   The legacy `[ ]` marker reclassifies to `{status: "b", note: "unmigrated"}`.
// - `parseTaskLine(line)` returns `{status, evidence, ...}` deterministically
//   and distinguishes `sha:<hex>` from `missing_sha` for `[x]` lines.
//
// The user-authorized `[ ]` = pending compatibility is preserved by callers
// (`measure/workflow.md`); this module surfaces only the rule and the
// reclassification signal, not the live plan's markers.

export const CANONICAL_REGEX = /^-\s\[([x~b])\]\s(.+?)(?:\s\(sha:[0-9a-f]{7,40}\))?(?:\s\(deferred:[A-Za-z0-9_.-]+\))?$/;

const LEGACY_PENDING_REGEX = /^-\s\[\s\]\s/;
const DEFERRED_FIELD_REGEX = /\(deferred:([A-Za-z0-9_.-]+)\)/;
const SHA_PAREN_REGEX = /\(sha:([0-9a-f]{7,40})\)/;
const BARE_SHA_TAIL_REGEX = /\b([0-9a-f]{7,40})\s*$/;

/**
 * Returns true only for `[b]` lines that carry a trailing
 * `(deferred:<owner>)` field. Other markers (including bare `[b]` without
 * the deferred field) return false.
 */
export function isTaskStructurallyBlocked(taskLine) {
  if (typeof taskLine !== "string") return false;
  if (!/^\-\s\[b\]/.test(taskLine)) return false;
  return DEFERRED_FIELD_REGEX.test(taskLine);
}

/**
 * Classifies a marker token (e.g. `"[x] Done"`, `"[ ] pending"`) into a
 * structured `{status, note}` shape. The legacy `[ ]` marker reclassifies
 * to `{status: "b", note: "unmigrated"}` to surface the migration gap.
 */
export function classifyMarker(marker) {
  if (typeof marker !== "string") return { status: undefined, note: "unknown" };
  const head = marker.match(/^\[(\s|x|~|b)\]/);
  if (!head) return { status: undefined, note: "unknown" };
  const char = head[1];
  if (char === " ") return { status: "b", note: "unmigrated" };
  if (char === "x") return { status: "x", note: "complete" };
  if (char === "~") return { status: "~", note: "in_progress" };
  if (char === "b") return { status: "b", note: "human_gated" };
  return { status: undefined, note: "unknown" };
}

/**
 * Parses a single task line into a structured result.
 *
 * Returns `{status, evidence, ...}` deterministically. The function is pure:
 * identical input yields identical output across repeated calls (no time,
 * no random).
 *
 * Special cases:
 * - `[ ]` lines reclassify to `{status: "b", evidence: "unmigrated"}`.
 * - `[x]` lines with no SHA evidence return `{status: "x", evidence: "missing_sha"}`.
 * - `[x]` lines with a `(sha:<hex>)` parens field or a bare 7-40 hex at the
 *   end of the line return `{status: "x", evidence: "sha:<hex>"}`.
 * - `[b]` lines with a `(deferred:<owner>)` field return
 *   `{status: "b", evidence: "deferred:<owner>", owner: "<owner>"}`.
 * - `[~]` lines return `{status: "~", evidence: undefined}`.
 */
export function parseTaskLine(line) {
  if (typeof line !== "string") {
    return { status: undefined, evidence: undefined, rawLine: String(line ?? "") };
  }

  if (LEGACY_PENDING_REGEX.test(line)) {
    return { status: "b", evidence: "unmigrated", rawLine: line };
  }

  const match = CANONICAL_REGEX.exec(line);
  if (!match) {
    return { status: undefined, evidence: undefined, rawLine: line };
  }

  const status = match[1];

  if (status === "x") {
    const paren = SHA_PAREN_REGEX.exec(line);
    if (paren) {
      return { status: "x", evidence: `sha:${paren[1]}`, rawLine: line };
    }
    const tail = BARE_SHA_TAIL_REGEX.exec(line);
    if (tail) {
      return { status: "x", evidence: `sha:${tail[1]}`, rawLine: line };
    }
    return { status: "x", evidence: "missing_sha", rawLine: line };
  }

  if (status === "b") {
    const def = DEFERRED_FIELD_REGEX.exec(line);
    if (def) {
      return { status: "b", evidence: `deferred:${def[1]}`, owner: def[1], rawLine: line };
    }
    return { status: "b", evidence: undefined, rawLine: line };
  }

  if (status === "~") {
    return { status: "~", evidence: undefined, rawLine: line };
  }

  return { status: undefined, evidence: undefined, rawLine: line };
}

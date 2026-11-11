/**
 * Adult retention decisions (track feature_adult_retention_keep_delete_20261111, Phase 1).
 *
 * After watching an adult item the owner records exactly one durable answer: keep or delete.
 * The decision rules are pure so the route can stay a thin orchestrator and the interesting
 * cases (repeat answers, explicit keep→delete, forbidden delete→keep) are unit-testable without
 * a database, a filesystem or Fastify.
 *
 * Deletion itself is not implemented here: the route reuses the quarantine engine
 * (`planQuarantine` → `executeQuarantine` → `deleteQuarantined`) so a mistake is still a move
 * followed by an explicit purge, never an unlink in the media tree.
 */

/** Append-only decision ledger. Overridable in tests; the default is the owner-facing path. */
export const ADULT_RETENTION_RECEIPT_PATH = '/config/adult-retention-receipts.jsonl';

export type AdultRetentionDecision = 'keep' | 'delete';

/** What actually happened to the item: kept, fully deleted, or the delete attempt failed. */
export type AdultRetentionOutcome = 'kept' | 'deleted' | 'failed';

export interface AdultRetentionReceipt {
  /** ISO timestamp of the decision. */
  at: string;
  itemId: number;
  path: string;
  decision: AdultRetentionDecision;
  result: AdultRetentionOutcome;
}

export interface AdultRetentionReceiptInput {
  at: Date;
  itemId: number;
  path: string;
  decision: AdultRetentionDecision;
  result: AdultRetentionOutcome;
}

/** Current durable state of an item, as far as the decision rules are concerned. */
export interface AdultRetentionState {
  /** False when the `AdultItem` row no longer exists. */
  exists: boolean;
  /**
   * True when a completed delete decision removed the row. The tombstone is the DELETED
   * `QuarantineEntry` row, so a repeat delete is a no-op even after a server restart.
   */
  deleted: boolean;
  keep: boolean;
  decidedAt: Date | null;
}

export type AdultRetentionVerdict =
  | { outcome: 'apply'; decision: AdultRetentionDecision }
  | { outcome: 'already-decided'; decision: AdultRetentionDecision; kept: boolean; deleted: boolean }
  | {
      outcome: 'rejected';
      code: 'INVALID_DECISION' | 'DECISION_CONFLICT' | 'NOT_FOUND';
      message: string;
    };

/** Normalises the request body's `decision`; anything but keep/delete is rejected. */
export function parseAdultRetentionDecision(raw: unknown): AdultRetentionDecision | null {
  if (typeof raw !== 'string') return null;
  const normalised = raw.trim().toLowerCase();
  if (normalised === 'keep' || normalised === 'delete') return normalised;
  return null;
}

/**
 * Decides whether a request applies, is a repeat of the same answer, or is refused.
 *
 * Rules (spec FR-4):
 * - an undecided item accepts either answer;
 * - repeating the recorded answer is `already-decided` (idempotent, no second quarantine);
 * - keep → delete is allowed: the owner changed their mind explicitly;
 * - delete → keep is refused: the file was purged, so there is nothing to keep.
 */
export function evaluateAdultRetentionDecision(
  rawDecision: unknown,
  state: AdultRetentionState,
): AdultRetentionVerdict {
  const decision = parseAdultRetentionDecision(rawDecision);
  if (decision === null) {
    return {
      outcome: 'rejected',
      code: 'INVALID_DECISION',
      message: 'decision must be "keep" or "delete"',
    };
  }

  if (state.deleted) {
    if (decision === 'delete') {
      return { outcome: 'already-decided', decision, kept: false, deleted: true };
    }
    return {
      outcome: 'rejected',
      code: 'DECISION_CONFLICT',
      message: 'this item was already deleted after a delete decision; it cannot be kept',
    };
  }

  if (!state.exists) {
    return { outcome: 'rejected', code: 'NOT_FOUND', message: 'Adult item not found' };
  }

  if (state.decidedAt !== null) {
    if (state.keep && decision === 'keep') {
      return { outcome: 'already-decided', decision, kept: true, deleted: false };
    }
    if (state.keep && decision === 'delete') {
      return { outcome: 'apply', decision };
    }
    // A decided-delete row that is still present means an interrupted purge. Retrying delete is
    // safe and idempotent; keeping it is not, because the file already left the media tree.
    if (decision === 'delete') {
      return { outcome: 'already-decided', decision, kept: false, deleted: true };
    }
    return {
      outcome: 'rejected',
      code: 'DECISION_CONFLICT',
      message: 'this item was already decided for deletion; it cannot be kept',
    };
  }

  return { outcome: 'apply', decision };
}

export function buildAdultRetentionReceipt(input: AdultRetentionReceiptInput): AdultRetentionReceipt {
  return {
    at: input.at.toISOString(),
    itemId: input.itemId,
    path: input.path,
    decision: input.decision,
    result: input.result,
  };
}

/** One JSON object, no newline: the caller appends exactly one line per applied decision. */
export function serialiseAdultRetentionReceipt(receipt: AdultRetentionReceipt): string {
  return JSON.stringify(receipt);
}

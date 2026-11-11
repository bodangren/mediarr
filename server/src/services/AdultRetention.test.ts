import { describe, expect, it } from 'vitest';
import {
  buildAdultRetentionReceipt,
  evaluateAdultRetentionDecision,
  parseAdultRetentionDecision,
  serialiseAdultRetentionReceipt,
  type AdultRetentionState,
} from './AdultRetention';

function state(overrides: Partial<AdultRetentionState> = {}): AdultRetentionState {
  return { exists: true, deleted: false, keep: false, decidedAt: null, ...overrides };
}

describe('parseAdultRetentionDecision', () => {
  it('accepts keep and delete, case-insensitively', () => {
    expect(parseAdultRetentionDecision('keep')).toBe('keep');
    expect(parseAdultRetentionDecision('delete')).toBe('delete');
    expect(parseAdultRetentionDecision(' KEEP ')).toBe('keep');
    expect(parseAdultRetentionDecision('Delete')).toBe('delete');
  });

  it('rejects anything else', () => {
    for (const raw of ['', 'archive', 'both', null, undefined, 7, {}, ['keep']]) {
      expect(parseAdultRetentionDecision(raw)).toBeNull();
    }
  });
});

describe('evaluateAdultRetentionDecision', () => {
  it('applies an explicit keep on a watched, undecided item', () => {
    expect(evaluateAdultRetentionDecision('keep', state())).toEqual({ outcome: 'apply', decision: 'keep' });
  });

  it('applies an explicit delete on a watched, undecided item', () => {
    expect(evaluateAdultRetentionDecision('delete', state())).toEqual({ outcome: 'apply', decision: 'delete' });
  });

  it('reports already-decided when keep is repeated', () => {
    const decidedAt = new Date('2026-11-11T10:00:00.000Z');
    expect(evaluateAdultRetentionDecision('keep', state({ keep: true, decidedAt }))).toEqual({
      outcome: 'already-decided',
      decision: 'keep',
      kept: true,
      deleted: false,
    });
  });

  it('allows changing keep -> delete explicitly', () => {
    const decidedAt = new Date('2026-11-11T10:00:00.000Z');
    expect(evaluateAdultRetentionDecision('delete', state({ keep: true, decidedAt }))).toEqual({
      outcome: 'apply',
      decision: 'delete',
    });
  });

  it('refuses delete -> keep for an item already removed by a delete decision', () => {
    const verdict = evaluateAdultRetentionDecision('keep', state({ exists: false, deleted: true }));
    expect(verdict.outcome).toBe('rejected');
    if (verdict.outcome === 'rejected') {
      expect(verdict.code).toBe('DECISION_CONFLICT');
    }
  });

  it('reports already-decided when delete is repeated after the row was removed', () => {
    expect(evaluateAdultRetentionDecision('delete', state({ exists: false, deleted: true }))).toEqual({
      outcome: 'already-decided',
      decision: 'delete',
      kept: false,
      deleted: true,
    });
  });

  it('reports already-decided when delete is repeated while a decided delete row remains', () => {
    const decidedAt = new Date('2026-11-11T10:00:00.000Z');
    expect(evaluateAdultRetentionDecision('delete', state({ keep: false, decidedAt }))).toEqual({
      outcome: 'already-decided',
      decision: 'delete',
      kept: false,
      deleted: true,
    });
    expect(evaluateAdultRetentionDecision('keep', state({ keep: false, decidedAt })).outcome).toBe('rejected');
  });

  it('rejects unknown items and unknown decisions', () => {
    expect(evaluateAdultRetentionDecision('keep', state({ exists: false }))).toMatchObject({
      outcome: 'rejected',
      code: 'NOT_FOUND',
    });
    expect(evaluateAdultRetentionDecision('maybe', state())).toMatchObject({
      outcome: 'rejected',
      code: 'INVALID_DECISION',
    });
  });
});

describe('receipt line', () => {
  it('has the append-only JSONL shape the run report reads back', () => {
    const receipt = buildAdultRetentionReceipt({
      at: new Date('2026-11-11T10:00:00.000Z'),
      itemId: 7,
      path: '/data/Adult/example.mp4',
      decision: 'delete',
      result: 'deleted',
    });

    expect(receipt).toEqual({
      at: '2026-11-11T10:00:00.000Z',
      itemId: 7,
      path: '/data/Adult/example.mp4',
      decision: 'delete',
      result: 'deleted',
    });
    const line = serialiseAdultRetentionReceipt(receipt);
    expect(line).not.toContain('\n');
    expect(JSON.parse(line)).toEqual(receipt);
  });
});

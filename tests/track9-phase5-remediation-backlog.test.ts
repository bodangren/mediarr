import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveTrack9ArtifactPath, resolveTrack9Root } from './helpers/track9Paths';

type RemediationItem = {
  id: string;
  findingIds: string[];
  ownerTrack: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  prerequisites: string[];
  verificationExitCriteria: string[];
};

type HardeningGate = {
  gateId: string;
  blockedByFindingIds: string[];
  policy: string;
};

type RemediationBacklog = {
  generatedAt: string;
  items: RemediationItem[];
  hardeningGates: HardeningGate[];
};

const trackRoot = resolveTrack9Root();

const parityMatrixPath = resolveTrack9ArtifactPath('parity-matrix.json');
const remediationPath = resolveTrack9ArtifactPath('remediation-backlog.json');

function readParityMatrix(): { entries: Array<{ id: string; severity: string }> } {
  return JSON.parse(fs.readFileSync(parityMatrixPath, 'utf8')) as { entries: Array<{ id: string; severity: string }> };
}

function readBacklog(): RemediationBacklog {
  return JSON.parse(fs.readFileSync(remediationPath, 'utf8')) as RemediationBacklog;
}

describe('Track 9 Phase 5 remediation backlog', () => {
  it('enforces remediation backlog schema requirements', () => {
    expect(fs.existsSync(remediationPath)).toBe(true);
    const backlog = readBacklog();

    for (const item of backlog.items) {
      expect(item.ownerTrack.trim().length).toBeGreaterThan(0);
      expect(item.prerequisites.length).toBeGreaterThan(0);
      expect(item.verificationExitCriteria.length).toBeGreaterThan(0);
    }
  });

  it('maps every P0/P1 finding to explicit remediation action', () => {
    const matrix = readParityMatrix();
    const backlog = readBacklog();

    const highSeverityIds = matrix.entries
      .filter(entry => entry.severity === 'P0' || entry.severity === 'P1')
      .map(entry => entry.id);

    const covered = new Set(backlog.items.flatMap(item => item.findingIds));

    for (const findingId of highSeverityIds) {
      expect(covered.has(findingId), `Missing remediation item for ${findingId}`).toBe(true);
    }
  });

  it('links hardening gates to unresolved parity blockers', () => {
    const matrix = readParityMatrix();
    const backlog = readBacklog();

    const unresolvedBlockers = matrix.entries
      .filter(entry => (entry.severity === 'P0' || entry.severity === 'P1'))
      .map(entry => entry.id);

    const referencedByGates = new Set(backlog.hardeningGates.flatMap(gate => gate.blockedByFindingIds));

    for (const blockerId of unresolvedBlockers) {
      expect(referencedByGates.has(blockerId), `Missing hardening gate linkage for ${blockerId}`).toBe(true);
    }
  });
});

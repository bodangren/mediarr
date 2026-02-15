import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveTrack9ArtifactPath } from './helpers/track9Paths';

type ConfidenceLevel = 'high' | 'medium' | 'low';

type ParityMatrixEntry = {
  domain: string;
  capability: string;
  status: string;
  severity: string;
  evidence: {
    codePaths: string[];
    tests: string[];
    runtimeVerification: string[];
  };
  verificationNotes: string;
  confidence: {
    level: ConfidenceLevel;
    rationale: string;
  };
};

type ParityMatrixDocument = {
  statusClasses: string[];
  entries: ParityMatrixEntry[];
};

const parityMatrixPath = resolveTrack9ArtifactPath('parity-matrix.json');

function readParityMatrix(): ParityMatrixDocument {
  const source = fs.readFileSync(parityMatrixPath, 'utf8');
  return JSON.parse(source) as ParityMatrixDocument;
}

describe('Track 9 Phase 1 parity matrix schema', () => {
  it('defines the required parity status classes', () => {
    expect(fs.existsSync(parityMatrixPath)).toBe(true);
    const matrix = readParityMatrix();

    expect(matrix.statusClasses).toEqual(
      expect.arrayContaining([
        'PARITY_IMPLEMENTED',
        'PARTIAL_IMPLEMENTATION',
        'SCAFFOLDED_ONLY',
        'PLACEHOLDER_ONLY',
        'MISSING',
        'REGRESSION',
      ]),
    );
  });

  it('requires each matrix entry core fields and evidence references', () => {
    const matrix = readParityMatrix();

    for (const entry of matrix.entries) {
      expect(entry.domain).toBeTypeOf('string');
      expect(entry.capability).toBeTypeOf('string');
      expect(entry.status).toBeTypeOf('string');
      expect(entry.severity).toBeTypeOf('string');
      expect(entry.verificationNotes).toBeTypeOf('string');
      expect(entry.evidence.codePaths.length).toBeGreaterThan(0);
      expect(entry.evidence.tests.length).toBeGreaterThan(0);
      expect(entry.evidence.runtimeVerification.length).toBeGreaterThan(0);
    }
  });

  it('requires explicit confidence level and rationale per finding', () => {
    const matrix = readParityMatrix();

    for (const entry of matrix.entries) {
      expect(['high', 'medium', 'low']).toContain(entry.confidence.level);
      expect(entry.confidence.rationale.trim().length).toBeGreaterThan(0);
    }
  });
});

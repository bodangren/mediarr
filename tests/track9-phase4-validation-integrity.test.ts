import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type SurfaceMetric = {
  surface: string;
  mockedTests: number;
  nonMockedTests: number;
  mockRatio: number;
};

type CriticalFlowCoverage = {
  flowId: string;
  hasNonMockedPath: boolean;
  requiredVerificationClasses: string[];
};

type ValidationIntegrityReport = {
  generatedAt: string;
  surfaceMetrics: SurfaceMetric[];
  criticalFlowCoverage: CriticalFlowCoverage[];
  parityClaimPolicy: {
    requires: string[];
  };
};

const reportPath = path.join(
  process.cwd(),
  'conductor',
  'tracks',
  'clone_parity_gap_investigation_20260212',
  'artifacts',
  'validation-integrity-report.json',
);

function readReport(): ValidationIntegrityReport {
  return JSON.parse(fs.readFileSync(reportPath, 'utf8')) as ValidationIntegrityReport;
}

describe('Track 9 Phase 4 validation integrity', () => {
  it('computes mock dependence metrics per surface', () => {
    expect(fs.existsSync(reportPath)).toBe(true);
    const report = readReport();

    const indexers = report.surfaceMetrics.find(entry => entry.surface === 'indexers');
    expect(indexers).toBeDefined();
    expect(indexers!.mockRatio).toBeGreaterThanOrEqual(0);
    expect(indexers!.mockRatio).toBeLessThanOrEqual(1);
  });

  it('requires at least one non-mocked verification path per clone-critical flow', () => {
    const report = readReport();
    for (const flow of report.criticalFlowCoverage) {
      expect(flow.hasNonMockedPath).toBe(true);
    }
  });

  it('enforces parity claim policy requiring runtime-capable verification classes', () => {
    const report = readReport();
    expect(report.parityClaimPolicy.requires).toEqual(
      expect.arrayContaining(['unit', 'contract', 'integration_or_runtime']),
    );
  });
});

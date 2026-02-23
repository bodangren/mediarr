export type ConformanceCaseStatus = 'pass' | 'fail';

export interface ConformanceCaseResult {
  status: ConformanceCaseStatus;
  reason?: string;
}

export interface ConformanceCase {
  id: string;
  definitionId: string;
  featureArea: string;
  execute: () => Promise<ConformanceCaseResult>;
}

interface ConformanceBucket {
  total: number;
  passed: number;
  failed: number;
}

interface ExecutedConformanceCase extends ConformanceCaseResult {
  id: string;
  definitionId: string;
  featureArea: string;
}

export interface ConformanceHarnessReport {
  total: number;
  passed: number;
  failed: number;
  byFeatureArea: Record<string, ConformanceBucket>;
  byDefinitionId: Record<string, ConformanceBucket>;
  cases: ExecutedConformanceCase[];
}

function upsertBucket(
  buckets: Record<string, ConformanceBucket>,
  key: string,
  status: ConformanceCaseStatus,
): void {
  if (!buckets[key]) {
    buckets[key] = { total: 0, passed: 0, failed: 0 };
  }

  const bucket = buckets[key];
  bucket.total += 1;
  if (status === 'pass') {
    bucket.passed += 1;
  } else {
    bucket.failed += 1;
  }
}

export async function runConformanceHarness(cases: ConformanceCase[]): Promise<ConformanceHarnessReport> {
  const report: ConformanceHarnessReport = {
    total: 0,
    passed: 0,
    failed: 0,
    byFeatureArea: {},
    byDefinitionId: {},
    cases: [],
  };

  for (const testCase of cases) {
    const result = await testCase.execute();

    report.total += 1;
    if (result.status === 'pass') {
      report.passed += 1;
    } else {
      report.failed += 1;
    }

    upsertBucket(report.byFeatureArea, testCase.featureArea, result.status);
    upsertBucket(report.byDefinitionId, testCase.definitionId, result.status);
    report.cases.push({
      id: testCase.id,
      definitionId: testCase.definitionId,
      featureArea: testCase.featureArea,
      status: result.status,
      reason: result.reason,
    });
  }

  return report;
}

export function formatConformanceSummary(report: ConformanceHarnessReport): string {
  const lines: string[] = [];
  lines.push(
    `CARDIGANN_CONFORMANCE_SUMMARY total=${report.total} passed=${report.passed} failed=${report.failed}`,
  );

  for (const [featureArea, bucket] of Object.entries(report.byFeatureArea)) {
    lines.push(
      `FEATURE area=${featureArea} total=${bucket.total} passed=${bucket.passed} failed=${bucket.failed}`,
    );
  }

  for (const [definitionId, bucket] of Object.entries(report.byDefinitionId)) {
    lines.push(
      `DEFINITION id=${definitionId} total=${bucket.total} passed=${bucket.passed} failed=${bucket.failed}`,
    );
  }

  for (const testCase of report.cases) {
    if (testCase.status === 'fail') {
      const reason = testCase.reason ?? 'unknown';
      lines.push(
        `FAIL case=${testCase.id} definition=${testCase.definitionId} area=${testCase.featureArea} reason="${reason}"`,
      );
    }
  }

  return lines.join('\n');
}

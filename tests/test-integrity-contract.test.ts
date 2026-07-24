import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPOSITORY_ROOT = process.cwd();
const TEST_ROOTS = ['server/src', 'tests'] as const;
const TEST_FILE_PATTERN = /\.(?:test|spec)\.(?:[cm]?js|tsx?)$/;

function collectTestFiles(relativeRoot: string): string[] {
  const absoluteRoot = path.join(REPOSITORY_ROOT, relativeRoot);
  const entries = fs.readdirSync(absoluteRoot, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const relativePath = path.join(relativeRoot, entry.name);
    if (entry.isDirectory()) {
      return collectTestFiles(relativePath);
    }
    return TEST_FILE_PATTERN.test(entry.name) ? [relativePath] : [];
  });
}

function findDirectSelfAssertions(source: string): string[] {
  const selfAssertion = /expect\(\s*([A-Za-z_$][\w.$]*)\s*\)\.toBe\(\s*\1\s*\)/g;
  return [...source.matchAll(selfAssertion)].map((match) => match[0]);
}

describe('server test integrity contract', () => {
  const testFiles = TEST_ROOTS.flatMap(collectTestFiles).sort();

  it('recursively audits nested server and root test suites', () => {
    expect(testFiles.length).toBeGreaterThan(250);
    expect(testFiles).toContain('server/src/api/routes/torrentRoutes.test.ts');
    expect(testFiles).toContain('tests/test-integrity-contract.test.ts');
  });

  it('rejects permissive status assertions and direct self-assertions', () => {
    const permissiveLowerBound = ['toBeGreaterThanOrEqual', '(400)'].join('');
    const statusAlternatives = ['expect([200, ', '403, 404])', '.toContain('].join('');
    const violations = testFiles.flatMap((file) => {
      const source = fs.readFileSync(path.join(REPOSITORY_ROOT, file), 'utf8');
      const findings: string[] = [];
      if (source.includes(permissiveLowerBound)) findings.push(permissiveLowerBound);
      if (source.includes(statusAlternatives)) findings.push(statusAlternatives);
      findings.push(...findDirectSelfAssertions(source));
      return findings.map((finding) => `${file}: ${finding}`);
    });

    expect(violations).toEqual([]);
  });

  it('requires mock-bound pipeline tests to be labeled as orchestration units', () => {
    const mislabeled = testFiles.filter((file) => {
      if (!path.basename(file).startsWith('pipeline.integration.')) return false;
      const source = fs.readFileSync(path.join(REPOSITORY_ROOT, file), 'utf8');
      return /vi\.mock\(|mockResolvedValue|mockReturnValue/.test(source);
    });

    const orchestrationFiles = testFiles.filter((file) =>
      path.basename(file).startsWith('pipeline.orchestration.'),
    );
    const missingLabels = orchestrationFiles.filter((file) =>
      !fs.readFileSync(path.join(REPOSITORY_ROOT, file), 'utf8').includes(
        'Orchestration Unit Tests',
      ),
    );

    expect(mislabeled).toEqual([]);
    expect(orchestrationFiles).toHaveLength(5);
    expect(missingLabels).toEqual([]);
  });
});

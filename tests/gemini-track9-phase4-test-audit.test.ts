import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const TESTS_ROOT = path.join(process.cwd(), 'tests');

function countMocks(filePath: string): number {
  const content = fs.readFileSync(filePath, 'utf8');
  const mockMatches = content.match(/vi\.mock\(|mockResolvedValue|mockReturnValue|spyOn\(/g);
  return mockMatches ? mockMatches.length : 0;
}

function countTests(filePath: string): number {
  const content = fs.readFileSync(filePath, 'utf8');
  const testMatches = content.match(/it\(|test\(/g);
  return testMatches ? testMatches.length : 0;
}

describe('Track 9 Phase 4 Test Integrity Audit (Gemini)', () => {
  it('AUDIT: Quantify mock usage in tests', () => {
    const files = fs.readdirSync(TESTS_ROOT).filter(f => f.endsWith('.test.js') || f.endsWith('.test.ts'));
    
    const stats = files.map(file => {
      const filePath = path.join(TESTS_ROOT, file);
      const mocks = countMocks(filePath);
      const tests = countTests(filePath);
      return { file, mocks, tests, ratio: tests > 0 ? mocks / tests : 0 };
    });

    // We can log this output for the report
    console.log('Test Integrity Stats:', JSON.stringify(stats, null, 2));

    // Heuristic: Warn if high mock usage in critical areas
    const highMockFiles = stats.filter(s => s.ratio > 1 && s.tests > 0);
    // Expect that some tests are heavily mocked (unit tests), but we want to know WHICH ones.
    // This test passes, but the side effect (log) helps build the report.
    expect(files.length).toBeGreaterThan(0);
  });
});

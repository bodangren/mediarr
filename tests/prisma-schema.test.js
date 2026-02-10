import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('Prisma Schema', () => {
  it('should be a valid schema', { timeout: 15000 }, () => {
    const result = execSync('npx prisma validate', {
      encoding: 'utf8',
      cwd: process.cwd(),
    });
    expect(result).toContain('is valid');
  });
});

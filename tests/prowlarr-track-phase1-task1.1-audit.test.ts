import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('prowlarr track phase 1 task 1.1 audit artifact', () => {
  const artifactPath = join(
    process.cwd(),
    'conductor',
    'tracks',
    'prowlarr_ui_cloning_20260214',
    'artifacts',
    'phase1-task1.1-tech-stack-audit.md',
  );

  it('creates a tech stack audit document with required verification sections', () => {
    expect(existsSync(artifactPath)).toBe(true);

    const markdown = readFileSync(artifactPath, 'utf8');
    expect(markdown).toContain('## Next.js + App Router');
    expect(markdown).toContain('## TypeScript Configuration');
    expect(markdown).toContain('## Tailwind CSS Setup');
    expect(markdown).toContain('## Infrastructure Gaps');
  });
});

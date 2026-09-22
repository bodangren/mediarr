import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const referenceDir = path.join(__dirname, '..', 'reference');

// The reference clones are optional, gitignored environment fixtures
// (see track foundation "add reference gathering task"). Skip, not fail,
// when the fixture directory is absent.
describe.skipIf(!fs.existsSync(referenceDir))('Reference Repositories', () => {
  const requiredRepos = ['sonarr', 'radarr', 'bazarr', 'prowlarr'];

  it.each(requiredRepos)('should have reference/%s repository cloned', (repo) => {
    const gitDir = path.join(__dirname, '..', 'reference', repo, '.git');
    expect(fs.existsSync(gitDir), `Missing reference/${repo}`).toBe(true);
  });
});

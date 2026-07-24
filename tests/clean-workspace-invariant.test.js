import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dockerfile = fs.readFileSync(path.join(REPO_ROOT, 'Dockerfile'), 'utf8');
const rootPackage = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'),
);
const lockfile = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'package-lock.json'), 'utf8'),
);

function instructionIndex(pattern) {
  const match = pattern.exec(dockerfile);
  return match?.index ?? -1;
}

describe('clean Docker workspace installation', () => {
  it('locks both declared workspaces in package-lock.json', () => {
    expect(rootPackage.workspaces).toEqual(['app', 'server']);
    expect(lockfile.lockfileVersion).toBe(3);
    expect(lockfile.packages[''].workspaces).toEqual(['app', 'server']);
    expect(lockfile.packages.app).toBeDefined();
    expect(lockfile.packages.server).toBeDefined();
  });

  it('copies every dependency manifest before the single frozen install', () => {
    const rootManifest = instructionIndex(
      /^COPY package\.json package-lock\.json \.\/$/m,
    );
    const appManifest = instructionIndex(
      /^COPY app\/package\.json \.\/app\/package\.json$/m,
    );
    const serverManifest = instructionIndex(
      /^COPY server\/package\.json \.\/server\/package\.json$/m,
    );
    const install = instructionIndex(
      /^RUN npm ci --workspaces --include-workspace-root$/m,
    );
    const source = instructionIndex(/^COPY \. \.$/m);
    const build = instructionIndex(/^RUN npm run build --workspace=app$/m);

    expect(rootManifest).toBeGreaterThan(-1);
    expect(appManifest).toBeGreaterThan(rootManifest);
    expect(serverManifest).toBeGreaterThan(appManifest);
    expect(install).toBeGreaterThan(serverManifest);
    expect(source).toBeGreaterThan(install);
    expect(build).toBeGreaterThan(source);
  });

  it('uses exactly one frozen install and never mutates the lockfile in-image', () => {
    const installs = dockerfile.match(/RUN npm (?:ci|install)[^\n]*/g) ?? [];

    expect(installs).toEqual([
      'RUN npm ci --workspaces --include-workspace-root',
    ]);
    expect(dockerfile).not.toMatch(/npm install|--package-lock-only/);
  });
});

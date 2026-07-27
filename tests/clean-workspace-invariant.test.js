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

  it('copies manifests, postinstall, and source before the combined install and build', () => {
    const rootManifest = instructionIndex(
      /^COPY package\.json package-lock\.json \.\/$/m,
    );
    const appManifest = instructionIndex(
      /^COPY app\/package\.json \.\/app\/package\.json$/m,
    );
    const serverManifest = instructionIndex(
      /^COPY server\/package\.json \.\/server\/package\.json$/m,
    );
    const postinstallScript = instructionIndex(
      /^COPY scripts\/apply-patches\.js \.\/scripts\/apply-patches\.js$/m,
    );
    const source = instructionIndex(/^COPY \. \.$/m);
    const install = instructionIndex(
      /^RUN npm ci --workspaces --include-workspace-root$/m,
    );

    expect(rootManifest).toBeGreaterThan(-1);
    expect(appManifest).toBeGreaterThan(rootManifest);
    expect(serverManifest).toBeGreaterThan(appManifest);
    expect(postinstallScript).toBeGreaterThan(serverManifest);
    expect(source).toBeGreaterThan(postinstallScript);
    expect(install).toBeGreaterThan(source);
  });

  // Regression guard for the Phase 6 clean-image defect. Combining the frozen
  // install and the SPA build into one RUN layer reproducibly fails with
  // `Rollup failed to resolve import "<dep>" from "/app/app/..."` even though
  // the dependency is present at /app/node_modules. Committing the install as
  // its own layer is what makes Vite's resolution independent of the overlay
  // filesystem's write visibility. Asserted structurally so the guard costs
  // milliseconds instead of a multi-minute image build; the live no-cache build
  // in clean-workspace-build.test.js is the end-to-end acceptance gate.
  it('runs the frozen install and the SPA build in separate layers', () => {
    const frozenInstalls = dockerfile.match(
      /npm ci --workspaces --include-workspace-root/g,
    ) ?? [];
    const appBuilds = dockerfile.match(/npm run build --workspace=app/g) ?? [];
    const npmRuns = dockerfile.match(/^RUN npm [^\n]*/gm) ?? [];

    expect(frozenInstalls).toHaveLength(1);
    expect(appBuilds).toHaveLength(1);
    expect(npmRuns).toEqual([
      'RUN npm ci --workspaces --include-workspace-root',
      'RUN npm run build --workspace=app',
    ]);

    const install = instructionIndex(
      /^RUN npm ci --workspaces --include-workspace-root$/m,
    );
    const build = instructionIndex(/^RUN npm run build --workspace=app$/m);
    expect(
      build,
      'the SPA build must be its own RUN layer, after the install layer',
    ).toBeGreaterThan(install);
    expect(dockerfile).not.toMatch(/npm install|--package-lock-only/);
  });
});

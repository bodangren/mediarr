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

// Split the Dockerfile into logical instructions, joining backslash
// continuations so a multi-line `RUN a && \` + `    b` reads as one
// instruction. Used to assert which *layer* a command lands in without
// pinning the literal text of the command itself.
function logicalInstructions(text) {
  const instructions = [];
  let current = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (current === null) {
      if (/^\s*(#|$)/.test(line)) continue;
      current = line;
    } else {
      current += `\n${line}`;
    }
    if (!/\\\s*$/.test(line)) {
      instructions.push(current);
      current = null;
    }
  }
  if (current !== null) instructions.push(current);
  return instructions;
}

const INSTRUCTIONS = logicalInstructions(dockerfile);

function instructionsMatching(pattern) {
  return INSTRUCTIONS.map((text, index) => ({ text, index })).filter(({ text }) =>
    pattern.test(text),
  );
}

// The SPA build may be invoked directly or through the diagnostic wrapper
// (scripts/docker-build-spa.sh). Both are the same step for invariant
// purposes; the wrapper's own contents are asserted separately below.
const FROZEN_INSTALL = /npm ci --workspaces --include-workspace-root/;
const SPA_BUILD = /npm run build --workspace=app|docker-build-spa\.sh/;

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
    // Located by substring, not by pinning the whole RUN line: the ordering is
    // the invariant, the exact install command is not.
    const install = instructionIndex(FROZEN_INSTALL);

    expect(rootManifest).toBeGreaterThan(-1);
    expect(appManifest).toBeGreaterThan(rootManifest);
    expect(serverManifest).toBeGreaterThan(appManifest);
    expect(postinstallScript).toBeGreaterThan(serverManifest);
    expect(source).toBeGreaterThan(postinstallScript);
    expect(install).toBeGreaterThan(source);
  });

  // Regression guard for the Phase 6 clean-image defect: the frozen install and
  // the SPA build must be separate RUN layers, install first.
  //
  // Read the scope of this guard carefully. The layer split is good practice
  // and it narrows the repro, but it is NOT the fix — the overlay
  // write-visibility explanation that once justified it is disproven (see
  // Phase 6 "Instrumented investigation" in the track plan; the defect
  // reproduced *with* the split in place). This test therefore asserts only the
  // ordering invariant, deliberately WITHOUT pinning the exact shape of the
  // Dockerfile. A previous version asserted the full `RUN npm …` list with
  // `toEqual`, which is the same anti-pattern that let commit 53e27adf lock the
  // broken single-layer shape in as a passing gate; any future remediation must
  // be free to change these commands.
  //
  // Asserted structurally so the guard costs milliseconds instead of a
  // multi-minute image build; the live no-cache build in
  // clean-workspace-build.test.js is the end-to-end acceptance gate.
  it('runs the frozen install and the SPA build in separate layers', () => {
    const installs = instructionsMatching(FROZEN_INSTALL);
    const builds = instructionsMatching(SPA_BUILD);

    expect(installs, 'exactly one frozen workspace install').toHaveLength(1);
    expect(builds, 'exactly one SPA build step').toHaveLength(1);

    const [install] = installs;
    const [build] = builds;

    expect(install.text.startsWith('RUN ')).toBe(true);
    expect(build.text.startsWith('RUN ')).toBe(true);
    expect(
      build.index,
      'the SPA build must be a separate RUN layer, after the install layer',
    ).toBeGreaterThan(install.index);
    expect(
      SPA_BUILD.test(install.text),
      'the install layer must not also run the SPA build',
    ).toBe(false);
  });

  it('never falls back to an unlocked install', () => {
    expect(dockerfile).not.toMatch(/npm install|--package-lock-only/);
  });

  // The SPA build is routed through a wrapper so the next spontaneous
  // occurrence of the intermittent Rollup-resolve failure captures a
  // DEBUG=vite:resolve trace instead of only a one-line diagnostic. Guard the
  // two properties that make the wrapper safe to sit in the build path: it
  // performs the real build, and a diagnostic re-run cannot mask a failure.
  it('keeps the SPA build wrapper faithful when one is used', () => {
    const wrapperRef = /scripts\/docker-build-spa\.sh/.test(dockerfile);
    if (!wrapperRef) return;

    const wrapperPath = path.join(REPO_ROOT, 'scripts/docker-build-spa.sh');
    expect(fs.existsSync(wrapperPath), 'wrapper referenced but missing').toBe(
      true,
    );
    const wrapper = fs.readFileSync(wrapperPath, 'utf8');

    expect(wrapper).toMatch(/npm run build --workspace=app/);
    expect(
      wrapper,
      'the wrapper must exit with the original build status, not the retry status',
    ).toMatch(/exit "\$status"/);
    expect(
      wrapper,
      'the diagnostic re-run must be the traced one, not the authoritative build',
    ).toMatch(/DEBUG=vite:resolve/);
  });
});

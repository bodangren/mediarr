// Phase 6 — Operational Fail-Closed Remediation: Slice C deterministic
// workspace-install/build Red contract.
//
// Strategy reference:
//   measure/tracks/chore_home_network_deployment_hardening_20260712/test-strategy.md
//   §§3, 8, 11, 17.
//
// This test is the deterministic Red gate for Phase 6. It complements
// `tests/clean-workspace-build.test.js` (the live no-cache Docker build
// regression test, which is non-deterministic in Red) by enforcing the
// deterministic workspace-install/build invariant as a bounded, family-level
// structural-semantic assertion.
//
// Why the current Dockerfile is non-deterministic
// ----------------------------------------------
// The current Dockerfile runs ONLY:
//
//   RUN npm ci --workspaces --include-workspace-root && npm run build --workspace=app
//
// `npm ci --workspaces --include-workspace-root` installs every workspace's
// declared dependency into the workspace's nearest `node_modules` per npm's
// hoisting algorithm. The hoisting choices are not stable across environments:
// cache states, partial overlays, Podman's COPY behaviour (see the Dockerfile's
// own comment about Podman's `COPY . .` partially overwriting inherited trees),
// and version-resolution edge cases all shift which packages land at root vs.
// in nested `node_modules/<parent>/node_modules/<dep>` locations.
//
// The Vite build then runs from `/app/app/`. Node's resolver walks up from the
// importing file looking for `node_modules/<dep>` and lands on root
// `node_modules`. The dependency is reachable ONLY because npm happened to hoist
// it. When npm does not hoist a package (or hoists a different version), the
// resolver fails. That is the observed family:
//
//   [vite]: Rollup failed to resolve import "<package>" from "/app/..."
//
// The exact package name is non-deterministic across runs (audit observed
// `cookie`; subsequent runs on this host observed `msw/browser`,
// `@radix-ui/react-dialog`, `@radix-ui/react-slot`,
// `@radix-ui/react-progress`). Anti-pattern A5 forbids pinning the assertion
// to a specific module name; this test captures the FAMILY root cause instead.
//
// What the deterministic invariant is
// -----------------------------------
// The invariant is: the Dockerfile's install + build steps must include at
// least ONE of the four documented remediation patterns from test-strategy.md
// §3 paragraph 5. Each pattern makes Vite/Node resolution INDEPENDENT of npm's
// hoisting choices by ensuring the package is reachable via a workspace-local
// path:
//
//   (a) Workspace-local install AFTER the root install:
//         RUN npm install --workspace=app
//       — forces the `app` workspace to materialise its declared deps in
//         `app/node_modules`, so Vite resolves from `app/` deterministically.
//
//   (b) Per-workspace install:
//         RUN npm ci --workspace=app
//       — same effect as (a), using the lockfile instead of registry
//         resolution.
//
//   (c) Explicit Vite/Rollup resolve aliases:
//         app/vite.config.ts adds `resolve.alias` entries that map each direct
//         dep to a specific path. Vite uses the explicit aliases, bypassing
//         npm's hoisting entirely.
//
//   (d) COPY workspace-local `node_modules` from builder to runner:
//         COPY --from=builder /app/app/node_modules ./app/node_modules
//       — for (d) the builder must already produce `app/node_modules`; the COPY
//         just propagates that state to the runner image.
//
// The four patterns are matched as FAMILY regexes (multiple valid textual
// implementations of each pattern are accepted). The test is therefore
// structural-semantic — it verifies the install STRATEGY, not a stale
// substring — and it allows the next role (measure-jr-green) to choose any
// sound implementation. Anti-pattern A5 is honoured: no specific package name
// is asserted.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DOCKERFILE_PATH = path.join(REPO_ROOT, 'Dockerfile');
const VITE_CONFIG_PATH = path.join(REPO_ROOT, 'app/vite.config.ts');
const APP_PACKAGE_JSON = path.join(REPO_ROOT, 'app/package.json');

// Family-level patterns for each remediation approach. Each entry is an array
// of regexes that all express the same SEMANTIC intent (workspace-local install
// step, workspace-local COPY, or resolve.alias block). Multiple regexes per
// family allow for textual variation (e.g. `npm install --workspace=app`,
// `npm ci --workspace=app`, `cd app && npm install`, etc.) without becoming
// a stale single-phrase assertion.
const WORKSPACE_LOCAL_INSTALL_FAMILY = [
  // `npm install --workspace=app` (option a) and `npm ci --workspace=app`
  // (option b). Both are workspace-local install invocations.
  /RUN\s+npm\s+(install|ci)\s+--workspace=app\b/i,
  // `npm install --prefix app` or `npm ci --prefix app` is another way to
  // target the app workspace from the root context.
  /RUN\s+npm\s+(install|ci)\s+--prefix\s+app\b/i,
  // `cd app && npm install|ci` is a common Docker idiom for workspace-local
  // install.
  /RUN\s+cd\s+app\s+&&\s+npm\s+(install|ci)\b/i,
  // `WORKDIR /app/app` followed by `RUN npm install|ci` runs the install in
  // the app workspace context.
  /WORKDIR\s+\/app\/app\b[\s\S]{0,200}?RUN\s+npm\s+(install|ci)\b/i,
];

const WORKSPACE_LOCAL_COPY_FAMILY = [
  // Option (d): copy the builder's `app/node_modules` into the runner image.
  /COPY\s+--from=builder\s+\/app\/app\/node_modules\b/i,
];

const VITE_RESOLVE_ALIAS_FAMILY = [
  // Option (c): Vite/Rollup resolve config has an explicit alias block.
  // The regex captures the structural shape `resolve: { ... alias: { ... }`
  // regardless of formatting.
  /resolve\s*:\s*\{[^}]*?alias\s*:\s*\{/is,
];

function fileMatchesAnyFamily(filePath, familyPatterns) {
  if (!fs.existsSync(filePath)) {
    return { matched: false, reason: `file not found: ${path.relative(REPO_ROOT, filePath)}` };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  for (const pattern of familyPatterns) {
    if (pattern.test(content)) {
      return { matched: true, pattern: pattern.source };
    }
  }
  return { matched: false, reason: 'no family regex matched' };
}

function readAppDirectDeps() {
  const pkg = JSON.parse(fs.readFileSync(APP_PACKAGE_JSON, 'utf8'));
  return [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
}

describe('Phase 6 — workspace-install/build invariant', () => {
  it('the Dockerfile enforces a deterministic workspace-install/build pattern', () => {
    // The test enforces the four-pattern invariant. At HEAD only the root
    // install is present; the test fails (Red). After the next role picks
    // any of (a)/(b)/(c)/(d), the test passes.
    const detected = [];

    // (a) / (b): workspace-local install step in the Dockerfile.
    const install = fileMatchesAnyFamily(DOCKERFILE_PATH, WORKSPACE_LOCAL_INSTALL_FAMILY);
    if (install.matched) {
      detected.push({ family: '(a)/(b) workspace-local install', pattern: install.pattern });
    }

    // (d): workspace-local COPY in the Dockerfile.
    if (!install.matched) {
      const copy = fileMatchesAnyFamily(DOCKERFILE_PATH, WORKSPACE_LOCAL_COPY_FAMILY);
      if (copy.matched) {
        detected.push({ family: '(d) workspace-local COPY', pattern: copy.pattern });
      }
    }

    // (c): explicit resolve.alias block in the Vite config that references at
    // least one declared `app` direct dep (defensive: an alias block with no
    // `app` deps does not satisfy the invariant). The reference check accepts
    // both bare-package aliases (e.g. `'msw'`) and subpath aliases
    // (e.g. `'msw/browser'`) because both shapes make Vite's resolution
    // deterministic for that package.
    if (detected.length === 0) {
      const alias = fileMatchesAnyFamily(VITE_CONFIG_PATH, VITE_RESOLVE_ALIAS_FAMILY);
      if (alias.matched) {
        const viteConfigContent = fs.readFileSync(VITE_CONFIG_PATH, 'utf8');
        const aliasBlockMatch = viteConfigContent.match(/alias\s*:\s*\{([\s\S]*?)\n\s*\}/);
        if (aliasBlockMatch) {
          const aliasBlock = aliasBlockMatch[1];
          const directDeps = readAppDirectDeps();
          // The alias block must reference at least one declared `app` dep.
          // Match either as a bare package key (e.g. `'msw'` or `"msw"`) or as
          // a subpath key (e.g. `'msw/browser'` or `"msw/browser"`). The
          // existing `@` and `@server` aliases are path-aliases that do not
          // address the npm-hoisting root cause, so they are filtered out by
          // the dep-name match.
          const referencesAnyDep = directDeps.some(
            (dep) =>
              aliasBlock.includes(`'${dep}'`) ||
              aliasBlock.includes(`"${dep}"`) ||
              aliasBlock.includes(`'${dep}/`) ||
              aliasBlock.includes(`"${dep}/`),
          );
          if (referencesAnyDep) {
            detected.push({
              family: '(c) Vite resolve.alias for direct deps',
              pattern: alias.pattern,
            });
          }
        }
      }
    }

    if (detected.length === 0) {
      throw new Error(
        'Phase 6 workspace-install/build invariant violated. The Dockerfile does ' +
          'not include any of the documented patterns that make Vite resolution ' +
          'deterministic in a clean Docker build. The current single-step ' +
          '`npm ci --workspaces --include-workspace-root` install is non-' +
          'deterministic across npm hoisting choices; that is the documented ' +
          'root cause of the `Rollup failed to resolve import "<dep>" from ' +
          '"/app/..."` family observed across runs (test-strategy.md §3). ' +
          'Add one of the following (family-level): ' +
          '(a) `RUN npm install --workspace=app` or `npm ci --workspace=app`; ' +
          '(b) `RUN npm ci --workspace=app`; ' +
          '(c) explicit `resolve.alias` entries in `app/vite.config.ts` mapping ' +
          'each `app` direct dep to a specific path; ' +
          '(d) `COPY --from=builder /app/app/node_modules ./app/node_modules`.',
      );
    }

    // Diagnostic: report which family satisfied the invariant so the next
    // role can confirm the chosen fix matches expectations.
    expect(detected.length).toBeGreaterThan(0);
    expect(detected[0].family).toMatch(/^\([abcd]\)/);
  });
});
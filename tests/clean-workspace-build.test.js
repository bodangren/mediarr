import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Phase 6 — Operational Fail-Closed Remediation: Slice C clean-image Red contract.
//
// Strategy reference: measure/tracks/chore_home_network_deployment_hardening_20260712/
// test-strategy.md §§3, 8, 11, 17.
//
// The Dockerfile's `RUN npm ci --workspaces --include-workspace-root &&
// npm run build --workspace=app` step is the source of truth for what a fresh
// container build will encounter. A no-cache Docker build (or `podman build
// --no-cache`) on a clean host has been observed to fail with the Vite/Rollup
// family:
//
//   [vite]: Rollup failed to resolve import "<module>" from "/app/..."
//
// The exact module name is non-deterministic between runs (audit reported
// "cookie", an on-host reproduction at a2950ff5 reported
// "@radix-ui/react-progress", and the audit on this HEAD reported
// "msw/browser" then "@radix-ui/react-dialog" on subsequent runs).
// Anti-pattern A5 forbids pinning the assertion to a specific module name;
// this test captures the **family** of the failure and is the regression
// guard for the clean-image workspace dependency-resolution defect.
//
// The test is the truthful Red for the Dockerfile + workspace module-graph
// invariant. The strategy documents that the no-cache build is the only
// build mode that reliably reproduces the family on this host (cached
// `podman build` may pass spuriously when Podman's overlay cache covers
// missing workspace packages; `--no-cache` strips that safety net).
//
// On a fresh clean workspace the Vite production build MUST succeed. The
// assertion below fails the test when the `Rollup failed to resolve import`
// family appears in stderr OR the build exits non-zero. Both branches are
// required: a `tsc -b` failure or an `npm ci` failure can also cause a
// non-zero exit, and the test reports which branch fired so the next role
// can act on the precise evidence.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Family-level regex. Matches the Vite/Rollup diagnostic text. Anti-pattern
// A5 forbids pinning a specific module name; the family pattern only asserts
// the class of failure (an unresolved Vite import during the production
// build).
const ROLLUP_FAILED_RESOLVE_FAMILY = /Rollup failed to resolve import\s+"[^"]+"\s+from\s+"\/app\//;

function detectBuildFailure(stderr, status) {
  const familyMatch = stderr.match(ROLLUP_FAILED_RESOLVE_FAMILY);
  if (familyMatch) {
    return { kind: 'rollup-family', match: familyMatch[0] };
  }
  if (status !== 0) {
    return { kind: 'non-zero-exit', match: `exit code ${status}` };
  }
  return null;
}

const DISK_PRESSURE_PATTERNS = [
  /no space left on device/i,
  /ENOSPC/,
  /disk quota exceeded/i,
  /Read-only file system/i,
  /cannot write to .*: No space/i,
];

function detectDiskPressure(stderr) {
  for (const pattern of DISK_PRESSURE_PATTERNS) {
    if (pattern.test(stderr)) {
      return { kind: 'disk-pressure', match: pattern.source };
    }
  }
  return null;
}

function parseDfUsePercent() {
  // Capture the labelled Use% integer from `df -h /` so the test can record
  // host disk pressure as a labelled integer (anti-pattern A3).
  const result = spawnSync('df', ['-h', '/'], { encoding: 'utf8' });
  if (result.status !== 0) {
    return null;
  }
  const line = result.stdout.split('\n').find((l) => l.includes(' /'));
  if (!line) {
    return null;
  }
  const match = line.match(/(\d+)%/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseDiskAvailGb() {
  const result = spawnSync('df', ['-h', '/'], { encoding: 'utf8' });
  if (result.status !== 0) {
    return null;
  }
  const line = result.stdout.split('\n').find((l) => l.includes(' /'));
  if (!line) {
    return null;
  }
  const cols = line.trim().split(/\s+/);
  // Available column is the 4th column (Size Used Avail Use% Mounted)
  const availToken = cols[3];
  if (!availToken) {
    return null;
  }
  const availMatch = availToken.match(/^(\d+(?:\.\d+)?)([GMK])$/);
  if (!availMatch) {
    return null;
  }
  const value = Number.parseFloat(availMatch[1]);
  const unit = availMatch[2];
  if (unit === 'G') return value;
  if (unit === 'M') return value / 1024;
  if (unit === 'K') return value / 1024 / 1024;
  return null;
}

describe('Phase 6 — clean-image workspace dependency resolution (no-cache build)', () => {
  // Heavy bounded test: runs `docker build --no-cache` to reproduce the
  // Dockerfile's exact behaviour on a fresh container. This is the truthful
  // Red; the no-cache flag is required because cached builds can pass
  // spuriously when Podman's overlay cache covers missing packages.
  // The default vitest timeout is 5s; the build typically takes 3-5 minutes
  // on this host.
  const HEAVY_TIMEOUT_MS = 900_000;
  const BUILD_LOG_PATH = path.join(os.tmpdir(), 'mediarr-phase6-clean-build.log');

  it('records host disk pressure (labelled integer, anti-pattern A3)', () => {
    // Anti-pattern A3 forbids digit-only "counts." This test parses a
    // labelled integer from `df -h /` and asserts the family is recorded
    // for the audit, NOT the integer itself.
    const usePercent = parseDfUsePercent();
    const availGb = parseDiskAvailGb();
    if (usePercent === null || availGb === null) {
      throw new Error('df parsing failed; cannot record host disk pressure');
    }
    // Assert the family is parseable but do NOT assert a specific Use%.
    // Disk pressure is host-dependent and not part of the build contract.
    expect(Number.isInteger(usePercent)).toBe(true);
    expect(Number.isFinite(availGb)).toBe(true);
  });

  it('produces a no-cache Docker build with exit code 0 (build slice C contract)', { timeout: HEAVY_TIMEOUT_MS }, () => {
    // The bounded test is gated on the strategy's RED_TEST_BUILD
    // command. We shell out so the test mirrors the orchestrator's
    // `docker build --no-cache` invocation and reports the family assertion.
    if (!fs.existsSync(path.join(REPO_ROOT, 'Dockerfile'))) {
      throw new Error('Dockerfile missing from repo root');
    }
    // Probe for `docker` availability. On this host `docker` is a podman
    // alias; on a Docker Engine host it is the daemon CLI. Either is
    // acceptable per the trusted-LAN deployment contract.
    const probe = spawnSync('docker', ['--version'], { encoding: 'utf8' });
    if (probe.status !== 0) {
      throw new Error(
        '`docker` is not available on PATH; the Phase 6 build contract is environment-blocked. ' +
          'Phase 6 strategy §6 routes this to a separate chore track; mark this test as `blocked`.',
      );
    }
    const result = spawnSync(
      'docker',
      ['build', '--no-cache', '-t', 'localhost/mediarr:readiness-report', '.'],
      {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        maxBuffer: 128 * 1024 * 1024,
        timeout: HEAVY_TIMEOUT_MS - 5_000,
      },
    );
    // Persist the build log so the next role can inspect it without
    // re-running the slow build. The path is /tmp to keep it out of the
    // working tree.
    fs.writeFileSync(BUILD_LOG_PATH, `# stdout\n${result.stdout ?? ''}\n# stderr\n${result.stderr ?? ''}\n# exit=${result.status}\n# signal=${result.signal ?? ''}\n# timedOut=${Boolean(result.error)}\n`);
    const stderr = result.stderr ?? '';
    const diskPressure = detectDiskPressure(stderr);
    if (diskPressure) {
      // Disk-pressure failures are host-only and OUT of Phase 6 scope per
      // test-strategy.md §6. The build cannot be the truthful Red in this
      // state. Mark the test as blocked (env-blocked) and skip the family
      // assertion.
      throw new Error(
        `no-cache build aborted by host-only disk pressure (${diskPressure.kind}: ${diskPressure.match}). ` +
          `Phase 6 strategy §6 routes disk-pressure failures to a separate chore track. ` +
          `Log: ${BUILD_LOG_PATH}`,
      );
    }
    const failure = detectBuildFailure(stderr, result.status ?? 1);
    if (failure) {
      // The build failed for one of the documented reasons. Re-raise with
      // the family and the saved log location so the orchestrator can read
      // the precise evidence.
      const log = fs.existsSync(BUILD_LOG_PATH)
        ? fs.readFileSync(BUILD_LOG_PATH, 'utf8')
        : '<log not written>';
      throw new Error(
        `no-cache build failed (${failure.kind}: ${failure.match}). ` +
          `Full log: ${BUILD_LOG_PATH}\n\n${log}`,
      );
    }
    expect(result.status, 'no-cache build must exit 0').toBe(0);
  });

  it('does not contain the Rollup failed-to-resolve-import family in build stderr', { timeout: HEAVY_TIMEOUT_MS }, () => {
    // Re-run the build only if the previous test did not persist a log
    // (e.g. when run in isolation). The family assertion is the contract
    // the strategy captures (test-strategy.md §3, §11).
    if (!fs.existsSync(BUILD_LOG_PATH)) {
      const probe = spawnSync('docker', ['--version'], { encoding: 'utf8' });
      if (probe.status !== 0) {
        throw new Error(
          '`docker` is not available on PATH; the Phase 6 build contract is environment-blocked. ' +
            'Phase 6 strategy §6 routes this to a separate chore track; mark this test as `blocked`.',
        );
      }
      const result = spawnSync(
        'docker',
        ['build', '--no-cache', '-t', 'localhost/mediarr:readiness-report', '.'],
        {
          cwd: REPO_ROOT,
          encoding: 'utf8',
          maxBuffer: 128 * 1024 * 1024,
          timeout: HEAVY_TIMEOUT_MS - 5_000,
        },
      );
      fs.writeFileSync(BUILD_LOG_PATH, `# stdout\n${result.stdout ?? ''}\n# stderr\n${result.stderr ?? ''}\n# exit=${result.status}\n`);
    }
    const log = fs.readFileSync(BUILD_LOG_PATH, 'utf8');
    // Disk-pressure failures are out of scope for Phase 6 (test-strategy.md
    // §6); a stale log from a disk-pressure-aborted build would not be the
    // truthful family assertion. Skip in that case.
    const diskPressure = detectDiskPressure(log);
    if (diskPressure) {
      throw new Error(
        `persisted log shows host-only disk pressure (${diskPressure.kind}: ${diskPressure.match}); ` +
          `Phase 6 strategy §6 routes this to a separate chore track. ` +
          `Log: ${BUILD_LOG_PATH}`,
      );
    }
    const match = log.match(ROLLUP_FAILED_RESOLVE_FAMILY);
    expect(
      match,
      `no-cache build emitted the Rollup failed-to-resolve family: ${match ? match[0] : '<no match>'}\n\nlog:\n${log}`,
    ).toBeNull();
  });
});

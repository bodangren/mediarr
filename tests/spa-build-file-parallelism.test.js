import { describe, expect, it } from 'vitest';
import viteConfig from '../app/vite.config.ts';

// Regression guard for the Phase 6 clean-image defect:
//
//   [vite]: Rollup failed to resolve import "<dep>" from "/app/app/..."
//
// naming a different module each occurrence and reproducing intermittently.
//
// Mechanism (measured 2026-07-28, after two weeks of wrong answers): rollup
// defaults `maxParallelFileOps` to 1000 (`getMaxParallelFileOps` in
// rollup/dist/shared/rollup.js), while a buildah `RUN` layer gets an fd soft
// limit of **1024**. Those numbers are 24 apart, so the SPA build runs its file
// queue right at the ceiling and loses the race whenever node's own descriptors
// push it over. A file that exists then fails to open, and rollup reports the
// failure as "failed to resolve".
//
// This also explains why the defect looked unfalsifiable for so long:
//   - different module each run   -> whichever file loses the race
//   - dies at 118-143 modules     -> once the queue has ramped up
//   - resolves from a probe 1s later -> a single-threaded probe needs one fd
//   - never reproduces on the host or under `podman run` -> limit is 1048576
//     there, so 1000 parallel ops is unremarkable. The earlier "fd exhaustion
//     excluded" finding measured `podman run`, which is NOT the namespace the
//     build executes in.
//
// The cap is asserted as a *bound with headroom*, not as a pinned number, so
// future tuning stays free. Pinning the status quo is what let commit 53e27adf
// lock the broken Dockerfile shape in as a passing gate.
const BUILDAH_RUN_FD_SOFT_LIMIT = 1024;
const REQUIRED_HEADROOM_FACTOR = 4;
const MAX_SAFE_PARALLEL_FILE_OPS = BUILDAH_RUN_FD_SOFT_LIMIT / REQUIRED_HEADROOM_FACTOR;

describe('SPA build file parallelism', () => {
  it('caps rollup file operations well below the container build fd limit', () => {
    const maxParallelFileOps = viteConfig.build?.rollupOptions?.maxParallelFileOps;

    expect(
      maxParallelFileOps,
      'app/vite.config.ts must set build.rollupOptions.maxParallelFileOps; ' +
        `rollup's default of 1000 sits under the ${BUILDAH_RUN_FD_SOFT_LIMIT}-fd ` +
        'soft limit of a buildah RUN layer',
    ).toBeTypeOf('number');

    expect(
      maxParallelFileOps,
      'a value <= 0 means Infinity in rollup, which removes the cap entirely',
    ).toBeGreaterThan(0);

    expect(
      maxParallelFileOps,
      `must leave at least ${REQUIRED_HEADROOM_FACTOR}x headroom under the ` +
        `${BUILDAH_RUN_FD_SOFT_LIMIT}-fd build-layer limit for node's own descriptors`,
    ).toBeLessThanOrEqual(MAX_SAFE_PARALLEL_FILE_OPS);
  });
});

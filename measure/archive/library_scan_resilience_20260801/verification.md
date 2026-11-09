# Verification — Library Scan Resilience (2026-11-09)

All work landed in the main tree before this track was archived; the commits below carry the evidence.

## Implementation commits

- **`8996e99b`** — `collectFiles` fails soft: unreadable directory or entry is skipped with a warning instead
  of aborting the scan; root unreadable returns `[]`. 3 collectFiles tests + device/live `chmod 000` demo
  (`Skipping unreadable directory … EACCES` while siblings were returned). Tech-debt row marked Resolved.
- **`9d55de21`** — the old "known defect: unreadable directory aborts scan" characterisation tests were
  replaced with the fixed contract (warn + skip + readable files still linked); full server suite green at
  that point (294 files / 2804 tests).
- **`97132625`** — visited-directory guard: `realpath` canonicalisation + visited set terminates symlink
  loops / repeated directory references with an actionable warning. Cycle test added; live loop scan
  returned the real file in 19 ms.

## Exact commands and outcomes

```
$ CI=true npx vitest run server/src/services/LibraryScanner.collectFiles.test.ts server/src/services/LibraryScanner.test.ts
Tests  28 passed (28)

$ npx tsc -p server/tsconfig.json --noEmit
(clean)

$ CI=true npx vitest run server/src          # full suite after the scanner work
Test Files  300 passed (300)
Tests  2823 passed | 11 skipped (2834)

# live unreadable-directory behaviour
Skipping unreadable directory /tmp/.../blocked: EACCES
FILES ["/tmp/.../good.mkv","/tmp/.../nested/deep.mp4"]

# live symlink loop
Skipping already visited directory /tmp/loop-demo/sub/loop (symlink loop or duplicate reference)
FILES ["/tmp/loop-demo/Show.S01E01.mkv"]
MS 19
```

## Acceptance criteria

- Readable partial results survive an unreadable sibling: **yes** (`8996e99b`, tests + live demo).
- Traversal errors are isolated and reported through the existing diagnostic path (`console.warn`): **yes**.
- Symlink loops / repeated references terminate deterministically: **yes** (`97132625`, fake + real FS).
- Fully readable scans behave as before: **yes** — existing linking tests unchanged and green.
- Tech-debt row closed: **yes** (`8996e99b`).

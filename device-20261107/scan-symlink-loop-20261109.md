# Library scan: symlink loops terminate (2026-11-09)

Part of the `library_scan_resilience_20260801` track (unreadable-directory isolation landed earlier in
`8996e99b`). A directory cycle previously walked until the OS path limit before failing, which delayed the
whole scan.

- `collectFiles` canonicalises each directory with `realpath` and keeps a visited set; a cycle or a second
  link to the same directory is skipped with an actionable warning.
- If `realpath` is unavailable/fails, traversal falls back to the raw path (still fail-soft).

## Live proof
Created `/tmp/loop-demo/sub/loop -> /tmp/loop-demo` plus one file and scanned it:
```
Skipping already visited directory /tmp/loop-demo/sub/loop (symlink loop or duplicate reference)
FILES ["/tmp/loop-demo/Show.S01E01.mkv"]
MS 19
```
Terminates immediately, returns the readable file.

## Tests
`LibraryScanner.collectFiles.test.ts` gained a cycle test (loop resolves to the root → only the root file is
returned, warning emitted); 28 scanner tests green.

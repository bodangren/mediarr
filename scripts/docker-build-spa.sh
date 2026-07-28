#!/bin/sh
# Build the Vite SPA inside the container image, capturing a resolver trace if
# the build fails.
#
# Why this exists: the repo has an open, intermittent clean-image defect in the
# Vite/Rollup family
#
#   [vite]: Rollup failed to resolve import "<dep>" from "/app/app/..."
#
# naming a different module each occurrence, and its reproduction rate swings
# wildly (13 consecutive greens on 2026-07-27; 3 of 4 first attempts failed on
# 2026-07-28). Rather than keep guessing between occurrences, the build captures
# its own evidence when it fails. See Phase 6 of
# measure/tracks/chore_home_network_deployment_hardening_20260712/plan.md.
#
# This wrapper has already earned its place: on its first live failure the
# environment block below showed `Max open files 1024` *inside the RUN layer*,
# overturning a documented exclusion that had been measured under `podman run`
# (1048576) — a different namespace from the one the build actually runs in.
#
# On success this behaves exactly like `npm run build --workspace=app`. On
# failure it re-runs the build under DEBUG='vite:*', prints the trace lines
# for the specifier that failed plus the tail of the trace, and then exits with
# the ORIGINAL failure status so the image build still fails.
#
# Deliberately POSIX sh with no heredocs: buildah 1.33 does not support
# Dockerfile heredocs, and node:20-slim has no bash guarantee worth relying on.

set -u

BUILD_LOG=/tmp/mediarr-spa-build.log
TRACE_LOG=/tmp/mediarr-spa-build-trace.log
TRACE_TAIL_LINES=300

npm run build --workspace=app >"$BUILD_LOG" 2>&1
status=$?
cat "$BUILD_LOG"

if [ "$status" -eq 0 ]; then
  exit 0
fi

echo ""
echo "=============================================================="
echo "SPA build failed (exit $status). Re-running under DEBUG=vite:*"
echo "to capture the resolver trace. This is diagnostic only — the image"
echo "build will still fail with the original status."
echo "=============================================================="

# The build dies in a narrow band (118, 130, 132, 143 modules transformed) on a
# different specifier each time, while the specifier itself resolves fine from a
# single-threaded probe one second later. Record the resource limits *as seen
# from inside this RUN layer* — an earlier check measured them under
# `podman run`, which is not the same namespace.
echo ""
echo "--- build environment as seen from inside this RUN layer:"
echo "  node: $(node -v 2>&1)  npm: $(npm -v 2>&1)  nproc: $(nproc 2>&1)"
echo "  ulimit -n soft: $(ulimit -Sn 2>&1)  hard: $(ulimit -Hn 2>&1)"
echo "  open fds now: $(ls /proc/self/fd 2>/dev/null | wc -l)"
grep -E 'Max open files|Max locked memory|Max address space|Max processes' \
  /proc/self/limits 2>/dev/null | sed 's/^/  /'
free -m 2>/dev/null | sed 's/^/  /'

specifier=$(
  sed -n 's/.*Rollup failed to resolve import "\([^"]*\)".*/\1/p' "$BUILD_LOG" |
    head -n 1
)

if [ -n "$specifier" ]; then
  echo ""
  echo "--- unresolved specifier: $specifier"
  echo "--- resolution probe from /app/app at failure+1:"
  (
    cd app 2>/dev/null &&
      node -e 'try { console.log("  resolved:", require.resolve(process.argv[1], { paths: [process.cwd()] })); } catch (e) { console.log("  UNRESOLVED:", e.code || e.message); }' "$specifier"
  ) || echo "  probe failed to run"
else
  echo ""
  echo "--- no Rollup unresolved-import specifier found in the build log;"
  echo "--- this failure may be a different family (tsc -b, npm, OOM)."
fi

# `DEBUG=vite:resolve` alone emitted a single line across 130 transformed
# modules on the 2026-07-28 capture — absence of trace lines there is not
# evidence of anything. Trace the whole vite namespace instead; the output is
# large but everything below is tail- or grep-bounded.
DEBUG='vite:*' npm run build --workspace=app >"$TRACE_LOG" 2>&1
trace_status=$?

echo ""
if [ "$trace_status" -eq 0 ]; then
  echo "--- NOTE: the instrumented re-run SUCCEEDED (exit 0)."
  echo "--- The defect is intermittent, so this is expected some of the time."
  echo "--- The trace below shows how the specifier resolved when it worked."
else
  echo "--- instrumented re-run also failed (exit $trace_status)."
fi

if [ -n "$specifier" ]; then
  echo ""
  echo "--- vite trace lines mentioning $specifier (last $TRACE_TAIL_LINES):"
  # `grep | tail` always exits 0, so test the captured text rather than status.
  matched=$(grep -F "$specifier" "$TRACE_LOG" | tail -n "$TRACE_TAIL_LINES")
  if [ -n "$matched" ]; then
    echo "$matched"
  else
    echo "  <no trace lines matched the specifier>"
  fi
fi

echo ""
echo "--- tail of vite trace (last $TRACE_TAIL_LINES lines):"
tail -n "$TRACE_TAIL_LINES" "$TRACE_LOG"

echo ""
echo "--- end of diagnostic capture; failing with the original status $status"
exit "$status"

#!/bin/sh
# Build the Vite SPA inside the container image, capturing a resolver trace if
# the build fails.
#
# Why this exists: the repo has an open, intermittent clean-image defect in the
# Vite/Rollup family
#
#   [vite]: Rollup failed to resolve import "<dep>" from "/app/app/..."
#
# naming a different module each occurrence. It is NOT reproducible on demand —
# it reproduced twice and then went 13 consecutive green clean builds — so the
# only realistic way to obtain the one artefact that would give a mechanism
# (Vite's resolver trace at the moment of failure) is to have the build capture
# it itself the next time it happens. See Phase 6 of
# measure/tracks/chore_home_network_deployment_hardening_20260712/plan.md.
#
# On success this behaves exactly like `npm run build --workspace=app`. On
# failure it re-runs the build under DEBUG=vite:resolve, prints the trace lines
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
echo "SPA build failed (exit $status). Re-running under DEBUG=vite:resolve"
echo "to capture the resolver trace. This is diagnostic only — the image"
echo "build will still fail with the original status."
echo "=============================================================="

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

DEBUG=vite:resolve npm run build --workspace=app >"$TRACE_LOG" 2>&1
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
  echo "--- vite:resolve trace lines mentioning $specifier (last $TRACE_TAIL_LINES):"
  # `grep | tail` always exits 0, so test the captured text rather than status.
  matched=$(grep -F "$specifier" "$TRACE_LOG" | tail -n "$TRACE_TAIL_LINES")
  if [ -n "$matched" ]; then
    echo "$matched"
  else
    echo "  <no trace lines matched the specifier>"
  fi
fi

echo ""
echo "--- tail of vite:resolve trace (last $TRACE_TAIL_LINES lines):"
tail -n "$TRACE_TAIL_LINES" "$TRACE_LOG"

echo ""
echo "--- end of diagnostic capture; failing with the original status $status"
exit "$status"

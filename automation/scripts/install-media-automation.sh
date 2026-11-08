#!/usr/bin/env bash
# Link the dsh-media-automation plugin into the DSH web profile (task B4).
#
# Gated like the host cutover: loading/reloading a host plugin restarts the harness that runs the
# agent turn invoking this script, so it refuses without MEDIA_AUTOMATION_CUTOVER=1.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PLUGIN="$REPO/automation/dsh-media-automation"
PROFILE="${DSH_PROFILE:-web}"

if [[ "${MEDIA_AUTOMATION_CUTOVER:-0}" != "1" ]]; then
  cat >&2 <<'MSG'
Refusing to link the plugin: reloading the harness host also ends the agent turn running
this script. Re-run with MEDIA_AUTOMATION_CUTOVER=1 when the current session may restart.
MSG
  exit 2
fi

[[ -f "$PLUGIN/package.json" ]] || { echo "plugin package missing: $PLUGIN" >&2; exit 1; }
command -v dsh >/dev/null || { echo "dsh not on PATH" >&2; exit 1; }

dsh plugin --profile "$PROFILE" add "link:$PLUGIN"
echo "linked $PLUGIN into profile $PROFILE"

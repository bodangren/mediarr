#!/usr/bin/env bash
# Install the DeepSeek Harness host as a systemd user unit (track
# chore_migrate_hermes_automation_20261107, task B3).
#
# The cutover stops the terminal-launched host, which is also the process running the agent turn that
# invoked this script. That is why it refuses to touch a live host by default: run it from a separate
# terminal or with DSH_HOST_CUTOVER=1 when you accept that the current harness session ends.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UNIT_SRC="$REPO/automation/systemd/dsh-host.service"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UNIT_DST="$UNIT_DIR/dsh-host.service"

if [[ ! -f "$UNIT_SRC" ]]; then
  echo "unit file missing: $UNIT_SRC" >&2
  exit 1
fi

if [[ "${DSH_HOST_CUTOVER:-0}" != "1" ]]; then
  cat >&2 <<'MSG'
Refusing to cut over: this script stops the running harness host, which is also the process running
this agent turn. Re-run from a separate terminal (or with DSH_HOST_CUTOVER=1) when you are ready for
the current session to end and be owned by systemd instead.
MSG
  exit 2
fi

install -d "$UNIT_DIR"
install -m 0644 "$UNIT_SRC" "$UNIT_DST"
systemctl --user daemon-reload

# B3 hard ordering: no second host while the webbridge bridge holds *:10086.
if ss -ltn 2>/dev/null | grep -q ':10086 '; then
  echo "port 10086 is in use; stopping the terminal host first" >&2
  systemctl --user stop dsh-host.service 2>/dev/null || true
  pkill -f 'dsh web' 2>/dev/null || true
  for _ in $(seq 1 20); do
    ss -ltn 2>/dev/null | grep -q ':10086 ' || break
    sleep 0.5
  done
  if ss -ltn 2>/dev/null | grep -q ':10086 '; then
    echo "port 10086 still busy after stopping the terminal host; aborting" >&2
    exit 3
  fi
fi

systemctl --user enable --now dsh-host.service
sleep 2
systemctl --user --no-pager status dsh-host.service || true
echo "dsh-host.service installed. Reconnect to the harness GUI on its configured port."

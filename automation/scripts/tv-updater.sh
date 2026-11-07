#!/usr/bin/env bash
# Fully hands-off TV client updater over network ADB.
# Runs daily (systemd timer) or manually. Installs only when the server manifest
# advertises a higher versionCode; verifies sha256 before installing.
set -euo pipefail

SERVER="${MEDIARR_URL:-http://127.0.0.1:5174}"
SERIAL="${TV_SERIAL:-192.168.10.60:5555}"
PKG="com.mediarr.mediarr_client"
LOG="${TV_UPDATER_LOG:-$HOME/.local/state/mediarr/tv-updater.log}"
mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

MANIFEST="$(curl -fsS --max-time 15 "$SERVER/api/client/update" 2>/dev/null || true)"
REMOTE_CODE="$(printf '%s' "$MANIFEST" | jq -r '.data.versionCode // empty' 2>/dev/null || true)"
if [ -z "$REMOTE_CODE" ]; then
  log "no published update; nothing to do"
  exit 0
fi

adb connect "$SERIAL" >/dev/null 2>&1 || true
INSTALLED="$(adb -s "$SERIAL" shell dumpsys package "$PKG" 2>/dev/null | grep -oE 'versionCode=[0-9]+' | head -1 | cut -d= -f2 || true)"
if [ -z "$INSTALLED" ]; then
  log "client not installed on $SERIAL; skipping"
  exit 0
fi
if [ "$REMOTE_CODE" -le "$INSTALLED" ] 2>/dev/null; then
  log "up to date (installed $INSTALLED, server $REMOTE_CODE)"
  exit 0
fi

FILE="$(printf '%s' "$MANIFEST" | jq -r '.data.file')"
SHA="$(printf '%s' "$MANIFEST" | jq -r '.data.sha256')"
TMP="$(mktemp --suffix=.apk)"
trap 'rm -f "$TMP"' EXIT
log "downloading $FILE ($REMOTE_CODE > $INSTALLED)"
curl -fsS --max-time 300 "$SERVER/api/client/download?file=$FILE" -o "$TMP"
ACTUAL="$(sha256sum "$TMP" | awk '{print $1}')"
if [ "$ACTUAL" != "$SHA" ]; then
  log "sha256 mismatch (expected $SHA, got $ACTUAL); aborting"
  exit 1
fi

log "installing silently over ADB"
if ! adb -s "$SERIAL" install -r "$TMP" >>"$LOG" 2>&1; then
  log "adb install failed; see log"
  exit 1
fi
adb -s "$SERIAL" shell am start -n "$PKG/.MainActivity" >/dev/null 2>&1 || true
log "updated to $REMOTE_CODE and relaunched"

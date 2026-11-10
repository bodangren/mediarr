#!/usr/bin/env bash
# Recover the X96Max launcher over ADB after a blank FallbackHome boot.
#
# Background (2026-11-10): a package replace (`adb install -r`, and the in-app
# PackageInstaller path) clears the app's preferred-HOME binding. The box's
# stock Amlogic launcher was user-disabled, so after a reboot Android had no
# default HOME and sat on the blank system FallbackHome. This script re-enables
# the stock launcher (so the box can always fall back) and re-asserts Mediarr
# as the HOME app.
#
# Usage: bash automation/scripts/tv-launcher-recover.sh [serial]
set -euo pipefail

SERIAL="${1:-192.168.10.60:5555}"
PKG="com.mediarr.mediarr_client"
STOCK="com.amlogic.android.leanbacklauncher"

adb connect "$SERIAL" >/dev/null 2>&1 || true
if ! adb -s "$SERIAL" get-state >/dev/null 2>&1; then
  echo "TV not reachable over ADB at $SERIAL" >&2
  exit 1
fi

adb -s "$SERIAL" shell pm enable "$STOCK" >/dev/null 2>&1 || true
adb -s "$SERIAL" shell pm enable "$PKG" >/dev/null 2>&1 || true
adb -s "$SERIAL" shell cmd package set-home-activity "$PKG/.MainActivity"
adb -s "$SERIAL" shell am start -n "$PKG/.MainActivity" >/dev/null 2>&1 || true

echo "HOME now resolves to:"
adb -s "$SERIAL" shell cmd package resolve-activity --brief \
  -a android.intent.action.MAIN -c android.intent.category.HOME | tail -1

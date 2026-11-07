#!/usr/bin/env bash
# Publish an Android client APK as the latest update for the TV updater + in-app prompt.
# Usage: publish-client-update.sh <apk> <versionCode> <versionName> [notes]
set -euo pipefail

APK="${1:?usage: publish-client-update.sh <apk> <versionCode> <versionName> [notes]}"
CODE="${2:?versionCode required}"
NAME="${3:?versionName required}"
NOTES="${4:-}"

CONFIG_DIR="${CONFIG_DIR:-/run/media/daniel-bo/4TB/mediarr-config}"
DIR="$CONFIG_DIR/client-updates"
mkdir -p "$DIR"

FILE="mediarr-client-${CODE}.apk"
cp -f "$APK" "$DIR/$FILE"
SHA="$(sha256sum "$DIR/$FILE" | awk '{print $1}')"
SIZE="$(stat -c %s "$DIR/$FILE")"

python3 - "$DIR/manifest.json" "$CODE" "$NAME" "$FILE" "$SHA" "$SIZE" "$NOTES" <<'PY'
import json, sys, datetime
path, code, name, file, sha, size, notes = sys.argv[1:8]
manifest = {
    "versionCode": int(code),
    "versionName": name,
    "file": file,
    "sha256": sha,
    "size": int(size),
    "notes": notes,
    "publishedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
}
open(path, "w").write(json.dumps(manifest, indent=2) + "\n")
print("published", name, "code", code, "sha", sha[:12], "size", size)
PY
ls -la "$DIR"

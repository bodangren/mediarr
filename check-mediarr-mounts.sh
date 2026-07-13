#!/usr/bin/env bash
set -euo pipefail

IMAGE="${1:-mediarr_mediarr}"
CONFIG_DIR="${CONFIG_DIR:-/home/daniel-bo/mediarr/config}"
MEDIA_DIR="${MEDIA_DIR:-/home/daniel-bo/mediarr/media}"
PUID="${PUID:-1000}"
PGID="${PGID:-1000}"

echo "== Host paths =="
ls -ld "$CONFIG_DIR" "$MEDIA_DIR"

echo
echo "== Container write test =="
podman run --rm \
  --userns=keep-id \
  -v "${CONFIG_DIR}:/config:Z" \
  -v "${MEDIA_DIR}:/data:Z" \
  "$IMAGE" \
  sh -c '
    set -e
    echo "container id: $(id)"
    echo "testing /config..."
    touch /config/test-write
    rm /config/test-write
    echo "testing /data..."
    touch /data/test-write
    rm /data/test-write
    echo "OK: both mounts are writable"
  '

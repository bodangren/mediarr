#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
LOCAL_PROPERTIES="${PROJECT_DIR}/local.properties"
DEFAULT_SDK_DIR="${PROJECT_DIR}/.android-sdk"
DEFAULT_AVD="MediarrTvApi34"
DEFAULT_TIMEOUT=300
APK_PATH="${PROJECT_DIR}/app/build/outputs/apk/debug/app-debug.apk"
APP_ID="com.mediarr.tv"
EMULATOR_LOG="${EMULATOR_LOG:-/tmp/mediarr-tv-emulator.log}"

usage() {
  cat <<USAGE
Usage:
  $(basename "$0") [command] [options]

Commands:
  up       Start emulator and wait for boot completion.
  build    Build debug APK with Gradle (:app:assembleDebug).
  install  Install existing debug APK on running emulator.
  run      Build + up + install.
  status   Show SDK path, emulator process, adb devices, APK status.
  down     Stop all running emulator instances.

Options:
  --avd <name>      AVD name (default: ${DEFAULT_AVD})
  --headless        Launch emulator without window
  --timeout <sec>   Boot wait timeout in seconds (default: ${DEFAULT_TIMEOUT})
  --wipe-data       Pass -wipe-data to emulator on startup
  --cold-boot       Pass -no-snapshot-load to emulator on startup
  -h, --help        Show this help

Examples:
  $(basename "$0") up
  $(basename "$0") run --headless
  $(basename "$0") install
USAGE
}

log() {
  printf '[android-tv] %s\n' "$*"
}

die() {
  printf '[android-tv] ERROR: %s\n' "$*" >&2
  exit 1
}

strip_cr() {
  tr -d '\r\n'
}

resolve_sdk_dir() {
  if [[ -n "${ANDROID_SDK_ROOT:-}" ]]; then
    echo "${ANDROID_SDK_ROOT}"
    return
  fi
  if [[ -f "${LOCAL_PROPERTIES}" ]]; then
    local from_local
    from_local="$(awk -F'=' '/^sdk\.dir=/{print $2}' "${LOCAL_PROPERTIES}" | tail -n1)"
    if [[ -n "${from_local}" ]]; then
      echo "${from_local//\\:/:}"
      return
    fi
  fi
  echo "${DEFAULT_SDK_DIR}"
}

SDK_DIR="$(resolve_sdk_dir)"
ADB_BIN="${SDK_DIR}/platform-tools/adb"
EMULATOR_BIN="${SDK_DIR}/emulator/emulator"

ensure_tools() {
  [[ -x "${ADB_BIN}" ]] || die "adb not found at ${ADB_BIN}"
  [[ -x "${EMULATOR_BIN}" ]] || die "emulator not found at ${EMULATOR_BIN}"
  export ANDROID_SDK_ROOT="${SDK_DIR}"
  export ANDROID_HOME="${SDK_DIR}"
  export PATH="${SDK_DIR}/platform-tools:${SDK_DIR}/emulator:${PATH}"
}

adb_devices() {
  "${ADB_BIN}" devices | awk 'NR>1 && NF>0 {print $1"\t"$2}'
}

first_emulator_serial() {
  "${ADB_BIN}" devices | awk '/^emulator-[0-9]+\t(device|offline)$/ {print $1; exit}'
}

start_adb() {
  "${ADB_BIN}" start-server >/dev/null
}

wait_for_boot() {
  local timeout="$1"
  local deadline=$((SECONDS + timeout))
  local serial state boot

  while (( SECONDS < deadline )); do
    "${ADB_BIN}" reconnect offline >/dev/null 2>&1 || true
    serial="$(first_emulator_serial || true)"
    if [[ -n "${serial}" ]]; then
      state="$("${ADB_BIN}" -s "${serial}" get-state 2>/dev/null || true)"
      if [[ "${state}" == "device" ]]; then
        boot="$("${ADB_BIN}" -s "${serial}" shell getprop sys.boot_completed 2>/dev/null | strip_cr || true)"
        if [[ "${boot}" == "1" ]]; then
          echo "${serial}"
          return 0
        fi
      fi
    fi
    sleep 2
  done

  return 1
}

start_emulator() {
  local avd_name="$1"
  local timeout="$2"
  local headless="$3"
  local wipe_data="$4"
  local cold_boot="$5"

  local existing
  existing="$(first_emulator_serial || true)"
  if [[ -n "${existing}" ]]; then
    log "Emulator already detected: ${existing}"
  else
    local -a args
    args=("-avd" "${avd_name}" "-no-audio" "-netdelay" "none" "-netspeed" "full")
    if [[ "${headless}" == "1" ]]; then
      args+=("-no-window" "-gpu" "swiftshader_indirect")
    fi
    if [[ "${wipe_data}" == "1" ]]; then
      args+=("-wipe-data")
    fi
    if [[ "${cold_boot}" == "1" ]]; then
      args+=("-no-snapshot-load")
    fi

    log "Launching emulator '${avd_name}' (log: ${EMULATOR_LOG})"
    nohup "${EMULATOR_BIN}" "${args[@]}" >"${EMULATOR_LOG}" 2>&1 &
  fi

  log "Waiting for emulator boot (timeout: ${timeout}s)"
  local serial
  if ! serial="$(wait_for_boot "${timeout}")"; then
    die "Timed out waiting for emulator boot. Check log: ${EMULATOR_LOG}"
  fi

  log "Emulator is ready: ${serial}"
}

build_apk() {
  log "Building debug APK"
  (
    cd "${PROJECT_DIR}"
    ./gradlew :app:assembleDebug
  )
  log "Build complete: ${APK_PATH}"
}

install_apk() {
  [[ -f "${APK_PATH}" ]] || die "APK not found at ${APK_PATH}. Run 'build' or 'run' first."

  local serial
  serial="$(first_emulator_serial || true)"
  [[ -n "${serial}" ]] || die "No emulator detected. Run 'up' first."

  log "Installing APK on ${serial}"
  "${ADB_BIN}" -s "${serial}" wait-for-device
  "${ADB_BIN}" -s "${serial}" install -r -d "${APK_PATH}"
  log "Install complete"
}

show_status() {
  log "Project dir: ${PROJECT_DIR}"
  log "SDK dir: ${SDK_DIR}"
  if [[ -x "${EMULATOR_BIN}" ]]; then
    log "Available AVDs:"
    "${EMULATOR_BIN}" -list-avds | sed 's/^/  - /'
  else
    log "emulator binary not found"
  fi

  log "Running emulator processes:"
  ps -ef | awk '$0 ~ /\/emulator( |$)/ {print}' || true

  log "adb devices:"
  adb_devices || true

  if [[ -f "${APK_PATH}" ]]; then
    log "APK present: ${APK_PATH}"
  else
    log "APK missing: ${APK_PATH}"
  fi
}

stop_emulators() {
  local serial
  local found=0
  while read -r serial; do
    [[ -z "${serial}" ]] && continue
    found=1
    log "Stopping ${serial}"
    "${ADB_BIN}" -s "${serial}" emu kill || true
  done < <("${ADB_BIN}" devices | awk '/^emulator-[0-9]+\t/ {print $1}')

  if [[ "${found}" == "0" ]]; then
    log "No running emulator instances found"
  fi
}

COMMAND="up"
if [[ $# -gt 0 && "$1" != -* ]]; then
  COMMAND="$1"
  shift
fi

AVD_NAME="${DEFAULT_AVD}"
HEADLESS=0
TIMEOUT="${DEFAULT_TIMEOUT}"
WIPE_DATA=0
COLD_BOOT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --avd)
      [[ $# -ge 2 ]] || die "--avd requires a value"
      AVD_NAME="$2"
      shift 2
      ;;
    --headless)
      HEADLESS=1
      shift
      ;;
    --timeout)
      [[ $# -ge 2 ]] || die "--timeout requires a value"
      TIMEOUT="$2"
      shift 2
      ;;
    --wipe-data)
      WIPE_DATA=1
      shift
      ;;
    --cold-boot)
      COLD_BOOT=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

ensure_tools
start_adb

case "${COMMAND}" in
  up)
    start_emulator "${AVD_NAME}" "${TIMEOUT}" "${HEADLESS}" "${WIPE_DATA}" "${COLD_BOOT}"
    ;;
  build)
    build_apk
    ;;
  install)
    install_apk
    ;;
  run)
    build_apk
    start_emulator "${AVD_NAME}" "${TIMEOUT}" "${HEADLESS}" "${WIPE_DATA}" "${COLD_BOOT}"
    install_apk
    ;;
  status)
    show_status
    ;;
  down)
    stop_emulators
    ;;
  *)
    usage
    die "Unknown command: ${COMMAND}"
    ;;
esac

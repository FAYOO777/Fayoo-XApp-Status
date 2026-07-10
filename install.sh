#!/usr/bin/env bash
set -euo pipefail

APPLET_UUID="fayoo-xapp-status@fayoo"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/${APPLET_UUID}"
APPLET_PARENT="${HOME}/.local/share/cinnamon/applets"
TARGET_DIR="${APPLET_PARENT}/${APPLET_UUID}"
MODE="copy"

if [[ "${EUID}" -eq 0 ]]; then
    echo "Do not run this script as root or with sudo." >&2
    exit 1
fi

if [[ "${1:-}" == "--dev" ]]; then
    MODE="dev"
elif [[ $# -gt 0 ]]; then
    echo "Usage: ./install.sh [--dev]" >&2
    exit 1
fi

if [[ ! -d "${SOURCE_DIR}" ]]; then
    echo "Source applet directory not found: ${SOURCE_DIR}" >&2
    exit 1
fi

if [[ ! -f "${SOURCE_DIR}/metadata.json" || ! -f "${SOURCE_DIR}/applet.js" ]]; then
    echo "Source applet is incomplete: ${SOURCE_DIR}" >&2
    exit 1
fi

case "${TARGET_DIR}" in
    "${HOME}/.local/share/cinnamon/applets/${APPLET_UUID}") ;;
    *)
        echo "Refusing unexpected target path: ${TARGET_DIR}" >&2
        exit 1
        ;;
esac

mkdir -p "${APPLET_PARENT}"

if [[ -e "${TARGET_DIR}" || -L "${TARGET_DIR}" ]]; then
    echo "Target already exists: ${TARGET_DIR}" >&2
    echo "Run ./uninstall.sh first if you want to replace it." >&2
    exit 1
fi

if [[ "${MODE}" == "dev" ]]; then
    ln -s "${SOURCE_DIR}" "${TARGET_DIR}"
    echo "Development install created: ${TARGET_DIR} -> ${SOURCE_DIR}"
else
    cp -R "${SOURCE_DIR}" "${TARGET_DIR}"
    echo "Installed applet to: ${TARGET_DIR}"
fi

echo "Applet was not enabled. Cinnamon was not restarted."

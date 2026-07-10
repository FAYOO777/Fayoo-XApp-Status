#!/usr/bin/env bash
set -euo pipefail

APPLET_UUID="fayoo-xapp-status@fayoo"
TARGET_DIR="${HOME}/.local/share/cinnamon/applets/${APPLET_UUID}"

if [[ "${EUID}" -eq 0 ]]; then
    echo "Do not run this script as root or with sudo." >&2
    exit 1
fi

case "${TARGET_DIR}" in
    "${HOME}/.local/share/cinnamon/applets/${APPLET_UUID}") ;;
    *)
        echo "Refusing unexpected target path: ${TARGET_DIR}" >&2
        exit 1
        ;;
esac

if [[ ! -e "${TARGET_DIR}" && ! -L "${TARGET_DIR}" ]]; then
    echo "Nothing to uninstall: ${TARGET_DIR} does not exist."
    exit 0
fi

if [[ -L "${TARGET_DIR}" ]]; then
    LINK_TARGET="$(readlink "${TARGET_DIR}")"
    if [[ "${LINK_TARGET}" != *"/${APPLET_UUID}" ]]; then
        echo "Refusing to remove unexpected symlink target: ${TARGET_DIR} -> ${LINK_TARGET}" >&2
        exit 1
    fi
    unlink "${TARGET_DIR}"
    echo "Removed development symlink: ${TARGET_DIR}"
    exit 0
fi

if [[ ! -d "${TARGET_DIR}" ]]; then
    echo "Refusing to remove non-directory target: ${TARGET_DIR}" >&2
    exit 1
fi

if [[ ! -f "${TARGET_DIR}/metadata.json" ]]; then
    echo "Refusing to remove target without metadata.json: ${TARGET_DIR}" >&2
    exit 1
fi

if ! grep -q '"uuid": "fayoo-xapp-status@fayoo"' "${TARGET_DIR}/metadata.json"; then
    echo "Refusing to remove target with unexpected UUID: ${TARGET_DIR}" >&2
    exit 1
fi

for entry in "${TARGET_DIR}"/*; do
    case "$(basename "${entry}")" in
        applet.js|metadata.json) ;;
        *)
            echo "Refusing to remove directory containing unexpected file: ${entry}" >&2
            exit 1
            ;;
    esac
done

rm -- "${TARGET_DIR}/applet.js" "${TARGET_DIR}/metadata.json"
rmdir "${TARGET_DIR}"

echo "Removed applet: ${TARGET_DIR}"
echo "Project source and system applet were not modified."

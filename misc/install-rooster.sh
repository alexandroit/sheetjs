#!/usr/bin/env bash
set -euo pipefail

ROOSTER_VERSION="0.2.0"
ROOSTER_SHA256="028f9891283f9e49a8aa40057852f9adecab02cc2295d302b4a79ac2111a5aac"
ROOSTER_URL="https://github.com/SheetJS/rooster/releases/download/v${ROOSTER_VERSION}/rooster-v${ROOSTER_VERSION}-linux-amd64"
BIN_DIR="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/sheetjs-tools/bin"
TMP_FILE="$(mktemp)"

cleanup() {
	rm -f "$TMP_FILE"
}
trap cleanup EXIT

curl -fsSL "$ROOSTER_URL" -o "$TMP_FILE"
printf '%s  %s\n' "$ROOSTER_SHA256" "$TMP_FILE" | sha256sum --check --status
mkdir -p "$BIN_DIR"
install -m 0755 "$TMP_FILE" "$BIN_DIR/rooster"

if [ -n "${GITHUB_PATH:-}" ]; then
	printf '%s\n' "$BIN_DIR" >> "$GITHUB_PATH"
fi

printf 'Installed rooster %s with verified SHA-256\n' "$ROOSTER_VERSION"

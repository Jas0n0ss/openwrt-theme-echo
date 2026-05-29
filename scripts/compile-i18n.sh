#!/usr/bin/env bash
# Compile .po translation files to LuCI .lmo catalogs
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/dist/i18n}"

if ! command -v msgfmt >/dev/null 2>&1; then
	echo "msgfmt not found (install gettext package)" >&2
	exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT"

compile_po() {
	local po="$1"
	local domain="$2"
	local lang="$3"
	local lmo="$OUT/${domain}.${lang}.lmo"

	msgfmt -o "$lmo" "$po"
	echo "Compiled: $(basename "$lmo")"
}

compile_po "$ROOT/po/zh_Hans/luci-theme-echo.po" "luci-theme-echo" "zh_Hans"
compile_po "$ROOT/luci-app-echo-config/po/zh_Hans/luci-app-echo-config.po" "luci-app-echo-config" "zh_Hans"

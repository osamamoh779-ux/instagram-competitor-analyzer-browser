#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
export DISPLAY="${DISPLAY:-:1}"
export PORT="${PORT:-3100}"
export CONSENT_PORT="${CONSENT_PORT:-3101}"
exec node src/server.js

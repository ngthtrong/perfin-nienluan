#!/usr/bin/env bash
# Draft export helper (no -e flag) for use case diagram self-check.
# Usage: _export_draft.sh <basename> [basename ...]
set -uo pipefail
cd "$(dirname "$0")" || exit 1
DRAWIO=/snap/bin/drawio
for base in "$@"; do
  src="drawio/$base.drawio"
  out="/tmp/$base-draft.png"
  echo "=== $base ==="
  xvfb-run -a "$DRAWIO" -x -f png --width 2000 --disable-gpu --no-sandbox -o "$out" "$src"
  echo "drawio_exit=$?"
  if [[ -s "$out" ]]; then
    echo "OK $out ($(stat -c%s "$out") bytes)"
  else
    echo "MISSING/EMPTY $out"
  fi
done

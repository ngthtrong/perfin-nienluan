#!/usr/bin/env bash
# Re-render stale draw.io diagrams to pdf+png+svg.
# Usage: ./rerender-stale.sh [diagram-basename ...]
# With no args, re-renders every diagram whose .drawio is newer than its rendered output.
set -uo pipefail

cd "$(dirname "$0")" || exit 1
SRC_DIR=drawio
OUT_DIR=rendered
LOG=/tmp/rerender.log
: >"$LOG"

log() { printf '%s %s\n' "$(date +%H:%M:%S)" "$*" | tee -a "$LOG"; }

is_stale() {
  local src=$1 out=$2
  [[ ! -f $out ]] && return 0
  [[ $src -nt $out ]] && return 0
  return 1
}

# Render one diagram in one format. drawio occasionally dies with UnknownVizError;
# retry once before giving up so a transient failure does not leave a stale artifact.
render() {
  local base=$1 fmt=$2
  local src="$SRC_DIR/$base.drawio" out="$OUT_DIR/$base.$fmt"
  local attempt
  for attempt in 1 2; do
    local args=(-x -f "$fmt" --disable-gpu --no-sandbox -o "$out" "$src")
    [[ $fmt == png ]] && args=(-x -f png -s 2 --disable-gpu --no-sandbox -o "$out" "$src")
    if timeout 180 xvfb-run -a drawio "${args[@]}" >>"$LOG" 2>&1 && [[ -s $out ]]; then
      log "  OK   $base.$fmt ($(stat -c%s "$out") bytes)"
      return 0
    fi
    log "  retry $base.$fmt (attempt $attempt failed)"
    sleep 2
  done
  log "  FAIL $base.$fmt"
  return 1
}

if (($# > 0)); then
  targets=("$@")
else
  targets=()
  for src in "$SRC_DIR"/*.drawio; do
    base=$(basename "$src" .drawio)
    for fmt in pdf png svg; do
      if is_stale "$src" "$OUT_DIR/$base.$fmt"; then targets+=("$base"); break; fi
    done
  done
fi

log "targets: ${targets[*]:-(none)}"
failed=()
for base in "${targets[@]:-}"; do
  [[ -z $base ]] && continue
  log "=== $base ==="
  for fmt in pdf png svg; do
    render "$base" "$fmt" || failed+=("$base.$fmt")
  done
done

log "DONE. failed=${#failed[@]} ${failed[*]:-}"
((${#failed[@]} == 0))

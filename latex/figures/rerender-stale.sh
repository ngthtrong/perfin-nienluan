#!/usr/bin/env bash
# Re-render draw.io diagrams to pdf+png+svg.
# Usage:
#   ./rerender-stale.sh                  # Render stale diagrams only
#   ./rerender-stale.sh --all            # Render all numbered diagrams
#   ./rerender-stale.sh BASE [BASE ...]  # Render selected diagrams
#   ./rerender-stale.sh --help
set -uo pipefail

cd "$(dirname "$0")" || exit 1
SRC_DIR=drawio
OUT_DIR=rendered
DRAWIO=${DRAWIO:-/snap/bin/drawio}
LOG=/tmp/rerender.log
: >"$LOG"

log() { printf '%s %s\n' "$(date +%H:%M:%S)" "$*" | tee -a "$LOG"; }

usage() {
  cat <<'EOF'
Render Draw.io diagrams to PDF, PNG and SVG.

Usage:
  ./rerender-stale.sh
      Render diagrams whose .drawio source is newer than at least one output.

  ./rerender-stale.sh --all
      Render all numbered diagrams in drawio/.

  ./rerender-stale.sh BASE [BASE ...]
      Render selected diagrams. BASE is the filename without .drawio,
      for example: 03-deployment 14-usecase-overview.

  ./rerender-stale.sh --help
      Show this help.

Environment:
  DRAWIO=/path/to/drawio
      Override the Draw.io executable. Default: /snap/bin/drawio
EOF
}

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
    [[ $fmt == png ]] && args=(-x -f png --width 2200 --disable-gpu --no-sandbox -o "$out" "$src")
    if timeout 180 xvfb-run -a "$DRAWIO" "${args[@]}" >>"$LOG" 2>&1 && [[ -s $out ]]; then
      log "  OK   $base.$fmt ($(stat -c%s "$out") bytes)"
      return 0
    fi
    log "  retry $base.$fmt (attempt $attempt failed)"
    sleep 2
  done
  log "  FAIL $base.$fmt"
  return 1
}

mode=stale
case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
  --all)
    shift
    if (($# > 0)); then
      printf 'error: --all does not accept diagram names\n\n' >&2
      usage >&2
      exit 2
    fi
    mode=all
    ;;
  --*)
    printf 'error: unknown option: %s\n\n' "$1" >&2
    usage >&2
    exit 2
    ;;
  "")
    ;;
  *)
    mode=selected
    ;;
esac

mkdir -p "$OUT_DIR"
shopt -s nullglob

if [[ $mode == selected ]]; then
  targets=("$@")
elif [[ $mode == all ]]; then
  targets=()
  for src in "$SRC_DIR"/[0-9][0-9]-*.drawio; do
    targets+=("$(basename "$src" .drawio)")
  done
else
  targets=()
  for src in "$SRC_DIR"/[0-9][0-9]-*.drawio; do
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
  if [[ ! -f "$SRC_DIR/$base.drawio" ]]; then
    log "  FAIL source not found: $SRC_DIR/$base.drawio"
    failed+=("$base")
    continue
  fi
  for fmt in pdf png svg; do
    render "$base" "$fmt" || failed+=("$base.$fmt")
  done
done

log "DONE. failed=${#failed[@]} ${failed[*]:-}"
((${#failed[@]} == 0))

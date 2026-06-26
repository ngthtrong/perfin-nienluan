#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT="${PORT:-3000}"

MODE="lan"
RUN_MIGRATE=0
CLEAR_CACHE=1

BACKEND_PID=""
TUNNEL_PID=""
BACKEND_LOG=""
TUNNEL_LOG=""

usage() {
  cat <<EOF
Usage:
  ./start-app.sh [lan|tunnel|web] [--migrate] [--no-clear]

Modes:
  lan      Start backend and Expo LAN QR. Good when phone can reach this machine.
  tunnel   Start backend, backend localtunnel, and Expo tunnel for iOS Expo Go in WSL.
  web      Start backend and Expo web on http://localhost:8081.

Options:
  --migrate   Run backend migrations before starting the app.
  --no-clear  Do not clear Expo bundler cache.
  -h, --help  Show this help.

Examples:
  ./start-app.sh lan
  ./start-app.sh tunnel --migrate
  ./start-app.sh web
EOF
}

log() {
  printf '[perfin] %s\n' "$*" >&2
}

cleanup() {
  local exit_code=$?

  if [[ -n "$TUNNEL_PID" ]] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    log "Stopping backend tunnel..."
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi

  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    log "Stopping backend..."
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  [[ -n "$BACKEND_LOG" && -f "$BACKEND_LOG" ]] && rm -f "$BACKEND_LOG"
  [[ -n "$TUNNEL_LOG" && -f "$TUNNEL_LOG" ]] && rm -f "$TUNNEL_LOG"

  exit "$exit_code"
}

trap cleanup EXIT INT TERM

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      lan|tunnel|web)
        MODE="$1"
        ;;
      --migrate)
        RUN_MIGRATE=1
        ;;
      --no-clear)
        CLEAR_CACHE=0
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        printf 'Unknown argument: %s\n\n' "$1" >&2
        usage
        exit 1
        ;;
    esac
    shift
  done
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

wait_for_backend() {
  local url="http://127.0.0.1:$BACKEND_PORT/"
  local attempt

  for attempt in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  printf 'Backend did not become ready at %s\n' "$url" >&2
  if [[ -n "$BACKEND_LOG" && -f "$BACKEND_LOG" ]]; then
    printf '\nBackend log:\n' >&2
    tail -n 80 "$BACKEND_LOG" >&2 || true
  fi
  exit 1
}

start_backend() {
  if curl -fsS "http://127.0.0.1:$BACKEND_PORT/" >/dev/null 2>&1; then
    log "Backend already running on port $BACKEND_PORT."
    return
  fi

  BACKEND_LOG="$(mktemp -t perfin-backend.XXXXXX.log)"
  log "Starting backend on port $BACKEND_PORT..."
  (
    cd "$BACKEND_DIR"
    npm start
  ) >"$BACKEND_LOG" 2>&1 &
  BACKEND_PID=$!

  wait_for_backend
  log "Backend ready: http://127.0.0.1:$BACKEND_PORT"
}

run_migrations() {
  log "Running backend migrations..."
  (
    cd "$BACKEND_DIR"
    npm run migrate
  )
}

wait_for_tunnel_url() {
  local attempt
  local url

  for attempt in $(seq 1 45); do
    url="$(sed -n 's/^your url is: //p' "$TUNNEL_LOG" 2>/dev/null | tail -n 1)"
    if [[ -n "$url" ]]; then
      printf '%s\n' "$url"
      return 0
    fi
    sleep 1
  done

  printf 'Backend tunnel did not print a URL.\n' >&2
  if [[ -n "$TUNNEL_LOG" && -f "$TUNNEL_LOG" ]]; then
    printf '\nTunnel log:\n' >&2
    tail -n 80 "$TUNNEL_LOG" >&2 || true
  fi
  exit 1
}

start_backend_tunnel() {
  TUNNEL_LOG="$(mktemp -t perfin-backend-tunnel.XXXXXX.log)"
  log "Starting backend tunnel for port $BACKEND_PORT..."
  (
    cd "$BACKEND_DIR"
    npx --yes localtunnel --port "$BACKEND_PORT" --local-host 127.0.0.1
  ) >"$TUNNEL_LOG" 2>&1 &
  TUNNEL_PID=$!

  local tunnel_url
  tunnel_url="$(wait_for_tunnel_url)"
  log "Backend tunnel ready: $tunnel_url"

  if ! curl -fsS "$tunnel_url/" >/dev/null; then
    printf 'Backend tunnel URL is not responding: %s\n' "$tunnel_url" >&2
    exit 1
  fi

  printf '%s\n' "$tunnel_url"
}

start_expo() {
  local expo_mode="$1"
  local api_url="${2:-}"
  local clear_arg=()

  if [[ "$CLEAR_CACHE" -eq 1 ]]; then
    clear_arg=(--clear)
  fi

  log "Starting Expo ($expo_mode). Press Ctrl+C to stop all started services."
  cd "$FRONTEND_DIR"

  case "$expo_mode" in
    lan)
      npx expo start --lan "${clear_arg[@]}"
      ;;
    tunnel)
      EXPO_PUBLIC_API_URL="$api_url" npx expo start --tunnel "${clear_arg[@]}"
      ;;
    web)
      npx expo start --web "${clear_arg[@]}"
      ;;
  esac
}

main() {
  parse_args "$@"

  require_command node
  require_command npm
  require_command npx
  require_command curl

  if [[ "$RUN_MIGRATE" -eq 1 ]]; then
    run_migrations
  fi

  start_backend

  case "$MODE" in
    lan)
      start_expo lan
      ;;
    tunnel)
      local backend_tunnel_url
      backend_tunnel_url="$(start_backend_tunnel)"
      start_expo tunnel "$backend_tunnel_url"
      ;;
    web)
      start_expo web
      ;;
  esac
}

main "$@"

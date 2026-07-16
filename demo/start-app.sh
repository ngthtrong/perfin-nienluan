#!/usr/bin/env bash
# PERFIN — Start App Script
# Khởi chạy đầy đủ: Docker Redis + Python AI env + Backend + Worker + Tunnel + Expo
#
# Usage:
#   ./start-app.sh [lan|tunnel|web] [--migrate] [--no-clear] [--skip-ai-setup] [--download-models] [--no-docker]
#
# Modes:
#   tunnel  (Mặc định) Backend + localtunnel + Expo tunnel — dành cho WSL kiểm thử iOS Expo Go
#   lan     Backend + Expo LAN QR — khi điện thoại cùng mạng Wi-Fi với máy tính
#   web     Backend + Expo Web tại http://localhost:8081

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT="${PORT:-3000}"

MODE="tunnel"   # Mặc định tunnel (phù hợp WSL + iOS testing)
RUN_MIGRATE=0
CLEAR_CACHE=1
SKIP_AI_SETUP=0
DOWNLOAD_MODELS=0
SKIP_DOCKER=0

BACKEND_PID=""
WORKER_PID=""
TUNNEL_PID=""
BACKEND_LOG=""
WORKER_LOG=""
TUNNEL_LOG=""

# ── Help ────────────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage:
  ./start-app.sh [lan|tunnel|web] [OPTIONS]

Modes:
  tunnel   (Mặc định) Backend + localtunnel + Expo tunnel — WSL/iOS Expo Go.
  lan      Backend + Expo LAN QR — điện thoại cùng mạng Wi-Fi.
  web      Backend + Expo web tại http://localhost:8081.

Options:
  --migrate          Chạy DB migration trước khi khởi động.
  --no-clear         Không xóa Expo bundler cache.
  --skip-ai-setup    Bỏ qua bước setup Python AI venv (khi đã setup rồi).
  --download-models  Force download lại AI models dù đã cache.
  --no-docker        Không khởi động Redis container (khi đã chạy Redis thủ công).
  -h, --help         Hiển thị help này.

Examples:
  ./start-app.sh                        # tunnel mode (mặc định)
  ./start-app.sh tunnel --migrate       # tunnel + chạy migration
  ./start-app.sh lan --skip-ai-setup    # LAN mode, bỏ qua setup Python
  ./start-app.sh web                    # Web mode
  ./start-app.sh tunnel --download-models  # Tải lại AI models
EOF
}

# ── Logging ────────────────────────────────────────────────────────────────────
log() {
  printf '[perfin] %s\n' "$*" >&2
}

log_step() {
  printf '\n[perfin] ══ %s ══\n' "$*" >&2
}

# ── Cleanup ────────────────────────────────────────────────────────────────────
cleanup() {
  local exit_code=$?

  if [[ -n "$TUNNEL_PID" ]] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    log "Stopping backend tunnel..."
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi

  if [[ -n "$WORKER_PID" ]] && kill -0 "$WORKER_PID" 2>/dev/null; then
    log "Stopping worker..."
    kill "$WORKER_PID" 2>/dev/null || true
  fi

  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    log "Stopping backend..."
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  [[ -n "$BACKEND_LOG" && -f "$BACKEND_LOG" ]] && rm -f "$BACKEND_LOG"
  [[ -n "$WORKER_LOG" && -f "$WORKER_LOG" ]] && rm -f "$WORKER_LOG"
  [[ -n "$TUNNEL_LOG" && -f "$TUNNEL_LOG" ]] && rm -f "$TUNNEL_LOG"

  exit "$exit_code"
}

trap cleanup EXIT INT TERM

# ── Argument parsing ───────────────────────────────────────────────────────────
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
      --skip-ai-setup)
        SKIP_AI_SETUP=1
        ;;
      --no-docker)
        SKIP_DOCKER=1
        ;;
      --download-models)
        DOWNLOAD_MODELS=1
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

# ── Dependency checks ──────────────────────────────────────────────────────────
require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '[perfin] ERROR: Thiếu lệnh bắt buộc: %s\n' "$1" >&2
    printf '[perfin]   Cài đặt: %s\n' "${2:-Xem hướng dẫn cài đặt}" >&2
    exit 1
  fi
}

# ── Python AI Environment Setup ────────────────────────────────────────────────
setup_python_ai() {
  if [[ "$SKIP_AI_SETUP" -eq 1 ]]; then
    log "Bỏ qua setup Python AI (--skip-ai-setup)."
    return
  fi

  log_step "Python AI Environment"
  local venv_dir="$BACKEND_DIR/.venv-ai"
  local req_file="$BACKEND_DIR/requirements-ai.txt"

  if [[ ! -f "$req_file" ]]; then
    log "Không tìm thấy requirements-ai.txt — bỏ qua setup AI."
    return
  fi

  if [[ ! -d "$venv_dir" ]]; then
    log "Tạo Python virtual environment cho AI tại .venv-ai/ ..."
    if ! python3 -m venv "$venv_dir"; then
      log "WARN: Không tạo được venv. Kiểm tra python3 đã cài chưa."
      return
    fi

    log "Cài đặt dependencies AI (có thể mất vài phút lần đầu)..."
    # PyTorch CPU-only từ custom index
    "$venv_dir/bin/pip" install --quiet --upgrade pip
    "$venv_dir/bin/pip" install --quiet \
      --extra-index-url https://download.pytorch.org/whl/cpu \
      -r "$req_file"
    log "Python AI environment đã sẵn sàng."
  else
    log "Python AI environment đã tồn tại (.venv-ai/)."
  fi
}

# ── Download AI Models (first run) ────────────────────────────────────────────
download_ai_models() {
  if [[ "$SKIP_AI_SETUP" -eq 1 ]]; then
    return
  fi

  local venv_dir="$BACKEND_DIR/.venv-ai"
  local cache_dir="$BACKEND_DIR/.cache/media-ai"
  local python_bin="$venv_dir/bin/python"

  if [[ ! -x "$python_bin" ]]; then
    log "Python AI venv chưa sẵn sàng — bỏ qua tải model."
    return
  fi

  # Kiểm tra SPEECH_PROVIDER
  local speech_provider
  speech_provider="$(grep -E '^SPEECH_PROVIDER=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]')"

  if [[ "$speech_provider" != "phowhisper" ]]; then
    log "SPEECH_PROVIDER=$speech_provider — không cần download PhoWhisper model."
    return
  fi

  # Kiểm tra cache
  local model_cached=0
  if [[ -d "$cache_dir" ]] && find "$cache_dir" -name "*.bin" -o -name "*.safetensors" 2>/dev/null | grep -q .; then
    model_cached=1
  fi

  if [[ "$model_cached" -eq 1 && "$DOWNLOAD_MODELS" -eq 0 ]]; then
    log "PhoWhisper model đã có trong cache — bỏ qua download."
    return
  fi

  log_step "Tải PhoWhisper model (lần đầu)"
  log "Đang tải vinai/PhoWhisper-small... (cần internet, có thể mất 5-15 phút)"
  mkdir -p "$cache_dir"

  # Tạm tắt offline mode để download model lần đầu
  (
    cd "$BACKEND_DIR"
    MEDIA_AI_OFFLINE=0 \
    HF_HOME="$cache_dir/huggingface" \
    TRANSFORMERS_CACHE="$cache_dir/huggingface/hub" \
    "$python_bin" -c "
from transformers import pipeline
import os
model_name = os.environ.get('PHOWHISPER_MODEL', 'vinai/PhoWhisper-small')
print(f'Tải model: {model_name}')
pipe = pipeline('automatic-speech-recognition', model=model_name)
print('Model đã tải xong!')
"
  ) && log "PhoWhisper model đã sẵn sàng." || log "WARN: Tải model thất bại — voice sẽ dùng Google Speech hoặc mock fallback."
}

# ── Backend ────────────────────────────────────────────────────────────────────
wait_for_backend() {
  local url="http://127.0.0.1:$BACKEND_PORT/"
  local attempt

  for attempt in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  printf '[perfin] Backend không khởi động được tại %s\n' "$url" >&2
  if [[ -n "$BACKEND_LOG" && -f "$BACKEND_LOG" ]]; then
    printf '\nBackend log:\n' >&2
    tail -n 80 "$BACKEND_LOG" >&2 || true
  fi
  exit 1
}

start_backend() {
  log_step "Backend"

  if curl -fsS "http://127.0.0.1:$BACKEND_PORT/" >/dev/null 2>&1; then
    log "Backend đang chạy trên port $BACKEND_PORT."
    return
  fi

  BACKEND_LOG="$(mktemp -t perfin-backend.XXXXXX.log)"
  log "Khởi động backend trên port $BACKEND_PORT..."
  (
    cd "$BACKEND_DIR"
    npm start
  ) >"$BACKEND_LOG" 2>&1 &
  BACKEND_PID=$!

  wait_for_backend
  log "Backend sẵn sàng: http://127.0.0.1:$BACKEND_PORT"
}

# ── Worker (BullMQ) ────────────────────────────────────────────────────────────
start_worker() {
  log_step "Worker (BullMQ)"
  WORKER_LOG="$(mktemp -t perfin-worker.XXXXXX.log)"
  log "Khởi động BullMQ worker..."
  (
    cd "$BACKEND_DIR"
    npm run worker
  ) >"$WORKER_LOG" 2>&1 &
  WORKER_PID=$!
  sleep 2

  if kill -0 "$WORKER_PID" 2>/dev/null; then
    log "Worker đang chạy (PID $WORKER_PID)."
  elif grep -q 'not started (redis_unavailable)' "$WORKER_LOG" 2>/dev/null; then
    log "Worker chủ động tắt vì Redis không khả dụng; API và bộ nhớ fallback vẫn hoạt động."
    WORKER_PID=""
  elif grep -q 'not started (jobs_disabled)' "$WORKER_LOG" 2>/dev/null; then
    log "Worker đã tắt theo cấu hình JOBS_ENABLED."
    WORKER_PID=""
  else
    log "WARN: Worker thoát ngoài dự kiến. Log gần nhất:"
    tail -n 20 "$WORKER_LOG" >&2 || true
    WORKER_PID=""
  fi
}

# ── Docker Redis ───────────────────────────────────────────────────────────────
start_docker_redis() {
  if [[ "$SKIP_DOCKER" -eq 1 ]]; then
    log "Bỏ qua Docker (--no-docker)."
    return
  fi

  # Kiểm tra Redis đã chạy chưa
  if command -v redis-cli >/dev/null 2>&1 && redis-cli -h 127.0.0.1 -p 6379 ping 2>/dev/null | grep -q PONG; then
    log "Redis đã chạy trên 127.0.0.1:6379."
    return
  fi

  log_step "Docker Redis"

  # Kiểm tra Docker có sẵn không
  local docker_cmd="docker"
  if ! docker info >/dev/null 2>&1; then
    # Thử qua sg docker (khi user chưa trong group docker)
    if sg docker -c "docker info" >/dev/null 2>&1; then
      docker_cmd="sg docker -c"
      log "Dùng 'sg docker' (user chưa trong group docker)."
      log "Tip: chạy 'sudo usermod -aG docker \$USER && newgrp docker' để fix vĩnh viễn."
    else
      log "WARN: Docker không khả dụng. Redis sẽ dùng fallback in-memory."
      log "      Chạy: ./scripts/setup-docker-wsl.sh để cài Docker."
      return
    fi
  fi

  local compose_file="$ROOT_DIR/docker-compose.yml"
  if [[ ! -f "$compose_file" ]]; then
    # Fallback sang compose.redis.yml cũ
    compose_file="$BACKEND_DIR/compose.redis.yml"
  fi

  if [[ ! -f "$compose_file" ]]; then
    log "WARN: Không tìm thấy docker-compose.yml — bỏ qua Docker."
    return
  fi

  log "Khởi động Redis container..."
  if [[ "$docker_cmd" == "sg docker -c" ]]; then
    sg docker -c "docker compose -f $compose_file up -d" 2>&1 || true
  else
    docker compose -f "$compose_file" up -d 2>&1 || true
  fi

  # Chờ Redis ready
  local attempt
  for attempt in $(seq 1 15); do
    if redis-cli -h 127.0.0.1 -p 6379 ping 2>/dev/null | grep -q PONG 2>/dev/null; then
      log "Redis sẵn sàng (127.0.0.1:6379)."
      return
    fi
    # Fallback: thử qua docker exec
    if [[ "$docker_cmd" == "sg docker -c" ]]; then
      sg docker -c "docker exec perfin-redis redis-cli ping" 2>/dev/null | grep -q PONG && { log "Redis sẵn sàng (container)."; return; }
    else
      docker exec perfin-redis redis-cli ping 2>/dev/null | grep -q PONG && { log "Redis sẵn sàng (container)."; return; }
    fi
    sleep 1
  done

  log "WARN: Redis chưa phản hồi PONG. Backend sẽ dùng in-memory fallback."
}

run_migrations() {
  log_step "Database Migration"
  log "Đang chạy migration..."
  (
    cd "$BACKEND_DIR"
    npm run migrate
  )
  log "Migration hoàn tất."
}

# ── Backend Tunnel ─────────────────────────────────────────────────────────────
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

  printf '[perfin] Backend tunnel không in ra URL.\n' >&2
  if [[ -n "$TUNNEL_LOG" && -f "$TUNNEL_LOG" ]]; then
    printf '\nTunnel log:\n' >&2
    tail -n 80 "$TUNNEL_LOG" >&2 || true
  fi
  exit 1
}

start_backend_tunnel() {
  log_step "Backend Tunnel (localtunnel)"
  TUNNEL_LOG="$(mktemp -t perfin-backend-tunnel.XXXXXX.log)"
  log "Mở tunnel cho port $BACKEND_PORT..."
  (
    cd "$BACKEND_DIR"
    npx --yes localtunnel --port "$BACKEND_PORT" --local-host 127.0.0.1
  ) >"$TUNNEL_LOG" 2>&1 &
  TUNNEL_PID=$!

  local tunnel_url
  tunnel_url="$(wait_for_tunnel_url)"
  log "Backend tunnel sẵn sàng: $tunnel_url"

  # Verify tunnel thực sự respond
  if ! curl -fsS "$tunnel_url/" >/dev/null 2>/dev/null; then
    log "WARN: Tunnel URL không phản hồi ngay — có thể cần vài giây. Tiếp tục..."
  fi

  printf '%s\n' "$tunnel_url"
}

# ── Frontend (Expo) ────────────────────────────────────────────────────────────
start_expo() {
  local expo_mode="$1"
  local api_url="${2:-}"
  local clear_arg=()

  if [[ "$CLEAR_CACHE" -eq 1 ]]; then
    clear_arg=(--clear)
  fi

  log_step "Expo Frontend ($expo_mode)"
  log "Nhấn Ctrl+C để dừng tất cả services."
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

# ── Main ───────────────────────────────────────────────────────────────────────
main() {
  parse_args "$@"

  log_step "PERFIN — Khởi động ứng dụng (mode: $MODE)"

  # Kiểm tra các lệnh cơ bản
  require_command node "https://nodejs.org"
  require_command npm  "https://nodejs.org"
  require_command npx  "npm install -g npx"
  require_command curl "sudo apt install curl"

  # Kiểm tra ffmpeg nếu dùng phowhisper
  local speech_provider
  speech_provider="$(grep -E '^SPEECH_PROVIDER=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo '')"
  if [[ "$speech_provider" == "phowhisper" ]]; then
    if ! command -v ffmpeg >/dev/null 2>&1; then
      log "WARN: ffmpeg chưa được cài — tính năng voice có thể không hoạt động."
      log "      Cài đặt: sudo apt install ffmpeg"
    else
      log "ffmpeg: OK ($(ffmpeg -version 2>&1 | head -1 | cut -d' ' -f3))"
    fi
  fi

  # Docker Redis
  start_docker_redis

  # Setup Python AI environment
  setup_python_ai

  # Download AI models nếu cần
  download_ai_models

  # Migration
  if [[ "$RUN_MIGRATE" -eq 1 ]]; then
    run_migrations
  fi

  # Start backend
  start_backend

  # Start worker (BullMQ background jobs)
  start_worker

  # Start frontend
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

#!/usr/bin/env bash
# ============================================================================
# PERFIN — Start App Script (WSL + Docker)
# ============================================================================
# Khởi chạy đầy đủ: Docker Redis + Python AI env + Backend + Worker + Expo
# Local web là mặc định; LAN/tunnel chỉ được bật khi yêu cầu rõ ràng.
#
# Usage:
#   ./start-app.sh [web|lan|tunnel] [OPTIONS]
#
# Options:
#   --migrate          Chạy DB migration trước khi khởi động.
#   --no-clear         Không xóa Expo bundler cache.
#   --skip-ai-setup    Bỏ qua bước setup Python AI venv (khi đã setup rồi).
#   --download-models  Force download lại AI models dù đã cache.
#   --no-docker        Không khởi động Redis container (khi đã chạy Redis thủ công).
#   -h, --help         Hiển thị help này.
#
# Kết quả mặc định: mở Expo web và gọi trực tiếp backend local.
# ============================================================================

set -Eeuo pipefail

# ── Color codes ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ── Path setup ─────────────────────────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT="${PORT:-3000}"

# ── Flags ──────────────────────────────────────────────────────────────────────
MODE="web"
RUN_MIGRATE=0
CLEAR_CACHE=1
SKIP_AI_SETUP=0
DOWNLOAD_MODELS=0
SKIP_DOCKER=0

# ── Process tracking ──────────────────────────────────────────────────────────
BACKEND_PID=""
WORKER_PID=""
TUNNEL_PID=""
BACKEND_LOG=""
WORKER_LOG=""
TUNNEL_LOG=""
BACKEND_TUNNEL_URL=""

# ── Component status tracking ─────────────────────────────────────────────────
declare -A COMPONENT_STATUS
declare -A COMPONENT_DETAIL

report_status() {
  local name="$1" status="$2" detail="${3:-}"
  COMPONENT_STATUS["$name"]="$status"
  COMPONENT_DETAIL["$name"]="$detail"
}

# ── Logging ────────────────────────────────────────────────────────────────────
log()      { printf "${BLUE}[perfin]${NC} %s\n" "$*" >&2; }
log_ok()   { printf "${GREEN}[perfin] ✓${NC} %s\n" "$*" >&2; }
log_warn() { printf "${YELLOW}[perfin] ⚠${NC} %s\n" "$*" >&2; }
log_err()  { printf "${RED}[perfin] ✗${NC} %s\n" "$*" >&2; }
log_step() { printf "\n${CYAN}${BOLD}[perfin] ══ %s ══${NC}\n" "$*" >&2; }

# ── Help ────────────────────────────────────────────────────────────────────────
usage() {
  printf '%b' "
${BOLD}PERFIN — Start App (WSL + Docker)${NC}

${BOLD}Usage:${NC}
  ./start-app.sh [web|lan|tunnel] [OPTIONS]

${BOLD}Mô tả:${NC}
  Khởi chạy toàn bộ stack PERFIN trong WSL. Local web là chế độ mặc định
  và không phụ thuộc URL tunnel tạm thời.

${BOLD}Modes:${NC}
  web               (Mặc định) Expo web + API local tại port ${BACKEND_PORT}.
  lan               Expo LAN cho thiết bị cùng mạng.
  tunnel            Expo Go + backend localtunnel.

${BOLD}Options:${NC}
  --migrate          Chạy DB migration trước khi khởi động.
  --no-clear         Không xóa Expo bundler cache.
  --skip-ai-setup    Bỏ qua bước setup Python AI venv.
  --download-models  Force download lại AI models dù đã cache.
  --no-docker        Không khởi động Redis container (Redis đã chạy sẵn).
  -h, --help         Hiển thị help này.

${BOLD}Yêu cầu:${NC}
  • WSL (Ubuntu/Debian)
  • Docker Desktop hoặc Docker CE trong WSL
  • PostgreSQL chạy local
  • Node.js, npm
  • Expo Go trên điện thoại

${BOLD}Examples:${NC}
  ./start-app.sh                       # Local web (mặc định)
  ./start-app.sh web --migrate         # Local web + chạy migration
  ./start-app.sh tunnel                # Expo Go qua tunnel
  ./start-app.sh lan                   # Expo Go trong cùng mạng LAN
  ./start-app.sh --skip-ai-setup       # Bỏ qua AI setup (đã cài rồi)
  ./start-app.sh --no-docker           # Redis đã chạy thủ công

${BOLD}Dừng / Reset:${NC}
  ./stop-app.sh                        # Dừng tất cả services
  ./stop-app.sh --status               # Xem trạng thái hệ thống
  ./stop-app.sh --reset                # Dừng + dọn cache
  ./stop-app.sh --reset-all            # Full reset (DB + cache + Redis)
"
}

# ── Cleanup ────────────────────────────────────────────────────────────────────
cleanup() {
  local exit_code=$?

  printf "\n${BLUE}[perfin]${NC} Đang dừng các services...\n" >&2

  if [[ -n "$TUNNEL_PID" ]] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    log "Dừng backend tunnel..."
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi

  if [[ -n "$WORKER_PID" ]] && kill -0 "$WORKER_PID" 2>/dev/null; then
    log "Dừng BullMQ worker..."
    kill "$WORKER_PID" 2>/dev/null || true
  fi

  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    log "Dừng backend..."
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
      web|lan|tunnel)
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
        printf "${RED}Unknown argument: %s${NC}\n\n" "$1" >&2
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
    log_err "Thiếu lệnh bắt buộc: $1"
    log_err "  Cài đặt: ${2:-Xem hướng dẫn cài đặt}"
    exit 1
  fi
}

check_wsl() {
  if grep -qiE '(microsoft|wsl)' /proc/version 2>/dev/null; then
    log_ok "WSL: đã xác nhận"
    report_status "WSL" "ok" "WSL detected"
    return 0
  fi
  log_warn "Không phát hiện WSL — script được thiết kế cho WSL + Docker."
  report_status "WSL" "warn" "Không phát hiện WSL"
  return 0
}

# ── Docker Redis ───────────────────────────────────────────────────────────────
start_docker_redis() {
  if [[ "$SKIP_DOCKER" -eq 1 ]]; then
    log "Bỏ qua Docker (--no-docker)."
    report_status "Docker" "skip" "Bỏ qua theo --no-docker"
    # Kiểm tra Redis có sẵn không
    if command -v redis-cli >/dev/null 2>&1 && redis-cli -h 127.0.0.1 -p 6379 ping 2>/dev/null | grep -q PONG; then
      report_status "Redis" "ok" "Đang chạy (thủ công) — 127.0.0.1:6379"
    else
      report_status "Redis" "warn" "Không khả dụng — API dùng in-memory fallback"
    fi
    return
  fi

  log_step "Docker Redis"

  # Kiểm tra Redis đã chạy chưa
  if command -v redis-cli >/dev/null 2>&1 && redis-cli -h 127.0.0.1 -p 6379 ping 2>/dev/null | grep -q PONG; then
    log_ok "Redis đã chạy trên 127.0.0.1:6379."
    report_status "Docker" "ok" "Đang chạy"
    report_status "Redis" "ok" "Đang chạy — 127.0.0.1:6379"
    return
  fi

  # Kiểm tra Docker có sẵn không
  local docker_cmd="docker"
  if ! docker info >/dev/null 2>&1; then
    if sg docker -c "docker info" >/dev/null 2>&1; then
      docker_cmd="sg docker -c"
      log_warn "Dùng 'sg docker' (user chưa trong group docker)."
      log "Tip: chạy 'sudo usermod -aG docker \$USER && newgrp docker' để fix vĩnh viễn."
    else
      log_warn "Docker không khả dụng. Redis sẽ dùng in-memory fallback."
      log "      Chạy: ./scripts/setup-docker-wsl.sh để cài Docker."
      report_status "Docker" "fail" "Không khả dụng — chạy ./scripts/setup-docker-wsl.sh"
      report_status "Redis" "warn" "Không khả dụng — API dùng in-memory fallback"
      return
    fi
  fi

  report_status "Docker" "ok" "Docker daemon sẵn sàng"

  local compose_file="$ROOT_DIR/docker-compose.yml"
  if [[ ! -f "$compose_file" ]]; then
    compose_file="$BACKEND_DIR/compose.redis.yml"
  fi

  if [[ ! -f "$compose_file" ]]; then
    log_warn "Không tìm thấy docker-compose.yml — bỏ qua Docker."
    report_status "Redis" "warn" "Không tìm thấy compose file"
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
    # Thử redis-cli trước
    if command -v redis-cli >/dev/null 2>&1 && redis-cli -h 127.0.0.1 -p 6379 ping 2>/dev/null | grep -q PONG; then
      log_ok "Redis sẵn sàng (127.0.0.1:6379)."
      report_status "Redis" "ok" "Container hoạt động — 127.0.0.1:6379"
      return
    fi
    # Fallback: thử qua docker exec
    if [[ "$docker_cmd" == "sg docker -c" ]]; then
      sg docker -c "docker exec perfin-redis redis-cli ping" 2>/dev/null | grep -q PONG && {
        log_ok "Redis sẵn sàng (container)."
        report_status "Redis" "ok" "Container hoạt động (qua docker exec)"
        return
      }
    else
      docker exec perfin-redis redis-cli ping 2>/dev/null | grep -q PONG && {
        log_ok "Redis sẵn sàng (container)."
        report_status "Redis" "ok" "Container hoạt động (qua docker exec)"
        return
      }
    fi
    sleep 1
  done

  log_warn "Redis chưa phản hồi PONG. Backend sẽ dùng in-memory fallback."
  report_status "Redis" "warn" "Container chạy nhưng chưa phản hồi PONG — in-memory fallback"
}

# ── PostgreSQL check ───────────────────────────────────────────────────────────
check_postgresql() {
  log_step "PostgreSQL"

  local db_host db_port db_name db_user
  db_host="$(grep -E '^DB_HOST=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo 'localhost')"
  db_port="$(grep -E '^DB_PORT=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo '5432')"
  db_name="$(grep -E '^DB_NAME=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo 'demodb')"
  db_user="$(grep -E '^DB_USER=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo 'postgres')"

  if command -v pg_isready >/dev/null 2>&1; then
    if pg_isready -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" >/dev/null 2>&1; then
      log_ok "PostgreSQL sẵn sàng ($db_host:$db_port/$db_name)"
      report_status "PostgreSQL" "ok" "$db_host:$db_port/$db_name"
      return
    fi
  fi

  # Fallback: kiểm tra bằng cách thử kết nối qua nc
  if command -v nc >/dev/null 2>&1; then
    if nc -z "$db_host" "$db_port" 2>/dev/null; then
      log_ok "PostgreSQL port reachable ($db_host:$db_port)"
      report_status "PostgreSQL" "ok" "Port mở — $db_host:$db_port/$db_name"
      return
    fi
  fi

  log_warn "PostgreSQL không phản hồi tại $db_host:$db_port."
  log_err "Core API cần PostgreSQL; dừng khởi động để tránh mở một giao diện không hoạt động."
  log "  Trong WSL, thử: sudo service postgresql start"
  log "  Sau đó kiểm tra: pg_isready -h $db_host -p $db_port"
  report_status "PostgreSQL" "fail" "Không phản hồi — $db_host:$db_port/$db_name"
  return 1
}

# ── Python AI Environment Setup ────────────────────────────────────────────────
setup_python_ai() {
  if [[ "$SKIP_AI_SETUP" -eq 1 ]]; then
    log "Bỏ qua setup Python AI (--skip-ai-setup)."
    report_status "Python AI" "skip" "Bỏ qua theo --skip-ai-setup"
    return
  fi

  log_step "Python AI Environment"
  local venv_dir="$BACKEND_DIR/.venv-ai"
  local req_file="$BACKEND_DIR/requirements-ai.txt"

  if [[ ! -f "$req_file" ]]; then
    log "Không tìm thấy requirements-ai.txt — bỏ qua setup AI."
    report_status "Python AI" "skip" "Không có requirements-ai.txt"
    return
  fi

  if [[ ! -d "$venv_dir" ]]; then
    log "Tạo Python virtual environment cho AI tại .venv-ai/ ..."
    if ! python3 -m venv "$venv_dir"; then
      log_warn "Không tạo được venv. Kiểm tra python3 đã cài chưa."
      report_status "Python AI" "fail" "Không tạo được venv"
      return
    fi

    log "Cài đặt dependencies AI (có thể mất vài phút lần đầu)..."
    "$venv_dir/bin/pip" install --quiet --upgrade pip
    "$venv_dir/bin/pip" install --quiet \
      --extra-index-url https://download.pytorch.org/whl/cpu \
      -r "$req_file"
    log_ok "Python AI environment đã sẵn sàng."
    report_status "Python AI" "ok" "Mới tạo venv + cài dependencies"
  else
    log_ok "Python AI environment đã tồn tại (.venv-ai/)."
    report_status "Python AI" "ok" "Venv đã tồn tại"
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
    log_ok "PhoWhisper model đã có trong cache — bỏ qua download."
    report_status "AI Models" "ok" "Đã cache"
    return
  fi

  log_step "Tải PhoWhisper model (lần đầu)"
  log "Đang tải vinai/PhoWhisper-small... (cần internet, có thể mất 5-15 phút)"
  mkdir -p "$cache_dir"

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
  ) && {
    log_ok "PhoWhisper model đã sẵn sàng."
    report_status "AI Models" "ok" "PhoWhisper đã tải"
  } || {
    log_warn "Tải model thất bại — voice sẽ dùng Google Speech hoặc mock fallback."
    report_status "AI Models" "warn" "Tải PhoWhisper thất bại — dùng fallback"
  }
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

  log_err "Backend không khởi động được tại $url"
  if [[ -n "$BACKEND_LOG" && -f "$BACKEND_LOG" ]]; then
    printf '\nBackend log:\n' >&2
    tail -n 80 "$BACKEND_LOG" >&2 || true
  fi
  exit 1
}

start_backend() {
  log_step "Backend"

  if curl -fsS "http://127.0.0.1:$BACKEND_PORT/" >/dev/null 2>&1; then
    log_ok "Backend đang chạy trên port $BACKEND_PORT."
    report_status "Backend" "ok" "Đã chạy sẵn — port $BACKEND_PORT"
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
  log_ok "Backend sẵn sàng: http://127.0.0.1:$BACKEND_PORT"
  report_status "Backend" "ok" "http://127.0.0.1:$BACKEND_PORT (PID $BACKEND_PID)"
}

# ── Backend health check ──────────────────────────────────────────────────────
check_backend_health() {
  log_step "Backend Health Check"

  local health_url="http://127.0.0.1:$BACKEND_PORT/api/health/ready"
  local health_response

  health_response="$(curl -sS "$health_url" 2>/dev/null || true)"

  if [[ -z "$health_response" ]]; then
    log_err "Không lấy được readiness status từ backend."
    return 1
  fi

  # Parse health response
  local ready status db_ok redis_status core_api ephemeral proactive_jobs

  ready="$(echo "$health_response" | grep -oP '"ready"\s*:\s*\K(true|false)' | head -1 || echo 'unknown')"
  status="$(echo "$health_response" | grep -oP '"status"\s*:\s*"\K[^"]+' | head -1 || echo 'unknown')"
  db_ok="$(echo "$health_response" | grep -oP '"database"\s*:\s*\{[^}]*"ok"\s*:\s*\K(true|false)' || echo 'unknown')"
  redis_status="$(echo "$health_response" | grep -oP '"redis"\s*:\s*\{[^}]*"status"\s*:\s*"\K[^"]+' || echo 'unknown')"
  core_api="$(echo "$health_response" | grep -oP '"core_api"\s*:\s*"\K[^"]+' || echo 'unknown')"
  ephemeral="$(echo "$health_response" | grep -oP '"ephemeral_state"\s*:\s*"\K[^"]+' || echo 'unknown')"
  proactive_jobs="$(echo "$health_response" | grep -oP '"proactive_jobs"\s*:\s*"\K[^"]+' || echo 'unknown')"

  if [[ "$ready" == "true" ]]; then
    if [[ "$status" == "degraded" ]]; then
      log_warn "Backend: $status (API hoạt động nhưng một số phụ thuộc không khả dụng)"
    else
      log_ok "Backend: $status"
    fi
  else
    log_err "Backend: $status"
  fi

  # Ghi log chi tiết
  printf "  ${DIM}├─ Database:       %s${NC}\n" "$([[ "$db_ok" == "true" ]] && echo "✓ ready" || echo "✗ unavailable")" >&2
  printf "  ${DIM}├─ Redis:          %s${NC}\n" "$redis_status" >&2
  printf "  ${DIM}├─ Core API:       %s${NC}\n" "$core_api" >&2
  printf "  ${DIM}├─ Ephemeral:      %s${NC}\n" "$ephemeral" >&2
  printf "  ${DIM}└─ Proactive Jobs: %s${NC}\n" "$proactive_jobs" >&2

  # Cập nhật report
  if [[ "$db_ok" == "true" ]]; then
    report_status "DB Connection" "ok" "Backend kết nối DB thành công"
  else
    report_status "DB Connection" "fail" "Backend không kết nối được DB"
  fi

  if [[ "$redis_status" == "ready" ]]; then
    report_status "Redis (Backend)" "ok" "Backend kết nối Redis thành công"
  elif [[ "$redis_status" == "unavailable" ]]; then
    report_status "Redis (Backend)" "warn" "Không khả dụng — dùng in-memory fallback"
  else
    report_status "Redis (Backend)" "skip" "Redis disabled theo cấu hình"
  fi

  report_status "Proactive Jobs" "$(
    case "$proactive_jobs" in
      ready) echo "ok";;
      disabled_redis_unavailable) echo "warn";;
      disabled_by_config) echo "skip";;
      *) echo "warn";;
    esac
  )" "$proactive_jobs"

  if [[ "$ready" != "true" ]]; then
    log_err "Readiness thất bại; không khởi động frontend trên một core API chưa sẵn sàng."
    return 1
  fi
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
    log_ok "Worker đang chạy (PID $WORKER_PID)."
    report_status "BullMQ Worker" "ok" "Đang chạy — PID $WORKER_PID"
  elif grep -q 'not started (redis_unavailable)' "$WORKER_LOG" 2>/dev/null; then
    log_warn "Worker tắt vì Redis không khả dụng; API và bộ nhớ fallback vẫn hoạt động."
    report_status "BullMQ Worker" "warn" "Tắt — Redis không khả dụng"
    WORKER_PID=""
  elif grep -q 'not started (jobs_disabled)' "$WORKER_LOG" 2>/dev/null; then
    log "Worker đã tắt theo cấu hình JOBS_ENABLED."
    report_status "BullMQ Worker" "skip" "Tắt theo cấu hình JOBS_ENABLED=false"
    WORKER_PID=""
  else
    log_warn "Worker thoát ngoài dự kiến. Log gần nhất:"
    tail -n 20 "$WORKER_LOG" >&2 || true
    report_status "BullMQ Worker" "fail" "Thoát ngoài dự kiến"
    WORKER_PID=""
  fi
}

# ── Migration ──────────────────────────────────────────────────────────────────
run_migrations() {
  log_step "Database Migration"
  log "Đang chạy migration..."
  (
    cd "$BACKEND_DIR"
    npm run migrate
  )
  log_ok "Migration hoàn tất."
  report_status "Migration" "ok" "Đã chạy thành công"
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

  log_err "Backend tunnel không in ra URL."
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

  BACKEND_TUNNEL_URL="$(wait_for_tunnel_url)"
  log_ok "Backend tunnel sẵn sàng: $BACKEND_TUNNEL_URL"

  # Verify tunnel thực sự respond
  if ! curl -fsS "$BACKEND_TUNNEL_URL/api/health/live" >/dev/null 2>/dev/null; then
    log_err "Tunnel đã cấp URL nhưng chưa chuyển tiếp được tới backend."
    return 1
  fi

  report_status "Backend Tunnel" "ok" "$BACKEND_TUNNEL_URL"
}

# ── Check provider config ─────────────────────────────────────────────────────
check_ai_providers() {
  log_step "AI Providers"

  local ai_provider gemini_key ocr_provider speech_provider

  ai_provider="$(grep -E '^AI_PROVIDER=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo '')"
  gemini_key="$(grep -E '^GEMINI_API_KEY=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo '')"
  ocr_provider="$(grep -E '^OCR_PROVIDER=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo '')"
  speech_provider="$(grep -E '^SPEECH_PROVIDER=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo '')"

  # Gemini
  if [[ -n "$gemini_key" && "$gemini_key" != "your-key-here" ]]; then
    log_ok "Gemini API: cấu hình (provider=$ai_provider)"
    report_status "Gemini API" "ok" "Có API key — provider=$ai_provider"
  else
    log_warn "Gemini API: không có key — dùng local parser fallback"
    report_status "Gemini API" "warn" "Không có API key — dùng local parser"
  fi

  # OCR
  if [[ "$ocr_provider" == "paddleocr" ]]; then
    if [[ -x "$BACKEND_DIR/.venv-ai/bin/python" ]]; then
      log_ok "OCR: PaddleOCR (Python venv sẵn sàng)"
      report_status "OCR Provider" "ok" "PaddleOCR — venv sẵn sàng"
    else
      log_warn "OCR: PaddleOCR cấu hình nhưng Python venv chưa sẵn sàng"
      report_status "OCR Provider" "warn" "PaddleOCR — venv chưa sẵn sàng"
    fi
  elif [[ "$ocr_provider" == "google" ]]; then
    log_ok "OCR: Google Vision"
    report_status "OCR Provider" "ok" "Google Vision"
  else
    log "OCR: $ocr_provider"
    report_status "OCR Provider" "ok" "$ocr_provider"
  fi

  # Speech
  if [[ "$speech_provider" == "phowhisper" ]]; then
    if [[ -x "$BACKEND_DIR/.venv-ai/bin/python" ]]; then
      log_ok "Speech: PhoWhisper (Python venv sẵn sàng)"
      report_status "Speech Provider" "ok" "PhoWhisper — venv sẵn sàng"
    else
      log_warn "Speech: PhoWhisper cấu hình nhưng Python venv chưa sẵn sàng"
      report_status "Speech Provider" "warn" "PhoWhisper — venv chưa sẵn sàng"
    fi
  elif [[ "$speech_provider" == "google" ]]; then
    log_ok "Speech: Google Speech-to-Text"
    report_status "Speech Provider" "ok" "Google Speech-to-Text"
  else
    log "Speech: $speech_provider"
    report_status "Speech Provider" "ok" "$speech_provider"
  fi

  # ffmpeg check (cần cho PhoWhisper)
  if [[ "$speech_provider" == "phowhisper" ]]; then
    if command -v ffmpeg >/dev/null 2>&1; then
      log_ok "ffmpeg: OK ($(ffmpeg -version 2>&1 | head -1 | cut -d' ' -f3))"
      report_status "ffmpeg" "ok" "$(ffmpeg -version 2>&1 | head -1 | cut -d' ' -f3)"
    else
      log_warn "ffmpeg chưa được cài — tính năng voice có thể không hoạt động."
      log "      Cài đặt: sudo apt install ffmpeg"
      report_status "ffmpeg" "warn" "Chưa cài — sudo apt install ffmpeg"
    fi
  fi
}

# ── Component Status Report ────────────────────────────────────────────────────
print_status_report() {
  printf "\n" >&2
  printf "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}\n" >&2
  printf "${CYAN}${BOLD}║          PERFIN — BÁO CÁO TRẠNG THÁI THÀNH PHẦN           ║${NC}\n" >&2
  printf "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}\n" >&2
  printf "\n" >&2

  local has_issue=0
  local component status detail icon color

  # Sắp xếp thứ tự hiển thị
  local ordered_components=(
    "WSL"
    "Docker"
    "Redis"
    "PostgreSQL"
    "DB Connection"
    "Backend"
    "BullMQ Worker"
    "Backend Tunnel"
    "Redis (Backend)"
    "Proactive Jobs"
    "Python AI"
    "AI Models"
    "Gemini API"
    "OCR Provider"
    "Speech Provider"
    "ffmpeg"
    "Migration"
    "Expo Frontend"
  )

  for component in "${ordered_components[@]}"; do
    status="${COMPONENT_STATUS[$component]:-}"
    detail="${COMPONENT_DETAIL[$component]:-}"
    [[ -z "$status" ]] && continue

    case "$status" in
      ok)
        icon="✓"
        color="$GREEN"
        ;;
      warn)
        icon="⚠"
        color="$YELLOW"
        has_issue=1
        ;;
      fail)
        icon="✗"
        color="$RED"
        has_issue=1
        ;;
      skip)
        icon="○"
        color="$DIM"
        ;;
      *)
        icon="?"
        color="$NC"
        ;;
    esac

    printf "  ${color}${icon}${NC} ${BOLD}%-20s${NC} ${DIM}%s${NC}\n" "$component" "$detail" >&2
  done

  printf "\n" >&2

  if [[ "$has_issue" -eq 1 ]]; then
    printf "${YELLOW}${BOLD}  ⚠ Một số thành phần không hoạt động đầy đủ.${NC}\n" >&2
    printf "${DIM}  Xem chi tiết ở trên. API cốt lõi vẫn hoạt động nhờ fallback.${NC}\n" >&2
  else
    printf "${GREEN}${BOLD}  ✓ Tất cả thành phần hoạt động bình thường.${NC}\n" >&2
  fi

  printf "\n" >&2
}

# ── Expo Frontend ──────────────────────────────────────────────────────────────
start_expo() {
  local expo_mode="$1"
  local api_url="${2:-}"
  local clear_arg=()

  if [[ "$CLEAR_CACHE" -eq 1 ]]; then
    clear_arg=(--clear)
  fi

  log_step "Expo Frontend ($expo_mode)"
  report_status "Expo Frontend" "ok" "Đang khởi chạy — $expo_mode mode"

  case "$expo_mode" in
    web)
      log_ok "Web local: http://localhost:8081"
      log "Backend API: http://127.0.0.1:$BACKEND_PORT"
      ;;
    lan)
      log "Quét mã QR bằng Expo Go; thiết bị phải cùng mạng LAN."
      ;;
    tunnel)
      log "Quét mã QR bằng Expo Go. Backend API: $api_url"
      ;;
  esac

  # In báo cáo trạng thái trước khi chạy Expo
  print_status_report

  cd "$FRONTEND_DIR"
  case "$expo_mode" in
    web)
      EXPO_PUBLIC_API_URL= npx expo start --web "${clear_arg[@]}"
      ;;
    lan)
      EXPO_PUBLIC_API_URL= npx expo start --lan "${clear_arg[@]}"
      ;;
    tunnel)
      EXPO_PUBLIC_API_URL="$api_url" npx expo start --tunnel "${clear_arg[@]}"
      ;;
  esac
}

# ── Pre-flight: detect orphan processes ────────────────────────────────────────
check_orphan_processes() {
  local orphans=()

  # Backend
  local backend_pids
  backend_pids="$(pgrep -f "node.*${BACKEND_DIR}/index.js" 2>/dev/null || true)"
  if [[ -z "$backend_pids" ]] && command -v lsof >/dev/null 2>&1; then
    backend_pids="$(lsof -ti :"$BACKEND_PORT" -sTCP:LISTEN 2>/dev/null || true)"
  fi
  [[ -n "$backend_pids" ]] && orphans+=("Backend (PID: $(echo $backend_pids | tr '\n' ' '))")

  # Worker
  local worker_pids
  worker_pids="$(pgrep -f "node.*${BACKEND_DIR}/scripts/worker.js" 2>/dev/null || true)"
  [[ -n "$worker_pids" ]] && orphans+=("BullMQ Worker (PID: $(echo $worker_pids | tr '\n' ' '))")

  # Tunnel
  local tunnel_pids
  tunnel_pids="$(pgrep -f "localtunnel.*--port.*${BACKEND_PORT}" 2>/dev/null || true)"
  [[ -n "$tunnel_pids" ]] && orphans+=("Backend Tunnel (PID: $(echo $tunnel_pids | tr '\n' ' '))")

  # Expo
  local expo_pids
  expo_pids="$(pgrep -f "expo.*start" 2>/dev/null || true)"
  [[ -n "$expo_pids" ]] && orphans+=("Expo/Metro (PID: $(echo $expo_pids | tr '\n' ' '))")

  if [[ ${#orphans[@]} -gt 0 ]]; then
    log_warn "Phát hiện PERFIN processes từ phiên trước:"
    for o in "${orphans[@]}"; do
      printf "  ${YELLOW}  → %s${NC}\n" "$o" >&2
    done
    log_err "Hãy chạy ./stop-app.sh trước để tránh dùng backend hoặc bundle chứa cấu hình cũ."
    return 1
  fi
}

# ── Main ───────────────────────────────────────────────────────────────────────
main() {
  parse_args "$@"

  printf "\n" >&2
  printf "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}\n" >&2
  printf "${CYAN}${BOLD}║              PERFIN — Khởi động ứng dụng                    ║${NC}\n" >&2
  printf "${CYAN}${BOLD}║              Môi trường: WSL + Docker                       ║${NC}\n" >&2
  printf "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}\n" >&2
  printf "\n" >&2
  log "Chế độ: $MODE"

  # Kiểm tra orphan processes từ phiên trước
  check_orphan_processes

  # Kiểm tra WSL
  check_wsl

  # Kiểm tra các lệnh cơ bản
  require_command node "https://nodejs.org"
  require_command npm  "https://nodejs.org"
  require_command npx  "npm install -g npx"
  require_command curl "sudo apt install curl"

  # Docker Redis
  start_docker_redis

  # Kiểm tra PostgreSQL
  check_postgresql

  # Setup Python AI environment
  setup_python_ai

  # Download AI models nếu cần
  download_ai_models

  # Kiểm tra AI providers
  check_ai_providers

  # Migration
  if [[ "$RUN_MIGRATE" -eq 1 ]]; then
    run_migrations
  fi

  # Start backend
  start_backend

  # Backend health check (sau khi backend đã sẵn sàng)
  check_backend_health

  # Start worker (BullMQ background jobs)
  start_worker

  # Chỉ tunnel mode mới phụ thuộc localtunnel; local web gọi API trực tiếp.
  case "$MODE" in
    web)
      start_expo web
      ;;
    lan)
      start_expo lan
      ;;
    tunnel)
      start_backend_tunnel
      start_expo tunnel "$BACKEND_TUNNEL_URL"
      ;;
  esac
}

main "$@"

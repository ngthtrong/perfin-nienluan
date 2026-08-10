#!/usr/bin/env bash
# ============================================================================
# PERFIN — Stop / Reset Script (WSL + Docker)
# ============================================================================
# Dừng sạch hoặc reset toàn bộ hệ thống PERFIN.
#
# Usage:
#   ./stop-app.sh              # Dừng tất cả services
#   ./stop-app.sh --status     # Xem trạng thái hiện tại
#   ./stop-app.sh --reset      # Dừng + dọn cache/Redis/uploads
#   ./stop-app.sh --reset-db   # Dừng + reset DB (migrate:fresh + seed)
#   ./stop-app.sh --reset-all  # Dừng + reset TOÀN BỘ (DB + cache + Redis + uploads)
# ============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT="${PORT:-3000}"

# ── Colors ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

log()      { printf "${BLUE}[perfin]${NC} %s\n" "$*"; }
log_ok()   { printf "${GREEN}[perfin] ✓${NC} %s\n" "$*"; }
log_warn() { printf "${YELLOW}[perfin] ⚠${NC} %s\n" "$*"; }
log_err()  { printf "${RED}[perfin] ✗${NC} %s\n" "$*"; }
log_step() { printf "\n${CYAN}${BOLD}[perfin] ══ %s ══${NC}\n" "$*"; }

# ── Docker command wrapper ─────────────────────────────────────────────────────
DOCKER_PREFIX=""

docker_cmd() {
  if [[ -n "$DOCKER_PREFIX" ]]; then
    sg docker -c "$*"
  else
    "$@"
  fi
}

detect_docker() {
  if docker info &>/dev/null 2>&1; then
    return 0
  fi
  if sg docker -c "docker info" &>/dev/null 2>&1; then
    DOCKER_PREFIX="sg"
    return 0
  fi
  return 1
}

# ── Help ────────────────────────────────────────────────────────────────────────
usage() {
  printf '%b' "
${BOLD}PERFIN — Stop / Reset App (WSL + Docker)${NC}

${BOLD}Usage:${NC}
  ./stop-app.sh [ACTION] [OPTIONS]

${BOLD}Actions:${NC}
  ${BOLD}(mặc định)${NC}     Dừng tất cả PERFIN services (backend, worker, tunnel, expo).
  ${BOLD}--status${NC}       Hiển thị trạng thái hiện tại của các services.
  ${BOLD}--reset${NC}        Dừng services + dọn cache (Expo, Redis data, uploads).
  ${BOLD}--reset-db${NC}     Dừng services + reset database (migrate:fresh + seed).
  ${BOLD}--reset-all${NC}    Dừng services + reset TOÀN BỘ (DB + cache + Redis + uploads).

${BOLD}Options:${NC}
  ${BOLD}--keep-docker${NC}  Không dừng Redis container (giữ Docker chạy).
  ${BOLD}--force${NC}        Không hỏi xác nhận khi reset.
  ${BOLD}-h, --help${NC}     Hiển thị help này.

${BOLD}Examples:${NC}
  ./stop-app.sh                    # Dừng sạch tất cả
  ./stop-app.sh --status           # Xem ai đang chạy
  ./stop-app.sh --reset            # Dừng + dọn cache
  ./stop-app.sh --reset-db --force # Reset DB không hỏi xác nhận
  ./stop-app.sh --reset-all        # Full reset
"
}

# ── Argument parsing ───────────────────────────────────────────────────────────
ACTION="stop"      # stop | status | reset | reset-db | reset-all
KEEP_DOCKER=0
FORCE=0

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --status)
        ACTION="status"
        ;;
      --reset)
        ACTION="reset"
        ;;
      --reset-db)
        ACTION="reset-db"
        ;;
      --reset-all)
        ACTION="reset-all"
        ;;
      --keep-docker)
        KEEP_DOCKER=1
        ;;
      --force)
        FORCE=1
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

# ── Process discovery ──────────────────────────────────────────────────────────
# Tìm và trả về PID của các tiến trình liên quan đến PERFIN

find_backend_pids() {
  # Tìm node process chạy backend index.js
  pgrep -f "node.*${BACKEND_DIR}/index.js" 2>/dev/null || true
  # Fallback: tìm process lắng nghe port backend
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti :"$BACKEND_PORT" -sTCP:LISTEN 2>/dev/null || true
  fi
}

find_worker_pids() {
  pgrep -f "node.*${BACKEND_DIR}/scripts/worker.js" 2>/dev/null || true
  pgrep -f "node.*worker\.js.*perfin" 2>/dev/null || true
}

find_tunnel_pids() {
  pgrep -f "localtunnel.*--port.*${BACKEND_PORT}" 2>/dev/null || true
  pgrep -f "lt.*--port.*${BACKEND_PORT}" 2>/dev/null || true
}

find_expo_pids() {
  pgrep -f "expo.*start" 2>/dev/null || true
  pgrep -f "@expo/cli" 2>/dev/null || true
  pgrep -f "metro.*bundler" 2>/dev/null || true
}

# Deduplicate PIDs
unique_pids() {
  echo "$@" | tr ' ' '\n' | sort -un | grep -v '^$' || true
}

# ── Kill processes ─────────────────────────────────────────────────────────────
kill_pids() {
  local label="$1"
  shift
  local pids=("$@")

  if [[ ${#pids[@]} -eq 0 ]]; then
    return 0
  fi

  for pid in "${pids[@]}"; do
    [[ -z "$pid" ]] && continue
    if kill -0 "$pid" 2>/dev/null; then
      log "Dừng $label (PID $pid)..."
      kill "$pid" 2>/dev/null || true
    fi
  done

  # Chờ processes thoát gracefully
  local waited=0
  for pid in "${pids[@]}"; do
    [[ -z "$pid" ]] && continue
    while kill -0 "$pid" 2>/dev/null && [[ $waited -lt 10 ]]; do
      sleep 0.5
      waited=$((waited + 1))
    done
    # Force kill nếu vẫn còn
    if kill -0 "$pid" 2>/dev/null; then
      log_warn "Force kill $label (PID $pid)..."
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
}

# ── Stop services ──────────────────────────────────────────────────────────────
do_stop() {
  log_step "Dừng PERFIN Services"

  local stopped_any=0

  # 1. Expo / Metro
  local expo_pids
  expo_pids=($(unique_pids $(find_expo_pids)))
  if [[ ${#expo_pids[@]} -gt 0 ]]; then
    kill_pids "Expo/Metro" "${expo_pids[@]}"
    log_ok "Expo/Metro đã dừng."
    stopped_any=1
  else
    log "Expo/Metro: không tìm thấy tiến trình."
  fi

  # 2. Tunnel
  local tunnel_pids
  tunnel_pids=($(unique_pids $(find_tunnel_pids)))
  if [[ ${#tunnel_pids[@]} -gt 0 ]]; then
    kill_pids "Backend Tunnel" "${tunnel_pids[@]}"
    log_ok "Backend Tunnel đã dừng."
    stopped_any=1
  else
    log "Backend Tunnel: không tìm thấy tiến trình."
  fi

  # 3. Worker
  local worker_pids
  worker_pids=($(unique_pids $(find_worker_pids)))
  if [[ ${#worker_pids[@]} -gt 0 ]]; then
    kill_pids "BullMQ Worker" "${worker_pids[@]}"
    log_ok "BullMQ Worker đã dừng."
    stopped_any=1
  else
    log "BullMQ Worker: không tìm thấy tiến trình."
  fi

  # 4. Backend
  local backend_pids
  backend_pids=($(unique_pids $(find_backend_pids)))
  if [[ ${#backend_pids[@]} -gt 0 ]]; then
    kill_pids "Backend" "${backend_pids[@]}"
    log_ok "Backend đã dừng."
    stopped_any=1
  else
    log "Backend: không tìm thấy tiến trình."
  fi

  # 5. Docker Redis
  if [[ "$KEEP_DOCKER" -eq 0 ]]; then
    stop_docker_redis
  else
    log "Docker Redis: giữ nguyên (--keep-docker)."
  fi

  # 6. Cleanup temp files
  cleanup_temp_files

  if [[ "$stopped_any" -eq 1 ]]; then
    log_ok "Tất cả PERFIN services đã dừng."
  else
    log "Không có PERFIN service nào đang chạy."
  fi
}

# ── Stop Docker Redis ──────────────────────────────────────────────────────────
stop_docker_redis() {
  if ! detect_docker; then
    log "Docker: không khả dụng — bỏ qua."
    return
  fi

  local compose_file="$ROOT_DIR/docker-compose.yml"
  if [[ ! -f "$compose_file" ]]; then
    compose_file="$BACKEND_DIR/compose.redis.yml"
  fi

  if [[ ! -f "$compose_file" ]]; then
    log "Docker compose file: không tìm thấy — bỏ qua."
    return
  fi

  # Kiểm tra container có đang chạy không
  local running
  running="$(docker_cmd docker compose -f "$compose_file" ps -q 2>/dev/null || true)"
  if [[ -z "$running" ]]; then
    log "Docker Redis: không có container nào đang chạy."
    return
  fi

  log "Dừng Docker Redis container..."
  docker_cmd docker compose -f "$compose_file" down 2>&1 || true
  log_ok "Docker Redis đã dừng."
}

# ── Cleanup temp files ─────────────────────────────────────────────────────────
cleanup_temp_files() {
  local count=0

  # Temp log files tạo bởi start-app.sh
  for f in /tmp/perfin-backend.*.log /tmp/perfin-worker.*.log /tmp/perfin-backend-tunnel.*.log; do
    if [[ -f "$f" ]]; then
      rm -f "$f"
      count=$((count + 1))
    fi
  done

  if [[ $count -gt 0 ]]; then
    log "Đã dọn $count temp log file(s)."
  fi
}

# ── Status ─────────────────────────────────────────────────────────────────────
do_status() {
  printf "\n"
  printf "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}\n"
  printf "${CYAN}${BOLD}║           PERFIN — Trạng thái hệ thống hiện tại            ║${NC}\n"
  printf "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}\n"
  printf "\n"

  # Backend
  local backend_pids
  backend_pids=($(unique_pids $(find_backend_pids)))
  if [[ ${#backend_pids[@]} -gt 0 ]]; then
    printf "  ${GREEN}●${NC} ${BOLD}Backend${NC}          Đang chạy — PID ${backend_pids[*]}, port $BACKEND_PORT\n"
    # Kiểm tra health
    local health
    health="$(curl -fsS "http://127.0.0.1:$BACKEND_PORT/api/health/ready" 2>/dev/null || echo '')"
    if [[ -n "$health" ]]; then
      local status
      status="$(echo "$health" | grep -oP '"status"\s*:\s*"\K[^"]+' | head -1 || echo 'unknown')"
      printf "  ${DIM}  └─ Health: %s${NC}\n" "$status"
    fi
  else
    printf "  ${RED}○${NC} ${BOLD}Backend${NC}          Không chạy\n"
  fi

  # Worker
  local worker_pids
  worker_pids=($(unique_pids $(find_worker_pids)))
  if [[ ${#worker_pids[@]} -gt 0 ]]; then
    printf "  ${GREEN}●${NC} ${BOLD}BullMQ Worker${NC}    Đang chạy — PID ${worker_pids[*]}\n"
  else
    printf "  ${RED}○${NC} ${BOLD}BullMQ Worker${NC}    Không chạy\n"
  fi

  # Tunnel
  local tunnel_pids
  tunnel_pids=($(unique_pids $(find_tunnel_pids)))
  if [[ ${#tunnel_pids[@]} -gt 0 ]]; then
    printf "  ${GREEN}●${NC} ${BOLD}Backend Tunnel${NC}   Đang chạy — PID ${tunnel_pids[*]}\n"
  else
    printf "  ${RED}○${NC} ${BOLD}Backend Tunnel${NC}   Không chạy\n"
  fi

  # Expo
  local expo_pids
  expo_pids=($(unique_pids $(find_expo_pids)))
  if [[ ${#expo_pids[@]} -gt 0 ]]; then
    printf "  ${GREEN}●${NC} ${BOLD}Expo/Metro${NC}       Đang chạy — PID ${expo_pids[*]}\n"
  else
    printf "  ${RED}○${NC} ${BOLD}Expo/Metro${NC}       Không chạy\n"
  fi

  # Redis
  local redis_running=0
  if command -v redis-cli >/dev/null 2>&1 && redis-cli -h 127.0.0.1 -p 6379 ping 2>/dev/null | grep -q PONG; then
    redis_running=1
  fi

  if detect_docker; then
    local compose_file="$ROOT_DIR/docker-compose.yml"
    [[ ! -f "$compose_file" ]] && compose_file="$BACKEND_DIR/compose.redis.yml"

    local container_running=""
    if [[ -f "$compose_file" ]]; then
      container_running="$(docker_cmd docker compose -f "$compose_file" ps -q 2>/dev/null || true)"
    fi

    if [[ -n "$container_running" ]]; then
      printf "  ${GREEN}●${NC} ${BOLD}Docker Redis${NC}     Container đang chạy"
      if [[ "$redis_running" -eq 1 ]]; then
        printf " — PONG ✓"
      fi
      printf "\n"
    else
      printf "  ${RED}○${NC} ${BOLD}Docker Redis${NC}     Container không chạy"
      if [[ "$redis_running" -eq 1 ]]; then
        printf " (Redis chạy từ nguồn khác)"
      fi
      printf "\n"
    fi
  else
    if [[ "$redis_running" -eq 1 ]]; then
      printf "  ${GREEN}●${NC} ${BOLD}Redis${NC}            Đang chạy — 127.0.0.1:6379\n"
    else
      printf "  ${RED}○${NC} ${BOLD}Redis${NC}            Không chạy (Docker không khả dụng)\n"
    fi
  fi

  # PostgreSQL
  local pg_host pg_port pg_name
  pg_host="$(grep -E '^DB_HOST=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo 'localhost')"
  pg_port="$(grep -E '^DB_PORT=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo '5432')"
  pg_name="$(grep -E '^DB_NAME=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo 'demodb')"

  if command -v pg_isready >/dev/null 2>&1 && pg_isready -h "$pg_host" -p "$pg_port" >/dev/null 2>&1; then
    printf "  ${GREEN}●${NC} ${BOLD}PostgreSQL${NC}       Đang chạy — %s:%s/%s\n" "$pg_host" "$pg_port" "$pg_name"
  elif command -v nc >/dev/null 2>&1 && nc -z "$pg_host" "$pg_port" 2>/dev/null; then
    printf "  ${YELLOW}●${NC} ${BOLD}PostgreSQL${NC}       Port mở — %s:%s\n" "$pg_host" "$pg_port"
  else
    printf "  ${RED}○${NC} ${BOLD}PostgreSQL${NC}       Không phản hồi — %s:%s\n" "$pg_host" "$pg_port"
  fi

  printf "\n"

  # Tổng kết
  local total_pids
  total_pids=($(unique_pids $(find_backend_pids) $(find_worker_pids) $(find_tunnel_pids) $(find_expo_pids)))
  if [[ ${#total_pids[@]} -gt 0 ]]; then
    printf "  ${YELLOW}${BOLD}%d PERFIN process(es) đang chạy.${NC}\n" "${#total_pids[@]}"
    printf "  ${DIM}Dùng ./stop-app.sh để dừng tất cả.${NC}\n"
  else
    printf "  ${DIM}Không có PERFIN process nào đang chạy.${NC}\n"
  fi

  printf "\n"
}

# ── Confirm prompt ─────────────────────────────────────────────────────────────
confirm_action() {
  local message="$1"

  if [[ "$FORCE" -eq 1 ]]; then
    return 0
  fi

  printf "\n${YELLOW}${BOLD}⚠ %s${NC}\n" "$message"
  printf "  Nhập ${BOLD}y${NC} để xác nhận, bất kỳ phím nào khác để hủy: "
  read -r -n 1 answer
  printf "\n"

  if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    log "Đã hủy."
    exit 0
  fi
}

# ── Reset cache ────────────────────────────────────────────────────────────────
do_reset_cache() {
  log_step "Reset Cache & Temp Data"

  # 1. Expo cache
  if [[ -d "$FRONTEND_DIR/.expo" ]]; then
    log "Xóa Expo cache (.expo/)..."
    rm -rf "$FRONTEND_DIR/.expo"
    log_ok "Expo cache đã xóa."
  else
    log "Expo cache: không tồn tại."
  fi

  # 2. Metro cache
  local metro_cache="$FRONTEND_DIR/node_modules/.cache"
  if [[ -d "$metro_cache" ]]; then
    log "Xóa Metro bundler cache..."
    rm -rf "$metro_cache"
    log_ok "Metro cache đã xóa."
  fi

  # 3. Backend uploads
  if [[ -d "$BACKEND_DIR/uploads" ]]; then
    local upload_count
    upload_count="$(find "$BACKEND_DIR/uploads" -type f 2>/dev/null | wc -l)"
    if [[ "$upload_count" -gt 0 ]]; then
      log "Xóa $upload_count file uploads..."
      find "$BACKEND_DIR/uploads" -type f -delete 2>/dev/null || true
      log_ok "Uploads đã xóa."
    else
      log "Uploads: thư mục trống."
    fi
  fi

  # 4. Backend exports
  if [[ -d "$BACKEND_DIR/exports" ]]; then
    local export_count
    export_count="$(find "$BACKEND_DIR/exports" -type f 2>/dev/null | wc -l)"
    if [[ "$export_count" -gt 0 ]]; then
      log "Xóa $export_count file exports..."
      find "$BACKEND_DIR/exports" -type f -delete 2>/dev/null || true
      log_ok "Exports đã xóa."
    else
      log "Exports: thư mục trống."
    fi
  fi

  # 5. Redis data (flush nếu Redis đang chạy, hoặc xóa volume)
  flush_redis_data

  # 6. Temp files
  cleanup_temp_files

  log_ok "Cache và temp data đã được dọn dẹp."
}

# ── Flush Redis ────────────────────────────────────────────────────────────────
flush_redis_data() {
  # Thử flush qua redis-cli
  if command -v redis-cli >/dev/null 2>&1 && redis-cli -h 127.0.0.1 -p 6379 ping 2>/dev/null | grep -q PONG; then
    log "Flush Redis data..."
    redis-cli -h 127.0.0.1 -p 6379 FLUSHALL 2>/dev/null || true
    log_ok "Redis data đã flush."
    return
  fi

  # Thử flush qua docker exec
  if detect_docker; then
    if docker_cmd docker exec perfin-redis redis-cli FLUSHALL 2>/dev/null | grep -q OK; then
      log_ok "Redis data đã flush (qua docker exec)."
      return
    fi
  fi

  # Nếu Redis không chạy, xóa Docker volume
  if detect_docker; then
    log "Redis không chạy — kiểm tra Docker volume..."
    if docker_cmd docker volume ls -q 2>/dev/null | grep -q "perfin-redis-data"; then
      log "Xóa Docker volume perfin-redis-data..."
      docker_cmd docker volume rm "$(docker_cmd docker volume ls -q 2>/dev/null | grep 'perfin-redis-data')" 2>/dev/null || true
      log_ok "Redis volume đã xóa."
    else
      log "Redis volume: không tìm thấy."
    fi
  fi
}

# ── Reset database ─────────────────────────────────────────────────────────────
do_reset_db() {
  log_step "Reset Database"

  confirm_action "Thao tác này sẽ XÓA TOÀN BỘ dữ liệu trong database và tạo lại schema + seed!"

  # Kiểm tra PostgreSQL
  local pg_host pg_port
  pg_host="$(grep -E '^DB_HOST=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo 'localhost')"
  pg_port="$(grep -E '^DB_PORT=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]' || echo '5432')"

  if command -v pg_isready >/dev/null 2>&1; then
    if ! pg_isready -h "$pg_host" -p "$pg_port" >/dev/null 2>&1; then
      log_err "PostgreSQL không phản hồi tại $pg_host:$pg_port — không thể reset DB."
      return 1
    fi
  fi

  log "Chạy migrate:fresh (drop all + recreate schema + seed)..."
  (
    cd "$BACKEND_DIR"
    npm run migrate:fresh
  )
  log_ok "Database đã reset thành công."

  # Hỏi import data demo
  if [[ "$FORCE" -eq 0 ]]; then
    printf "\n  Bạn có muốn import dữ liệu demo (dataFinance.csv)? [y/N]: "
    read -r -n 1 import_answer
    printf "\n"
    if [[ "$import_answer" == "y" || "$import_answer" == "Y" ]]; then
      do_import_demo_data
    fi
  fi
}

# ── Import demo data ──────────────────────────────────────────────────────────
do_import_demo_data() {
  local csv_file="$ROOT_DIR/data/dataFinance.csv"
  if [[ ! -f "$csv_file" ]]; then
    log_warn "Không tìm thấy $csv_file — bỏ qua import."
    return
  fi

  log "Import dữ liệu demo từ dataFinance.csv..."
  (
    cd "$BACKEND_DIR"
    npm run data:import -- --confirm-user default_user
  ) && log_ok "Dữ liệu demo đã import." || log_warn "Import dữ liệu demo thất bại."
}

# ── Main ───────────────────────────────────────────────────────────────────────
main() {
  parse_args "$@"

  case "$ACTION" in
    status)
      do_status
      ;;
    stop)
      printf "\n"
      printf "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}\n"
      printf "${CYAN}${BOLD}║             PERFIN — Dừng hệ thống (Clean)                 ║${NC}\n"
      printf "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}\n"
      do_stop
      printf "\n"
      ;;
    reset)
      printf "\n"
      printf "${YELLOW}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}\n"
      printf "${YELLOW}${BOLD}║         PERFIN — Reset Cache & Temp Data                   ║${NC}\n"
      printf "${YELLOW}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}\n"
      confirm_action "Sẽ dừng services + dọn cache Expo, Redis data, uploads, exports."
      do_stop
      do_reset_cache
      printf "\n${GREEN}${BOLD}  ✓ Reset cache hoàn tất.${NC}\n\n"
      ;;
    reset-db)
      printf "\n"
      printf "${RED}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}\n"
      printf "${RED}${BOLD}║         PERFIN — Reset Database                             ║${NC}\n"
      printf "${RED}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}\n"
      do_stop
      do_reset_db
      printf "\n${GREEN}${BOLD}  ✓ Reset database hoàn tất.${NC}\n\n"
      ;;
    reset-all)
      printf "\n"
      printf "${RED}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}\n"
      printf "${RED}${BOLD}║         PERFIN — FULL RESET (DB + Cache + Redis)            ║${NC}\n"
      printf "${RED}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}\n"
      confirm_action "Thao tác này sẽ XÓA TẤT CẢ: database, Redis data, cache, uploads, exports!"
      do_stop
      do_reset_cache
      do_reset_db
      printf "\n${GREEN}${BOLD}  ✓ Full reset hoàn tất. Chạy ./start-app.sh --migrate để khởi động lại.${NC}\n\n"
      ;;
  esac
}

main "$@"

#!/usr/bin/env bash
# ============================================================================
# PERFIN — Khởi động Docker services
# ============================================================================
# Đảm bảo Docker daemon chạy và khởi động Redis container.
#
# Usage:
#   ./scripts/start-docker.sh          # Khởi động Redis
#   ./scripts/start-docker.sh --stop   # Dừng Redis
#   ./scripts/start-docker.sh --status # Xem trạng thái
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { printf "${BLUE}[PERFIN]${NC} %s\n" "$*"; }
log_ok()    { printf "${GREEN}[PERFIN]${NC} %s\n" "$*"; }
log_warn()  { printf "${YELLOW}[PERFIN]${NC} %s\n" "$*"; }
log_error() { printf "${RED}[PERFIN]${NC} %s\n" "$*"; }

# ── Docker command wrapper (xử lý quyền truy cập) ───────────────────────────
DOCKER_PREFIX=""

docker_cmd() {
  if [[ -n "$DOCKER_PREFIX" ]]; then
    sg docker -c "$*"
  else
    "$@"
  fi
}

ensure_docker_running() {
  # Thử docker trực tiếp
  if docker info &>/dev/null 2>&1; then
    log_ok "Docker daemon đã sẵn sàng."
    return 0
  fi

  # Thử qua sg docker (user chưa trong group docker)
  if sg docker -c "docker info" &>/dev/null 2>&1; then
    DOCKER_PREFIX="sg"
    log_ok "Docker daemon sẵn sàng (qua sg docker)."
    log_warn "Tip: chạy 'sudo usermod -aG docker \$USER && newgrp docker' để fix vĩnh viễn."
    return 0
  fi

  log_error "Docker không khả dụng!"
  log_error "Chạy: ./scripts/setup-docker-wsl.sh để cài đặt Docker"
  exit 1
}


# ── Start ────────────────────────────────────────────────────────────────────
do_start() {
  ensure_docker_running

  log_info "Khởi động Redis container..."
  cd "$ROOT_DIR"
  docker_cmd docker compose up -d

  # Chờ Redis healthy
  log_info "Đang chờ Redis sẵn sàng..."
  local count=0
  while [ $count -lt 30 ]; do
    if docker_cmd docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
      log_ok "Redis đã sẵn sàng! (localhost:6379)"
      return 0
    fi
    sleep 1
    ((count++))
  done

  log_warn "Redis chưa phản hồi PING nhưng container đang chạy."
  docker_cmd docker compose ps
}

# ── Stop ─────────────────────────────────────────────────────────────────────
do_stop() {
  log_info "Dừng Docker services..."
  cd "$ROOT_DIR"
  docker_cmd docker compose down
  log_ok "Đã dừng tất cả services."
}

# ── Status ───────────────────────────────────────────────────────────────────
do_status() {
  cd "$ROOT_DIR"

  printf "\n${BLUE}══ Docker Status ══${NC}\n\n"

  if docker info &>/dev/null 2>&1 || sg docker -c "docker info" &>/dev/null 2>&1; then
    log_ok "Docker daemon: Running"
  else
    log_error "Docker daemon: Stopped"
  fi

  printf "\n"
  docker_cmd docker compose ps 2>/dev/null || log_warn "Không có container nào."

  printf "\n"
  if docker_cmd docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
    log_ok "Redis: PONG ✓"
  else
    log_error "Redis: Not responding"
  fi
}

# ── Main ─────────────────────────────────────────────────────────────────────
case "${1:-start}" in
  start|up)
    do_start
    ;;
  stop|down|--stop)
    do_stop
    ;;
  status|ps|--status)
    do_status
    ;;
  restart)
    do_stop
    do_start
    ;;
  *)
    echo "Usage: $0 {start|stop|status|restart}"
    exit 1
    ;;
esac

#!/usr/bin/env bash
# ============================================================================
# PERFIN — Setup Docker cho WSL Ubuntu
# ============================================================================
# Script này xử lý cài đặt Docker trong WSL Ubuntu, hỗ trợ cả:
#   1. Docker Desktop WSL Integration (khi đã bật từ Docker Desktop trên Windows)
#   2. Docker Engine cài trực tiếp trong WSL (khi không dùng Docker Desktop)
#
# Xử lý xung đột giữa Docker Desktop và Docker Engine:
#   - Nếu Docker Desktop WSL Integration đã hoạt động → dùng nó
#   - Nếu chưa → cài Docker Engine standalone trong WSL
#
# Usage:
#   chmod +x scripts/setup-docker-wsl.sh
#   ./scripts/setup-docker-wsl.sh
# ============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { printf "${BLUE}[INFO]${NC}  %s\n" "$*"; }
log_ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
log_warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
log_error() { printf "${RED}[ERROR]${NC} %s\n" "$*"; }

# ── Kiểm tra WSL ────────────────────────────────────────────────────────────
check_wsl() {
  if ! grep -qi microsoft /proc/version 2>/dev/null; then
    log_error "Script này chỉ dành cho WSL. Bạn đang không chạy trên WSL."
    exit 1
  fi
  log_ok "Đang chạy trên WSL"
}

# ── Kiểm tra Docker đã có chưa ──────────────────────────────────────────────
check_existing_docker() {
  # Kiểm tra docker command
  if command -v docker &>/dev/null; then
    # Kiểm tra xem docker có thực sự hoạt động không
    if docker info &>/dev/null 2>&1; then
      local docker_version
      docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
      log_ok "Docker đã hoạt động (version: $docker_version)"

      # Kiểm tra docker compose
      if docker compose version &>/dev/null; then
        log_ok "Docker Compose đã sẵn sàng"
      else
        log_warn "Docker Compose chưa cài. Đang cài..."
        install_compose_plugin
      fi
      return 0
    else
      log_warn "Docker command tồn tại nhưng không hoạt động."
      return 1
    fi
  else
    log_info "Docker chưa được cài đặt trong WSL distro này."
    return 1
  fi
}

# ── Kiểm tra Docker Desktop WSL Integration ─────────────────────────────────
check_docker_desktop_integration() {
  # Docker Desktop tạo binary tại /usr/bin/docker khi WSL Integration bật
  if [ -f "/usr/bin/docker" ] || [ -S "/var/run/docker.sock" ]; then
    if docker info &>/dev/null 2>&1; then
      log_ok "Docker Desktop WSL Integration đang hoạt động!"
      return 0
    fi
  fi

  # Kiểm tra Docker Desktop có đang chạy trên Windows không
  if [ -d "/mnt/wsl/docker-desktop" ]; then
    log_warn "Docker Desktop đang chạy trên Windows nhưng WSL Integration chưa bật cho distro này."
    printf "\n"
    printf "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}\n"
    printf "${YELLOW}║  Hướng dẫn bật Docker Desktop WSL Integration:              ║${NC}\n"
    printf "${YELLOW}║                                                              ║${NC}\n"
    printf "${YELLOW}║  1. Mở Docker Desktop trên Windows                          ║${NC}\n"
    printf "${YELLOW}║  2. Vào Settings (⚙️) → Resources → WSL Integration          ║${NC}\n"
    printf "${YELLOW}║  3. Bật toggle cho distro 'Ubuntu'                           ║${NC}\n"
    printf "${YELLOW}║  4. Nhấn 'Apply & Restart'                                   ║${NC}\n"
    printf "${YELLOW}║  5. Chạy lại script này                                      ║${NC}\n"
    printf "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}\n"
    printf "\n"

    read -p "Bạn muốn cài Docker Engine trực tiếp trong WSL thay thế? (y/N): " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then
      return 1
    else
      log_info "Hãy bật WSL Integration rồi chạy lại script."
      exit 0
    fi
  fi

  return 1
}

# ── Xử lý xung đột Docker ──────────────────────────────────────────────────
handle_docker_conflicts() {
  # Kiểm tra nếu có Docker Engine cũ hoặc bị lỗi
  if dpkg -l | grep -q docker.io 2>/dev/null; then
    log_warn "Phát hiện docker.io package cũ. Gỡ bỏ để tránh xung đột..."
    sudo apt-get remove -y docker.io docker-doc docker-compose podman-docker containerd runc 2>/dev/null || true
  fi

  # Kiểm tra Docker Desktop wrapper script conflict
  local docker_desktop_bin="/mnt/c/Program Files/Docker/Docker/resources/bin/docker"
  if [ -f "$docker_desktop_bin" ]; then
    # Đảm bảo PATH ưu tiên /usr/bin trước /mnt/c/...
    if echo "$PATH" | grep -q "/mnt/c/Program Files/Docker"; then
      log_warn "Docker Desktop Windows binary trong PATH. Sẽ ưu tiên Docker Engine trong WSL."
    fi
  fi

  # Dừng Docker Desktop daemon nếu nó đang giữ socket
  if [ -S "/var/run/docker.sock" ]; then
    if ! docker info &>/dev/null; then
      log_warn "Docker socket tồn tại nhưng daemon không phản hồi. Dọn dẹp..."
      sudo rm -f /var/run/docker.sock 2>/dev/null || true
    fi
  fi
}

# ── Cài đặt Docker Engine ───────────────────────────────────────────────────
install_docker_engine() {
  log_info "Đang cài đặt Docker Engine trong WSL Ubuntu..."

  # Cài dependencies
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg lsb-release

  # Thêm Docker GPG key
  sudo install -m 0755 -d /etc/apt/keyrings
  if [ ! -f /etc/apt/keyrings/docker.asc ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
    sudo chmod a+r /etc/apt/keyrings/docker.asc
  fi

  # Thêm Docker repo
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  log_ok "Docker Engine đã cài xong."
}

# ── Cài Docker Compose plugin ───────────────────────────────────────────────
install_compose_plugin() {
  sudo apt-get update
  sudo apt-get install -y docker-compose-plugin
  log_ok "Docker Compose plugin đã cài."
}

# ── Cấu hình Docker cho WSL ─────────────────────────────────────────────────
configure_docker_wsl() {
  # Thêm user vào docker group
  if ! groups | grep -q docker; then
    log_info "Thêm user $(whoami) vào group docker..."
    sudo usermod -aG docker "$(whoami)"
    log_warn "Đã thêm vào group docker. Cần logout/login lại hoặc chạy: newgrp docker"
  else
    log_ok "User $(whoami) đã ở trong group docker."
  fi

  # Tạo Docker daemon config tối ưu cho WSL
  if [ ! -f /etc/docker/daemon.json ]; then
    log_info "Tạo Docker daemon config cho WSL..."
    sudo mkdir -p /etc/docker
    sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "iptables": true
}
EOF
    log_ok "Docker daemon config đã tạo."
  fi

  # Khởi động Docker daemon (WSL không có systemd mặc định)
  start_docker_daemon
}

# ── Khởi động Docker daemon ─────────────────────────────────────────────────
start_docker_daemon() {
  if docker info &>/dev/null 2>&1; then
    log_ok "Docker daemon đang chạy."
    return 0
  fi

  log_info "Khởi động Docker daemon..."

  # Thử systemctl trước (WSL2 với systemd)
  if command -v systemctl &>/dev/null && systemctl is-system-running &>/dev/null 2>&1; then
    sudo systemctl start docker
    sudo systemctl enable docker
    log_ok "Docker daemon đã khởi động qua systemd."
  else
    # Fallback: Khởi động thủ công
    sudo dockerd --iptables=true > /tmp/dockerd.log 2>&1 &
    local max_wait=30
    local count=0
    while [ $count -lt $max_wait ]; do
      if docker info &>/dev/null 2>&1; then
        log_ok "Docker daemon đã khởi động (manual mode)."
        return 0
      fi
      sleep 1
      ((count++))
    done
    log_error "Không thể khởi động Docker daemon. Xem log: /tmp/dockerd.log"
    exit 1
  fi
}

# ── Kiểm tra cuối cùng ──────────────────────────────────────────────────────
final_check() {
  printf "\n"
  log_info "══ Kiểm tra hệ thống ══"

  # Docker
  if docker version &>/dev/null; then
    log_ok "Docker: $(docker version --format '{{.Server.Version}}' 2>/dev/null)"
  else
    log_error "Docker không hoạt động!"
    exit 1
  fi

  # Docker Compose
  if docker compose version &>/dev/null; then
    log_ok "Docker Compose: $(docker compose version --short 2>/dev/null)"
  else
    log_error "Docker Compose không hoạt động!"
    exit 1
  fi

  # Test chạy container
  log_info "Test chạy container hello-world..."
  if docker run --rm hello-world &>/dev/null; then
    log_ok "Docker hoạt động bình thường!"
  else
    log_error "Không thể chạy container. Thử: newgrp docker"
    exit 1
  fi

  printf "\n"
  printf "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}\n"
  printf "${GREEN}║  ✅ Docker đã sẵn sàng!                                     ║${NC}\n"
  printf "${GREEN}║                                                              ║${NC}\n"
  printf "${GREEN}║  Tiếp theo, chạy:                                            ║${NC}\n"
  printf "${GREEN}║    cd demo && docker compose up -d                           ║${NC}\n"
  printf "${GREEN}║    ./start-app.sh tunnel --migrate                           ║${NC}\n"
  printf "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}\n"
}

# ── Main ────────────────────────────────────────────────────────────────────
main() {
  printf "\n"
  printf "${BLUE}══════════════════════════════════════════════════════${NC}\n"
  printf "${BLUE}  PERFIN — Docker Setup cho WSL Ubuntu${NC}\n"
  printf "${BLUE}══════════════════════════════════════════════════════${NC}\n"
  printf "\n"

  check_wsl

  # Kiểm tra Docker đã có chưa
  if check_existing_docker; then
    final_check
    return 0
  fi

  # Kiểm tra Docker Desktop Integration
  if check_docker_desktop_integration; then
    final_check
    return 0
  fi

  # Xử lý xung đột
  handle_docker_conflicts

  # Cài Docker Engine
  install_docker_engine

  # Cấu hình
  configure_docker_wsl

  # Kiểm tra cuối
  final_check
}

main "$@"

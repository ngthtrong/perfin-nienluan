#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
frontend_dir="$(cd -- "${script_dir}/.." && pwd)"
source_logo="${frontend_dir}/logo.png"
assets_dir="${frontend_dir}/assets"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Cần ffmpeg để tạo bộ nhận diện từ logo.png." >&2
  exit 1
fi

if [[ ! -f "${source_logo}" ]]; then
  echo "Không tìm thấy ${source_logo}." >&2
  exit 1
fi

# Launcher icon: use only the central emblem. The wordmark and subtitle become
# unreadable after the operating system scales an icon down to home-screen size.
ffmpeg -hide_banner -loglevel error -y \
  -i "${source_logo}" \
  -vf "crop=600:600:212:40,scale=760:760:flags=lanczos,pad=1024:1024:132:132:color=0xF7F4EA" \
  -frames:v 1 "${assets_dir}/icon.png"

# Keep the emblem inside Android's adaptive-icon safe zone. The image is
# deliberately opaque so it also remains valid as the legacy Android icon.
ffmpeg -hide_banner -loglevel error -y \
  -i "${source_logo}" \
  -vf "crop=600:600:212:40,scale=760:760:flags=lanczos,pad=1024:1024:132:132:color=0xF7F4EA" \
  -frames:v 1 "${assets_dir}/adaptive-icon.png"

# Splash uses the complete brand lockup, cropped to remove the generator mark in
# the source image while preserving PERFIN and its Vietnamese descriptor.
ffmpeg -hide_banner -loglevel error -y \
  -i "${source_logo}" \
  -vf "crop=800:800:112:100,scale=1024:1024:flags=lanczos" \
  -frames:v 1 "${assets_dir}/splash-icon.png"

ffmpeg -hide_banner -loglevel error -y \
  -i "${assets_dir}/icon.png" \
  -vf "scale=64:64:flags=lanczos" \
  -frames:v 1 "${assets_dir}/favicon.png"

echo "Đã tạo icon, adaptive icon, splash và favicon từ logo.png."

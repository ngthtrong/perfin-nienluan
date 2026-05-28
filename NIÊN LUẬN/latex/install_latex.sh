#!/bin/bash
# Script cài đặt TeX Live và font tiếng Việt hoàn chỉnh cho Ubuntu/Debian

echo "=========================================================="
echo "  BẮT ĐẦU CÀI ĐẶT TRÌNH BIÊN DỊCH LATEX & FONT TIẾNG VIỆT  "
echo "=========================================================="

# 1. Cập nhật danh sách package
echo -e "\n[1/3] Đang cập nhật danh sách gói hệ thống..."
sudo apt-get update

# 2. Cài đặt các gói TeX Live cần thiết (latex-base, recommended, extra, xetex và gói tiếng Việt)
echo -e "\n[2/3] Đang cài đặt các công cụ TeX Live (pdflatex, xelatex và gói tiếng Việt)..."
# Sử dụng phiên bản gọn nhẹ nhưng đầy đủ thư viện thay vì tải bản texlive-full (tránh tải ~3GB+)
sudo apt-get install -y \
  texlive-latex-base \
  texlive-latex-recommended \
  texlive-latex-extra \
  texlive-lang-vietnamese \
  texlive-fonts-recommended \
  texlive-fonts-extra \
  texlive-xetex \
  fontconfig

# 3. Cài đặt các font chữ hệ thống Microsoft Core (Times New Roman, Arial)
echo -e "\n[3/3] Đang cài đặt font chữ hệ thống Microsoft Core (Times New Roman, Arial)..."
# Chấp nhận EULA tự động để tránh bị treo màn hình terminal khi cài đặt package này
echo ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true | sudo debconf-set-selections
sudo apt-get install -y ttf-mscorefonts-installer

# Cập nhật cache font chữ hệ thống
echo "Cập nhật font cache..."
sudo fc-cache -f -v

echo -e "\n=========================================================="
echo "           CÀI ĐẶT HOÀN TẤT THÀNH CÔNG!                   "
echo "=========================================================="
echo "Bạn có thể biên dịch bằng 1 trong 2 cách sau:"
echo "Cách 1 (Khuyên dùng - XeLaTeX có Times New Roman thật):"
echo "   xelatex main.tex"
echo "Cách 2 (Sử dụng pdfLaTeX truyền thống):"
echo "   pdflatex main.tex"
echo "=========================================================="

# Hướng dẫn render sơ đồ Draw.io

Tài liệu này hướng dẫn chuyển các file nguồn `drawio/*.drawio` thành ba
định dạng trong `rendered/`:

- PDF: định dạng vector được báo cáo LaTeX sử dụng.
- PNG: ảnh xem nhanh, được xuất ở chiều rộng 2200 px.
- SVG: định dạng vector dùng cho web hoặc chỉnh sửa tiếp.

## 1. Chuẩn bị môi trường

Script được thiết kế cho Linux và cần:

- Draw.io Desktop có hỗ trợ dòng lệnh.
- `xvfb-run` để Draw.io chạy ở chế độ không cần màn hình.
- Bash và lệnh `timeout`.

Kiểm tra môi trường:

```bash
command -v xvfb-run
command -v timeout
test -x /snap/bin/drawio && /snap/bin/drawio --version
```

Trên Ubuntu, nếu chưa có `xvfb-run`:

```bash
sudo apt update
sudo apt install xvfb coreutils
```

Script mặc định dùng Draw.io tại `/snap/bin/drawio`. Nếu Draw.io được cài
ở vị trí khác, xem mục **Đường dẫn Draw.io tùy chỉnh** bên dưới.

## 2. Render nhanh

Di chuyển đến thư mục sơ đồ:

```bash
cd /home/ngthtrong/perfin-nienluan/latex/figures
```

Chỉ render các sơ đồ có nguồn mới hơn file kết quả hoặc còn thiếu kết quả:

```bash
./rerender-stale.sh
```

Đây là lệnh nên dùng sau khi chỉnh sửa một hoặc nhiều file `.drawio`.

## 3. Các chế độ render

### Render một sơ đồ

Truyền tên file nhưng bỏ phần mở rộng `.drawio`:

```bash
./rerender-stale.sh 03-deployment
```

Kết quả:

```text
rendered/03-deployment.pdf
rendered/03-deployment.png
rendered/03-deployment.svg
```

### Render nhiều sơ đồ

```bash
./rerender-stale.sh 03-deployment 04-domain-class 14-usecase-overview
```

### Buộc render lại toàn bộ 14 sơ đồ

```bash
./rerender-stale.sh --all
```

### Xem trợ giúp

```bash
./rerender-stale.sh --help
```

## 4. Đường dẫn Draw.io tùy chỉnh

Nếu lệnh Draw.io là `drawio` trong `PATH`:

```bash
DRAWIO=drawio ./rerender-stale.sh --all
```

Nếu dùng bản `.deb` hoặc bản giải nén ở một đường dẫn riêng:

```bash
DRAWIO=/opt/drawio/drawio ./rerender-stale.sh 03-deployment
```

Biến `DRAWIO` chỉ áp dụng cho lần chạy lệnh đó.

## 5. Kiểm tra kết quả

Kiểm tra ba file của một sơ đồ:

```bash
ls -lh rendered/03-deployment.{pdf,png,svg}
```

Kiểm tra số lượng kết quả. Khi render đầy đủ, mỗi định dạng phải có 14 file:

```bash
find rendered -maxdepth 1 -type f -name '*.pdf' | wc -l
find rendered -maxdepth 1 -type f -name '*.png' | wc -l
find rendered -maxdepth 1 -type f -name '*.svg' | wc -l
```

Script ghi nhật ký chi tiết tại:

```text
/tmp/rerender.log
```

Xem nhật ký:

```bash
less /tmp/rerender.log
```

## 6. Biên dịch lại hai phiên bản báo cáo

Sau khi render xong, chuyển về thư mục LaTeX và biên dịch cả bản tiếng Việt
lẫn tiếng Anh:

```bash
cd /home/ngthtrong/perfin-nienluan/latex
make -B all
```

Hai file đầu ra là:

```text
latex/main-vi.pdf
latex/main-en.pdf
```

## 7. Quy trình làm việc khuyến nghị

1. Mở và chỉnh sửa file trong `latex/figures/drawio/`.
2. Giữ nguyên tên file để các tham chiếu trong báo cáo không bị thay đổi.
3. Chạy `./rerender-stale.sh` trong `latex/figures/`.
4. Kiểm tra PNG hoặc PDF vừa tạo trong `latex/figures/rendered/`.
5. Chạy `make -B all` trong `latex/` để cập nhật hai báo cáo.

Không chạy `core_gen.py` hoặc `usecase_gen.py` nếu chỉ chỉnh sửa trực tiếp
file `.drawio`. Các script sinh nguồn này có thể ghi đè nội dung Draw.io đã
chỉnh thủ công; chỉ chạy chúng khi chủ động muốn tái tạo nguồn sơ đồ.

## 8. Xử lý lỗi thường gặp

### Không tìm thấy Draw.io

Draw.io không nằm tại đường dẫn mặc định. Xác định đường dẫn rồi truyền qua
biến `DRAWIO`:

```bash
command -v drawio
DRAWIO=/duong/dan/toi/drawio ./rerender-stale.sh 03-deployment
```

### `xvfb-run: command not found`

Cài gói `xvfb`, sau đó chạy lại lệnh render.

### Một định dạng render thất bại

Script tự thử lại một lần. Nếu vẫn lỗi, xem `/tmp/rerender.log`, sau đó chạy
riêng sơ đồ bị lỗi:

```bash
./rerender-stale.sh TEN_SO_DO
```

### Truyền tên file nhưng script báo không tìm thấy nguồn

Chỉ truyền tên cơ sở, không kèm thư mục và không kèm `.drawio`:

```bash
# Đúng
./rerender-stale.sh 03-deployment

# Không đúng
./rerender-stale.sh drawio/03-deployment.drawio
```

### Báo cáo vẫn hiển thị hình cũ

Buộc render lại sơ đồ hoặc toàn bộ sơ đồ, rồi buộc LaTeX biên dịch lại:

```bash
cd /home/ngthtrong/perfin-nienluan/latex/figures
./rerender-stale.sh --all
cd ..
make -B all
```

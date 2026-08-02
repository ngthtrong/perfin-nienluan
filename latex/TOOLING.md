# Hướng dẫn chạy draw.io và MiKTeX trên môi trường hiện tại

Tài liệu này ghi lại đúng cấu hình máy đang dùng và các cạm bẫy đã gặp thực tế,
để lần sau không phải dò lại. Hai công việc tách biệt nhau:

- **Xuất sơ đồ** (`figures/drawio/*.drawio` → `figures/rendered/*.{pdf,png,svg}`):
  chạy trong **WSL Ubuntu**, dùng draw.io bản snap.
- **Biên dịch báo cáo** (`main-vi.pdf`, `main-en.pdf`): chạy bằng **MiKTeX trên
  Windows** (hoặc TeX Live trong WSL cho bản nháp).

## 1. Môi trường đã xác nhận

| Thành phần | Vị trí / phiên bản |
|---|---|
| Shell của agent | Git Bash trên Windows 11 (`bash`, không phải cmd/PowerShell) |
| WSL | v2.6.3.0, distro `Ubuntu` (Ubuntu 24.04.4 LTS, đang chạy) |
| draw.io (WSL) | snap `drawio` 30.4.1 rev 292, entry `/snap/bin/drawio` → `/usr/bin/snap` |
| `xvfb-run` (WSL) | `/usr/bin/xvfb-run` — **bắt buộc**, draw.io là app Electron cần X display |
| Python (WSL) | 3.12.3 tại `/usr/bin/python3` — dùng cho `figures/usecase_gen.py` |
| `make` (WSL) | `/usr/bin/make` |
| TeX (WSL) | XeTeX 3.141592653-2.6-0.999995 (TeX Live 2023/Debian), có `fontspec` |
| MiKTeX (Windows) | MiKTeX 26.5, MiKTeX-XeTeX 4.18, `C:\Users\jhiny\AppData\Local\Programs\MiKTeX\miktex\bin\x64\` |
| `xelatex`, `latexmk` (Windows) | đã có trên PATH của Git Bash |
| `make` (Windows) | **không có** — đây là lý do phải dùng WSL hoặc gọi `xelatex` thủ công |
| Python (Windows) | 3.14.4 |
| draw.io Desktop (Windows) | `C:\Program Files\draw.io\draw.io.exe` — chỉ dùng để **xem/sửa** bằng GUI |

Đường dẫn dự án nhìn từ hai phía:

- Windows / Git Bash: `c:\Users\jhiny\OneDrive\Desktop\perfin-nienluan\latex`
- WSL: `/mnt/c/Users/jhiny/OneDrive/Desktop/perfin-nienluan/latex`

## 2. Xuất sơ đồ draw.io

### 2.1 Lệnh chuẩn (dùng script có sẵn)

Luôn ưu tiên `figures/rerender-stale.sh`; script đã bọc sẵn `xvfb-run`, cờ
sandbox, `timeout 180` và retry một lần cho lỗi `UnknownVizError` ngẫu nhiên.

```bash
# Xuất lại mọi sơ đồ có .drawio mới hơn bản rendered
wsl bash -c "cd /mnt/c/Users/jhiny/OneDrive/Desktop/perfin-nienluan/latex/figures && ./rerender-stale.sh"

# Chỉ xuất vài sơ đồ theo basename (không kèm .drawio)
wsl bash -c "cd /mnt/c/Users/jhiny/OneDrive/Desktop/perfin-nienluan/latex/figures && ./rerender-stale.sh 02-runtime-architecture 14-usecase-overview"
```

Script xuất cả ba định dạng `pdf`, `png` (`--width 2200`), `svg` vào `rendered/`
và ghi log vào `/tmp/rerender.log` **trong WSL**. Muốn đọc log:

```bash
wsl bash -c "tail -40 /tmp/rerender.log"
```

### 2.2 Lệnh trần (khi cần export nháp một lần)

```bash
wsl bash -c "cd /mnt/c/Users/jhiny/OneDrive/Desktop/perfin-nienluan/latex/figures && \
  xvfb-run -a /snap/bin/drawio -x -f png --width 2000 --disable-gpu --no-sandbox \
  -o /mnt/c/Users/jhiny/OneDrive/Desktop/perfin-nienluan/latex/figures/_draft.png \
  drawio/14-usecase-overview.drawio"
```

Bốn thành phần không được bỏ:

- `xvfb-run -a` — không có display thì Electron thoát mà không báo lỗi rõ ràng.
- `--disable-gpu` `--no-sandbox` — snap trong WSL không có GPU/namespace phù hợp.
- `-x` (export) và `-f <fmt>`.
- Đường dẫn `-o` **tuyệt đối, nằm trong `/mnt/c`** (xem 2.3).

### 2.3 Bốn cạm bẫy đã gặp thật

**a) Snap confinement chặn `/tmp` — draw.io exit 0 nhưng không có tệp.**
Đây là lỗi khó chịu nhất: draw.io in dòng `src -> dst`, trả exit code `0`, và
không tạo tệp nào cả. Nguyên nhân là snap không được ghi vào `/tmp` của host.
Ghi thẳng vào thư mục dự án trên `/mnt/c` thì chạy được ngay.

```bash
-o /tmp/x.png                      # ❌ im lặng thất bại
-o /mnt/c/Users/.../figures/x.png  # ✅
```

Lưu ý phân biệt: `LOG=/tmp/rerender.log` trong `rerender-stale.sh` **vẫn hoạt
động bình thường**, vì log do `tee` của bash ghi, không phải do tiến trình snap.

**b) Nối `| tail` làm mất exit code của draw.io.** `$?` sau pipe là mã của
`tail`, luôn bằng 0. Đừng tin exit code; hãy kiểm tra tệp đầu ra tồn tại và khác
rỗng, đúng như `rerender-stale.sh` đang làm:

```bash
if timeout 180 xvfb-run -a "$DRAWIO" "${args[@]}" >>"$LOG" 2>&1 && [[ -s $out ]]; then
```

**c) Trích dẫn lồng nhau bị Git Bash ăn mất.** Trong
`wsl bash -c "... echo $?"`, Git Bash bên ngoài nội suy `$?` trước khi chuỗi tới
WSL, nên kết quả vô nghĩa (đã thấy in ra `T=0`). Cách xử lý: viết các lệnh nhiều
bước ra một tệp `.sh` rồi gọi `wsl bash -c "cd ... && bash script.sh"`, hoặc dùng
nháy đơn cho phần cần giữ nguyên.

**d) Không `cd /mnt/c/...` từ Git Bash.** Đường dẫn đó không tồn tại phía
Windows; lệnh sẽ báo `No such file or directory`. Mọi thứ liên quan `/mnt/c` phải
nằm **bên trong** `wsl bash -c`.

### 2.4 Sinh sơ đồ bằng script

Sơ đồ use case tổng thể (`14`) sinh từ `figures/usecase_gen.py`; các sơ đồ lõi
sinh từ `core_gen.py`, còn ba sequence diagram sinh từ JSON trong `specs/`.
Sau bước sinh, chạy `translate_labels.js` để bảo đảm bộ hình dùng chung chỉ có
nhãn tiếng Anh, rồi mới export:

```bash
wsl bash -c "cd /mnt/c/Users/jhiny/OneDrive/Desktop/perfin-nienluan/latex/figures && python3 core_gen.py && python3 usecase_gen.py && node translate_labels.js"
wsl bash -c "cd /mnt/c/Users/jhiny/OneDrive/Desktop/perfin-nienluan/latex/figures && ./rerender-stale.sh"
```

Python 3.14 trên Windows cũng chạy được script này (chỉ dùng `html` + `os`),
nhưng nên giữ một đường: dùng `python3` trong WSL cho khớp với bước export.

### 2.5 Sửa sơ đồ bằng GUI

Mở bằng draw.io Desktop trên Windows: `C:\Program Files\draw.io\draw.io.exe`.
Giữ nguyên basename, lưu lại `.drawio`, rồi chạy `rerender-stale.sh` — script tự
phát hiện tệp nguồn mới hơn bản rendered.

## 3. Biên dịch LaTeX

### 3.1 Windows + MiKTeX (bản dùng để nộp)

Không có `make` trên Windows, nên gọi `xelatex` trực tiếp. Mỗi bản cần **ba
lượt** để mục lục, danh mục hình/bảng và tham chiếu chéo ổn định. `-jobname`
là bắt buộc để hai ngôn ngữ không ghi đè `.aux`/`.toc` của nhau.

```bash
cd /c/Users/jhiny/OneDrive/Desktop/perfin-nienluan/latex

for i in 1 2 3; do
  xelatex -interaction=nonstopmode -halt-on-error -file-line-error \
    -jobname=main-vi "\def\doclang{vi}\input{main.tex}"
done

for i in 1 2 3; do
  xelatex -interaction=nonstopmode -halt-on-error -file-line-error \
    -jobname=main-en "\def\doclang{en}\input{main.tex}"
done
```

`latexmk` cũng có sẵn nếu muốn để nó tự quyết số lượt:

```bash
latexmk -xelatex -jobname=main-vi "\def\doclang{vi}\input{main.tex}"
```

Ghi chú về MiKTeX: lần đầu biên dịch, MiKTeX có thể xin cài gói thiếu (on-the-fly
installation). Nếu cần cài trước cho chạy không tương tác, dùng
`miktex packages install <tên-gói>` hoặc `mpm --install=<tên-gói>` từ
`...\MiKTeX\miktex\bin\x64\`.

Không cần `--shell-escape`, không cần BibTeX/Biber, không cần `minted` — tham
khảo IEEE viết tay trong `chapters/<lang>/references.tex`.

### 3.2 WSL + TeX Live (bản nháp, có `make`)

```bash
wsl bash -c "cd /mnt/c/Users/jhiny/OneDrive/Desktop/perfin-nienluan/latex && make vi"
wsl bash -c "cd /mnt/c/Users/jhiny/OneDrive/Desktop/perfin-nienluan/latex && make en"
wsl bash -c "cd /mnt/c/Users/jhiny/OneDrive/Desktop/perfin-nienluan/latex && make all"
```

Makefile đã lặp ba lượt `xelatex` sẵn cho mỗi target.

Khác biệt cần biết: `config/preamble.tex` yêu cầu Times New Roman và Arial,
có `IfFontExistsTF` fallback sang TeX Gyre Termes / TeX Gyre Heros. WSL Ubuntu
thường không có hai font Microsoft đó, nên bản build từ WSL rất có thể rơi vào
fallback — chữ vẫn đẹp nhưng **không đúng quy chuẩn nộp**. Dùng WSL để kiểm tra
nhanh lỗi cú pháp, dùng MiKTeX trên Windows cho bản cuối. (Tôi chưa kiểm tra
danh sách font thực tế trong WSL; muốn chắc thì `wsl fc-list | grep -i "times new roman"`.)

### 3.3 Dọn tệp trung gian

```bash
wsl bash -c "cd /mnt/c/Users/jhiny/OneDrive/Desktop/perfin-nienluan/latex && make clean"
```

## 4. Quy trình đầy đủ khi đổi sơ đồ

```bash
P=/mnt/c/Users/jhiny/OneDrive/Desktop/perfin-nienluan/latex

# 1. sinh lại XML nếu sửa spec Python/JSON và chuẩn hóa nhãn tiếng Anh
wsl bash -c "cd $P/figures && python3 core_gen.py && python3 usecase_gen.py && node translate_labels.js"

# 2. export pdf/png/svg cho các sơ đồ đã thay đổi
wsl bash -c "cd $P/figures && ./rerender-stale.sh"

# 3. kiểm tra không có FAIL
wsl bash -c "grep -E 'FAIL|DONE' /tmp/rerender.log"

# 4. biên dịch lại hai bản PDF bằng MiKTeX (xem 3.1)
```

Kiểm tra nhanh số lượng artifact — 14 nguồn phải cho 42 tệp rendered:

```bash
wsl bash -c "ls $P/figures/drawio/*.drawio | wc -l; ls $P/figures/rendered/* | wc -l"
```

## 5. Lưu ý về Git trên máy này

`core.autocrlf = true`, nghĩa là tệp text được checkout dạng CRLF. Script bash
chạy trong WSL phải là LF, nếu không sẽ gặp lỗi kiểu
`bad interpreter: /usr/bin/env bash^M`. Hiện `rerender-stale.sh` và
`_export_draft.sh` đang là LF (`file` báo `ASCII text executable`, không có
`with CRLF line terminators`). Nếu về sau gặp lỗi `^M`, kiểm tra bằng:

```bash
wsl bash -c "file $P/figures/*.sh"
wsl bash -c "sed -i 's/\r$//' $P/figures/rerender-stale.sh"   # sửa nếu cần
```

Cân nhắc thêm `*.sh text eol=lf` vào `.gitattributes` để chặn vấn đề này từ gốc.

## 6. Tra lỗi nhanh

| Hiện tượng | Nguyên nhân | Xử lý |
|---|---|---|
| draw.io in `src -> dst`, exit 0, không có tệp | snap bị chặn ghi `/tmp` | đổi `-o` sang đường dẫn trong `/mnt/c` |
| exit code luôn 0 dù thất bại | có `\| tail` sau lệnh | kiểm tra `[[ -s $out ]]` thay vì `$?` |
| `cd: /mnt/c/...: No such file or directory` | chạy ở Git Bash chứ không phải WSL | bọc trong `wsl bash -c "..."` |
| `$?` in ra giá trị lạ | Git Bash nội suy trước khi vào WSL | đưa lệnh vào tệp `.sh` hoặc dùng nháy đơn |
| draw.io thoát ngay, không log | thiếu `xvfb-run` | thêm `xvfb-run -a` |
| `UnknownVizError` | lỗi ngẫu nhiên của draw.io | `rerender-stale.sh` đã retry 1 lần; chạy lại basename đó |
| `make: command not found` | Windows không có make | dùng WSL, hoặc gọi `xelatex` ba lượt thủ công |
| Font trong PDF khác kỳ vọng | fallback TeX Gyre khi thiếu Times/Arial | build bản cuối bằng MiKTeX trên Windows |
| Mục lục / số hình sai | chưa chạy đủ ba lượt | chạy lại đủ ba lượt hoặc dùng `latexmk` |

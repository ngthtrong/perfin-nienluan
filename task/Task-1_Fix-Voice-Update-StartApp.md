# Task 1: Sửa lỗi Voice + Cập nhật `start-app.sh`

## 🎯 Mục tiêu

1. **Sửa lỗi tính năng voice chưa hoạt động** trên môi trường WSL
2. **Cập nhật script `demo/v1/start-app.sh`** để khởi chạy đầy đủ tất cả modules (backend + AI Python env + frontend tunnel) với mặc định phù hợp cho WSL + kiểm thử iOS

## 📍 File liên quan

- `demo/v1/start-app.sh` — Script khởi chạy chính
- `demo/v1/backend/services/media-ai.service.js` — Service spawn Python cho voice/OCR
- `demo/v1/backend/routes/ai.routes.js` — Endpoint `/api/speech` xử lý voice
- `demo/v1/backend/scripts/phowhisper_speech.py` — Python script chạy PhoWhisper STT
- `demo/v1/backend/.env` — Config voice provider
- `demo/v1/backend/requirements-ai.txt` — Python dependencies
- `demo/v1/frontend/src/screens/ChatScreen.js` — UI ghi âm voice

---

## 📋 Phần A: Sửa lỗi Voice

### Hiện trạng qua phân tích code

Luồng voice hoạt động như sau:
1. **Frontend** (`ChatScreen.js`): Dùng `expo-audio` (`useAudioRecorder`) ghi âm → gọi `api.transcribeAudio(asset)` upload audio lên backend
2. **Backend** (`ai.routes.js`): Endpoint `POST /api/speech` nhận audio multipart/base64 → kiểm tra `SPEECH_PROVIDER`:
   - `'phowhisper'` → gọi `MediaAI.runPhoWhisper(filePath)` (Python offline)
   - Default `'google'` → dùng `@google-cloud/speech` (Google Cloud STT)
   - **Mock fallback**: Nếu cả 2 đều fail → trả về text cứng `"Hôm nay uống cà phê hết 50 nghìn"` 🔴
3. **Python** (`phowhisper_speech.py`): Convert audio → 16kHz WAV qua FFmpeg → chạy PhoWhisper model → trả JSON

### Config hiện tại trong `.env`:
```
SPEECH_PROVIDER=phowhisper
PHOWHISPER_MODEL=vinai/PhoWhisper-small
MEDIA_AI_OFFLINE=1
```

### Các nguyên nhân có thể gây lỗi (cần kiểm tra theo thứ tự)

#### 1. Python virtual environment chưa setup hoặc thiếu dependencies
- `media-ai.service.js` tìm Python binary tại `.venv-ai/bin/python`
- Cần kiểm tra: `.venv-ai/` đã tồn tại chưa? Đã cài `requirements-ai.txt` chưa?
- **Fix:** Chạy:
  ```bash
  cd demo/v1/backend
  python3 -m venv .venv-ai
  .venv-ai/bin/pip install -r requirements-ai.txt
  ```

#### 2. PhoWhisper model chưa được download (MEDIA_AI_OFFLINE=1)
- Với `MEDIA_AI_OFFLINE=1`, HuggingFace sẽ KHÔNG tải model → fail nếu chưa cache sẵn
- **Fix:** Lần đầu cần tạm tắt offline mode:
  ```bash
  MEDIA_AI_OFFLINE=0 .venv-ai/bin/python scripts/phowhisper_speech.py test.wav
  ```
  Hoặc bỏ dòng `MEDIA_AI_OFFLINE=1` trong `.env` để tự động download lần đầu

#### 3. FFmpeg chưa cài trên WSL
- `phowhisper_speech.py` cần FFmpeg để convert audio format
- **Fix:**
  ```bash
  sudo apt install ffmpeg
  ```

#### 4. Audio format không tương thích
- Frontend ghi âm qua `expo-audio` → format `.m4a` (iOS)
- PhoWhisper cần WAV 16kHz mono
- Script đã có convert nhưng cần FFmpeg hoạt động

#### 5. Mock fallback che lỗi thực sự
- Khi PhoWhisper fail, endpoint trả mock data thay vì báo lỗi rõ ràng
- **Cần xem xét:** Có nên bỏ mock fallback và trả error rõ ràng không?

### Bước kiểm tra & sửa lỗi

1. **Test Python env:**
   ```bash
   cd demo/v1/backend
   .venv-ai/bin/python -c "import transformers; print(transformers.__version__)"
   ```
2. **Test PhoWhisper trực tiếp:**
   ```bash
   # Tạo file test audio
   .venv-ai/bin/python scripts/phowhisper_speech.py <path-to-test-audio.wav>
   ```
3. **Test endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/speech \
     -F "audio=@test-audio.m4a"
   ```
4. **Kiểm tra log:** Backend log sẽ hiển thị chi tiết provider nào được chọn và lỗi nếu có

---

## 📋 Phần B: Cập nhật `start-app.sh`

### Yêu cầu

Script hiện tại đã xử lý backend + frontend (lan/tunnel/web). Cần bổ sung:

### 1. Tự động setup Python venv cho AI modules
- Trước khi start backend, kiểm tra `.venv-ai/` có tồn tại không
- Nếu không: tạo venv + cài `requirements-ai.txt`
- Nếu có: skip (để nhanh)
- Hiển thị log rõ ràng: `[perfin] Setting up Python AI environment...`

Thêm function mới vào script:
```bash
setup_python_ai() {
  local venv_dir="$BACKEND_DIR/.venv-ai"
  if [[ ! -d "$venv_dir" ]]; then
    log "Setting up Python AI virtual environment..."
    python3 -m venv "$venv_dir"
    "$venv_dir/bin/pip" install --quiet -r "$BACKEND_DIR/requirements-ai.txt"
    log "Python AI environment ready."
  else
    log "Python AI environment already exists."
  fi
}
```

### 2. Tải PhoWhisper model lần đầu (nếu chưa cache)
- Kiểm tra cache dir `.cache/media-ai/` có model chưa
- Nếu chưa: chạy warmup download (tạm bỏ OFFLINE mode)
- Nếu đã có: skip

### 3. Kiểm tra FFmpeg
- Thêm `require_command ffmpeg` nếu `SPEECH_PROVIDER=phowhisper`

### 4. Thay đổi mặc định cho WSL + iOS testing
- **Mode mặc định:** `tunnel` (thay vì `lan`), vì trên WSL cần tunnel để iOS Expo Go kết nối
- Backend tunnel vẫn dùng `localtunnel` như hiện tại
- Expo tunnel vẫn dùng `npx expo start --tunnel`

### 5. Thứ tự khởi chạy đầy đủ
```
1. Parse args
2. Require commands (node, npm, npx, curl, ffmpeg)
3. Setup Python AI env (nếu chưa có)
4. Download models (nếu chưa cache)
5. Run migrations (nếu --migrate)
6. Start backend
7. Start backend tunnel (cho tunnel mode)
8. Start Expo frontend (tunnel mode mặc định)
```

### 6. Thêm option mới
- `--skip-ai-setup`: Bỏ qua bước setup Python AI (khi biết đã setup rồi, để tiết kiệm thời gian)
- `--download-models`: Force download lại models dù đã có cache

---

## ⚠️ Lưu ý quan trọng

- **KHÔNG thay đổi logic xử lý voice trong frontend** (ChatScreen.js đã hoàn chỉnh)
- **KHÔNG thay đổi logic ai.routes.js** trừ khi cần fix bug cụ thể
- Ưu tiên fix ở tầng **infrastructure** (Python env, FFmpeg, model download) trước
- Test trên **WSL** (môi trường chính của dev)
- Frontend test trên **iOS Expo Go** (qua tunnel)
- Kiểm tra file `.env` backend: có space thừa trước `=` ở dòng `OPENAI_API_KEY` → cần fix
- Nếu voice vẫn không hoạt động sau khi fix infrastructure → kiểm tra log chi tiết của `media-ai.service.js` (timeout 300s, Python process errors)

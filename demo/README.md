# PERFIN Demo v1

Demo v1 la ban MVP cua ung dung quan ly tai chinh ca nhan PERFIN. Ban nay gom:

- Backend REST API bang Node.js, Express va PostgreSQL.
- Frontend mobile bang React Native Expo.
- Luong demo chatbot nhap giao dich bang text, anh hoa don va ghi am.
- Man hinh tong quan, giao dich, ngan sach va bao cao co ban.

Luu y: frontend dang duoc ghim ve Expo SDK 54 vi Expo Go tren iOS hien tai cua moi truong demo chi ho tro SDK 54.

## 1. Yeu cau moi truong

- Node.js va npm.
- PostgreSQL dang chay local.
- Expo Go tren dien thoai.
- Neu chay trong WSL va mo app tren iOS, nen dung Expo tunnel va backend tunnel nhu huong dan ben duoi.

## 2. Cau truc thu muc

```text
demo/v1/
├── backend/
│   ├── index.js
│   ├── config/database.js
│   ├── migrations/
│   ├── models/
│   ├── routes/
│   ├── scripts/migrate.js
│   └── services/
└── frontend/
    ├── App.js
    ├── app.json
    ├── src/components/
    ├── src/screens/
    └── src/services/api.service.js
```

## 3. Cau hinh backend

Tao file `backend/.env` theo mau:

```env
PORT=3000

DB_USER=postgres
DB_HOST=localhost
DB_NAME=demodb
DB_PASSWORD=postgres
DB_PORT=5432

# Tuy chon. Neu khong cau hinh, backend tu fallback sang local parser/mock.
GEMINI_API_KEY=
AI_PROVIDER=auto

# Media AI local tren backend host. Khong co cloud OCR/STT fallback.
MEDIA_AI_OFFLINE=true
MEDIA_AI_TIMEOUT_MS=120000
MEDIA_AI_CACHE_DIR=.cache/media-ai
MEDIA_AI_PYTHON=.venv-ai/bin/python
OCR_LANG=vi
PHOWHISPER_MODEL=vinai/PhoWhisper-small
```

Khong commit khoa API hoac file credential that vao git.

## 4. Cai dat va khoi tao database

Tu thu muc `demo/v1/backend`:

```bash
npm install
npm run migrate
```

Neu can reset lai toan bo schema va seed data:

```bash
npm run migrate:fresh
```

Migration hien tao cac bang chinh:

- `categories`
- `wallets`
- `transactions`
- `budgets`
- `budget_history`
- `chat_messages`

Seed mac dinh tao danh muc thu/chi va vi `Tien mat` cho `default_user`.

## 5. Chay backend

Tu thu muc `demo/v1/backend`:

```bash
npm start
```

Hoac chay watch mode:

```bash
npm run dev
```

Kiem tra API:

```bash
curl http://localhost:3000/
curl http://localhost:3000/api/test-db
```

Neu thanh cong, API tra ve JSON co `success: true`.

## 5.1. Chay nhanh bang script

Tu thu muc `demo/v1`:

```bash
chmod +x start-app.sh
./start-app.sh lan
```

Chay voi Expo tunnel va backend tunnel de test tren iOS Expo Go khi dung WSL:

```bash
./start-app.sh tunnel
```

Neu muon chay migration truoc khi khoi dong:

```bash
./start-app.sh tunnel --migrate
```

Dung `Ctrl+C` de dung cac tien trinh do script khoi tao.

## 6. Chay frontend tren may cung LAN

Tu thu muc `demo/v1/frontend`:

```bash
npm install
npm run start:lan
```

Dung Expo Go quet QR. Cach nay chi phu hop khi dien thoai truy cap duoc IP LAN cua may dang chay Metro va backend.

Frontend tu suy ra backend theo IP cua Metro neu URL Metro la IP LAN, vi du:

```text
http://192.168.1.15:3000
```

Neu app bao khong ket noi duoc API, dat bien moi truong ro rang truoc khi chay Expo:

```bash
EXPO_PUBLIC_API_URL=http://IP_LAN_CUA_MAY:3000 npx expo start --lan --clear
```

## 7. Chay iOS khi project nam trong WSL

Trong WSL, Expo LAN thuong phat IP ao dang `172.x.x.x`. iPhone khong truy cap duoc IP nay. Cach de demo nhanh:

1. Chay backend local:

   ```bash
   cd demo/v1/backend
   npm start
   ```

2. Mo public tunnel cho backend port 3000:

   ```bash
   cd demo/v1/backend
   npx --yes localtunnel --port 3000 --local-host 127.0.0.1
   ```

   Lenh nay in ra URL dang:

   ```text
   https://ten-ngau-nhien.loca.lt
   ```

3. Chay Expo tunnel va tro frontend ve backend tunnel:

   ```bash
   cd demo/v1/frontend
   EXPO_PUBLIC_API_URL=https://ten-ngau-nhien.loca.lt npx expo start --tunnel --clear
   ```

4. Tren iOS, tat han Expo Go khoi app switcher, mo lai va quet QR moi.

Neu localtunnel tra `408 Request Timeout` hoac URL het hoat dong, dung tunnel cu va tao tunnel moi, sau do restart Expo voi `EXPO_PUBLIC_API_URL` moi.

## 8. Cac script hien co

Backend:

```bash
npm start          # chay API server
npm run dev        # chay API server voi node --watch
npm run migrate    # chay migration chua ap dung
npm run migrate:fresh
npm run seed
npm run seed:demo         # tao du lieu demo (80-120 giao dich, 3 thang)
npm run seed:demo:fresh   # xoa du lieu demo cu roi seed lai
npm run test:ai    # kiem tra do chinh xac AI (32 cau tieng Viet)
```

Frontend:

```bash
npm start          # expo start
npm run start:lan  # expo start --lan
npm run start:tunnel
npm run android
npm run ios
npm run web
```

Chi tiet day du cua tat ca endpoints xem trong `doc/API.md`.

Tom tat API chinh:

Health check: `GET /` · `GET /api/test-db`

AI va chat:
- `POST /api/chat/message` · `POST /api/chat/confirm` · `POST /api/chat/edit` · `POST /api/chat/cancel`
- `GET /api/chat/messages` · `POST /api/ocr` · `POST /api/speech`

Tai chinh:
- `GET/POST /api/accounts` · `GET /api/accounts/balance`
- `GET /api/categories` · `GET/POST/PUT/DELETE /api/transactions`
- `GET /api/transactions/summary` · `POST /api/transactions/:id/restore`
- `GET/POST/DELETE /api/budgets` · `GET /api/budgets/progress`
- `GET /api/reports/summary` · `/category-breakdown` · `/monthly-trend`

## 10. Tinh nang da co trong demo

- Dashboard tong quan so du vi mac dinh, tong thu, tong chi va giao dich gan day.
- Them giao dich thu/chi thu cong.
- Chat nhap giao dich bang ngon ngu tu nhien, vi du `an pho 50k` hoac `nhan luong 5 trieu`.
- Xem preview giao dich do chatbot phan tich, sua mo ta/so tien, xac nhan hoac huy.
- Luu lich su chat vao database.
- Upload anh hoa don va audio tu frontend.
- Tao ngan sach theo danh muc chi tieu trong thang hien tai.
- Xem tien do ngan sach va bao cao chi tieu theo danh muc.
- Xem xu huong chi tieu 12 thang.
- Backend co soft delete va restore giao dich.
- AI co 2 che do: Gemini neu co `GEMINI_API_KEY`, fallback local parser neu khong co hoac API loi.

## 11. Cac phan chua hoan thien

- Chua co dang nhap, dang ky, phan quyen hay multi-user that. Backend dang dung cung `default_user`.
- OCR va Speech-to-Text chay tren backend host bang PaddleOCR va PhoWhisper. Neu runtime/model thieu, endpoint tra loi 503 va khong tao mock text.
- Gemini la tuy chon. Neu khong co `GEMINI_API_KEY`, parser local chi xu ly cac mau tieng Viet don gian.
- Chua co AI personalities, nhac nho chi phi dinh ky, recurring bills hay notification.
- Chua co export/backup du lieu, offline mode, hay sync.
- Chua co deploy production, rate limit, logging tap trung.

## 12. Troubleshooting

### Expo Go bao phai tai ban moi nhat

Kiem tra frontend dang dung SDK 54:

```bash
cd demo/v1/frontend
npm ls expo react-native
```

Neu version bi lech, chay:

```bash
npm install
npx expo install --fix
npx expo start --tunnel --clear
```

### App mo duoc nhung bao khong ket noi API

Kiem tra backend:

```bash
curl http://localhost:3000/
curl http://localhost:3000/api/test-db
```

Neu dang chay trong WSL va dung iOS, dung backend tunnel:

```bash
npx --yes localtunnel --port 3000 --local-host 127.0.0.1
EXPO_PUBLIC_API_URL=https://URL_BACKEND_TUNNEL npx expo start --tunnel --clear
```

### App van goi API cu

Tat han Expo Go khoi app switcher, sau do quet QR moi. Neu van loi, restart Expo bang `--clear`.

### Backend chay nhung database loi

Kiem tra `.env`, PostgreSQL service va database `demodb`. Sau do chay lai:

```bash
cd demo/v1/backend
npm run migrate
```

## 13. Ghi chu bao mat khi demo bang tunnel

Public tunnel lam API local co the truy cap tu internet trong thoi gian tunnel dang chay. Chi dung cho demo ngan han, khong truyen du lieu that, va dung tunnel sau khi demo xong bang `Ctrl+C`.

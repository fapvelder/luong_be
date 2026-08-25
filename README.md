# Backend Node.js — SQLite local

Đây là backend thay cho thư mục `backend` Python trong dự án React trước đó.

## Cài và chạy
1. Cài Node.js 20+.
2. Trong thư mục này chạy:
   ```bash
   npm install
   npm start
   ```
3. React Vite vẫn chạy ở `http://localhost:5173`; API Node sẽ chạy `http://127.0.0.1:5000`.

Database tự tạo: `luong.db` trong chính thư mục backend. Không gửi dữ liệu ra Internet.

## API cho React
- `GET/POST /api/employees`
- `DELETE /api/employees/:id`
- `GET /api/logs?employee_id=ID&month=YYYY-MM`
- `POST /api/logs`
- `DELETE /api/logs/:id`

Công thức: pot dùng = pot đầu − pot cuối; meso mua pot = pot dùng × giá pot; meso thực nhận = meso cuối − meso đầu − meso mua pot; giờ = meso thực nhận ÷ meso/giờ; lương = giờ × đơn giá giờ.

# Quickstart — Bật cây ước nguyện chung (007)

Khi chưa làm các bước dưới đây, web vẫn chạy **chế độ local** (mỗi người một cây riêng trong trình duyệt).

## 1. Tạo project Supabase
1. Vào https://supabase.com → **New project** (gói Free là đủ). Ghi lại **Database password**.
2. Vào **Project Settings → API**, ghi lại:
   - **Project URL** — dạng `https://<ref>.supabase.co`
   - **anon public key** — key công khai, được phép nằm trong frontend
   - **Project ref** — phần `<ref>` trong URL
3. ⚠️ Không chia sẻ / commit **service_role key**. Edge Function tự có key này.

## 2. Tạo bảng và các hàm (migration)
Chọn một trong hai cách:

**Cách A — SQL Editor (không cần cài gì):** mở **SQL Editor**, dán toàn bộ nội dung
`supabase/migrations/20260930000000_shared_wishes.sql` rồi bấm **Run**.

**Cách B — CLI:**
```bash
npx supabase login                          # mở trình duyệt để đăng nhập
npx supabase link --project-ref <ref>       # nhập Database password khi được hỏi
npx supabase db push
```

## 3. Deploy Edge Function `wishes`
```bash
npx supabase secrets set IP_HASH_SALT="<chuỗi ngẫu nhiên ≥ 32 ký tự>" \
  ALLOWED_ORIGINS="https://minh32520-eng.github.io,http://localhost:5173,http://localhost:4173"
npx supabase functions deploy wishes --no-verify-jwt
```
- `IP_HASH_SALT`: bí mật dùng để băm IP. Đổi salt → mọi IP được tính lại từ 0 lượt.
- `--no-verify-jwt`: web không đăng nhập nên function tự kiểm tra quyền bằng owner token.

## 4. Cấu hình frontend
**Chạy ở máy:** tạo file `.env.local` (đã nằm trong `.gitignore`):
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

**GitHub Pages:** vào repo → **Settings → Secrets and variables → Actions → Variables** → thêm
`SUPABASE_URL` và `SUPABASE_ANON_KEY`, rồi chạy lại workflow **Deploy GitHub Pages**.

## 5. Kiểm tra
- Mở web ở 2 trình duyệt khác nhau → điều ước viết ở máy này xuất hiện ở máy kia trong ≤ 30 s.
- Viết đủ 3 điều ước → lần thứ 4 bị chặn với thông báo giới hạn IP.
- Supabase **Table Editor → wishes**: cột `ip_hash` là chuỗi 64 ký tự hex, không có IP gốc.

## Quản trị
- Xoá nội dung xấu: Table Editor → `wishes` → đặt `deleted_at = now()` (hoặc xoá hàng).
- Cho một IP thêm lượt: không có cách "reset" riêng lẻ vì IP chỉ lưu dạng băm; có thể xoá hẳn các hàng của `ip_hash` đó.

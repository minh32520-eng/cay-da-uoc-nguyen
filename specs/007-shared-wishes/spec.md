# Feature Specification: Cây ước nguyện chung & giới hạn 3 điều ước mỗi IP

**Feature ID**: `007-shared-wishes`
**Branch**: `007-shared-wishes`
**Status**: Approved
**Created**: 2026-09-30
**Depends on**: 001, 002, 003, 004, 005, 006 · Constitution v2.0.0 (§II, §VII)

---

## 1. Context & Goal

- **Bối cảnh**: Hiện mỗi người chỉ thấy điều ước lưu trong trình duyệt của mình. Người dùng muốn một cây chung: ai viết thì mọi người vào web đều thấy; đồng thời chống spam bằng cách giới hạn **mỗi địa chỉ IP chỉ viết được 3 điều ước**.
- **Mục tiêu**: Lưu điều ước vào database Supabase; cây hiển thị **100 điều ước mới nhất** của tất cả mọi người; danh sách xem được cả điều ước cũ hơn; server thực thi giới hạn 3 điều ước/IP; chỉ người viết mới sửa/gỡ được điều ước của mình.
- **Chỉ số thành công**:
  - Điều ước mới xuất hiện trên máy người khác trong ≤ 30 s (không cần tải lại trang).
  - 0 trường hợp một IP tạo được điều ước thứ 4, kể cả khi gửi đồng thời.
  - 0 IP gốc được lưu trong database.

## 2. Actors

| Actor | Mô tả | Mục tiêu |
|---|---|---|
| Người viết | Khách truy cập muốn treo điều ước | Viết (tối đa 3 lần/IP), sửa/gỡ điều ước của mình |
| Người xem | Bất kỳ ai mở web | Xem cây chung, đọc điều ước của mọi người |
| Edge Function `wishes` (hệ thống) | Hàm Deno trên Supabase, giữ service-role key | Kiểm tra dữ liệu, băm IP, thực thi giới hạn & quyền sở hữu |
| Database Postgres (hệ thống) | Bảng `wishes`, view `public_wishes`, các hàm RPC | Lưu trữ bền vững, ràng buộc CHECK, khoá giao dịch |
| Quản trị viên | Chủ project Supabase | Xoá nội dung xấu qua Supabase Dashboard |

## 3. Functional Requirements (EARS)

| ID | Loại EARS | Yêu cầu |
|---|---|---|
| FR-007-01 | Optional | WHERE biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` được cấu hình lúc build, THE system SHALL chạy ở **chế độ remote** (dữ liệu chung); nếu không, THE system SHALL chạy **chế độ local** như spec 003. |
| FR-007-02 | Event-driven | WHEN ứng dụng khởi động ở chế độ remote, THE system SHALL tải 100 điều ước mới nhất (chưa bị gỡ) từ view `public_wishes` và treo lên cây. |
| FR-007-03 | Ubiquitous | THE system SHALL gán slot cho điều ước remote một cách tất định ở phía client: xét theo thứ tự `created_at` tăng dần, mỗi điều ước nhận slot trống chọn bằng số ngẫu nhiên có seed là `id`, ưu tiên tầng thấp — mọi máy cùng dữ liệu thấy cùng bố cục. |
| FR-007-04 | State-driven | WHILE tab đang hiển thị ở chế độ remote, THE system SHALL tải lại danh sách mỗi 30 s và ngay sau mỗi thao tác tạo/sửa/gỡ/khôi phục của chính người dùng. |
| FR-007-05 | Event-driven | WHEN người dùng mở form viết điều ước ở chế độ remote, THE system SHALL hiển thị số lượt còn lại ("Bạn còn n/3 lượt viết") và dòng thông báo "Điều ước sẽ hiển thị công khai cho mọi người". |
| FR-007-06 | Event-driven | WHEN người dùng gửi điều ước hợp lệ ở chế độ remote, THE system SHALL sinh một owner token ngẫu nhiên 32 byte, gửi tới Edge Function, và chỉ treo lên cây khi server trả về thành công. |
| FR-007-07 | Ubiquitous | THE Edge Function SHALL lấy IP người gửi từ header (`cf-connecting-ip` → `x-real-ip` → phần tử đầu của `x-forwarded-for`), băm bằng HMAC-SHA256 với salt bí mật, và chỉ lưu bản băm. |
| FR-007-08 | Unwanted | IF một IP đã tạo 3 điều ước (kể cả điều ước đã gỡ), THEN THE system SHALL từ chối điều ước tiếp theo với lỗi `QUOTA_EXCEEDED` (HTTP 429) và giữ nguyên bản nháp của người dùng. |
| FR-007-09 | Ubiquitous | THE database SHALL đếm và chèn trong cùng một giao dịch có khoá theo bản băm IP (`pg_advisory_xact_lock`) để các yêu cầu đồng thời không vượt giới hạn. |
| FR-007-10 | Ubiquitous | THE Edge Function SHALL validate lại nội dung (1–200 ký tự grapheme), tên (≤ 30), chủ đề, màu giấy và từ cấm giống client; database SHALL có ràng buộc `CHECK` tương ứng. |
| FR-007-11 | Ubiquitous | THE system SHALL lưu owner token của mỗi điều ước mình viết trong localStorage và chỉ hiển thị nút "Sửa" / "Gỡ" cho điều ước có token. |
| FR-007-12 | Event-driven | WHEN người dùng sửa, gỡ hoặc hoàn tác điều ước ở chế độ remote, THE system SHALL gửi owner token tới Edge Function; server chỉ thực hiện khi SHA-256 của token khớp bản băm đã lưu. |
| FR-007-13 | Ubiquitous | THE system SHALL gỡ điều ước bằng cách đánh dấu `deleted_at` (xoá mềm); điều ước đã gỡ vẫn tính vào 3 lượt của IP và có thể khôi phục trong 60 s. |
| FR-007-14 | Event-driven | WHEN người dùng cuộn tới cuối "Danh sách ước nguyện" ở chế độ remote và bấm "Xem thêm", THE system SHALL tải thêm 100 điều ước cũ hơn (không treo lên cây). |
| FR-007-15 | State-driven | WHILE ở chế độ remote, THE system SHALL ẩn "Nhập sao lưu" và "Xoá toàn bộ" (005); "Xuất sao lưu" xuất các điều ước đang tải được. |
| FR-007-16 | Event-driven | WHEN người nhận bấm "Treo lên cây của tôi" từ link chia sẻ (006) ở chế độ remote, THE system SHALL tạo điều ước mới qua server với `source = 'shared'` (tính vào 3 lượt); IF cây chung đã có điều ước cùng nội dung và tên, THEN THE system SHALL báo trùng thay vì tạo mới. |
| FR-007-17 | Unwanted | IF không kết nối được server ở chế độ remote, THEN THE system SHALL giữ dữ liệu đang hiển thị, báo lỗi và cho phép thử lại; KHÔNG lặng lẽ lưu vào localStorage. |
| FR-007-18 | Ubiquitous | THE view `public_wishes` SHALL chỉ lộ các cột công khai (`id, content, author, category, paper_color, source, created_at, updated_at`); anon key KHÔNG đọc được bảng `wishes` và các cột băm. |
| FR-007-19 | Event-driven | WHEN client gọi `GET /quota`, THE Edge Function SHALL trả `{ used, limit, remaining }` cho IP hiện tại. |

### Ghi đè các spec khác ở chế độ remote

| Spec | Yêu cầu | Ở chế độ remote |
|---|---|---|
| 003 | FR-003-08, 09, 10, 11, 15 (lưu & nạp localStorage) | Thay bằng FR-007-02..04 (nguồn dữ liệu là server) |
| 003 | FR-003-12 (cây đầy) | Không áp dụng: cây luôn hiển thị 100 điều ước mới nhất |
| 005 | FR-005-08..14 (nhập, thay thế, xoá toàn bộ) | Ẩn (FR-007-15) |
| 005 | FR-005-03..06 (sửa, gỡ, hoàn tác) | Chỉ với điều ước có owner token (FR-007-11..13) |
| 006 | FR-006-09, 10 | Theo FR-007-16 |

## 4. Non-Functional Requirements

| ID | Nhóm | Yêu cầu |
|---|---|---|
| NFR-007-01 | Bảo mật | THE system SHALL không đưa service-role key hay salt băm IP vào bundle frontend hoặc git; chúng chỉ nằm trong secrets của Edge Function. |
| NFR-007-02 | Quyền riêng tư | THE system SHALL không lưu, không log IP gốc; chỉ lưu HMAC-SHA256(salt, ip) dạng hex 64 ký tự. |
| NFR-007-03 | Bảo mật | THE Edge Function SHALL chỉ chấp nhận CORS từ các origin trong biến `ALLOWED_ORIGINS`. |
| NFR-007-04 | Hiệu năng | THE system SHALL tải danh sách cây (100 bản ghi) trong ≤ 1 s trên 4G giả lập; payload ≤ 60 KB. |
| NFR-007-05 | Đơn giản | THE client SHALL gọi Supabase bằng `fetch` (không thêm `supabase-js`); bundle ban đầu tăng ≤ 5 KB gzip. |
| NFR-007-06 | Kiểm thử | THE logic thuần của Edge Function (validate, lấy IP, băm, CORS) SHALL nằm trong `supabase/functions/_shared/` và có unit test chạy bằng Vitest. |
| NFR-007-07 | Kiểm thử | THE luồng remote SHALL có e2e chạy với server Supabase giả lập bằng `page.route`, không cần mạng thật. |
| NFR-007-08 | Tương thích | THE chế độ local SHALL giữ nguyên hành vi và toàn bộ test của 003/005/006. |

## 5. Data Model

```sql
-- supabase/migrations/20260930000000_shared_wishes.sql
create table public.wishes (
  id               uuid primary key default gen_random_uuid(),
  content          text not null check (char_length(btrim(content)) between 1 and 400),  -- ≤ 200 grapheme kiểm ở function
  author           text not null check (char_length(btrim(author)) between 1 and 60),
  category         text not null check (category in ('family','study','health','love','career','other')),
  paper_color      text not null check (paper_color in ('red','yellow','pink','green','blue')),
  source           text not null default 'local' check (source in ('local','shared')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  owner_token_hash text not null check (owner_token_hash ~ '^[0-9a-f]{64}$'),
  ip_hash          text not null check (ip_hash ~ '^[0-9a-f]{64}$')
);
-- view public_wishes: chỉ cột công khai, where deleted_at is null
-- RPC (security definer, chỉ service_role gọi được): create_wish, update_wish, delete_wish, restore_wish, wish_quota
```

```ts
// Client — dữ liệu đọc từ view (validate bằng Zod)
interface RemoteWishRow {
  id: string; content: string; author: string;
  category: WishCategory; paper_color: PaperColor;
  source: 'local' | 'shared'; created_at: string; updated_at: string;
}
// → map thành Wish (002 §5); slotId gán bởi assignRemoteSlots (FR-007-03)

interface Quota { used: number; limit: number; remaining: number }

// localStorage key "banyan:owners:v1"
type OwnerTokens = Record<string /* wishId */, string /* token base64url */>;
```

## 6. API Spec

### 6.1 Đọc (PostgREST, anon key)
`GET {SUPABASE_URL}/rest/v1/public_wishes?select=*&order=created_at.desc&limit=100&offset={n}`
Headers: `apikey: <anon>`, `Authorization: Bearer <anon>` → `200 RemoteWishRow[]`

### 6.2 Ghi (Edge Function `{SUPABASE_URL}/functions/v1/wishes`)

| Method & path | Body | Thành công | Lỗi |
|---|---|---|---|
| `GET /quota` | — | `200 { used, limit: 3, remaining }` | 500 |
| `POST /` | `{ content, author, category, paperColor, ownerToken, source? }` | `201 { wish: RemoteWishRow, quota }` | 422 `VALIDATION` / `PROFANITY`, 429 `QUOTA_EXCEEDED` |
| `PATCH /:id` | `{ ownerToken, content, author, category, paperColor }` | `200 { wish }` | 403 `FORBIDDEN`, 404 `NOT_FOUND`, 422 |
| `DELETE /:id` | `{ ownerToken }` | `200 { id }` | 403, 404 |
| `POST /:id/restore` | `{ ownerToken }` | `200 { wish }` | 403, 404, 410 `GONE` (> 60 s) |

Lỗi luôn có dạng `{ "error": "<CODE>", "message": "<tiếng Việt>" }`.

### 6.3 Client

```ts
// src/shared/config/backend.ts
BACKEND: { url: string; anonKey: string } | null      // FR-007-01

// src/entities/wish/remote/remoteRepository.ts
remoteRepository.list(offset?: number, limit?: number): Promise<Result<RemoteWishRow[], RemoteError>>
remoteRepository.quota(): Promise<Result<Quota, RemoteError>>
remoteRepository.create(draft: WishDraft, ownerToken: string, source?: Wish['source']): Promise<Result<{ wish: RemoteWishRow; quota: Quota }, RemoteError>>
remoteRepository.update(id, draft, ownerToken): Promise<Result<RemoteWishRow, RemoteError>>
remoteRepository.remove(id, ownerToken): Promise<Result<{ id: string }, RemoteError>>
remoteRepository.restore(id, ownerToken): Promise<Result<RemoteWishRow, RemoteError>>
type RemoteError = 'NETWORK' | 'VALIDATION' | 'PROFANITY' | 'QUOTA_EXCEEDED' | 'FORBIDDEN' | 'NOT_FOUND' | 'GONE' | 'SERVER' | 'BAD_RESPONSE'

// src/entities/wish/remote/assignRemoteSlots.ts
assignRemoteSlots(rows: RemoteWishRow[]): Wish[]      // tối đa 100, tất định (FR-007-03)

// src/entities/wish/ownerTokens.ts
ownerTokens.create(): string; ownerTokens.get(id): string | null; ownerTokens.set(id, token); ownerTokens.has(id): boolean

// supabase/functions/_shared/logic.ts (thuần, có test)
validateWishInput(body: unknown): { ok: true; data } | { ok: false; error: 'VALIDATION' | 'PROFANITY' }
clientIp(headers: Headers): string | null
hmacSha256Hex(secret: string, value: string): Promise<string>
sha256Hex(value: string): Promise<string>
corsHeaders(origin: string | null, allowed: string[]): Record<string, string>
```

## 7. Error Handling

| ID | Tình huống | Hành vi hệ thống | Thông báo người dùng |
|---|---|---|---|
| ERR-007-01 | `QUOTA_EXCEEDED` | Không treo, giữ bản nháp, khoá nút gửi, cập nhật lượt = 0 | "Mỗi địa chỉ IP chỉ được viết 3 điều ước. Bạn đã dùng hết lượt." |
| ERR-007-02 | `NETWORK` / `SERVER` khi gửi | Giữ bản nháp, cho gửi lại | "Không kết nối được máy chủ. Vui lòng thử lại." |
| ERR-007-03 | `NETWORK` khi tải danh sách | Giữ danh sách cũ, thử lại ở chu kỳ sau | "Không tải được cây ước nguyện chung." (1 lần) |
| ERR-007-04 | `FORBIDDEN` khi sửa/gỡ | Không đổi dữ liệu | "Bạn chỉ có thể sửa hoặc gỡ điều ước của chính mình." |
| ERR-007-05 | `NOT_FOUND` | Tải lại danh sách, đóng thẻ | "Điều ước này không còn trên cây." |
| ERR-007-06 | `GONE` khi hoàn tác | Không khôi phục | "Đã quá thời gian hoàn tác." |
| ERR-007-07 | `PROFANITY` / `VALIDATION` từ server | Giữ bản nháp, báo lỗi dưới ô nội dung | Như ERR-002-04 / ERR-002-01 |
| ERR-007-08 | Phản hồi sai định dạng | Coi như `BAD_RESPONSE`, không cập nhật state | "Máy chủ trả dữ liệu không hợp lệ." |
| ERR-007-09 | Không xác định được IP (thiếu header) | Server từ chối 400 `VALIDATION` | "Không xác định được thiết bị, vui lòng thử lại." |

## 8. Acceptance Criteria

| ID | FR | Given | When | Then |
|---|---|---|---|---|
| AC-007-01 | FR-007-01 | Không có biến `VITE_SUPABASE_*` | Khởi động | `BACKEND === null`, app chạy chế độ local (toàn bộ test 003 vẫn xanh) |
| AC-007-02 | FR-007-02, 03 | Server có 120 điều ước | Tải cây | Cây treo đúng 100 điều ước mới nhất, slot không trùng |
| AC-007-03 | FR-007-03 | Cùng danh sách điều ước | Gán slot 2 lần (đảo thứ tự đầu vào) | Kết quả giống hệt nhau |
| AC-007-04 | FR-007-03 | Danh sách có thêm 1 điều ước mới nhất | Gán slot lại | Các điều ước cũ giữ nguyên slot |
| AC-007-05 | FR-007-05, 19 | IP đã viết 1 điều ước | Mở form | Thấy "Bạn còn 2/3 lượt viết" và thông báo công khai |
| AC-007-06 | FR-007-06, 11 | Form hợp lệ | Gửi | Server nhận `ownerToken` 43 ký tự base64url; token lưu trong localStorage theo id; điều ước xuất hiện trên cây |
| AC-007-07 | FR-007-08 | IP đã dùng 3 lượt | Gửi điều ước thứ 4 | Nhận 429, thấy ERR-007-01, bản nháp còn nguyên |
| AC-007-08 | FR-007-07, NFR-007-02 | Header `cf-connecting-ip: 1.2.3.4` | Gọi `clientIp` + `hmacSha256Hex` | Trả 64 ký tự hex; salt khác → băm khác; không chứa "1.2.3.4" |
| AC-007-09 | FR-007-07 | Chỉ có `x-forwarded-for: 5.6.7.8, 10.0.0.1` | Gọi `clientIp` | Trả `5.6.7.8` |
| AC-007-10 | FR-007-10 | Body nội dung rỗng / 201 grapheme / từ cấm / màu lạ | `validateWishInput` | Lỗi `VALIDATION` / `VALIDATION` / `PROFANITY` / `VALIDATION` |
| AC-007-11 | FR-007-10 | Danh sách từ cấm của function | So với `profanity-vi.json` của client | Giống hệt |
| AC-007-12 | FR-007-11 | Điều ước của người khác | Mở thẻ chi tiết | Không có nút "Sửa" / "Gỡ"; có "Chia sẻ" |
| AC-007-13 | FR-007-12, 13 | Điều ước của mình | Gỡ rồi "Hoàn tác" | Server nhận token; điều ước biến mất rồi xuất hiện lại |
| AC-007-14 | FR-007-17, ERR-007-02 | Server không phản hồi | Gửi điều ước | Thấy ERR-007-02; localStorage không có bản ghi mới |
| AC-007-15 | FR-007-18 | Migration SQL | Kiểm tra nội dung | Có `enable row level security` trên `wishes`, view không chọn cột `ip_hash` / `owner_token_hash`, RPC chỉ grant cho `service_role` |
| AC-007-16 | FR-007-09 | Migration SQL | Kiểm tra `create_wish` | Có `pg_advisory_xact_lock` trước khi đếm |
| AC-007-17 | NFR-007-03 | Origin lạ | `corsHeaders` | Không trả `Access-Control-Allow-Origin` cho origin đó |
| AC-007-18 | FR-007-15 | Chế độ remote | Mở "Sao lưu" | Không có "Nhập sao lưu" và "Xoá toàn bộ" |
| AC-007-19 | FR-007-04 | Người khác vừa viết | Chờ ≤ 30 s | Điều ước mới xuất hiện trên cây mà không tải lại trang |

## 9. Out of Scope

- Đăng nhập tài khoản; giới hạn theo người dùng thay vì IP.
- Kiểm duyệt trước khi hiển thị, nút báo cáo nội dung (quản trị viên xoá qua Supabase Dashboard).
- Chuyển các điều ước đang lưu localStorage (chế độ local) lên server.
- Realtime qua WebSocket (dùng polling 30 s).
- Nhiều cây / phân trang trên cây 3D (cây luôn là 100 điều ước mới nhất).
- Chống giả mạo IP qua VPN/proxy; người dùng chung một IP (trường học, 4G) dùng chung 3 lượt — đây là giới hạn đã được chấp nhận.

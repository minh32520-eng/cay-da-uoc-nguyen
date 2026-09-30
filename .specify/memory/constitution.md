<!--
Sync Impact Report
- Version: 1.0.0 → 2.0.0 (MAJOR — đổi nghĩa nguyên tắc II và VII)
- Lý do: người dùng yêu cầu (2026-09-30) cơ sở dữ liệu chung để mọi người thấy điều ước của nhau,
  và giới hạn mỗi IP chỉ viết 3 điều ước. Người dùng đã đồng ý rõ ràng việc sửa hiến pháp.
- Nguyên tắc sửa: II (Client-only → Backend tối thiểu có kiểm soát), III (thêm kiểm định phía server),
  VII (quyền riêng tư khi có dữ liệu công khai & IP).
- Ràng buộc công nghệ: thêm Supabase; sửa cho khớp thực tế: npm (không phải pnpm), store tự ghi
  localStorage (không dùng middleware persist), model cây dựng bằng code (không có file .glb).
- Spec bị ảnh hưởng: 003, 004, 005, 006 (được spec 007 ghi đè ở chế độ "remote"); 007 mới.
- Tên dự án: Cây Đa Ước Nguyện Trung Thu → Cây Thông Ước Nguyện (chủ đề Giáng sinh, spec 001).
-->

# Hiến pháp dự án: Cây Thông Ước Nguyện

> Hiến pháp là tài liệu có thẩm quyền cao nhất của dự án. Mọi spec, plan, task và mã nguồn PHẢI tuân thủ.
> Khi có xung đột, thứ tự ưu tiên: **Constitution > AGENTS.md > spec.md > plan.md > tasks.md > mã nguồn**.

---

## Nguyên tắc cốt lõi (Core Principles)

### I. Spec trước, code sau (Spec-Driven Development) — BẮT BUỘC
- Mọi tính năng PHẢI có `specs/<NNN-feature>/spec.md` được duyệt trước khi viết code.
- Spec PHẢI có đủ 9 mục: *Context & Goal, Actors, Functional Requirements, Non-Functional Requirements, Data Model, API Spec, Error Handling, Acceptance Criteria, Out of Scope*.
- Yêu cầu chức năng PHẢI viết theo cú pháp **EARS** (xem mục "Chuẩn EARS" bên dưới).
- Mã nguồn không được hiện thực hoá hành vi không có trong spec. Hành vi mới → cập nhật spec trước.

### II. Backend tối thiểu, có kiểm soát — BẮT BUỘC
- Frontend là SPA tĩnh, build ra deploy được lên hosting tĩnh (GitHub Pages).
- Backend DUY NHẤT được phép: **một project Supabase** gồm (a) Postgres chứa bảng điều ước chung, (b) **một** Edge Function `wishes` xử lý mọi thao tác ghi (tạo / sửa / gỡ / khôi phục) và giới hạn IP. KHÔNG thêm server, dịch vụ hay API bên thứ ba nào khác.
- Client CHỈ dùng **anon key** (công khai) để ĐỌC qua view công khai và gọi Edge Function. **Service-role key** và mọi bí mật (salt băm IP) CHỈ nằm trong biến môi trường của Edge Function — cấm đưa vào mã nguồn frontend hoặc commit lên git.
- Mọi luật nghiệp vụ quan trọng (giới hạn 3 điều ước/IP, quyền sửa/gỡ) PHẢI được thực thi ở **server/database**, không tin client.
- Khi chưa cấu hình Supabase (dev, test, offline), ứng dụng PHẢI chạy được ở **chế độ local** (localStorage) như trước.
- "API Spec" trong spec gồm cả hợp đồng HTTP của Edge Function và hợp đồng giữa các module phía client.

### III. An toàn kiểu & dữ liệu được kiểm định
- TypeScript `strict: true`; cấm `any` (trừ khi có comment giải thích và được review).
- Mọi dữ liệu đi vào từ bên ngoài (localStorage, URL, file import, input người dùng, **phản hồi server**) PHẢI được validate bằng **Zod schema** trước khi dùng.
- Server PHẢI validate lại toàn bộ input (độ dài, enum, từ cấm) và database PHẢI có ràng buộc `CHECK` tương ứng.
- Schema dữ liệu có trường `version` (client) hoặc migration có đánh số (database); thay đổi schema PHẢI kèm migration.

### IV. Kiểm thử bám theo Acceptance Criteria
- Mỗi Acceptance Criteria (AC) PHẢI có ít nhất một test tự động tham chiếu ID của nó (vd: `it('AC-002-03: ...')`).
- Logic thuần (service, store, validator, codec, logic của Edge Function) → **Vitest** unit test, độ phủ ≥ 80% dòng.
- Luồng người dùng chính → **Playwright** e2e.
- Không merge khi test đỏ.

### V. Khả năng tiếp cận & tiếng Việt là mặc định
- Tuân thủ **WCAG 2.1 mức AA** cho mọi UI 2D (form, modal, danh sách).
- Mọi thao tác PHẢI làm được bằng bàn phím; mọi tờ ước nguyện 3D PHẢI có tương đương truy cập được (danh sách / aria).
- Ngôn ngữ giao diện mặc định: **tiếng Việt**; chuỗi hiển thị đặt trong file i18n, không hard-code trong component.
- Tôn trọng `prefers-reduced-motion`.

### VI. Ngân sách hiệu năng
- Desktop: ≥ 60 FPS; điện thoại tầm trung: ≥ 30 FPS khi hiển thị 100 tờ ước nguyện.
- JS bundle ban đầu (gzip) ≤ 500 KB, không tính module 3D lazy-load; nếu dùng model GLB thì ≤ 3 MB (nén Draco/Meshopt).
- LCP ≤ 2.5 s trên 4G giả lập; module 3D được lazy-load với màn hình chờ.

### VII. Quyền riêng tư
- Không analytics, không cookie theo dõi.
- **Không bao giờ lưu IP gốc.** IP chỉ được lưu dưới dạng HMAC-SHA256 với salt bí mật, chỉ để đếm giới hạn.
- Mã sở hữu (owner token) chỉ lưu trong trình duyệt người viết; server chỉ lưu bản băm SHA-256.
- Ở chế độ dữ liệu chung, điều ước là **công khai**: giao diện PHẢI nói rõ điều này trước khi người dùng gửi. Cột băm IP / băm token KHÔNG được lộ qua API đọc.

### VIII. Đơn giản (YAGNI)
- Chỉ làm những gì spec yêu cầu. Không thêm thư viện khi có thể làm bằng code < 50 dòng (vd: gọi Supabase bằng `fetch`, không cần `supabase-js`).
- Mỗi thư viện mới PHẢI được ghi lý do vào `plan.md` của feature.

---

## Ràng buộc công nghệ (Technology Constraints)

| Hạng mục | Lựa chọn chốt |
|---|---|
| Ngôn ngữ | TypeScript 5.x (strict) |
| UI | React 18 + Vite |
| 3D | three.js qua `@react-three/fiber` + `@react-three/drei` |
| State | Zustand (store tự ghi/đọc localStorage có validate) |
| Validation | Zod |
| Style | Tailwind CSS |
| Animation 2D | CSS |
| Backend | Supabase: Postgres + 1 Edge Function (Deno) `wishes` |
| Test | Vitest + React Testing Library + Playwright |
| Lint/Format | ESLint + Prettier |
| Package manager | npm |

Cấu trúc thư mục chuẩn:

```
src/
  app/            # App shell, routing, providers
  features/       # Mỗi feature 1 thư mục: components/, hooks/, services/, *.test.ts
  entities/wish/  # Model Wish: types, zod schema, constants, local + remote repository
  shared/         # ui/, lib/, i18n/, config/
  scene/          # Thành phần 3D dùng chung (cây, ánh sáng, camera)
supabase/
  migrations/     # SQL có đánh số
  functions/      # Edge Function `wishes` + _shared (logic thuần, có test)
specs/            # Tài liệu SDD
```

---

## Chuẩn EARS (bắt buộc cho Functional Requirements)

| Mẫu | Cú pháp |
|---|---|
| Ubiquitous (luôn đúng) | `THE <system> SHALL <response>` |
| Event-driven | `WHEN <trigger>, THE <system> SHALL <response>` |
| State-driven | `WHILE <state>, THE <system> SHALL <response>` |
| Unwanted behaviour | `IF <condition>, THEN THE <system> SHALL <response>` |
| Optional feature | `WHERE <feature is included>, THE <system> SHALL <response>` |
| Complex | Kết hợp: `WHILE <state>, WHEN <trigger>, THE <system> SHALL <response>` |

Quy tắc: mỗi yêu cầu **một** hành vi, có ID duy nhất `FR-<feature>-<nn>`, kiểm thử được, không dùng từ mơ hồ ("nhanh", "đẹp", "thân thiện") mà không có số đo.

---

## Quy trình phát triển (Development Workflow)

1. `/specify` → tạo `specs/NNN-name/spec.md` từ `.specify/templates/spec-template.md`.
2. `/clarify` → giải quyết mọi `[NEEDS CLARIFICATION]`; spec không còn đánh dấu này mới được duyệt.
3. `/plan` → `plan.md` (kiến trúc, thư viện, Constitution Check).
4. `/tasks` → `tasks.md` (task nhỏ, có thứ tự, test trước).
5. `/implement` → code + test; mỗi PR tham chiếu ID FR/AC.
6. Review: kiểm tra **Constitution Check** — mọi vi phạm phải được ghi vào mục *Complexity Tracking* kèm lý do.

Nhánh git: `NNN-feature-name`. Commit theo Conventional Commits (`feat(002): ...`).

---

## Quản trị (Governance)

- Hiến pháp có hiệu lực cao hơn mọi quy ước khác.
- Sửa đổi hiến pháp PHẢI: (1) được người dùng đồng ý rõ ràng, (2) ghi lý do trong Sync Impact Report, (3) tăng version theo SemVer — MAJOR: bỏ/đổi nghĩa nguyên tắc; MINOR: thêm nguyên tắc/mục; PATCH: sửa câu chữ, (4) rà soát lại các spec bị ảnh hưởng.
- Mỗi review PR PHẢI xác nhận tuân thủ hiến pháp.

**Version**: 2.0.0 | **Ratified**: 2026-09-25 | **Last Amended**: 2026-09-30

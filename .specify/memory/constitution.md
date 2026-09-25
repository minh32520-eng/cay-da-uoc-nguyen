# Hiến pháp dự án: Cây Đa Ước Nguyện Trung Thu

> Hiến pháp là tài liệu có thẩm quyền cao nhất của dự án. Mọi spec, plan, task và mã nguồn PHẢI tuân thủ.
> Khi có xung đột, thứ tự ưu tiên: **Constitution > AGENTS.md > spec.md > plan.md > tasks.md > mã nguồn**.

---

## Nguyên tắc cốt lõi (Core Principles)

### I. Spec trước, code sau (Spec-Driven Development) — BẮT BUỘC
- Mọi tính năng PHẢI có `specs/<NNN-feature>/spec.md` được duyệt trước khi viết code.
- Spec PHẢI có đủ 9 mục: *Context & Goal, Actors, Functional Requirements, Non-Functional Requirements, Data Model, API Spec, Error Handling, Acceptance Criteria, Out of Scope*.
- Yêu cầu chức năng PHẢI viết theo cú pháp **EARS** (xem mục "Chuẩn EARS" bên dưới).
- Mã nguồn không được hiện thực hoá hành vi không có trong spec. Hành vi mới → cập nhật spec trước.

### II. Chỉ chạy phía client (Client-only, No Backend) — BẮT BUỘC
- Ứng dụng là SPA tĩnh, KHÔNG có backend, KHÔNG có database server, KHÔNG gọi API bên thứ ba lúc runtime.
- Dữ liệu được lưu tại `localStorage` của trình duyệt; chia sẻ thực hiện qua **URL encode** (không server).
- "API Spec" trong spec được hiểu là **hợp đồng giữa các module phía client**: service, hook, store, sự kiện, định dạng URL, định dạng file import/export.
- Build output PHẢI deploy được lên hosting tĩnh (GitHub Pages / Netlify / Vercel static).

### III. An toàn kiểu & dữ liệu được kiểm định
- TypeScript `strict: true`; cấm `any` (trừ khi có comment giải thích và được review).
- Mọi dữ liệu đi vào từ bên ngoài (localStorage, URL, file import, input người dùng) PHẢI được validate bằng **Zod schema** trước khi dùng.
- Schema dữ liệu có trường `version`; thay đổi schema PHẢI kèm migration.

### IV. Kiểm thử bám theo Acceptance Criteria
- Mỗi Acceptance Criteria (AC) PHẢI có ít nhất một test tự động tham chiếu ID của nó (vd: `it('AC-002-03: ...')`).
- Logic thuần (service, store, validator, codec) → **Vitest** unit test, độ phủ ≥ 80% dòng.
- Luồng người dùng chính → **Playwright** e2e.
- Không merge khi test đỏ.

### V. Khả năng tiếp cận & tiếng Việt là mặc định
- Tuân thủ **WCAG 2.1 mức AA** cho mọi UI 2D (form, modal, danh sách).
- Mọi thao tác PHẢI làm được bằng bàn phím; mọi tờ ước nguyện 3D PHẢI có tương đương truy cập được (danh sách / aria).
- Ngôn ngữ giao diện mặc định: **tiếng Việt**; chuỗi hiển thị đặt trong file i18n, không hard-code trong component.
- Tôn trọng `prefers-reduced-motion`.

### VI. Ngân sách hiệu năng
- Desktop: ≥ 60 FPS; điện thoại tầm trung: ≥ 30 FPS khi hiển thị 100 tờ ước nguyện.
- JS bundle ban đầu (gzip) ≤ 500 KB, không tính model 3D; model cây đa ≤ 3 MB (GLB, nén Draco/Meshopt).
- LCP ≤ 2.5 s trên 4G giả lập; model 3D được lazy-load với màn hình chờ.

### VII. Quyền riêng tư
- Không analytics, không cookie theo dõi, không gửi dữ liệu ra ngoài.
- Nội dung ước nguyện chỉ rời khỏi thiết bị khi người dùng **chủ động** chia sẻ link hoặc xuất file.

### VIII. Đơn giản (YAGNI)
- Chỉ làm những gì spec yêu cầu. Không thêm thư viện khi có thể làm bằng code < 50 dòng.
- Mỗi thư viện mới PHẢI được ghi lý do vào `plan.md` của feature.

---

## Ràng buộc công nghệ (Technology Constraints)

| Hạng mục | Lựa chọn chốt |
|---|---|
| Ngôn ngữ | TypeScript 5.x (strict) |
| UI | React 18 + Vite |
| 3D | three.js qua `@react-three/fiber` + `@react-three/drei` |
| State | Zustand (có middleware `persist` → localStorage) |
| Validation | Zod |
| Style | Tailwind CSS |
| Animation 2D | CSS / Framer Motion |
| Test | Vitest + React Testing Library + Playwright |
| Lint/Format | ESLint + Prettier |
| Package manager | pnpm |

Cấu trúc thư mục chuẩn:

```
src/
  app/            # App shell, routing, providers
  features/       # Mỗi feature 1 thư mục: components/, hooks/, services/, *.test.ts
  entities/wish/  # Model Wish: types, zod schema, constants
  shared/         # ui/, lib/, i18n/, config/
  scene/          # Thành phần 3D dùng chung (cây, ánh sáng, camera)
public/models/    # banyan.glb
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
- Sửa đổi hiến pháp PHẢI: (1) ghi lý do, (2) tăng version theo SemVer — MAJOR: bỏ/đổi nghĩa nguyên tắc; MINOR: thêm nguyên tắc/mục; PATCH: sửa câu chữ, (3) rà soát lại các spec bị ảnh hưởng.
- Mỗi review PR PHẢI xác nhận tuân thủ hiến pháp.

**Version**: 1.0.0 | **Ratified**: 2026-09-25 | **Last Amended**: 2026-09-25

# AGENTS.md — Quy tắc cho AI Agent

Tài liệu này quy định cách mọi AI coding agent (Claude Code, Copilot, Cursor, Codex…) làm việc trong repo **Cây Thông Ước Nguyện** (tên repo cũ: cay-da-uoc-nguyen).
Đọc file này **trước mọi tác vụ**. Nó bổ sung cho [.specify/memory/constitution.md](.specify/memory/constitution.md) và không được mâu thuẫn với hiến pháp.

---

## 1. Tổng quan dự án

- Website React (SPA tĩnh) hiển thị **mô hình 3D cây thông Giáng sinh** giữa trời tuyết (tuần lộc, người tuyết); người dùng viết **tờ giấy ước nguyện** và treo lên các tầng lá.
- **Không có backend.** Dữ liệu lưu `localStorage`; chia sẻ qua URL.
- Phương pháp: **Spec-Driven Development (SDD)** theo chuẩn **Spec Kit**; yêu cầu viết theo **EARS**.

## 2. Nguồn sự thật (Source of Truth)

| Thứ tự | File | Vai trò |
|---|---|---|
| 1 | `.specify/memory/constitution.md` | Nguyên tắc không được vi phạm |
| 2 | `AGENTS.md` | Quy tắc làm việc của agent |
| 3 | `specs/NNN-*/spec.md` | Hành vi cần xây dựng (WHAT/WHY) |
| 4 | `specs/NNN-*/plan.md` | Cách xây dựng (HOW) |
| 5 | `specs/NNN-*/tasks.md` | Danh sách việc cần làm |

Danh mục feature: [specs/README.md](specs/README.md).

## 3. Quy tắc bắt buộc (MUST)

1. **Không code khi chưa có spec.** Nếu yêu cầu của người dùng không có trong spec → đề xuất cập nhật spec trước, chờ xác nhận.
2. **Không bịa yêu cầu.** Điểm chưa rõ → ghi `[NEEDS CLARIFICATION: câu hỏi]` vào spec, không tự đoán.
3. **Không thêm backend**, server, serverless function, database, hay gọi API bên ngoài lúc runtime.
4. **Truy vết ID.** Mọi commit / PR / test phải tham chiếu `FR-xxx-yy` hoặc `AC-xxx-yy`.
5. **Validate mọi input ngoài** (localStorage, URL, file, form) bằng Zod schema trong `src/entities/wish/`.
6. **Dùng lại model `Wish` chung** ở `src/entities/wish`; không định nghĩa lại kiểu Wish trong feature.
7. **Chuỗi UI** đặt ở `src/shared/i18n/vi.ts`; không hard-code tiếng Việt trong JSX.
8. **Test trước**: viết test cho AC, thấy đỏ, rồi mới implement.
9. **Giữ ngân sách hiệu năng** (Constitution §VI); dùng `InstancedMesh` cho tờ giấy khi số lượng > 20.
10. **Accessibility**: phần tử tương tác phải có `aria-label`, focus hiển thị rõ, điều khiển được bằng bàn phím.

## 4. Điều cấm (MUST NOT)

- Không dùng `any`, `// @ts-ignore`, `eslint-disable` khi không có comment lý do.
- Không dùng `dangerouslySetInnerHTML` cho nội dung ước nguyện (chống XSS).
- Không thêm thư viện tracking/analytics/cookie.
- Không sửa `constitution.md` trừ khi người dùng yêu cầu rõ ràng.
- Không xoá/đổi ID của FR/AC đã tồn tại; nếu bỏ yêu cầu, đánh dấu `~~FR-xxx~~ (Deprecated: lý do)`.
- Không commit file model > 3 MB hoặc asset chưa nén.

## 5. Quy trình làm việc của agent

```
Đọc AGENTS.md + constitution
   → Xác định feature (specs/NNN-*)
   → Đọc spec.md (và plan.md/tasks.md nếu có)
   → Kiểm tra [NEEDS CLARIFICATION] → hỏi người dùng nếu còn
   → Viết test theo AC
   → Implement tối thiểu để pass
   → npm run lint && npm run typecheck && npm test
   → Tóm tắt thay đổi kèm ID FR/AC đã hoàn thành
```

## 6. Lệnh chuẩn

| Mục đích | Lệnh |
|---|---|
| Cài đặt | `npm install` |
| Dev server | `npm run dev` |
| Kiểm tra kiểu | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit test | `npm test` |
| E2E | `npm run test:e2e` (dùng Chrome đã cài; `PW_CHANNEL=""` để dùng Chromium) |
| Build tĩnh | `npm run build` |

## 7. Quy ước viết spec

- Dùng template [.specify/templates/spec-template.md](.specify/templates/spec-template.md).
- Đủ 9 mục theo đúng thứ tự: Context & Goal → Actors → Functional Requirements → Non-Functional Requirements → Data Model → API Spec → Error Handling → Acceptance Criteria → Out of Scope.
- FR theo EARS, từ khoá EARS viết HOA tiếng Anh (`WHEN`, `WHILE`, `IF … THEN`, `WHERE`, `SHALL`), nội dung tiếng Việt.
- AC theo Given / When / Then, mỗi AC ánh xạ tới ít nhất một FR.
- ID: `FR-<NNN>-<nn>`, `NFR-<NNN>-<nn>`, `ERR-<NNN>-<nn>`, `AC-<NNN>-<nn>`.

## 8. Quy ước code

- Component: `PascalCase.tsx`; hook: `useXxx.ts`; service: `xxx.service.ts`; test cạnh file: `*.test.ts(x)`.
- Mỗi feature chỉ export qua `features/<name>/index.ts`.
- Feature không import trực tiếp nội bộ của feature khác; giao tiếp qua store (`useWishStore`) hoặc event bus trong `shared/lib/events.ts`.
- Commit: Conventional Commits, scope là số feature: `feat(003): treo tờ ước nguyện vào slot trống`.

## 9. Định nghĩa hoàn thành (Definition of Done)

- [ ] Mọi AC của phạm vi task có test và pass.
- [ ] Typecheck, lint sạch.
- [ ] Không vi phạm Constitution (hoặc đã ghi Complexity Tracking).
- [ ] Kiểm tra bàn phím + screen reader cơ bản cho UI mới.
- [ ] Cập nhật spec nếu hành vi thay đổi.

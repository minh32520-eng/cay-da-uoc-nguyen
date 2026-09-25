# Feature Specification: Viết tờ ước nguyện

**Feature ID**: `002-write-wish`
**Branch**: `002-write-wish`
**Status**: Draft
**Created**: 2026-09-25
**Depends on**: 001-banyan-tree-scene

---

## 1. Context & Goal

- **Bối cảnh**: Tục viết điều ước lên giấy đỏ rồi treo lên cây là nét văn hoá quen thuộc dịp lễ hội. Người dùng cần một cách soạn điều ước nhanh, đẹp và mang không khí Trung Thu.
- **Mục tiêu**: Cung cấp form soạn tờ ước nguyện gồm nội dung, tên người ước, chủ đề, màu giấy, có xem trước trực quan; tạo ra đối tượng `Wish` hợp lệ để feature 003 treo lên cây.
- **Chỉ số thành công**: Người dùng mới hoàn thành một tờ ước nguyện trong ≤ 60 s; 0 bản ghi không hợp lệ lọt vào store.

## 2. Actors

| Actor | Mô tả | Mục tiêu |
|---|---|---|
| Người ước nguyện | Khách truy cập muốn viết điều ước | Soạn nhanh, xem trước tờ giấy, gửi đi treo |
| Người dùng bàn phím / screen reader | — | Điền form, nghe thông báo lỗi |
| Hệ thống lưu trữ cục bộ | localStorage | Giữ bản nháp khi lỡ đóng form |

## 3. Functional Requirements (EARS)

| ID | Loại EARS | Yêu cầu |
|---|---|---|
| FR-002-01 | Event-driven | WHEN người dùng bấm nút "Viết điều ước", THE system SHALL mở modal soạn ước nguyện và đặt focus vào ô nội dung. |
| FR-002-02 | Ubiquitous | THE system SHALL cung cấp các trường: nội dung (bắt buộc), tên người ước (tuỳ chọn), chủ đề (bắt buộc, mặc định "Khác"), màu giấy (bắt buộc, mặc định "Đỏ"). |
| FR-002-03 | Ubiquitous | THE system SHALL giới hạn nội dung 1–200 ký tự (sau khi trim) và tên người ước 0–30 ký tự. |
| FR-002-04 | State-driven | WHILE người dùng đang gõ nội dung, THE system SHALL hiển thị bộ đếm "n/200" cập nhật theo thời gian thực. |
| FR-002-05 | State-driven | WHILE form đang mở, THE system SHALL hiển thị bản xem trước tờ giấy với đúng màu, nội dung, tên và biểu tượng chủ đề đã chọn. |
| FR-002-06 | Event-driven | WHEN tên người ước để trống lúc gửi, THE system SHALL gán tên "Ẩn danh". |
| FR-002-07 | Unwanted | IF nội dung rỗng hoặc chỉ gồm khoảng trắng, THEN THE system SHALL vô hiệu hoá nút "Treo lên cây" và hiển thị lỗi dưới ô nội dung khi ô mất focus. |
| FR-002-08 | Unwanted | IF nội dung chứa từ trong danh sách từ cấm (`profanity-vi.json`), THEN THE system SHALL chặn gửi và yêu cầu người dùng chỉnh sửa. |
| FR-002-09 | Ubiquitous | THE system SHALL hiển thị nội dung ước nguyện dưới dạng văn bản thuần (escape HTML), không diễn giải markup. |
| FR-002-10 | Event-driven | WHEN người dùng bấm "Treo lên cây" với dữ liệu hợp lệ, THE system SHALL tạo `WishDraft` đã chuẩn hoá và phát sự kiện `wish:submitted` cho feature 003. |
| FR-002-11 | State-driven | WHILE form có dữ liệu chưa gửi, THE system SHALL lưu bản nháp vào localStorage sau mỗi 500 ms không gõ. |
| FR-002-12 | Event-driven | WHEN người dùng mở lại form và có bản nháp, THE system SHALL khôi phục bản nháp vào form. |
| FR-002-13 | Event-driven | WHEN người dùng đóng form (Esc, nút X, click nền) khi có dữ liệu chưa gửi, THE system SHALL hỏi xác nhận "Giữ bản nháp / Bỏ bản nháp". |
| FR-002-14 | Unwanted | IF cây đã đủ 100 tờ ước nguyện, THEN THE system SHALL vô hiệu hoá nút "Viết điều ước" và hiển thị gợi ý gỡ bớt ước nguyện (feature 005). |
| FR-002-15 | Optional | WHERE người dùng chọn "Gợi ý lời ước", THE system SHALL điền một câu mẫu ngẫu nhiên theo chủ đề từ danh sách tĩnh ≥ 5 câu/chủ đề. |

## 4. Non-Functional Requirements

| ID | Nhóm | Yêu cầu |
|---|---|---|
| NFR-002-01 | Hiệu năng | WHEN người dùng gõ phím, THE system SHALL cập nhật bản xem trước trong ≤ 50 ms. |
| NFR-002-02 | A11y | THE system SHALL dùng modal có `role="dialog"`, `aria-modal="true"`, bẫy focus, trả focus về nút mở khi đóng. |
| NFR-002-03 | A11y | THE system SHALL liên kết thông báo lỗi với trường bằng `aria-describedby` và đọc lỗi qua `aria-live="polite"`. |
| NFR-002-04 | Bảo mật | THE system SHALL không dùng `dangerouslySetInnerHTML` cho bất kỳ trường nào của Wish. |
| NFR-002-05 | Unicode | THE system SHALL đếm ký tự theo grapheme (emoji, tiếng Việt tổ hợp đếm là 1) và chuẩn hoá NFC trước khi lưu. |
| NFR-002-06 | Responsive | THE system SHALL hiển thị modal toàn màn hình khi chiều rộng < 640 px. |

## 5. Data Model

> Đây là **định nghĩa chuẩn duy nhất** của thực thể `Wish`, hiện thực tại `src/entities/wish/`.

```ts
export const WISH_CATEGORIES = ['family', 'study', 'health', 'love', 'career', 'other'] as const;
export type WishCategory = typeof WISH_CATEGORIES[number];
// Nhãn vi: Gia đình, Học tập, Sức khoẻ, Tình yêu, Sự nghiệp, Khác

export const PAPER_COLORS = ['red', 'yellow', 'pink', 'green', 'blue'] as const;
export type PaperColor = typeof PAPER_COLORS[number];
// Nhãn vi: Đỏ, Vàng, Hồng, Xanh lá, Xanh dương

/** Dữ liệu do form sinh ra — chưa gắn vào cây */
export interface WishDraft {
  content: string;       // 1..200 grapheme, trim, NFC
  author: string;        // 1..30 grapheme, mặc định "Ẩn danh"
  category: WishCategory;
  paperColor: PaperColor;
}

/** Ước nguyện đã treo — tạo bởi feature 003 */
export interface Wish extends WishDraft {
  id: string;            // UUID v4 (crypto.randomUUID)
  slotId: string;        // tham chiếu BranchSlot.id (feature 001)
  source: 'local' | 'shared'; // 'shared' = nhận từ link (feature 006)
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
}
```

```ts
// Zod schema
export const WishDraftSchema = z.object({
  content: z.string().trim().min(1).refine(s => graphemeLength(s) <= 200),
  author: z.string().trim().refine(s => graphemeLength(s) <= 30)
           .transform(s => s || 'Ẩn danh'),
  category: z.enum(WISH_CATEGORIES),
  paperColor: z.enum(PAPER_COLORS),
});

export const WishSchema = WishDraftSchema.extend({
  id: z.string().uuid(),
  slotId: z.string().regex(/^slot-\d{3}$/),
  source: z.enum(['local', 'shared']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
```

**Lưu trữ bản nháp**: localStorage key `banyan:draft:v1` → `Partial<WishDraft>`.

## 6. API Spec (Client-side contracts)

```ts
// Component
<WishComposer
  open={boolean}
  onClose={() => void}
  onSubmit={(draft: WishDraft) => void}   // mặc định: emit 'wish:submitted'
  initialValue?={Partial<WishDraft>}       // dùng lại cho chế độ sửa (feature 005)
  mode?={'create' | 'edit'}
/>

<WishPaperPreview draft={Partial<WishDraft>} size?={'sm' | 'md' | 'lg'} />

// Hook
useWishForm(initial?: Partial<WishDraft>): {
  values: WishDraft;
  errors: Partial<Record<keyof WishDraft, string>>;
  isValid: boolean;
  isDirty: boolean;
  setField<K extends keyof WishDraft>(k: K, v: WishDraft[K]): void;
  submit(): WishDraft | null;   // null nếu không hợp lệ
  reset(): void;
}

// Service
draftStorage.load(): Partial<WishDraft> | null
draftStorage.save(d: Partial<WishDraft>): void
draftStorage.clear(): void

// Pure helpers (src/entities/wish)
validateDraft(input: unknown): { ok: true; data: WishDraft } | { ok: false; errors: ZodIssue[] }
graphemeLength(s: string): number
containsProfanity(s: string): boolean
getSuggestion(category: WishCategory): string
```

**Sự kiện**:
| Tên | Payload | Phát khi |
|---|---|---|
| `wish:submitted` | `{ draft: WishDraft }` | Gửi form hợp lệ (FR-002-10) |

## 7. Error Handling

| ID | Tình huống | Hành vi hệ thống | Thông báo người dùng |
|---|---|---|---|
| ERR-002-01 | Nội dung rỗng | Khoá nút gửi, đánh dấu `aria-invalid` | "Hãy viết điều ước của bạn." |
| ERR-002-02 | Nội dung > 200 ký tự | Chặn nhập thêm, bộ đếm chuyển đỏ | "Điều ước tối đa 200 ký tự." |
| ERR-002-03 | Tên > 30 ký tự | Chặn nhập thêm | "Tên tối đa 30 ký tự." |
| ERR-002-04 | Chứa từ cấm | Chặn gửi | "Điều ước có từ ngữ không phù hợp, vui lòng chỉnh sửa." |
| ERR-002-05 | Bản nháp trong localStorage hỏng / sai schema | Xoá bản nháp, mở form trống | Không hiển thị |
| ERR-002-06 | localStorage không khả dụng (private mode, quota) | Bỏ qua lưu nháp, form vẫn hoạt động | "Không thể lưu bản nháp trên trình duyệt này." (1 lần) |
| ERR-002-07 | Cây đầy 100 tờ | Khoá nút "Viết điều ước" | "Cây đa đã kín ước nguyện. Hãy gỡ bớt để viết thêm." |

## 8. Acceptance Criteria

| ID | FR | Given | When | Then |
|---|---|---|---|---|
| AC-002-01 | FR-002-01 | Đang ở trang chủ | Bấm "Viết điều ước" | Modal mở, focus nằm ở ô nội dung |
| AC-002-02 | FR-002-02 | Modal vừa mở | Quan sát form | Chủ đề mặc định "Khác", màu mặc định "Đỏ" |
| AC-002-03 | FR-002-03, 04 | Modal mở | Gõ 200 ký tự rồi gõ thêm | Bộ đếm "200/200", ký tự thứ 201 không được nhận |
| AC-002-04 | FR-002-05 | Modal mở | Chọn màu "Vàng", gõ "Mẹ khoẻ" | Bản xem trước là giấy vàng ghi "Mẹ khoẻ" |
| AC-002-05 | FR-002-06 | Tên để trống, nội dung hợp lệ | Bấm "Treo lên cây" | Draft có `author = "Ẩn danh"` |
| AC-002-06 | FR-002-07 | Nội dung chỉ có khoảng trắng | Rời ô nội dung | Nút gửi bị khoá, hiện "Hãy viết điều ước của bạn." |
| AC-002-07 | FR-002-08 | Nội dung chứa từ cấm | Bấm gửi | Không phát `wish:submitted`, hiện ERR-002-04 |
| AC-002-08 | FR-002-09 | Nội dung `<img src=x onerror=alert(1)>` | Gửi và xem trước | Chuỗi hiển thị nguyên văn, không có alert |
| AC-002-09 | FR-002-10 | Form hợp lệ | Bấm "Treo lên cây" | Phát đúng 1 sự kiện `wish:submitted` với draft đã trim & NFC; bản nháp bị xoá |
| AC-002-10 | FR-002-11, 12 | Đã gõ "Đỗ đại học" | Reload trang, mở lại form | Ô nội dung có "Đỗ đại học" |
| AC-002-11 | FR-002-13 | Form có dữ liệu | Nhấn Esc | Hiện hộp xác nhận Giữ / Bỏ bản nháp |
| AC-002-12 | FR-002-14 | Store có 100 wish | Xem trang chủ | Nút "Viết điều ước" bị khoá kèm ERR-002-07 |
| AC-002-13 | FR-002-15 | Chủ đề "Học tập" | Bấm "Gợi ý lời ước" | Ô nội dung được điền một câu thuộc chủ đề Học tập |
| AC-002-14 | NFR-002-05 | Nội dung "🌕🏮" | Xem bộ đếm | Hiển thị "2/200" |

## 9. Out of Scope

- Viết tay / vẽ lên tờ giấy, chèn ảnh, sticker.
- Định dạng văn bản (in đậm, màu chữ, font tuỳ chọn).
- Kiểm duyệt nội dung bằng AI hoặc dịch vụ bên ngoài.
- Đa ngôn ngữ ngoài tiếng Việt.
- Đăng nhập / định danh người dùng.

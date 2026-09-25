# Feature Specification: Quản lý ước nguyện

**Feature ID**: `005-manage-wish`
**Branch**: `005-manage-wish`
**Status**: Draft
**Created**: 2026-09-25
**Depends on**: 002-write-wish, 003-hang-wish, 004-view-browse-wish

---

## 1. Context & Goal

- **Bối cảnh**: Dữ liệu chỉ nằm trên trình duyệt (không backend), nên người dùng cần tự sửa lỗi chính tả, gỡ điều ước cũ, giải phóng chỗ khi cây đầy (100 slot), và sao lưu/khôi phục khi đổi máy hoặc xoá dữ liệu trình duyệt.
- **Mục tiêu**: Cung cấp thao tác Sửa, Gỡ (có hoàn tác), Xoá toàn bộ, Xuất file JSON, Nhập file JSON.
- **Chỉ số thành công**: Xuất rồi nhập lại trên trình duyệt khác cho kết quả giống 100% (nội dung, slot, ngày tạo); 0 lần mất dữ liệu ngoài ý muốn.

## 2. Actors

| Actor | Mô tả | Mục tiêu |
|---|---|---|
| Chủ cây (người dùng hiện tại) | Mọi ước nguyện trên trình duyệt này thuộc quyền quản lý của họ | Chỉnh sửa, dọn dẹp, sao lưu |
| Hệ thống file (trình duyệt) | File picker, tải xuống | Đọc/ghi file `.json` |
| Wish Store (003) | Nguồn dữ liệu | Thực thi thay đổi |

> Không có đăng nhập: "chủ cây" = bất kỳ ai dùng trình duyệt đó.

## 3. Functional Requirements (EARS)

| ID | Loại EARS | Yêu cầu |
|---|---|---|
| FR-005-01 | Ubiquitous | THE system SHALL hiển thị nút "Sửa" và "Gỡ" trong thẻ chi tiết ước nguyện (004). |
| FR-005-02 | Event-driven | WHEN người dùng bấm "Sửa", THE system SHALL mở `WishComposer` (002) ở chế độ `edit` với dữ liệu hiện tại. |
| FR-005-03 | Event-driven | WHEN người dùng lưu bản sửa hợp lệ, THE system SHALL cập nhật `content`, `author`, `category`, `paperColor`, `updatedAt`, giữ nguyên `id`, `slotId`, `createdAt`, `source`. |
| FR-005-04 | Event-driven | WHEN người dùng bấm "Gỡ", THE system SHALL hỏi xác nhận "Gỡ điều ước này khỏi cây?". |
| FR-005-05 | Event-driven | WHEN người dùng xác nhận gỡ, THE system SHALL xoá ước nguyện khỏi store, chạy animation tờ giấy rơi xuống (≤ 1 s) và giải phóng slot. |
| FR-005-06 | State-driven | WHILE toast "Đã gỡ điều ước — Hoàn tác" còn hiển thị (8 s), THE system SHALL cho phép khôi phục ước nguyện về đúng slot và dữ liệu cũ. |
| FR-005-07 | Event-driven | WHEN người dùng bấm "Xuất sao lưu", THE system SHALL tải xuống file `cay-da-uoc-nguyen-YYYYMMDD-HHmm.json` chứa toàn bộ ước nguyện theo định dạng `WishExportV1`. |
| FR-005-08 | Event-driven | WHEN người dùng chọn file ở "Nhập sao lưu", THE system SHALL validate file và hiển thị bản tóm tắt: số bản ghi hợp lệ, số trùng `id`, số không hợp lệ, số vượt giới hạn. |
| FR-005-09 | Event-driven | WHEN người dùng xác nhận nhập với chế độ "Gộp", THE system SHALL thêm các bản ghi mới, bỏ qua bản ghi trùng `id`, gán slot trống cho bản ghi có slot đã bị chiếm. |
| FR-005-10 | Event-driven | WHEN người dùng xác nhận nhập với chế độ "Thay thế", THE system SHALL thay toàn bộ ước nguyện hiện có bằng dữ liệu trong file. |
| FR-005-11 | Unwanted | IF tổng số sau khi gộp > 100, THEN THE system SHALL chỉ nhập các bản ghi có `createdAt` mới nhất cho đến khi đủ 100 và báo số bản ghi bị bỏ. |
| FR-005-12 | Event-driven | WHEN người dùng bấm "Xoá toàn bộ", THE system SHALL yêu cầu gõ chữ `XOA` để xác nhận, sau đó xoá hết ước nguyện và bản nháp. |
| FR-005-13 | Ubiquitous | THE system SHALL tự động xuất một bản sao lưu vào `banyan:wishes:backup` trước mọi thao tác "Thay thế" hoặc "Xoá toàn bộ". |
| FR-005-14 | Unwanted | IF file nhập > 1 MB hoặc không phải JSON, THEN THE system SHALL từ chối và không thay đổi dữ liệu hiện có. |

## 4. Non-Functional Requirements

| ID | Nhóm | Yêu cầu |
|---|---|---|
| NFR-005-01 | Độ tin cậy | THE system SHALL thực hiện nhập theo kiểu nguyên tử: lỗi ở bất kỳ bước nào → dữ liệu hiện có giữ nguyên. |
| NFR-005-02 | Bảo mật | THE system SHALL xử lý file nhập hoàn toàn trong trình duyệt bằng `FileReader`, không upload đi đâu. |
| NFR-005-03 | Bảo mật | THE system SHALL bỏ qua mọi thuộc tính lạ trong file nhập (Zod `strip`) và chống prototype pollution (`__proto__`, `constructor`). |
| NFR-005-04 | Hiệu năng | THE system SHALL validate và xem trước file 100 bản ghi trong ≤ 200 ms. |
| NFR-005-05 | A11y | THE system SHALL dùng `role="alertdialog"` cho các hộp xác nhận xoá, focus mặc định vào nút "Huỷ". |
| NFR-005-06 | Tương thích | THE system SHALL cho phép file xuất ra từ phiên bản v1 được nhập ở mọi phiên bản sau (tương thích ngược). |

## 5. Data Model

Dùng `Wish` từ [002 §5](../002-write-wish/spec.md#5-data-model).

```ts
// Định dạng file xuất/nhập
export interface WishExportV1 {
  app: 'cay-da-uoc-nguyen';
  version: 1;
  exportedAt: string;     // ISO 8601
  wishes: Wish[];         // ≤ 100
}

export const WishExportSchema = z.object({
  app: z.literal('cay-da-uoc-nguyen'),
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  wishes: z.array(z.unknown()).max(1000), // validate từng phần tử bằng WishSchema
}).strip();

export type ImportMode = 'merge' | 'replace';

export interface ImportPreview {
  valid: Wish[];
  duplicateIds: string[];
  invalidCount: number;
  overflowCount: number;  // số bản ghi vượt giới hạn 100 (FR-005-11)
}

// Chỉ trong bộ nhớ
export interface UndoEntry {
  wish: Wish;
  expiresAt: number;      // Date.now() + 8000
}
```

## 6. API Spec (Client-side contracts)

```ts
// Mở rộng Wish Store (003)
interface WishState {
  updateWish(id: string, draft: WishDraft): Result<Wish, 'NOT_FOUND' | 'INVALID_DRAFT'>;
  removeWish(id: string): Result<UndoEntry, 'NOT_FOUND'>;
  restoreWish(entry: UndoEntry): Result<Wish, 'EXPIRED' | 'SLOT_TAKEN' | 'TREE_FULL'>;
  clearAll(): void;
  importWishes(preview: ImportPreview, mode: ImportMode): Result<{ added: number; skipped: number }, 'STORAGE_FAILED'>;
}

type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E };

// Service
backupService.exportToFile(wishes: Wish[], now?: Date): void              // FR-005-07
backupService.buildExport(wishes: Wish[], now?: Date): WishExportV1       // thuần, dễ test
backupService.readFile(file: File): Promise<Result<unknown, 'TOO_LARGE' | 'NOT_JSON'>>
backupService.preview(raw: unknown, current: Wish[]): Result<ImportPreview, 'BAD_FORMAT'>
backupService.snapshot(wishes: Wish[]): void                              // FR-005-13

// Component
<WishActions wishId={string} />          // Sửa / Gỡ — gắn vào WishDetailCard.actions
<BackupPanel />                          // Xuất / Nhập / Xoá toàn bộ
<ImportPreviewDialog preview={ImportPreview} onConfirm={(m: ImportMode) => void} onCancel={() => void} />
<ConfirmTypeDialog keyword="XOA" onConfirm={() => void} />
```

**Sự kiện**:
| Tên | Payload | Phát khi |
|---|---|---|
| `wish:updated` | `{ wish: Wish }` | Lưu bản sửa |
| `wish:removed` | `{ wishId: string }` | Gỡ thành công |
| `wish:restored` | `{ wish: Wish }` | Hoàn tác |
| `wishes:imported` | `{ added: number; mode: ImportMode }` | Nhập xong |
| `wishes:cleared` | `{}` | Xoá toàn bộ |

## 7. Error Handling

| ID | Tình huống | Hành vi hệ thống | Thông báo người dùng |
|---|---|---|---|
| ERR-005-01 | Sửa wish không còn tồn tại | Đóng form | "Điều ước này không còn trên cây." |
| ERR-005-02 | Hoàn tác khi slot đã bị chiếm | Gán slot trống khác | "Điều ước đã được treo lại ở cành khác." |
| ERR-005-03 | Hoàn tác khi cây đầy | Không khôi phục | "Cây đã đầy, không thể hoàn tác." |
| ERR-005-04 | File > 1 MB | Từ chối | "File quá lớn (tối đa 1 MB)." |
| ERR-005-05 | File không phải JSON | Từ chối | "File không đúng định dạng JSON." |
| ERR-005-06 | JSON sai schema (`app`/`version`) | Từ chối | "Đây không phải file sao lưu Cây Đa Ước Nguyện." |
| ERR-005-07 | Không có bản ghi hợp lệ nào | Không cho xác nhận | "Không có điều ước hợp lệ trong file." |
| ERR-005-08 | Ghi localStorage lỗi khi nhập | Rollback về dữ liệu cũ | "Không thể lưu dữ liệu. Chưa có thay đổi nào được áp dụng." |
| ERR-005-09 | Gõ sai từ xác nhận `XOA` | Nút xác nhận vẫn khoá | — |

## 8. Acceptance Criteria

| ID | FR | Given | When | Then |
|---|---|---|---|---|
| AC-005-01 | FR-005-01, 02 | Thẻ chi tiết đang mở | Bấm "Sửa" | Form mở chế độ sửa, điền sẵn dữ liệu cũ |
| AC-005-02 | FR-005-03 | Wish ở `slot-010` | Sửa nội dung rồi lưu | Nội dung mới, `slotId`/`createdAt`/`id` không đổi, `updatedAt` tăng |
| AC-005-03 | FR-005-04, 05 | Có wish | Bấm "Gỡ" → xác nhận | Tờ giấy rơi xuống và biến mất, bộ đếm giảm 1 |
| AC-005-04 | FR-005-06 | Vừa gỡ wish | Bấm "Hoàn tác" trong 8 s | Wish trở lại đúng slot cũ, dữ liệu y nguyên |
| AC-005-05 | FR-005-06 | Vừa gỡ wish | Chờ quá 8 s | Toast biến mất, không thể hoàn tác |
| AC-005-06 | FR-005-07 | Có 5 wish, lúc 2026-09-25 20:30 | Bấm "Xuất sao lưu" | Tải file `cay-da-uoc-nguyen-20260925-2030.json`, hợp lệ theo `WishExportSchema`, có 5 wish |
| AC-005-07 | FR-005-08 | File có 3 hợp lệ, 1 trùng id, 2 hỏng | Chọn file | Tóm tắt: 3 hợp lệ / 1 trùng / 2 không hợp lệ |
| AC-005-08 | FR-005-09 | Store 2 wish, file 3 wish mới (1 trùng slot) | Nhập "Gộp" | Store có 5 wish, không slot trùng |
| AC-005-09 | FR-005-10, 13 | Store 4 wish, file 2 wish | Nhập "Thay thế" | Store còn đúng 2 wish của file; `banyan:wishes:backup` chứa 4 wish cũ |
| AC-005-10 | FR-005-11 | Store 95 wish, file 10 wish mới | Nhập "Gộp" | Store 100 wish, báo "5 điều ước không được nhập vì cây đã đầy" |
| AC-005-11 | FR-005-12 | Có wish | Bấm "Xoá toàn bộ", gõ `XOA`, xác nhận | Cây trống, bộ đếm "0/100" |
| AC-005-12 | FR-005-14 | — | Chọn file ảnh `.png` đổi đuôi `.json` | Báo ERR-005-05, dữ liệu không đổi |
| AC-005-13 | NFR-005-01 | Giả lập lỗi ghi storage | Nhập "Thay thế" | Dữ liệu cũ còn nguyên, hiện ERR-005-08 |
| AC-005-14 | NFR-005-03 | File có wish kèm `"__proto__": {"x":1}` | Nhập | `({}).x === undefined`; wish không có thuộc tính lạ |

## 9. Out of Scope

- Lịch sử phiên bản / nhiều bước hoàn tác.
- Đồng bộ đám mây (Google Drive, iCloud…).
- Phân quyền, bảo vệ bằng mật khẩu, mã hoá file sao lưu.
- Sửa ước nguyện có `source='shared'` thành của người khác trên máy họ (chỉ sửa được bản sao cục bộ).
- Xuất định dạng khác JSON (CSV, PDF, ảnh).

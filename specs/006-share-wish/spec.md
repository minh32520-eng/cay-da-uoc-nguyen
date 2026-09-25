# Feature Specification: Chia sẻ ước nguyện

**Feature ID**: `006-share-wish`
**Branch**: `006-share-wish`
**Status**: Draft
**Created**: 2026-09-25
**Depends on**: 003-hang-wish, 004-view-browse-wish

---

## 1. Context & Goal

- **Bối cảnh**: Trung Thu là dịp sum họp; người dùng muốn gửi điều ước tới gia đình, bạn bè. Không có backend nên không thể lưu ước nguyện lên server và trả về link ngắn.
- **Mục tiêu**: Mã hoá nội dung một tờ ước nguyện **vào chính URL** (phần hash `#`), để người nhận mở link là thấy tờ giấy trên cây đa của họ và có thể treo lại vào cây của mình.
- **Chỉ số thành công**: Link mở đúng nội dung 100% trên mọi trình duyệt hỗ trợ; độ dài link ≤ 2000 ký tự; không có dữ liệu nào đi qua server.

## 2. Actors

| Actor | Mô tả | Mục tiêu |
|---|---|---|
| Người chia sẻ | Chủ tờ ước nguyện | Tạo link, gửi qua Zalo/Messenger/… |
| Người nhận | Mở link được chia sẻ | Đọc điều ước, tuỳ chọn treo lên cây của mình |
| Web Share API / Clipboard API (hệ thống) | API trình duyệt | Chia sẻ hoặc sao chép link |

## 3. Functional Requirements (EARS)

| ID | Loại EARS | Yêu cầu |
|---|---|---|
| FR-006-01 | Ubiquitous | THE system SHALL hiển thị nút "Chia sẻ" trong thẻ chi tiết ước nguyện (004). |
| FR-006-02 | Event-driven | WHEN người dùng bấm "Chia sẻ", THE system SHALL tạo link dạng `<origin><base>#/w/<payload>` trong đó `payload` là `SharedWishPayload` được nén và mã hoá URL-safe. |
| FR-006-03 | Ubiquitous | THE system SHALL chỉ đưa vào payload các trường `content`, `author`, `category`, `paperColor`, `createdAt`; KHÔNG đưa `id`, `slotId`, `source`. |
| FR-006-04 | Optional | WHERE trình duyệt hỗ trợ Web Share API, THE system SHALL mở bảng chia sẻ gốc của hệ điều hành với tiêu đề "Điều ước Trung Thu" và link. |
| FR-006-05 | Optional | WHERE trình duyệt không hỗ trợ Web Share API, THE system SHALL sao chép link vào clipboard và hiện toast "Đã sao chép link". |
| FR-006-06 | Optional | WHERE người dùng chọn "Mã QR", THE system SHALL hiển thị mã QR của link (sinh phía client) kèm nút tải ảnh PNG. |
| FR-006-07 | Event-driven | WHEN ứng dụng được mở với hash `#/w/<payload>`, THE system SHALL giải mã payload, validate, và hiển thị tờ ước nguyện dạng "khách" lơ lửng trước cây với thẻ chi tiết. |
| FR-006-08 | State-driven | WHILE đang xem ước nguyện được chia sẻ, THE system SHALL hiển thị hai nút "Treo lên cây của tôi" và "Đóng". |
| FR-006-09 | Event-driven | WHEN người nhận bấm "Treo lên cây của tôi", THE system SHALL tạo `Wish` mới với `source = 'shared'` qua `hangWish` (003) và chạy animation treo. |
| FR-006-10 | Unwanted | IF người nhận đã treo một ước nguyện giống hệt (cùng `content`, `author`, `createdAt`), THEN THE system SHALL không tạo bản sao và hiển thị "Điều ước này đã có trên cây của bạn". |
| FR-006-11 | Event-driven | WHEN người nhận bấm "Đóng" hoặc treo xong, THE system SHALL xoá hash khỏi URL bằng `history.replaceState` mà không tải lại trang. |
| FR-006-12 | Unwanted | IF payload hỏng, sai phiên bản, hoặc không qua validate, THEN THE system SHALL bỏ qua payload, mở cây bình thường và hiện thông báo lỗi. |
| FR-006-13 | Unwanted | IF link được tạo dài hơn 2000 ký tự, THEN THE system SHALL từ chối tạo link và thông báo cho người dùng. |
| FR-006-14 | Ubiquitous | THE system SHALL hiển thị nội dung từ link dưới dạng văn bản thuần, áp dụng cùng quy tắc validate & lọc từ cấm như feature 002. |

## 4. Non-Functional Requirements

| ID | Nhóm | Yêu cầu |
|---|---|---|
| NFR-006-01 | Quyền riêng tư | THE system SHALL đặt payload trong phần hash (`#`) để dữ liệu không bị gửi tới server hosting trong HTTP request. |
| NFR-006-02 | Kích thước | THE system SHALL tạo link ≤ 2000 ký tự cho mọi ước nguyện hợp lệ (200 ký tự nội dung + 30 ký tự tên, kể cả tiếng Việt có dấu và emoji). |
| NFR-006-03 | Hiệu năng | THE system SHALL mã hoá/giải mã payload trong ≤ 10 ms. |
| NFR-006-04 | Bảo mật | THE system SHALL giới hạn payload đầu vào ≤ 4096 ký tự trước khi giải nén để chống "zip bomb". |
| NFR-006-05 | Tương thích | THE system SHALL hoạt động với routing hash để deploy trên hosting tĩnh không cần rewrite rule. |
| NFR-006-06 | Mở rộng | THE system SHALL đặt trường phiên bản `v` trong payload để thay đổi định dạng sau này không làm hỏng link cũ. |

## 5. Data Model

```ts
// Payload rút gọn khoá để tiết kiệm độ dài URL
export interface SharedWishPayload {
  v: 1;                 // phiên bản định dạng
  c: string;            // content
  a: string;            // author
  k: WishCategory;      // category
  p: PaperColor;        // paperColor
  t: string;            // createdAt (ISO 8601)
}

export const SharedWishPayloadSchema = z.object({
  v: z.literal(1),
  c: WishDraftSchema.shape.content,
  a: WishDraftSchema.shape.author,
  k: z.enum(WISH_CATEGORIES),
  p: z.enum(PAPER_COLORS),
  t: z.string().datetime(),
}).strict();

// Mã hoá: JSON.stringify → lz-string compressToEncodedURIComponent
// URL:   https://<host>/<base>/#/w/<encoded>

export interface IncomingSharedWish {
  draft: WishDraft;
  originalCreatedAt: string;
}

export const MAX_SHARE_URL_LENGTH = 2000;
export const MAX_PAYLOAD_INPUT_LENGTH = 4096;
```

## 6. API Spec (Client-side contracts)

```ts
// Codec thuần — src/features/share-wish/services/shareCodec.ts
encodeWish(wish: Wish): string                                   // → payload string
decodeWish(payload: string): Result<IncomingSharedWish, 'TOO_LONG' | 'DECOMPRESS_FAILED' | 'BAD_JSON' | 'BAD_VERSION' | 'INVALID' | 'PROFANITY'>
buildShareUrl(wish: Wish, location?: Location): Result<string, 'URL_TOO_LONG'>
parseShareHash(hash: string): string | null                      // "#/w/abc" → "abc"

// Service
shareService.share(url: string): Promise<'shared' | 'copied' | 'cancelled' | 'failed'>
qrService.toDataUrl(url: string): Promise<string>                // PNG data URL

// Hook
useIncomingSharedWish(): {
  incoming: IncomingSharedWish | null;
  error: string | null;
  accept(): HangResult;       // gọi useWishStore.hangWish(draft) với source 'shared'
  dismiss(): void;            // FR-006-11
}

// Component
<ShareButton wish={Wish} />
<ShareQrDialog url={string} open={boolean} onClose={() => void} />
<IncomingWishOverlay />
```

**Route**:
| Hash | Hành vi |
|---|---|
| `#/` hoặc rỗng | Cây đa bình thường |
| `#/w/<payload>` | Mở ước nguyện được chia sẻ (FR-006-07) |
| Khác | Bỏ qua, về `#/` |

**Sự kiện**:
| Tên | Payload | Phát khi |
|---|---|---|
| `share:created` | `{ method: 'native' \| 'clipboard' }` | Chia sẻ thành công |
| `share:opened` | `{}` | Mở link hợp lệ |
| `share:accepted` | `{ wish: Wish }` | Người nhận treo lên cây |

## 7. Error Handling

| ID | Tình huống | Hành vi hệ thống | Thông báo người dùng |
|---|---|---|---|
| ERR-006-01 | Payload hỏng / giải nén lỗi / JSON lỗi | Bỏ payload, xoá hash | "Link chia sẻ không hợp lệ hoặc đã bị hỏng." |
| ERR-006-02 | Phiên bản `v` không hỗ trợ | Bỏ payload | "Link được tạo từ phiên bản khác, không thể mở." |
| ERR-006-03 | Nội dung chứa từ cấm | Không hiển thị nội dung | "Điều ước trong link không phù hợp để hiển thị." |
| ERR-006-04 | Link > 2000 ký tự | Không tạo link | "Điều ước quá dài để chia sẻ qua link." |
| ERR-006-05 | Clipboard bị từ chối quyền | Hiện ô text chứa link để người dùng tự sao chép | "Không thể tự sao chép, hãy sao chép link bên dưới." |
| ERR-006-06 | Người dùng huỷ bảng chia sẻ gốc | Không làm gì | Không hiển thị |
| ERR-006-07 | Treo khi cây người nhận đã đầy | Giữ overlay | "Cây của bạn đã đầy. Hãy gỡ bớt để treo điều ước này." |
| ERR-006-08 | Trùng ước nguyện đã có | Không tạo bản sao | "Điều ước này đã có trên cây của bạn." |

## 8. Acceptance Criteria

| ID | FR | Given | When | Then |
|---|---|---|---|---|
| AC-006-01 | FR-006-01, 02 | Thẻ chi tiết đang mở | Bấm "Chia sẻ" | Link có dạng `…#/w/<payload>` |
| AC-006-02 | FR-006-03 | Wish bất kỳ | `decodeWish(encodeWish(w))` | Trả về đúng content/author/category/paperColor/createdAt; không có id/slotId |
| AC-006-03 | FR-006-04 | Mobile có `navigator.share` | Bấm "Chia sẻ" | Bảng chia sẻ gốc hiện ra |
| AC-006-04 | FR-006-05 | Desktop không có `navigator.share` | Bấm "Chia sẻ" | Link nằm trong clipboard, toast "Đã sao chép link" |
| AC-006-05 | FR-006-06 | — | Chọn "Mã QR" | QR hiện ra; quét bằng điện thoại mở đúng link |
| AC-006-06 | FR-006-07, 08 | Có link hợp lệ | Mở link ở trình duyệt mới | Thấy tờ ước nguyện "khách" + 2 nút "Treo lên cây của tôi", "Đóng" |
| AC-006-07 | FR-006-09 | Đang xem wish được chia sẻ | Bấm "Treo lên cây của tôi" | Wish mới `source='shared'` được treo, có nhãn "Được chia sẻ" |
| AC-006-08 | FR-006-10 | Đã treo wish từ link | Mở lại link, bấm treo | Không tạo bản sao, hiện ERR-006-08 |
| AC-006-09 | FR-006-11 | Đang xem wish được chia sẻ | Bấm "Đóng" | URL còn `#/`, trang không reload |
| AC-006-10 | FR-006-12 | Link bị cắt cụt | Mở link | Cây hiển thị bình thường + ERR-006-01 |
| AC-006-11 | FR-006-14 | Payload chứa `<script>alert(1)</script>` | Mở link | Chuỗi hiển thị nguyên văn, không thực thi |
| AC-006-12 | NFR-006-02 | Wish 200 ký tự tiếng Việt có dấu + emoji, tên 30 ký tự | `buildShareUrl` | Link ≤ 2000 ký tự |
| AC-006-13 | NFR-006-04 | Payload dài 5000 ký tự | `decodeWish` | Trả lỗi `TOO_LONG` mà không giải nén |
| AC-006-14 | NFR-006-01 | Mở link chia sẻ | Kiểm tra request mạng | Không request nào chứa payload |

## 9. Out of Scope

- Link rút gọn (cần server hoặc dịch vụ ngoài).
- Chia sẻ toàn bộ cây / nhiều ước nguyện trong một link.
- Ảnh xem trước Open Graph động cho từng link (cần server render).
- Thống kê lượt mở link, thông báo khi người nhận treo.
- Mã hoá đầu-cuối / link có mật khẩu.

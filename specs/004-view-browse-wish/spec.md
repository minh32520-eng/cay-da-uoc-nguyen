# Feature Specification: Xem & duyệt ước nguyện

**Feature ID**: `004-view-browse-wish`
**Branch**: `004-view-browse-wish`
**Status**: Draft
**Created**: 2026-09-25
**Depends on**: 003-hang-wish

---

## 1. Context & Goal

- **Bối cảnh**: Khi cây có nhiều tờ giấy, người dùng muốn đọc lại từng điều ước, tìm nhanh điều ước của một người hoặc theo chủ đề. Các tờ giấy trong cảnh 3D lại nhỏ và không truy cập được với screen reader.
- **Mục tiêu**: Cho phép (a) click/tap tờ giấy trên cây để đọc chi tiết, (b) mở bảng danh sách ước nguyện có tìm kiếm, lọc, sắp xếp, (c) chọn một mục trong danh sách để camera bay tới tờ giấy tương ứng.
- **Chỉ số thành công**: Tìm được một ước nguyện cụ thể trong 100 tờ trong ≤ 10 s; 100% ước nguyện đọc được bằng bàn phím + screen reader.

## 2. Actors

| Actor | Mô tả | Mục tiêu |
|---|---|---|
| Khách truy cập | Người dùng thông thường | Đọc các điều ước trên cây |
| Người ước nguyện | Người đã treo ước | Tìm lại điều ước của mình |
| Người dùng bàn phím / screen reader | — | Duyệt ước nguyện không cần canvas 3D |

## 3. Functional Requirements (EARS)

| ID | Loại EARS | Yêu cầu |
|---|---|---|
| FR-004-01 | Event-driven | WHEN con trỏ di qua một tờ giấy trên cây (desktop), THE system SHALL phóng to tờ giấy 1.2 lần, đổi con trỏ thành `pointer` và hiện tooltip tên người ước. |
| FR-004-02 | Event-driven | WHEN người dùng click/tap một tờ giấy, THE system SHALL mở thẻ chi tiết hiển thị nội dung, tên người ước, chủ đề, màu giấy và ngày treo (định dạng `dd/MM/yyyy`). |
| FR-004-03 | Event-driven | WHEN thẻ chi tiết mở, THE system SHALL đưa camera tới tờ giấy đó và làm mờ các tờ khác 50%. |
| FR-004-04 | Event-driven | WHEN người dùng bấm "Trước" / "Sau" (hoặc phím `←` / `→`) trong thẻ chi tiết, THE system SHALL chuyển sang ước nguyện liền kề theo thứ tự danh sách hiện tại. |
| FR-004-05 | Event-driven | WHEN người dùng bấm nút "Danh sách ước nguyện", THE system SHALL mở bảng bên (drawer) liệt kê tất cả ước nguyện dưới dạng thẻ. |
| FR-004-06 | Event-driven | WHEN người dùng nhập từ khoá vào ô tìm kiếm, THE system SHALL lọc danh sách theo `content` và `author`, không phân biệt hoa thường và dấu tiếng Việt, sau debounce 200 ms. |
| FR-004-07 | Event-driven | WHEN người dùng chọn một hoặc nhiều chủ đề / màu giấy, THE system SHALL chỉ hiển thị ước nguyện khớp với mọi bộ lọc đang bật (AND giữa nhóm, OR trong nhóm). |
| FR-004-08 | Event-driven | WHEN người dùng chọn cách sắp xếp, THE system SHALL sắp xếp theo "Mới nhất" (mặc định), "Cũ nhất" hoặc "Tên A→Z". |
| FR-004-09 | State-driven | WHILE bộ lọc/tìm kiếm đang bật, THE system SHALL làm nổi bật trên cây các tờ giấy khớp và làm mờ các tờ không khớp. |
| FR-004-10 | Event-driven | WHEN người dùng chọn một thẻ trong danh sách, THE system SHALL đóng drawer trên mobile, bay camera tới tờ giấy và mở thẻ chi tiết. |
| FR-004-11 | Unwanted | IF kết quả lọc rỗng, THEN THE system SHALL hiển thị trạng thái trống "Không tìm thấy điều ước phù hợp" và nút "Xoá bộ lọc". |
| FR-004-12 | Unwanted | IF cây chưa có ước nguyện nào, THEN THE system SHALL hiển thị lời mời "Hãy là người đầu tiên treo điều ước" kèm nút mở form (002). |
| FR-004-13 | Ubiquitous | THE system SHALL hiển thị tổng số ước nguyện dạng "n/100 điều ước" trên giao diện chính. |
| FR-004-14 | Ubiquitous | THE system SHALL gắn nhãn "Được chia sẻ" cho ước nguyện có `source = 'shared'`. |
| FR-004-15 | Event-driven | WHEN người dùng nhấn Esc hoặc click ra ngoài, THE system SHALL đóng thẻ chi tiết / drawer và khôi phục độ sáng các tờ giấy. |

## 4. Non-Functional Requirements

| ID | Nhóm | Yêu cầu |
|---|---|---|
| NFR-004-01 | Hiệu năng | THE system SHALL trả kết quả lọc trên 100 bản ghi trong ≤ 16 ms. |
| NFR-004-02 | Hiệu năng | THE system SHALL xác định tờ giấy được click (raycast trên InstancedMesh) trong ≤ 8 ms. |
| NFR-004-03 | A11y | THE system SHALL trình bày danh sách bằng `<ul role="list">`, mỗi thẻ là `<button>` có `aria-label` "Điều ước của {author}: {content}". |
| NFR-004-04 | A11y | THE system SHALL thông báo số kết quả lọc qua `aria-live="polite"`. |
| NFR-004-05 | Mobile | THE system SHALL có vùng chạm tờ giấy tối thiểu 44×44 px (mở rộng hit area vô hình nếu cần). |
| NFR-004-06 | State | THE system SHALL lưu bộ lọc & cách sắp xếp gần nhất vào `sessionStorage` (không lưu vĩnh viễn). |

## 5. Data Model

Dùng `Wish` từ [002 §5](../002-write-wish/spec.md#5-data-model).

```ts
export type WishSortOrder = 'newest' | 'oldest' | 'author-asc';

export interface WishFilter {
  query: string;                 // từ khoá, đã chuẩn hoá bỏ dấu khi so khớp
  categories: WishCategory[];    // rỗng = tất cả
  paperColors: PaperColor[];     // rỗng = tất cả
  sources: Array<Wish['source']>;// rỗng = tất cả
  sort: WishSortOrder;           // mặc định 'newest'
}

export interface WishViewState {
  selectedWishId: string | null;
  drawerOpen: boolean;
  hoveredWishId: string | null;
  filter: WishFilter;
}
```

`sessionStorage` key: `banyan:filter:v1` → `WishFilter`.

## 6. API Spec (Client-side contracts)

```ts
// Hàm thuần — src/features/view-wish/services/filterWishes.ts
normalizeVi(s: string): string                   // lowercase, bỏ dấu, đ→d, NFC
filterWishes(wishes: Wish[], f: WishFilter): Wish[]
getAdjacentWishId(list: Wish[], currentId: string, dir: 'prev' | 'next'): string | null  // vòng tròn
formatWishDate(iso: string): string              // "dd/MM/yyyy"

// Hook
useWishView(): WishViewState & {
  select(id: string | null): void;
  openDrawer(): void; closeDrawer(): void;
  setFilter(p: Partial<WishFilter>): void;
  clearFilter(): void;
  visibleWishes: Wish[];                         // đã lọc + sắp xếp
  matchedIds: Set<string>;                       // cho FR-004-09
}

// Component
<WishDetailCard wish={Wish} onPrev={() => void} onNext={() => void} onClose={() => void}
                actions?={ReactNode} />            // slot cho nút Sửa/Gỡ (005), Chia sẻ (006)
<WishListDrawer open={boolean} onClose={() => void} />
<WishFilterBar value={WishFilter} onChange={(f: WishFilter) => void} />
<WishCounter />                                    // "n/100 điều ước"
```

**Sự kiện**:
| Tên | Payload | Phát khi |
|---|---|---|
| `wish:selected` | `{ wishId: string }` | Mở thẻ chi tiết |
| `wish:deselected` | `{}` | Đóng thẻ chi tiết |

## 7. Error Handling

| ID | Tình huống | Hành vi hệ thống | Thông báo người dùng |
|---|---|---|---|
| ERR-004-01 | `selectedWishId` không còn tồn tại (bị gỡ ở tab khác) | Đóng thẻ chi tiết | "Điều ước này không còn trên cây." |
| ERR-004-02 | Kết quả lọc rỗng | Hiện trạng thái trống | "Không tìm thấy điều ước phù hợp" |
| ERR-004-03 | `sessionStorage` chứa bộ lọc hỏng | Dùng bộ lọc mặc định | Không hiển thị |
| ERR-004-04 | Raycast không trúng tờ nào | Bỏ qua click, không đóng/mở gì | Không hiển thị |
| ERR-004-05 | Từ khoá > 100 ký tự | Cắt còn 100 ký tự | Không hiển thị |

## 8. Acceptance Criteria

| ID | FR | Given | When | Then |
|---|---|---|---|---|
| AC-004-01 | FR-004-01 | Desktop, có wish của "Lan" | Rê chuột qua tờ giấy | Tờ giấy phóng to, tooltip "Lan" |
| AC-004-02 | FR-004-02, 03 | Có wish | Click tờ giấy | Thẻ chi tiết hiện đủ 5 thông tin; camera bay tới; tờ khác mờ |
| AC-004-03 | FR-004-04 | Thẻ chi tiết mở ở mục cuối danh sách | Nhấn `→` | Chuyển về mục đầu tiên |
| AC-004-04 | FR-004-05 | Có 10 wish | Bấm "Danh sách ước nguyện" | Drawer hiện 10 thẻ, mới nhất ở trên |
| AC-004-05 | FR-004-06 | Có wish "Đỗ đại học" | Gõ "do dai" | Wish đó xuất hiện trong kết quả |
| AC-004-06 | FR-004-07 | Wish A (Học tập, Đỏ), B (Học tập, Vàng), C (Gia đình, Đỏ) | Lọc Học tập + Đỏ | Chỉ còn A |
| AC-004-07 | FR-004-08 | Có wish tên "Bình", "An" | Chọn "Tên A→Z" | "An" đứng trước "Bình" |
| AC-004-08 | FR-004-09 | Đang lọc chủ đề Sức khoẻ | Quan sát cây | Chỉ tờ Sức khoẻ sáng rõ, còn lại mờ |
| AC-004-09 | FR-004-10 | Mobile, drawer mở | Chọn một thẻ | Drawer đóng, camera bay tới, thẻ chi tiết mở |
| AC-004-10 | FR-004-11 | Có wish | Tìm "xyzxyz" | Trạng thái trống và nút "Xoá bộ lọc" |
| AC-004-11 | FR-004-12 | Store rỗng | Mở drawer | Lời mời "Hãy là người đầu tiên treo điều ước" |
| AC-004-12 | FR-004-13 | Có 37 wish | Xem giao diện chính | Hiển thị "37/100 điều ước" |
| AC-004-13 | FR-004-14 | Có wish `source='shared'` | Mở thẻ chi tiết | Có nhãn "Được chia sẻ" |
| AC-004-14 | NFR-004-03 | Chỉ dùng bàn phím | Tab vào drawer, Enter trên thẻ | Thẻ chi tiết mở, screen reader đọc nội dung |

## 9. Out of Scope

- Thả tim, bình luận, phản hồi ước nguyện của người khác.
- Phân trang / tải vô hạn (tối đa 100 bản ghi).
- Tìm kiếm mờ (fuzzy), tìm theo khoảng ngày.
- Thống kê, biểu đồ theo chủ đề.
- In tờ ước nguyện.

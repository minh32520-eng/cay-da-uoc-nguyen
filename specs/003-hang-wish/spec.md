# Feature Specification: Treo ước nguyện lên cây

**Feature ID**: `003-hang-wish`
**Branch**: `003-hang-wish`
**Status**: Draft
**Created**: 2026-09-25
**Depends on**: 001-banyan-tree-scene, 002-write-wish

---

## 1. Context & Goal

- **Bối cảnh**: Sau khi soạn xong (002), khoảnh khắc "treo lên cây" là trải nghiệm cảm xúc chính. Vì không có backend, cây đa chứa các ước nguyện được lưu trên chính trình duyệt của người dùng.
- **Mục tiêu**: Nhận `WishDraft`, gán một slot trên cành, tạo `Wish`, chạy animation tờ giấy bay lên và treo, lưu bền vững vào localStorage để lần sau mở lại vẫn thấy.
- **Chỉ số thành công**: 100% ước nguyện đã treo còn nguyên sau khi reload; animation hoàn tất ≤ 2.5 s.

## 2. Actors

| Actor | Mô tả | Mục tiêu |
|---|---|---|
| Người ước nguyện | Vừa gửi form ở feature 002 | Thấy điều ước của mình treo trên cây |
| Wish Store (hệ thống) | Zustand store + persist | Nguồn dữ liệu duy nhất về ước nguyện |
| localStorage (hệ thống) | Bộ nhớ trình duyệt | Lưu bền vững |

## 3. Functional Requirements (EARS)

| ID | Loại EARS | Yêu cầu |
|---|---|---|
| FR-003-01 | Event-driven | WHEN nhận sự kiện `wish:submitted`, THE system SHALL tạo `Wish` mới với `id` UUID v4, `source = 'local'`, `createdAt = updatedAt = now`. |
| FR-003-02 | Ubiquitous | THE system SHALL đảm bảo mỗi slot chứa tối đa 1 ước nguyện và mỗi ước nguyện chiếm đúng 1 slot. |
| FR-003-03 | Event-driven | WHEN gán slot tự động, THE system SHALL chọn ngẫu nhiên một slot trống, ưu tiên tầng `low` → `mid` → `high` để tờ giấy dễ nhìn thấy. |
| FR-003-04 | Optional | WHERE người dùng bật "Tự chọn cành", THE system SHALL làm nổi bật các slot trống và cho người dùng click chọn một slot trước khi treo. |
| FR-003-05 | Event-driven | WHEN `Wish` được tạo, THE system SHALL chạy animation: tờ giấy xuất hiện dưới gốc, bay theo đường cong lên slot, đung đưa rồi đứng yên, tổng thời gian ≤ 2.5 s. |
| FR-003-06 | Event-driven | WHEN animation bắt đầu, THE system SHALL đưa camera tới slot đích (dùng `flyTo` của 001). |
| FR-003-07 | Event-driven | WHEN animation kết thúc, THE system SHALL hiển thị toast "Điều ước của bạn đã được treo lên cây đa 🏮" trong 4 s. |
| FR-003-08 | Ubiquitous | THE system SHALL lưu toàn bộ danh sách `Wish` vào localStorage ngay sau mỗi thay đổi. |
| FR-003-09 | Event-driven | WHEN ứng dụng khởi động, THE system SHALL nạp danh sách `Wish` từ localStorage, validate từng bản ghi và hiển thị chúng tại đúng slot mà không chạy animation bay. |
| FR-003-10 | Unwanted | IF một bản ghi trong localStorage không hợp lệ theo `WishSchema`, THEN THE system SHALL bỏ qua bản ghi đó, giữ các bản ghi hợp lệ và ghi log cảnh báo ra console. |
| FR-003-11 | Unwanted | IF hai bản ghi trỏ cùng một `slotId`, THEN THE system SHALL giữ bản ghi có `createdAt` sớm hơn và chuyển bản ghi còn lại sang slot trống khác. |
| FR-003-12 | Unwanted | IF không còn slot trống, THEN THE system SHALL từ chối treo và giữ nguyên bản nháp để người dùng không mất nội dung. |
| FR-003-13 | State-driven | WHILE `prefers-reduced-motion` được bật, THE system SHALL bỏ animation bay và hiển thị tờ giấy tại slot bằng hiệu ứng mờ dần 200 ms. |
| FR-003-14 | Ubiquitous | THE system SHALL render tờ giấy với màu tương ứng `paperColor`, dây treo đỏ và đung đưa nhẹ theo gió (biên độ ≤ 5°), lệch pha ngẫu nhiên giữa các tờ. |
| FR-003-15 | Event-driven | WHEN dữ liệu localStorage thay đổi từ tab khác (sự kiện `storage`), THE system SHALL đồng bộ lại danh sách trên cây. |

## 4. Non-Functional Requirements

| ID | Nhóm | Yêu cầu |
|---|---|---|
| NFR-003-01 | Hiệu năng | THE system SHALL render các tờ giấy bằng `InstancedMesh` (1 draw call cho thân giấy) khi số lượng > 20. |
| NFR-003-02 | Hiệu năng | THE system SHALL ghi localStorage ≤ 5 ms cho 100 bản ghi (debounce không quá 100 ms). |
| NFR-003-03 | Dung lượng | THE system SHALL giữ dữ liệu 100 wish ≤ 100 KB trong localStorage. |
| NFR-003-04 | Độ tin cậy | THE system SHALL không mất bản ghi đã xác nhận treo khi reload, đóng tab, hoặc mất mạng. |
| NFR-003-05 | A11y | WHEN treo thành công, THE system SHALL thông báo qua vùng `aria-live="polite"`. |

## 5. Data Model

Sử dụng `Wish`, `WishDraft` từ [002 §5](../002-write-wish/spec.md#5-data-model) và `BranchSlot` từ [001 §5](../001-banyan-tree-scene/spec.md#5-data-model).

```ts
// Định dạng lưu trữ — localStorage key: "banyan:wishes:v1"
export interface WishStorageV1 {
  version: 1;
  wishes: Wish[];          // tối đa 100
}

export const WishStorageSchema = z.object({
  version: z.literal(1),
  wishes: z.array(z.unknown()),   // validate từng phần tử bằng WishSchema (FR-003-10)
});

// Trạng thái animation — chỉ trong bộ nhớ, không persist
export interface HangingAnimation {
  wishId: string;
  fromPosition: Vec3;      // gốc cây
  toSlotId: string;
  startedAt: number;       // performance.now()
  durationMs: number;      // ≤ 2500; 200 khi reduced-motion
}

export const MAX_WISHES = 100;
```

**Migration**: hàm `migrateWishStorage(raw: unknown): WishStorageV1` — dữ liệu không có `version` hoặc version lạ → trả về `{ version: 1, wishes: [] }` sau khi lưu bản sao lưu vào key `banyan:wishes:backup`.

## 6. API Spec (Client-side contracts)

```ts
// Store — src/entities/wish/wishStore.ts
interface WishState {
  wishes: Wish[];
  hydrated: boolean;
  pendingAnimation: HangingAnimation | null;

  hangWish(draft: WishDraft, opts?: { slotId?: string }): HangResult;
  getFreeSlots(): BranchSlot[];
  getWishBySlot(slotId: string): Wish | undefined;
  isFull(): boolean;
  _hydrate(): void;             // FR-003-09
  _resolveSlotConflicts(): void; // FR-003-11
}
useWishStore: UseBoundStore<StoreApi<WishState>>

type HangResult =
  | { ok: true; wish: Wish }
  | { ok: false; error: 'TREE_FULL' | 'SLOT_TAKEN' | 'INVALID_DRAFT' | 'STORAGE_FAILED' };

// Service thuần
slotAllocator.pick(free: BranchSlot[], rng?: () => number): BranchSlot | null  // FR-003-03
wishRepository.load(): Wish[]
wishRepository.save(wishes: Wish[]): void           // throw StorageError khi quota
wishRepository.subscribe(cb: (w: Wish[]) => void): () => void  // sự kiện 'storage'

// Component 3D
<WishPapers wishes={Wish[]} onWishClick?={(id: string) => void} />
<HangingWishAnimation animation={HangingAnimation} onDone={() => void} />
<SlotPicker enabled={boolean} onPick={(slotId: string) => void} />
```

**Sự kiện**:
| Tên | Payload | Phát khi |
|---|---|---|
| `wish:submitted` (nghe) | `{ draft: WishDraft }` | Từ 002 |
| `wish:hung` | `{ wish: Wish }` | Animation kết thúc |
| `wish:hang-failed` | `{ error: HangResult['error'] }` | Treo thất bại |

## 7. Error Handling

| ID | Tình huống | Hành vi hệ thống | Thông báo người dùng |
|---|---|---|---|
| ERR-003-01 | `TREE_FULL` | Không tạo Wish, giữ bản nháp (002) | "Cây đa đã kín ước nguyện. Hãy gỡ bớt để treo thêm." |
| ERR-003-02 | `SLOT_TAKEN` (tự chọn slot đã có người) | Yêu cầu chọn lại | "Cành này đã có điều ước, hãy chọn cành khác." |
| ERR-003-03 | `STORAGE_FAILED` (quota / private mode) | Vẫn treo trong phiên hiện tại, đánh dấu `persisted=false` | "Không thể lưu vĩnh viễn. Điều ước sẽ mất khi đóng trang — hãy xuất file sao lưu." |
| ERR-003-04 | Bản ghi hỏng khi nạp | Bỏ qua bản ghi, `console.warn` | Không hiển thị |
| ERR-003-05 | Dữ liệu storage không parse được JSON | Sao lưu chuỗi gốc vào `banyan:wishes:backup`, khởi tạo rỗng | "Dữ liệu cũ bị lỗi và đã được sao lưu." |
| ERR-003-06 | `slotId` không tồn tại trong `BRANCH_SLOTS` | Gán lại slot trống | Không hiển thị |

## 8. Acceptance Criteria

| ID | FR | Given | When | Then |
|---|---|---|---|---|
| AC-003-01 | FR-003-01 | Store rỗng | Phát `wish:submitted` hợp lệ | Store có 1 Wish với UUID hợp lệ, `source='local'` |
| AC-003-02 | FR-003-02, 03 | Có 99 wish | Treo thêm 1 | Wish mới ở slot trống duy nhất còn lại; không slot nào có 2 wish |
| AC-003-03 | FR-003-03 | Còn slot trống ở cả 3 tầng, rng cố định | Gọi `slotAllocator.pick` | Slot trả về thuộc tầng `low` |
| AC-003-04 | FR-003-04 | Bật "Tự chọn cành" | Click một slot trống | Wish được treo đúng slot đó |
| AC-003-05 | FR-003-05, 06, 07 | Form hợp lệ | Bấm "Treo lên cây" | Camera bay tới slot, tờ giấy bay lên trong ≤ 2.5 s, toast xuất hiện |
| AC-003-06 | FR-003-08, 09 | Đã treo 3 wish | Reload trang | 3 wish hiện ở đúng slot cũ, không có animation bay |
| AC-003-07 | FR-003-10 | localStorage có 2 bản ghi hợp lệ + 1 thiếu `content` | Khởi động app | Hiển thị 2 wish, console có 1 cảnh báo |
| AC-003-08 | FR-003-11 | 2 bản ghi cùng `slot-005` | Khởi động app | Bản sớm hơn giữ `slot-005`, bản kia chuyển slot khác |
| AC-003-09 | FR-003-12 | Có 100 wish | Gửi draft | `hangWish` trả `TREE_FULL`, bản nháp còn nguyên |
| AC-003-10 | FR-003-13 | Bật reduced-motion | Treo wish | Tờ giấy mờ dần tại slot trong 200 ms, không bay |
| AC-003-11 | FR-003-15 | Mở app ở 2 tab | Treo wish ở tab A | Tab B hiển thị wish mới mà không cần reload |
| AC-003-12 | ERR-003-03 | Giả lập `setItem` ném `QuotaExceededError` | Treo wish | Wish vẫn hiện trên cây, hiện cảnh báo ERR-003-03 |
| AC-003-13 | NFR-003-01 | Có 100 wish | Đếm draw call của tờ giấy | Thân giấy dùng 1 `InstancedMesh` |

## 9. Out of Scope

- Đồng bộ ước nguyện giữa các thiết bị / người dùng khác (cần backend).
- Cây ước nguyện chung toàn cộng đồng thời gian thực.
- Treo nhiều tờ trên cùng một slot, mở rộng số slot > 100.
- Hiệu ứng vật lý thực (gió động, va chạm giữa các tờ).
- Hoàn tác (undo) thao tác treo — gỡ thực hiện ở feature 005.

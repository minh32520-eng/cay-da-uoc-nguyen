# Feature Specification: Cảnh cây đa 3D đêm Trung Thu

**Feature ID**: `001-banyan-tree-scene`
**Branch**: `001-banyan-tree-scene`
**Status**: Draft
**Created**: 2026-09-25
**Depends on**: —

---

## 1. Context & Goal

- **Bối cảnh**: Cây đa là biểu tượng làng quê Việt Nam gắn với truyền thuyết chú Cuội – chị Hằng. Trung tâm trải nghiệm của website là một mô hình cây đa 3D trong đêm rằm, nơi người dùng treo tờ giấy ước nguyện.
- **Mục tiêu**: Hiển thị cảnh 3D cây đa có trăng rằm, đèn lồng, ánh sáng ấm; người dùng xoay/zoom quan sát; cảnh cung cấp **các slot treo** trên cành cho feature 003.
- **Chỉ số thành công**:
  - Cảnh tương tác được trong ≤ 4 s trên 4G giả lập.
  - ≥ 60 FPS desktop, ≥ 30 FPS mobile tầm trung.
  - Thiết bị không có WebGL vẫn dùng được toàn bộ chức năng qua chế độ 2D.

## 2. Actors

| Actor | Mô tả | Mục tiêu |
|---|---|---|
| Khách truy cập | Bất kỳ ai mở website, desktop hoặc mobile | Ngắm cảnh, tìm chỗ treo ước nguyện |
| Người dùng bàn phím / screen reader | Không dùng chuột hoặc không nhìn màn hình | Truy cập được mọi chức năng tương đương |
| Trình duyệt (hệ thống) | Cung cấp WebGL, `matchMedia`, localStorage | Render cảnh, báo khả năng thiết bị |

## 3. Functional Requirements (EARS)

| ID | Loại EARS | Yêu cầu |
|---|---|---|
| FR-001-01 | Ubiquitous | THE system SHALL hiển thị một mô hình 3D cây đa (thân, rễ phụ, tán lá) ở trung tâm khung nhìn trên nền trời đêm có trăng tròn. |
| FR-001-02 | Ubiquitous | THE system SHALL định nghĩa đúng 100 slot treo (`BranchSlot`) cố định trên các cành, mỗi slot có vị trí 3D và ID duy nhất. |
| FR-001-03 | Event-driven | WHEN trang được mở, THE system SHALL hiển thị màn hình chờ có thanh tiến trình tải model cho đến khi model tải xong. |
| FR-001-04 | Event-driven | WHEN người dùng kéo chuột hoặc vuốt một ngón, THE system SHALL xoay camera quanh thân cây trong giới hạn góc ngẩng 10°–80°. |
| FR-001-05 | Event-driven | WHEN người dùng cuộn chuột hoặc chụm hai ngón, THE system SHALL zoom camera trong khoảng cách 4–20 đơn vị tính từ tâm cây. |
| FR-001-06 | Event-driven | WHEN người dùng bấm nút "Về góc nhìn ban đầu", THE system SHALL đưa camera về vị trí mặc định trong 600 ms. |
| FR-001-07 | Ubiquitous | THE system SHALL hiển thị tối thiểu 8 đèn lồng Trung Thu phát sáng treo trên cây, đung đưa nhẹ theo chu kỳ 3–5 s. |
| FR-001-08 | State-driven | WHILE người dùng không tương tác quá 10 s, THE system SHALL tự xoay camera chậm 5°/s cho đến khi có tương tác mới. |
| FR-001-09 | State-driven | WHILE `prefers-reduced-motion: reduce` được bật, THE system SHALL tắt tự xoay, tắt đung đưa đèn lồng và thay mọi chuyển động camera bằng chuyển cảnh tức thì. |
| FR-001-10 | Unwanted | IF trình duyệt không hỗ trợ WebGL, THEN THE system SHALL hiển thị chế độ 2D (ảnh SVG cây đa với 100 slot tương ứng) thay cho cảnh 3D. |
| FR-001-11 | Unwanted | IF model 3D tải thất bại, THEN THE system SHALL hiển thị thông báo lỗi kèm nút "Thử lại" và nút "Dùng chế độ 2D". |
| FR-001-12 | Optional | WHERE người dùng bật nhạc nền, THE system SHALL phát nhạc Trung Thu lặp lại với âm lượng mặc định 30%; mặc định nhạc TẮT. |
| FR-001-13 | Event-driven | WHEN tab trình duyệt bị ẩn, THE system SHALL tạm dừng vòng render và nhạc nền; WHEN tab hiện lại, THE system SHALL tiếp tục. |
| FR-001-14 | Ubiquitous | THE system SHALL cung cấp nút điều khiển camera (xoay trái/phải, zoom +/-) truy cập được bằng bàn phím (phím mũi tên, `+`, `-`, `Home`). |

## 4. Non-Functional Requirements

| ID | Nhóm | Yêu cầu |
|---|---|---|
| NFR-001-01 | Hiệu năng | THE system SHALL duy trì ≥ 60 FPS trên desktop (GPU tích hợp 2020+) và ≥ 30 FPS trên mobile tầm trung khi có 100 tờ ước nguyện. |
| NFR-001-02 | Hiệu năng | THE system SHALL giới hạn model `banyan.glb` ≤ 3 MB (nén Draco/Meshopt) và ≤ 150k tam giác. |
| NFR-001-03 | Hiệu năng | THE system SHALL lazy-load module 3D; bundle JS ban đầu (gzip) ≤ 500 KB. |
| NFR-001-04 | Hiệu năng | WHILE thiết bị có `devicePixelRatio` > 2, THE system SHALL giới hạn DPR render ở 2. |
| NFR-001-05 | Tương thích | THE system SHALL chạy trên 2 phiên bản mới nhất của Chrome, Edge, Firefox, Safari (desktop & iOS/Android). |
| NFR-001-06 | Responsive | THE system SHALL hiển thị đúng từ chiều rộng 320 px đến 2560 px, cả hướng dọc và ngang. |
| NFR-001-07 | A11y | THE system SHALL gắn `role="img"` và `aria-label` mô tả cảnh cho canvas 3D. |
| NFR-001-08 | A11y | THE system SHALL đảm bảo tương phản ≥ 4.5:1 cho mọi chữ và nút phủ lên cảnh. |

## 5. Data Model

```ts
// src/scene/types.ts
export type Vec3 = [x: number, y: number, z: number];

export interface BranchSlot {
  id: string;          // "slot-001" … "slot-100"
  position: Vec3;      // toạ độ điểm treo trên cành (world space)
  rotationY: number;   // radian, hướng tờ giấy
  tier: 'low' | 'mid' | 'high'; // tầng cành, dùng cho chế độ 2D & ưu tiên gán
}

export interface SceneSettings {
  musicEnabled: boolean;   // mặc định false
  musicVolume: number;     // 0..1, mặc định 0.3
  renderMode: 'auto' | '3d' | '2d'; // mặc định 'auto'
}

export interface CameraState {
  azimuth: number;   // radian
  polar: number;     // radian, giới hạn [10°, 80°]
  distance: number;  // [4, 20]
}
```

- `BRANCH_SLOTS: readonly BranchSlot[]` — hằng số tĩnh tại `src/scene/branchSlots.ts`, sinh một lần từ model và commit vào repo.
- `SceneSettings` lưu tại localStorage key `banyan:settings:v1`.

## 6. API Spec (Client-side contracts)

```ts
// Component
<BanyanScene
  wishes={Wish[]}                        // từ store (feature 003)
  onSlotClick?={(slotId: string) => void}
  onWishClick?={(wishId: string) => void} // feature 004
  focusSlotId?={string | null}            // camera bay tới slot
/>

// Hooks
useRenderCapability(): { webgl: boolean; mode: '3d' | '2d' }
useSceneSettings(): SceneSettings & {
  setMusic(enabled: boolean): void;
  setVolume(v: number): void;            // clamp 0..1
  setRenderMode(m: SceneSettings['renderMode']): void;
}
useCameraControls(): {
  reset(): void;                          // FR-001-06
  rotate(deltaRad: number): void;
  zoom(delta: number): void;
  flyTo(slotId: string, durationMs?: number): Promise<void>;
}

// Constants
getSlotById(id: string): BranchSlot | undefined
BRANCH_SLOTS: readonly BranchSlot[]      // length === 100
```

**Sự kiện** (`shared/lib/events.ts`):
| Tên | Payload | Phát khi |
|---|---|---|
| `scene:ready` | `{ mode: '3d' \| '2d' }` | Model tải xong / chế độ 2D sẵn sàng |
| `scene:error` | `{ reason: 'webgl' \| 'model-load' }` | Lỗi render |

## 7. Error Handling

| ID | Tình huống | Hành vi hệ thống | Thông báo người dùng |
|---|---|---|---|
| ERR-001-01 | Không có WebGL | Tự chuyển `mode = '2d'` | "Thiết bị không hỗ trợ 3D, đang hiển thị chế độ 2D." |
| ERR-001-02 | Tải `banyan.glb` lỗi / timeout 20 s | Phát `scene:error`, hiện nút Thử lại / Dùng 2D | "Không tải được cây đa. Vui lòng thử lại." |
| ERR-001-03 | Mất WebGL context (`webglcontextlost`) | Dừng render, thử khôi phục 1 lần, thất bại → chuyển 2D | "Đã chuyển sang chế độ 2D để ổn định hơn." |
| ERR-001-04 | Trình duyệt chặn autoplay nhạc | Giữ trạng thái nhạc TẮT, không báo lỗi | Nút nhạc hiển thị trạng thái "Tắt" |
| ERR-001-05 | FPS trung bình < 24 trong 5 s | Giảm chất lượng: tắt bóng đổ, DPR = 1 | Không hiển thị (âm thầm) |

## 8. Acceptance Criteria

| ID | FR | Given | When | Then |
|---|---|---|---|---|
| AC-001-01 | FR-001-01, 03 | Trình duyệt có WebGL | Mở trang chủ | Thấy màn hình chờ có %, sau đó thấy cây đa, trăng tròn, nền trời đêm |
| AC-001-02 | FR-001-02 | Cảnh đã tải | Đọc `BRANCH_SLOTS` | Có đúng 100 phần tử, ID không trùng |
| AC-001-03 | FR-001-04 | Cảnh đã tải | Kéo chuột lên hết cỡ | Góc ngẩng camera dừng ở 80°, không lật qua đỉnh |
| AC-001-04 | FR-001-05 | Cảnh đã tải | Cuộn zoom vào liên tục | Khoảng cách camera không nhỏ hơn 4 |
| AC-001-05 | FR-001-06 | Camera đã bị xoay | Bấm "Về góc nhìn ban đầu" | Camera về vị trí mặc định trong ≤ 600 ms |
| AC-001-06 | FR-001-08 | Cảnh đã tải, không tương tác | Chờ 10 s | Camera bắt đầu tự xoay; chạm chuột thì dừng |
| AC-001-07 | FR-001-09 | Bật reduced-motion trong OS | Mở trang | Không có tự xoay, đèn lồng đứng yên |
| AC-001-08 | FR-001-10 | Giả lập WebGL không khả dụng | Mở trang | Hiển thị cây đa 2D SVG, không có lỗi console chưa bắt |
| AC-001-09 | FR-001-11 | Chặn request `banyan.glb` | Mở trang | Thấy thông báo lỗi với 2 nút "Thử lại" và "Dùng chế độ 2D" |
| AC-001-10 | FR-001-12 | Nhạc đang tắt | Bấm nút nhạc | Nhạc phát, âm lượng 30%; bấm lại thì dừng |
| AC-001-11 | FR-001-13 | Nhạc đang phát | Chuyển sang tab khác | Nhạc tạm dừng; quay lại thì phát tiếp |
| AC-001-12 | FR-001-14 | Focus vào canvas | Nhấn `←`, `+`, `Home` | Camera xoay trái, zoom vào, về góc mặc định |
| AC-001-13 | NFR-001-01 | 100 tờ ước nguyện đã treo | Đo FPS 10 s trên desktop chuẩn | FPS trung bình ≥ 60 |

## 9. Out of Scope

- Chế độ ngày/đêm theo giờ thực, thời tiết động.
- Nhiều loại cây hoặc tuỳ biến hình dáng cây.
- VR/AR, WebXR.
- Nhân vật chú Cuội / chị Hằng chuyển động.
- Người dùng tự thêm slot treo mới.

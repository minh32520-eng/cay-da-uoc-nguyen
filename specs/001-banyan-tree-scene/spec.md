# Feature Specification: Cảnh cây thông 3D đêm Giáng sinh

**Feature ID**: `001-banyan-tree-scene` (giữ ID/thư mục cũ để truy vết; nội dung đã chuyển sang cây thông — xem Changelog)
**Branch**: `001-banyan-tree-scene`
**Status**: Approved
**Created**: 2026-09-25 · **Updated**: 2026-09-30
**Depends on**: —

---

## 1. Context & Goal

- **Bối cảnh**: Cây thông phủ tuyết là biểu tượng của đêm Giáng sinh. Trung tâm trải nghiệm của website là một mô hình cây thông 3D giữa trời tuyết, quanh gốc có tuần lộc và người tuyết; người dùng treo tờ giấy ước nguyện lên các tầng lá.
- **Mục tiêu**: Hiển thị cảnh 3D cây thông có tuyết rơi, quả châu, dây đèn, ngôi sao trên đỉnh; người dùng xoay/zoom quan sát; cảnh cung cấp **các slot treo** ở mép các tầng lá cho feature 003.
- **Chỉ số thành công**:
  - Cảnh tương tác được trong ≤ 4 s trên 4G giả lập.
  - ≥ 60 FPS desktop, ≥ 30 FPS mobile tầm trung (kể cả khi có tuyết rơi).
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
| FR-001-01 | Ubiquitous | THE system SHALL hiển thị một mô hình 3D cây thông (thân, các tầng lá kim phủ tuyết, ngôi sao trên đỉnh) ở trung tâm khung nhìn trên nền trời đêm mùa đông. |
| FR-001-02 | Ubiquitous | THE system SHALL định nghĩa đúng 100 slot treo (`BranchSlot`) cố định ở mép các tầng lá, mỗi slot có vị trí 3D và ID duy nhất. |
| FR-001-03 | Event-driven | WHEN trang được mở, THE system SHALL hiển thị màn hình chờ có thanh tiến trình tải model cho đến khi model tải xong. |
| FR-001-04 | Event-driven | WHEN người dùng kéo chuột hoặc vuốt một ngón, THE system SHALL xoay camera quanh thân cây trong giới hạn góc ngẩng 10°–80°. |
| FR-001-05 | Event-driven | WHEN người dùng cuộn chuột hoặc chụm hai ngón, THE system SHALL zoom camera trong khoảng cách 4–20 đơn vị tính từ tâm cây. |
| FR-001-06 | Event-driven | WHEN người dùng bấm nút "Về góc nhìn ban đầu", THE system SHALL đưa camera về vị trí mặc định trong 600 ms. |
| FR-001-07 | Ubiquitous | THE system SHALL hiển thị tối thiểu 8 quả châu Giáng sinh phát sáng trên cây, đung đưa nhẹ theo chu kỳ 3–5 s, cùng một dây đèn nhấp nháy quấn quanh cây. |
| FR-001-08 | State-driven | WHILE người dùng không tương tác quá 10 s, THE system SHALL tự xoay camera chậm 5°/s cho đến khi có tương tác mới. |
| FR-001-09 | State-driven | WHILE `prefers-reduced-motion: reduce` được bật, THE system SHALL tắt tự xoay, tắt đung đưa quả châu, dừng tuyết rơi, cho tuần lộc đứng yên, không cho xe trượt tuyết bay và thay mọi chuyển động camera bằng chuyển cảnh tức thì. |
| FR-001-10 | Unwanted | IF trình duyệt không hỗ trợ WebGL, THEN THE system SHALL hiển thị chế độ 2D (ảnh SVG cây thông có tuyết với 100 slot tương ứng) thay cho cảnh 3D. |
| FR-001-11 | Unwanted | IF model 3D tải thất bại, THEN THE system SHALL hiển thị thông báo lỗi kèm nút "Thử lại" và nút "Dùng chế độ 2D". |
| FR-001-12 | Optional | WHERE người dùng bật nhạc nền, THE system SHALL phát nhạc Giáng sinh lặp lại với âm lượng mặc định 30%; mặc định nhạc TẮT. |
| FR-001-13 | Event-driven | WHEN tab trình duyệt bị ẩn, THE system SHALL tạm dừng vòng render (kể cả tuyết rơi) và nhạc nền; WHEN tab hiện lại, THE system SHALL tiếp tục. |
| FR-001-14 | Ubiquitous | THE system SHALL cung cấp nút điều khiển camera (xoay trái/phải, zoom +/-) truy cập được bằng bàn phím (phím mũi tên, `+`, `-`, `Home`). |
| FR-001-15 | State-driven | WHILE cảnh 3D đang chạy, THE system SHALL hiển thị tuyết rơi liên tục: mỗi bông tuyết rơi chậm, trôi ngang theo gió và quay lại đỉnh khi chạm đất. |
| FR-001-16 | Ubiquitous | THE system SHALL hiển thị 4–6 con tuần lộc đi lại quanh gốc cây, xen kẽ đi bộ, cúi đầu gặm cỏ và ngẩng đầu nhìn quanh. |
| FR-001-17 | Ubiquitous | THE system SHALL hiển thị 3–4 người tuyết (3 khối tuyết, mũi cà rốt, mắt & cúc than, tay cành cây, khăn quàng, mũ) đứng quanh gốc cây. |
| FR-001-18 | Unwanted | IF một con tuần lộc sắp chạm vật cản (đá, bụi, hộp quà, người tuyết, thân cây, tuần lộc khác), THEN THE system SHALL lái tuần lộc tránh sang hướng khác và không bao giờ để thân tuần lộc chồng lên vật cản. |
| FR-001-19 | Ubiquitous | THE system SHALL đặt quả châu sao cho không quả nào che tờ giấy ước nguyện khi nhìn từ ngoài vào (không đồng thời chồng lấn theo cung tròn quanh thân, theo độ cao kể cả dây treo, và nằm phía trước tờ giấy; không chạm tờ giấy). |
| FR-001-20 | State-driven | WHILE cảnh 3D đang chạy, THE system SHALL cho **hình bóng tối** (silhouette) ông già Noel ngồi xe trượt tuyết do 4 tuần lộc kéo bay ngang bầu trời trong khoảng 8 s, đi qua trước mặt trăng; trăng và đường bay xoay theo phương vị camera để luôn ở cùng chỗ trên trời. |
| FR-001-21 | Event-driven | WHEN một lượt bay kết thúc, THE system SHALL nghỉ một khoảng ngẫu nhiên 5–8 s rồi bắt đầu lượt bay mới, hướng bay đổi xen kẽ trái → phải và phải → trái. |

## 4. Non-Functional Requirements

| ID | Nhóm | Yêu cầu |
|---|---|---|
| NFR-001-01 | Hiệu năng | THE system SHALL duy trì ≥ 60 FPS trên desktop (GPU tích hợp 2020+) và ≥ 30 FPS trên mobile tầm trung khi có 100 tờ ước nguyện. |
| NFR-001-02 | Hiệu năng | WHERE dùng model GLB bên ngoài, THE system SHALL giới hạn file ≤ 3 MB (nén Draco/Meshopt) và ≤ 150k tam giác. Hiện model được dựng bằng code nên không có file GLB. |
| NFR-001-03 | Hiệu năng | THE system SHALL lazy-load module 3D; bundle JS ban đầu (gzip) ≤ 500 KB. |
| NFR-001-04 | Hiệu năng | WHILE thiết bị có `devicePixelRatio` > 2, THE system SHALL giới hạn DPR render ở 2. |
| NFR-001-05 | Tương thích | THE system SHALL chạy trên 2 phiên bản mới nhất của Chrome, Edge, Firefox, Safari (desktop & iOS/Android). |
| NFR-001-06 | Responsive | THE system SHALL hiển thị đúng từ chiều rộng 320 px đến 2560 px, cả hướng dọc và ngang. |
| NFR-001-07 | A11y | THE system SHALL gắn `role="img"` và `aria-label` mô tả cảnh cho canvas 3D. |
| NFR-001-08 | A11y | THE system SHALL đảm bảo tương phản ≥ 4.5:1 cho mọi chữ và nút phủ lên cảnh. |
| NFR-001-09 | Hiệu năng | THE system SHALL vẽ toàn bộ tuyết bằng một draw call (`Points`), tối đa 3000 bông trên desktop và 1200 bông trên thiết bị màn hình < 768 px hoặc khi đang ở chế độ chất lượng thấp. |
| NFR-001-10 | Kiểm thử | THE system SHALL tách logic di chuyển của tuần lộc thành hàm thuần (không phụ thuộc three.js) để mô phỏng và kiểm thử va chạm. |
| NFR-001-11 | Kiểm thử | THE system SHALL tách lịch bay và quỹ đạo xe trượt tuyết thành hàm thuần để kiểm thử nhịp lặp và độ cao bay. |

## 5. Data Model

```ts
// src/scene/types.ts
export type Vec3 = [x: number, y: number, z: number];

export interface BranchSlot {
  id: string;          // "slot-001" … "slot-100"
  position: Vec3;      // điểm buộc dây ở mép tầng lá (world space)
  rotationY: number;   // radian, hướng tờ giấy (quay ra ngoài)
  tier: 'low' | 'mid' | 'high'; // theo độ cao, dùng cho chế độ 2D & ưu tiên gán
}

export interface SceneSettings {
  musicEnabled: boolean;   // mặc định false
  musicVolume: number;     // 0..1, mặc định 0.3
  renderMode: 'auto' | '3d' | '2d'; // mặc định 'auto'
}

// src/scene/treeLayout.ts — cây thông
export interface PineLayer { y: number; radius: number; height: number } // một tầng lá hình nón
export interface Ornament { position: Vec3; color: string; size: number } // quả châu

// src/scene/groundLayout.ts
export interface Obstacle { x: number; z: number; r: number }            // vật cản hình tròn trên mặt XZ
export interface SnowmanSpot { x: number; z: number; rotationY: number; scale: number }

// src/scene/animalBrain.ts
export interface AnimalBrain {
  x: number; z: number; heading: number;
  mode: 'move' | 'rest' | 'stand';  // tuần lộc: đi / gặm cỏ / ngẩng nhìn
  timer: number; stepsLeft: number; stepPhase: number;
  dir: 1 | -1; targetRadius: number;
}
```

- `BRANCH_SLOTS: readonly BranchSlot[]` — sinh tất định từ `TREE_LAYOUT` (seed cố định).
- `SceneSettings` lưu tại localStorage key `banyan:settings:v1` (giữ key cũ để không mất cài đặt).

## 6. API Spec (Client-side contracts)

```ts
// Component
<BanyanScene
  wishes={Wish[]}
  onSlotClick?={(slotId: string) => void}
  onWishClick?={(wishId: string) => void}
  pickableSlots={BranchSlot[] | null}
  highlightIds={Set<string> | null}
  selectedId={string | null}
  reducedMotion={boolean}
  onBackgroundClick?={() => void}
/>
<Snowfall animate={boolean} count={number} />      // FR-001-15, NFR-001-09
<Reindeer animate={boolean} />                     // FR-001-16, FR-001-18
<Snowmen animate={boolean} />                      // FR-001-17

// Hooks
useRenderCapability(): { webgl: boolean; mode: '3d' | '2d' }
useCameraControls(): { reset(); rotate(deltaRad); zoom(delta); flyTo(slotId, durationMs?) }

// Logic thuần
snowflakeCount(viewportWidth: number, lowQuality: boolean): number   // 3000 | 1200
createBrain(rnd, obstacles, profile): AnimalBrain
stepBrain(brain, dt, rnd, obstacles, others, profile): void           // không bao giờ chồng vật cản
isFree(x, z, obstacles, margin): boolean
ornamentCoversPaper(ornament, slot): boolean                         // FR-001-19

// Constants
getSlotById(id: string): BranchSlot | undefined
BRANCH_SLOTS: readonly BranchSlot[]      // length === 100
GROUND_OBSTACLES: readonly Obstacle[]
```

**Sự kiện** (`shared/lib/events.ts`):
| Tên | Payload | Phát khi |
|---|---|---|
| `scene:ready` | `{ mode: '3d' \| '2d' }` | Cảnh sẵn sàng |
| `scene:error` | `{ reason: 'webgl' \| 'model-load' }` | Lỗi render |

## 7. Error Handling

| ID | Tình huống | Hành vi hệ thống | Thông báo người dùng |
|---|---|---|---|
| ERR-001-01 | Không có WebGL | Tự chuyển `mode = '2d'` | "Thiết bị không hỗ trợ 3D, đang hiển thị chế độ 2D." |
| ERR-001-02 | Tải module 3D lỗi / timeout 20 s | Phát `scene:error`, hiện nút Thử lại / Dùng 2D | "Không tải được cây thông. Vui lòng thử lại." |
| ERR-001-03 | Mất WebGL context (`webglcontextlost`) | Dừng render, thử khôi phục 1 lần, thất bại → chuyển 2D | "Đã chuyển sang chế độ 2D để ổn định hơn." |
| ERR-001-04 | Trình duyệt chặn autoplay nhạc | Giữ trạng thái nhạc TẮT, không báo lỗi | Nút nhạc hiển thị trạng thái "Tắt" |
| ERR-001-05 | FPS trung bình < 24 trong 5 s | Giảm chất lượng: DPR = 1, giảm tuyết xuống 1200 bông | Không hiển thị (âm thầm) |
| ERR-001-06 | Tuần lộc sinh ra trong vật cản | Chọn lại vị trí trống (tối đa 200 lần) rồi đẩy ra khỏi vật cản | Không hiển thị |

## 8. Acceptance Criteria

| ID | FR | Given | When | Then |
|---|---|---|---|---|
| AC-001-01 | FR-001-01, 03 | Trình duyệt có WebGL | Mở trang chủ | Thấy màn hình chờ, sau đó thấy cây thông phủ tuyết có ngôi sao trên đỉnh, nền trời đêm |
| AC-001-02 | FR-001-02 | Cảnh đã tải | Đọc `BRANCH_SLOTS` | Có đúng 100 phần tử, ID không trùng |
| AC-001-03 | FR-001-04 | Cảnh đã tải | Kéo chuột lên hết cỡ | Góc ngẩng camera dừng ở 80°, không lật qua đỉnh |
| AC-001-04 | FR-001-05 | Cảnh đã tải | Cuộn zoom vào liên tục | Khoảng cách camera không nhỏ hơn 4 |
| AC-001-05 | FR-001-06 | Camera đã bị xoay | Bấm "Về góc nhìn ban đầu" | Camera về vị trí mặc định trong ≤ 600 ms |
| AC-001-06 | FR-001-08 | Cảnh đã tải, không tương tác | Chờ 10 s | Camera bắt đầu tự xoay; chạm chuột thì dừng |
| AC-001-07 | FR-001-09 | Bật reduced-motion trong OS | Mở trang | Không có tự xoay, quả châu đứng yên, tuyết không rơi |
| AC-001-08 | FR-001-10 | Giả lập WebGL không khả dụng | Mở trang | Hiển thị cây thông 2D SVG, không có lỗi console chưa bắt |
| AC-001-09 | FR-001-11 | Chặn tải module 3D | Mở trang | Thấy thông báo lỗi với 2 nút "Thử lại" và "Dùng chế độ 2D" |
| AC-001-10 | FR-001-12 | Nhạc đang tắt | Bấm nút nhạc | Nhạc phát, âm lượng 30%; bấm lại thì dừng |
| AC-001-11 | FR-001-13 | Nhạc đang phát | Chuyển sang tab khác | Nhạc tạm dừng; quay lại thì phát tiếp |
| AC-001-12 | FR-001-14 | Focus vào canvas | Nhấn `←`, `+`, `Home` | Camera xoay trái, zoom vào, về góc mặc định |
| AC-001-13 | NFR-001-01 | 100 tờ ước nguyện đã treo | Đo FPS 10 s trên desktop chuẩn | FPS trung bình ≥ 60 |
| AC-001-14 | FR-001-15, NFR-001-09 | Màn hình rộng 1280 px / 390 px | Gọi `snowflakeCount` | Trả về 3000 / 1200; chế độ chất lượng thấp luôn 1200 |
| AC-001-15 | FR-001-16 | Cảnh đã tải | Đếm tuần lộc | Có 4–6 con, di chuyển khi không bật reduced-motion |
| AC-001-16 | FR-001-17 | Đọc bố cục mặt đất | Đếm người tuyết | Có 3–4 người tuyết, đều là vật cản |
| AC-001-17 | FR-001-18, NFR-001-10 | 5 tuần lộc | Mô phỏng 2 phút với bước 1/60 s | Không lần nào thân tuần lộc chồng lên vật cản; tuần lộc thực sự di chuyển ≥ 30% thời gian |
| AC-001-18 | FR-001-19 | Bố cục cây thông | Gọi `ornamentCoversPaper` cho mọi cặp quả châu – slot | Không cặp nào trả về true; có ≥ 8 quả châu |
| AC-001-19 | FR-001-02 | Bố cục cây thông | So mọi slot với mặt nón tầng lá bên dưới | Tâm tờ giấy nằm ngoài mặt nón tầng dưới (không bị lá che) |
| AC-001-20 | FR-001-20, 21, NFR-001-11 | Lịch bay với seed cố định | Mô phỏng 5 phút | Mỗi lượt bay 8 s; mỗi khoảng nghỉ 5–8 s; hướng bay đổi xen kẽ |
| AC-001-21 | FR-001-20 | Quỹ đạo bay | Lấy mẫu toàn lượt | Xe luôn cao hơn ngôi sao trên đỉnh cây ≥ 2 đơn vị, nằm phía sau cây, đi từ mép này sang mép kia |
| AC-001-22 | FR-001-09 | Bật reduced-motion | Mô phỏng 30 s | Xe trượt tuyết không bay |
| AC-001-23 | FR-001-20 | Đường bay & vị trí trăng | Nhìn từ camera gốc tại giữa lượt bay | Hình bóng nằm trong đĩa mặt trăng (lệch tâm < 60% bán kính góc) |
| AC-001-23 | FR-001-20 | Camera ở vị trí gốc | Lấy vị trí giữa lượt bay | Hình bóng nằm trong đĩa mặt trăng khi nhìn từ camera |

## 9. Out of Scope

- Chế độ ngày/đêm theo giờ thực, tuyết đọng tích luỹ theo thời gian.
- Nhiều loại cây hoặc tuỳ biến hình dáng cây.
- VR/AR, WebXR.
- Ông già Noel trong chế độ 2D (chỉ có ở cảnh 3D theo lựa chọn của người dùng).
- Người dùng tự thêm slot treo mới.
- Tương tác trực tiếp với tuần lộc / người tuyết (bấm, kéo).

---

## Changelog

| Ngày | Thay đổi |
|---|---|
| 2026-09-25 | Bản đầu: cây đa đêm Trung Thu, đèn lồng, thỏ ngọc. |
| 2026-09-30 | Theo yêu cầu người dùng: chuyển sang cây thông Giáng sinh. Sửa nội dung FR-001-01, 07, 09, 10, 12, 13; NFR-001-02; ERR-001-02, 05; AC-001-01, 07, 08, 09. Thêm FR-001-15..19, NFR-001-09..10, ERR-001-06, AC-001-14..19. Thỏ ngọc được thay bằng tuần lộc; thêm người tuyết và tuyết rơi. Tiêu chí FR-001-19/AC-001-18 đổi từ "cách ≥ 1.0" sang "không che khi nhìn từ ngoài" vì mép tầng lá dày đặc chỗ treo. |
| 2026-10-01 | Theo yêu cầu người dùng: thêm ông già Noel cưỡi xe tuần lộc bay ngang trời, nghỉ 5–8 s rồi lặp lại (FR-001-20, 21; NFR-001-11; AC-001-20..22), chỉ ở cảnh 3D. |
| 2026-10-01 | Theo yêu cầu người dùng: ông già Noel chỉ còn dạng hình bóng, bay ngang qua trước mặt trăng (sửa FR-001-20, thêm AC-001-23); bỏ vệt bụi sao; trăng lớn hơn, xoay theo camera. |
| 2026-10-01 | Theo yêu cầu người dùng: ông già Noel chỉ còn là hình bóng tối bay qua trước mặt trăng (FR-001-20 sửa nội dung; thêm AC-001-23); bỏ vệt bụi sao; trăng to hơn và xoay theo camera. |

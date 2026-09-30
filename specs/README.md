# Danh mục Feature — Cây Thông Ước Nguyện (Giáng sinh)

Ứng dụng React (SPA tĩnh) + backend tối thiểu Supabase cho cây ước nguyện chung (007). Mọi spec tuân theo [Constitution](../.specify/memory/constitution.md) và [AGENTS.md](../AGENTS.md).

| ID | Feature | Mô tả ngắn | Phụ thuộc | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| [001](001-banyan-tree-scene/spec.md) | Cảnh cây thông 3D | Cây thông phủ tuyết, quả châu, dây đèn, ngôi sao, tuyết rơi, tuần lộc, người tuyết, điều khiển camera, dự phòng 2D | — | P1 | Approved |
| [002](002-write-wish/spec.md) | Viết tờ ước nguyện | Form soạn ước nguyện: nội dung, tên, chủ đề, màu giấy, xem trước | 001 | P1 | Draft |
| [003](003-hang-wish/spec.md) | Treo ước nguyện lên cây | Gán slot trên cành, animation bay lên treo, lưu localStorage | 001, 002 | P1 | Draft |
| [004](004-view-browse-wish/spec.md) | Xem & duyệt ước nguyện | Click tờ giấy để đọc, danh sách truy cập được, tìm kiếm & lọc | 003 | P1 | Draft |
| [005](005-manage-wish/spec.md) | Quản lý ước nguyện | Sửa, gỡ, xuất/nhập file JSON, xoá toàn bộ | 003 | P2 | Draft |
| [006](006-share-wish/spec.md) | Chia sẻ ước nguyện | Tạo link chia sẻ (dữ liệu mã hoá trong URL), mở link để xem & treo | 003, 004 | P2 | Draft |
| [007](007-shared-wishes/spec.md) | Cây ước nguyện chung | Database Supabase: mọi người thấy điều ước của nhau, tối đa 3 điều ước/IP, chỉ người viết sửa/gỡ | 001–006 | P1 | Approved |

## Mô hình dữ liệu dùng chung

Thực thể `Wish` được định nghĩa **một lần** trong [002-write-wish/spec.md §5](002-write-wish/spec.md#5-data-model) và được hiện thực tại `src/entities/wish/`. Các feature khác chỉ mở rộng/tham chiếu, không định nghĩa lại.

## Luồng người dùng tổng thể

```
Mở web → (001) thấy cây thông Giáng sinh giữa trời tuyết
       → (002) bấm "Viết điều ước" → soạn nội dung
       → (003) bấm "Treo lên cây" → tờ giấy bay lên cành
       → (004) click tờ giấy bất kỳ để đọc / mở danh sách tìm kiếm
       → (005) sửa / gỡ / sao lưu
       → (006) chia sẻ link cho bạn bè
```

# OneOps UI — Tailwind Design System & Aurora Ops

## 1. Phạm vi & Triết lý Thiết kế

Hệ thống giao diện OneOps được xây dựng trên ngôn ngữ thiết kế **Aurora Ops**:
- Màu sắc chủ đạo: Cam thương hiệu `#f06000` (năng lượng, hành động) kết hợp xanh đậm `#00204d` (tin cậy, chuyên nghiệp).
- Hiệu ứng thị giác: Lớp kính mờ (glassmorphism), nền sương tĩnh đa tầng (aurora mist), và lưới bento thông minh (bento grid).
- Độ tương phản: Đạt chuẩn WCAG 2.1 AA (≥ 4.5:1 đối với văn bản thông thường) trên cả hai chủ đề Light và Dark.
- Thư viện tài nguyên hoạt động trực quan tại `/design-system` và `/design-tokens`.

---

## 2. Ngăn xếp Kỹ thuật Frontend

- **Tailwind CSS 4** qua `@tailwindcss/postcss`, quét `apps/web/src/`; dùng `@theme inline` và biến CSS ngữ nghĩa.
- **Lucide Icons & SVG Primitives**: Bộ biểu tượng gọn gàng, sắc nét tại `apps/web/src/icons/index.tsx`.
- `clsx` và `tailwind-merge` ghép và xử lý class override linh hoạt.
- **Kiến trúc thành phần Leaf Feature:**
  - Từng feature tự quản lý các component UI chuyên biệt: `table.tsx`, `*-form.tsx`, `detail-sheet.tsx`, `create-dialog.tsx`, `primitives.tsx`.
  - Không tạo thư viện UI monolithic dùng chung xuyên feature; mỗi feature độc lập và tự kiểm soát vòng đời giao diện.
- **Shell và Điều hướng toàn cục:** `apps/web/src/core/layout/app-shell.tsx` quản lý thanh điều hướng rail (5 nhóm), panel phân hệ, header, breadcrumb và preferences.

---

## 3. Hệ thống Design Tokens (233 Tokens)

Bộ **233 tokens** được quản lý tập trung tại `tokens/source.json` (v2.0.0) và biên dịch qua `scripts/build-tokens.mjs`:

| Vai trò | Light | Dark | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Brand 500** | `#f06000` | `#f06000` | Nhận diện thương hiệu cốt lõi |
| **Action** | `#bd4600` | `#ffad6b` | Nút hành động chính (tương phản AA trên nền sáng) |
| **Action text** | `#ffffff` | `#39200b` | Chữ trên nền nút hành động |
| **Surface** | `#ffffff` | `#141f30` | Nền thẻ, bảng dữ liệu, sheet |
| **Canvas** | `#f6f8fb` | `#0d1522` | Nền ứng dụng toàn cục |
| **Foreground** | `#00204d` | `#e8eef8` | Màu chữ chính |
| **Muted text** | `#52647d` | `#abbcd2` | Màu chữ phụ, chú thích |
| **Border** | `#dfe5ee` | `#2a3a51` | Viền ngăn cách |

### Lớp mở rộng Aurora:
- Utility kính: `bg-glass`, `border-glass-border`, `shadow-glass`, `backdrop-blur-glass`.
- Quầng sương tĩnh: `mist-warm`, `mist-violet`, `mist-cyan`.
- Gradient hành động: `action-gradient-start`, `action-gradient-end`.
- Bo góc & Mật độ: `rounded-card`, `rounded-control`, `rounded-panel`.
- Mật độ hiển thị:
  - **Comfortable (Thoáng):** Control 40px, hàng bảng 56px, panel padding 24px.
  - **Compact (Gọn):** Control 34px, hàng bảng 44px, panel padding 16px.

Lựa chọn theme và mật độ được lưu trong `localStorage`, đồng bộ tức thì trên toàn bộ ứng dụng.

---

## 4. Bố cục và Cấu trúc Trang Ứng dụng

- **Thanh Rail (68px):** Kính mờ dọc 5 phân hệ lớn (Tổng quan, Công việc, Nhân sự, Hệ thống, Thư viện). Phân hệ đang chọn có vạch chỉ báo gradient và `aria-current="page"`.
- **Panel Phân hệ (268px):** Danh sách các tính năng con của phân hệ, kèm bộ lọc trạng thái nhanh.
- **Vùng Nội dung Chính:**
  - Header trang: Tiêu đề, mô tả, nút tạo nhanh và dải chỉ số KPI (`metric-strip`).
  - Thanh công cụ (`toolbar`): Tìm kiếm, bộ lọc đa chiều, nút chuyển đổi view (Table / Kanban / Calendar).
  - Bảng dữ liệu (`table.tsx`): Header cố định, font số `tabular-nums`, phân trang và menu hành động trên từng hàng.
  - Chi tiết trượt (`detail-sheet.tsx`): Xem nhanh và cập nhật thông tin chi tiết mà không rời trang.
  - Hộp thoại tạo mới (`create-dialog.tsx`): Form nhập liệu có validation Zod và xử lý lỗi trực quan.

# Xác minh hệ thống OneOps

Tài liệu ghi nhận kết quả kiểm định chất lượng toàn diện và các cổng kiểm tra tự động của hệ thống OneOps.

---

## 1. Mốc xác minh toàn diện — 01/11/2026 (Thiết kế lại UX/UI v3 “Aurora Ops” & Tự động hóa)

Hoàn thiện chuyển đổi toàn bộ lớp giao diện sang ngôn ngữ Aurora Ops và nâng cấp động cơ tự động hóa theo sự kiện:
- **Hệ thống thiết kế (`tokens:check` & `test:tokens`):**
  - **233 design tokens** (125 primitive, 49 semantic, 56 component, 3 density) qua 10 tệp dẫn xuất; **5/5 test token đạt**, 7 cặp tương phản ≥4.5:1 trên cả hai theme Light/Dark.
  - Bộ lớp Aurora: `glass`, `glass-border`, `mist-warm/violet/cyan`, `aurora-from/via/to`, `prism-*`, `radius-card/widget`, `shadow-glass`, `blur-glass`, `bento-gap`.
- **Ranh giới phân hệ & Cấu trúc (`architecture:check`):**
  - **4 nhóm chính, 39 thư mục đối xứng FE/BE**.
  - **31 implementation dữ liệu hoàn chỉnh** (9 Record APIs, 22 Resource APIs).
  - **53 owned Prisma models** nạp trực tiếp qua junction `packages/database/prisma/schema/features`.
  - Các phần chưa triển khai (`crm`, `company-profile`, `external-integrations`, `ai-copilot`) tiếp tục được giữ trống sạch sẽ.
- **Phân tích mã nguồn mồ côi (`unused:check`):**
  - Toàn bộ **592 source files** đều có thể truy vết hợp lệ từ application entrypoints (100% reachability).
- **Trích xuất Sơ đồ Tri thức Kiến trúc (Graphify Engine):**
  - Trích xuất thành công mạng lưới **6.006 nodes**, **15.918 edges** và **202 communities**.
  - Bản đồ tương tác trực quan tại `graphify-out/graph.html` và báo cáo phân tích tại `graphify-out/GRAPH_REPORT.md`.
- **Kiểm tra tĩnh:**
  - `npm run typecheck`: 0 lỗi TypeScript trên toàn bộ monorepo.
  - `npm run lint`: 0 lỗi ESLint.
  - `npm run format:check`: Đạt chuẩn Prettier.
- **Kiểm thử tích hợp API (`test:api`):**
  - Các bộ test bao phủ toàn diện:
    1. Xác thực phiên trượt & bảo vệ route khách.
    2. Phân tách CRUD namespace của các resource.
    3. Sơ đồ tổ chức phòng ban phân cấp không xóa cứng.
    4. Chức danh ngạch bậc và chặn bậc không hợp lệ.
    5. Danh bạ hồ sơ nhân sự và tính duy nhất email.
    6. Tài khoản, quyền hạn và chặn xóa người quản trị cuối.
    7. Ma trận phân quyền RBAC và runtime context ABAC check.
    8. Nhật ký kiểm toán append-only bất biến.
    9. Xử lý trùng mã và xung đột phiên bản version (Optimistic Concurrency).
    10. Thẩm định schema Zod `.strict()` và chặn ghi đè status trực tiếp.
    11. Checklist công việc, bình luận riêng biệt và liên kết phụ thuộc.
    12. Phân trang, tìm kiếm và lọc dữ liệu.
    13. Động cơ quy tắc tự động hóa `workflow-rules` và chống lặp đệ quy.
    14. Tổng hợp dữ liệu bảng điều khiển Workspace Today.
    15. Sự kiện phát sinh thông báo đa kênh qua SSE.
    16. Máy trạng thái công việc hữu hạn (TR-02..TR-09).
    17. Đề xuất hoãn/hủy/gia hạn việc chờ quản lý khác duyệt.
    18. Mốc tiến độ và Cổng QA Gate chặn hoàn tất việc chưa đạt.
    19. Bảng chấm công tuần 15 phút và duyệt theo ngưỡng.
    20. Điểm danh hàng ngày, bảng quân số hiện diện và giải trình.
    21. Mẫu ca kíp, mẫu tuần hoàn và phân ca nhân sự.
    22. Kỳ chốt công, tổng hợp dòng công và khóa sổ bất biến.
    23. Đơn xin nghỉ phép, duyệt phép và tính toán công suất dự án.

---

## 2. Các mốc xác minh trước đó

### Mốc 31/10/2026 (Chiều) — Mở rộng toàn diện HR & Tenant Policies
- 29 chức năng dữ liệu hoàn chỉnh, 46 models Prisma.
- 196 semantic design tokens.
- Hoàn thiện 11/11 chức năng HR và chính sách làm việc `work-policies`.

### Mốc 31/10/2026 (Sáng) — Hoàn thiện Core Work & Access Control
- 20 implementation dữ liệu, 30 models, 540 source files.
- Bổ sung xác thực `tenant-auth`, tài khoản `accounts`, quyền `roles-permissions`, kiểm toán `checklog`, thông báo SSE `notifications`, `milestones-qa`, `timesheets`.

### Mốc 30/10/2026 — Rà soát ranh giới và chuẩn hóa 39 thư mục
- Chuyển đổi mã nguồn sang 4 main groups và 39 thư mục chức năng con đối xứng FE/BE.

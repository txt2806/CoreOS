# Hợp đồng triển khai OneOps — v2

Tài liệu này chốt các contract nền tảng cho mọi package trong hệ thống OneOps. Contract chỉ được thay đổi có chủ đích, kèm cập nhật tài liệu, checker và test; tuyệt đối không thay đổi cục bộ trong một feature.

---

## 1. Thứ tự ưu tiên nguồn

1. Chỉ dẫn hiện hành của người dùng và `AGENTS.md`.
2. Specification đã được duyệt trong `docs/specifications/`.
3. Tài liệu kiến trúc và kỹ thuật trong `docs/`.
4. Cấu trúc thư mục tại `Cau Truc Thu Muc (1).md` và `feature-structure.json`.

Khi nguồn có sự khác biệt, không tự ý chọn theo thói quen cá nhân. Ghi quyết định vào specification/ADR tương ứng và giữ code cũ cho đến khi có phê duyệt nếu thay đổi đó ảnh hưởng dữ liệu hoặc phân quyền.

---

## 2. Ranh giới sở hữu nghiệp vụ (Ownership Boundaries)

| Dữ liệu / Quyết định nghiệp vụ | Nơi sở hữu duy nhất |
| :--- | :--- |
| Vòng đời tài khoản, đổi mật khẩu, kích hoạt/tạm khóa | `tenant-system/access-control/accounts` |
| Quản lý phiên, đăng nhập/đăng xuất, actor context, sliding cookie | `tenant-system/access-control/tenant-auth` |
| Vai trò nền tảng, `is_system_admin`, permission catalog, `PermissionGuard` | `tenant-system/access-control/roles-permissions` |
| Hồ sơ nhân sự, chức danh (`job_title`), thông tin cá nhân | `hr-management/employees/employee-directory` |
| Ngạch bậc chuyên môn (Rank 1-99), vị trí công việc | `hr-management/organization/positions-grades` |
| Phòng ban (Department), Nhóm (Team), cơ cấu tổ chức hình cây | `hr-management/organization/departments-teams` |
| Chính sách làm việc, giờ lõi, IP văn phòng, ngày lễ, định mức phép | `tenant-system/organization/work-policies` |
| Nhật ký kiểm toán bất biến (append-only), lưu vết truy vết | `tenant-system/checklog` |
| Quy tắc tự động hóa theo sự kiện, động cơ luật AND, nhật ký chạy | `tenant-system/automation-hub/workflow-rules` |
| Thực thể công việc, người phụ trách, reviewer, deadline, checklist | `work-management/work/tasks` |
| Máy trạng thái công việc (TR-02…TR-09), đề xuất hoãn/hủy/gia hạn | `work-management/work/task-workflow` |
| Bình luận công việc, log trao đổi, đính kèm liên kết | `work-management/work/task-comments` |
| Đồ thị phụ thuộc công việc (blocks, blocked_by, relates_to, duplicates) | `work-management/work/task-links` |
| Giao diện Kanban kéo thả, ánh xạ trạng thái trực quan | `work-management/work/kanban` (View FE) |
| Không gian dự án, chu kỳ phát triển (Sprints), Backlog & Story Points | `work-management/projects/project-spaces` |
| Mốc tiến độ dự án, danh mục nghiệm thu và cổng QA Gate | `work-management/projects/milestones-qa` |
| Chấm công thời gian thực bước 15 phút, duyệt bảng chấm công | `work-management/projects/timesheets` |
| Điểm danh hàng ngày, giờ bấm vào/ra, vi phạm thời gian | `hr-management/attendance/daily-checkin` |
| Bảng quân số hiện diện tức thời theo phòng ban | `hr-management/attendance/workforce-board` |
| Đơn giải trình vi phạm điểm danh, quy trình duyệt của quản lý | `hr-management/attendance/checkin-explanations` |
| Thiết lập ca kíp, mẫu tuần hoàn và phân ca làm việc | `hr-management/attendance/shifts-schedules` |
| Tổng hợp công kỳ hạn và chốt sổ bảng công bất biến | `hr-management/attendance/attendance-reports` |
| Đơn xin nghỉ phép, kiểm tra hạn mức còn lại, bàn giao công việc | `hr-management/leaves/leave-requests` |
| Xét duyệt nghỉ phép đa cấp, chống tự duyệt | `hr-management/leaves/leave-approvals` |
| Quỹ giờ khả dụng nhân sự và phân bổ công suất dự án | `hr-management/employees/resource-capacity` |
| Trung tâm thông báo in-app thời gian thực (SSE), xóa mềm | `work-management/coordination/notifications` |
| Lịch sự kiện, cuộc họp và thời gian tập trung | `work-management/coordination/workspace-today/calendar` |
| Báo cáo và chỉ số tổng hợp công việc | `work-management/coordination/workspace-today/reports` |
| Phiếu đề xuất nội bộ và quy trình duyệt đa bước | `work-management/coordination/tickets-approvals` |
| Kênh trao đổi nội bộ theo chủ đề trong không gian làm việc | `work-management/coordination/internal-chat` |
| Kho tri thức và quy trình vận hành tiêu chuẩn (SOP) | `work-management/coordination/knowledge-sop` |
| Thương mại & CRM (tiền bán hàng, hợp đồng, chăm sóc sau bán) | `crm/*` theo các nhánh tương ứng (giai đoạn mở rộng) |

### Quy tắc bất biến:
- Leaf backend feature chỉ dùng repository và delegate Prisma do chính mình sở hữu.
- Leaf frontend feature chỉ import public `index.ts` của chính feature; các ngoại lệ duy nhất: Tasks nhúng Kanban, TaskComments và TaskLinks.
- Tích hợp liên module chỉ diễn ra ở tầng Composition Module (gọi public service, không truy cập repository hoặc database delegate của module khác).
- Liên kết dữ liệu giữa các phân hệ (Account/Employee, Task/Project) dùng scalar ID, không tạo Foreign Key xuyên multi-schema namespace.
- Tuyệt đối không trả entity Prisma thô qua API; DTO phải loại bỏ password_hash, token, secret.

---

## 3. Actor Context và Authorization Contract

Mọi request được xác thực phải phân giải thành `ActorContext`:

```ts
interface ActorContext {
  accountId: string;
  employeeId: string;
  role: "EMPLOYEE" | "MANAGER";
  isSystemAdmin: boolean;
  sessionId: string;
}
```

- Hệ thống chỉ có 2 Role: `EMPLOYEE` và `MANAGER`. Quản trị cấp cao là `role = MANAGER` đi kèm `isSystemAdmin = true`.
- Chức danh (`job_title`) tuyệt đối không tham gia vào điều kiện phân quyền API.
- Runtime Context Check: Mọi thao tác đều phải kiểm tra quan hệ dữ liệu tại thời điểm chạy:
  - Có phải Quản lý Team / Quản lý Dự án / Quản trị Department của thực thể không?
  - Có phải Assignee hoặc Reviewer của Task không?
  - Không ai được tự duyệt đơn từ hoặc đề xuất của chính mình (`BR-LV-05`).
  - Khi `isSystemAdmin` can thiệp ngoài phạm vi phụ trách, bắt buộc ghi audit log với `is_out_of_scope_override = true`.

---

## 4. HTTP và Idempotency Contract

- Global API Prefix: `/api/v1`.
- Danh sách phân trang: `{ items, total, page, pageSize }`.
- Chi tiết / Mutation: Trả về DTO của entity sau khi cập nhật thành công.
- Cấu trúc lỗi chuẩn hóa: `{ statusCode, error, message, fieldErrors?, timestamp, path }`.
- HTTP Status Codes:
  - `401 Unauthorized`: Chưa đăng nhập hoặc phiên hết hạn.
  - `403 Forbidden`: Không có quyền hoặc vi phạm ngữ cảnh (scope/actor check).
  - `404 Not Found`: Không tìm thấy bản ghi.
  - `409 Conflict`: Xung đột version (Optimistic Concurrency), chuyển trạng thái không hợp lệ, hoặc Idempotency conflict.
  - `422 Unprocessable Entity`: Dữ liệu vi phạm quy tắc nghiệp vụ.

### Kiểm soát phiên bản và chống gửi lặp:
- Mọi model nghiệp vụ duy trì trường `version: Int`. Khi cập nhật, tăng version và kiểm tra version cũ; nếu không khớp, trả về `409 Conflict`.
- Các mutation quan trọng (check-in, gửi đơn, chuyển trạng thái việc, kích hoạt Sprint) chấp nhận header `Idempotency-Key` (8–128 ký tự).

---

## 5. Event Bus và Động cơ Tự động hóa (`workflow-rules`)

- Sự kiện miền được phát tán qua `@nestjs/event-emitter` (`core/events/notification-events.ts`, `core/events/workflow-events.ts`).
- **Workflow Automation Bus:**
  - Khi một bản ghi (Task, Request, Checkin) thay đổi, hệ thống phát `WorkflowSnapshot` (`entity`, `id`, `code`, `name`, `status`, `assignee`, `reviewer`, `scope`, `date`, `previous`).
  - `tenant-system/automation-hub/workflow-rules`: Động cơ luật `rule-engine.ts` quét các quy tắc đang hoạt động, thẩm định điều kiện (AND logic), và kích hoạt hành động (`WorkflowAction`: assign, status, comment, notify).
  - Chống vòng lặp vô tận: Sử dụng cơ chế khóa `lockSeconds` trên từng `entityId`.
  - Nhật ký thực thi: Mỗi lượt xử lý đều lưu trạng thái `APPLIED`, `SKIPPED`, hoặc `FAILED` vào bảng `AutomationRun`.
  - Hỗ trợ mô phỏng: API `POST /api/v1/workflow-rules/simulate` cho phép kiểm tra quy tắc trên dữ liệu giả lập mà không làm thay đổi dữ liệu thật.

---

## 6. Migration và Quản lý Cơ sở dữ liệu

- Áp dụng triệt để chính sách **Zero Hard-Delete** cho dữ liệu nghiệp vụ: tài khoản bị khóa, phòng ban ngừng hoạt động, công việc bị hủy đều được lưu giữ để kiểm toán.
- Prisma multi-schema federation: 25+ schema namespaces tách biệt hoàn toàn trong PostgreSQL.
- Thư mục `packages/database/prisma/schema/features` đọc trực tiếp 53 models từ các thư mục `prisma/*.prisma` của từng backend feature.
- Cơ sở dữ liệu kiểm thử bắt buộc có tên kết thúc bằng `_test` để ngăn ngừa rủi ro dữ liệu môi trường phát triển.

---

## 7. Tiêu chuẩn Frontend và Giao diện (Aurora Ops)

- Áp dụng ngôn ngữ thiết kế **Aurora Ops**:
  - Gam màu chủ đạo: Cam thương hiệu `#f06000` kết hợp nền xanh đậm `#00204d`.
  - Hiệu ứng kính mờ (glassmorphism), nền sương tĩnh (aurora mist) và bố cục lưới bento.
  - 233 Design Tokens tự động sinh từ `tokens/source.json` qua `scripts/build-tokens.mjs`.
  - Hỗ trợ 2 themes (Light, Dark) và 2 chế độ mật độ hiển thị (Comfortable, Compact).
  - Tỷ lệ tương phản đạt chuẩn WCAG 2.1 AA (≥ 4.5:1 đối với văn bản thông thường).
- Kiến trúc thành phần Leaf Feature:
  - Từng feature tự quản lý `components/` gồm: `table.tsx`, `*-form.tsx`, `detail-sheet.tsx`, `create-dialog.tsx`, `primitives.tsx`.
  - Quản lý state và kết nối API bằng custom hooks (`hooks/use-*.ts`) và formatters (`format.ts`).
  - Không import chéo primitives giữa các feature.

---

## 8. Nhật ký bàn giao các mốc phát triển

### Mốc 01/11/2026: Tái cấu trúc UX/UI v3 "Aurora Ops", Workflow Rules & Task Links
- Triển khai hoàn chỉnh `workflow-rules`: Động cơ quy tắc tự động hóa theo sự kiện, rule engine, mô phỏng simulation, lưu vết `AutomationRun`.
- Triển khai `task-links`: Quản lý đồ thị phụ thuộc công việc (blocks, blocked_by, relates_to, duplicates).
- Tái cấu trúc toàn bộ 39 thư mục Frontend sang kiến trúc thành phần tinh gọn (`table.tsx`, `detail-sheet.tsx`, `create-dialog.tsx`, `primitives.tsx`), loại bỏ hoàn toàn các file mồ côi.
- Hệ thống Design Tokens nâng cấp lên 233 tokens đạt 100% kiểm định.
- Graphify tri thức hệ thống đạt 6.006 nodes, 15.918 edges, 202 communities.

### Mốc 31/10/2026: Hoàn thiện HR Management & Work Management Sprints
- Hoàn thiện 11/11 chức năng HR: điểm danh (`daily-checkin`), ca kíp (`shifts-schedules`), chốt công (`attendance-reports`), giải trình (`checkin-explanations`), quân số (`workforce-board`), nghỉ phép (`leave-requests`, `leave-approvals`), định biên (`resource-capacity`), phòng ban (`departments-teams`), ngạch bậc (`positions-grades`), danh bạ (`employee-directory`).
- Bổ sung quản lý Sprint (`ProjectSprint`) và Cổng QA Gate (`MilestoneItem`, `AcceptanceResult`).

### Mốc 30/10/2026: Access Control & Checklog Audit
- Triển khai phiên sliding-window `tenant-auth`, tài khoản `accounts`, ma trận phân quyền `roles-permissions`, chính sách làm việc `work-policies`, và nhật ký kiểm toán bất biến `checklog`.

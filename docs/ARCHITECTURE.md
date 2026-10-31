# Kiến trúc OneOps theo file cấu trúc

Dự án dùng **Next.js 16.4.3**, **NestJS 12.3.2**, **PostgreSQL 16+** và **Prisma 7.10.1**, tổ chức theo bốn miền nghiệp vụ chính: `tenant-system`, `work-management`, `hr-management`, `crm`. File `Cau Truc Thu Muc (1).md` tại root là chuẩn cấu trúc thư mục. Xem `FOLDER-MAPPING.md` để biết vị trí từng chức năng và phần còn trống.

```text
packages/database/
  prisma/schema/base.prisma      # DataSource PostgreSQL, generator và danh sách 25+ multi-schema namespaces
  prisma/schema/features         # Symlink/Junction tới model gốc dưới API features (53 models)
  prisma/migrations/             # Lịch sử các bản migration đã áp dụng (21 migrations)
  generated/                     # Prisma Client sinh tự động, không sửa trực tiếp
  index.ts                       # Public exports: PrismaClient, Prisma namespace và model types
apps/api/src/
  core/                          # Hạ tầng backend: database lifecycle, auth actor context, filters, pipes, notification events, workflow events
  features/                      # 4 module chính và 39 chức năng con
    tenant-system/               # 6/9 chức năng: xác thực phiên, tài khoản, vai trò/phân quyền, kiểm toán, chính sách giờ làm, động cơ quy tắc workflow
    hr-management/               # 11/11 chức năng: sơ đồ tổ chức, chức danh, hồ sơ, ca làm, điểm danh, giải trình, chốt công, nghỉ phép, định biên
    work-management/             # 14 chức năng: nhiệm vụ, workflow, bình luận, liên kết, dự án & sprint, mốc & QA Gate, timesheet, lịch, đề xuất, chat, SOP, thông báo SSE
    crm/                         # Khung module thương mại & quan hệ khách hàng (sẵn sàng mở rộng)
apps/web/src/
  app/                           # Next.js App Router (31 routes điều hướng trực tiếp dưới 4 miền; layout gốc giữ shell)
  core/                          # Shell, layout, context providers, Design System foundations
  icons/                         # Bộ biểu tượng SVG và Lucide tích hợp
  features/                      # Đối xứng 39 chức năng con với BE, tự sở hữu components, hooks, api, types, formatters
graphify-out/                    # Sơ đồ tương tác tri thức toàn hệ thống tự động sinh bởi Graphify
  graph.html                     # Bản đồ tri thức tương tác cộng đồng (6.006 nodes, 15.918 edges, 202 communities)
  graph.json                     # GraphRAG knowledge graph JSON
  GRAPH_REPORT.md                # Báo cáo phân tích cấu trúc cộng đồng hệ thống
  wiki/                          # Bài viết tài liệu hóa kiến trúc mã nguồn
```

---

## 1. Nguyên tắc sở hữu & Ranh giới phân hệ

1. **Độc lập tuyệt đối giữa các Leaf Feature:**
   - Từng feature tự sở hữu `components/`, `hooks/`, `api/`, `types.ts`, `constants.ts` ở FE và `<name>.controller.ts`, `<name>.service.ts`, `<name>.repository.ts`, `dto/`, `prisma/` ở BE.
   - Không có generic CRUD factory, base business repository hay package contracts dùng chung.
   - Các UI primitives được sở hữu cục bộ trong chính feature đó (`components/primitives.tsx`) nhằm bảo đảm tính độc lập hoàn toàn, không phụ thuộc xuyên suốt.

2. **Giao tiếp Frontend có chủ đích:**
   - Frontend feature tuyệt đối không import source hoặc primitives nội bộ của feature khác.
   - Các tích hợp công khai được cấp phép: `Tasks` nhúng `KanbanBoard` (`work/kanban`), `TaskComments` (`work/task-comments`) và `TaskLinks` (`work/task-links`) qua public `index.ts`, truyền dữ liệu/callback.
   - Shell và routing chỉ tích hợp thông qua public feature exports.

3. **Giao tiếp Backend & Tầng điều phối (Composition):**
   - Leaf backend feature chỉ truy cập delegate Prisma và model do chính mình sở hữu.
   - Tích hợp liên phân hệ nằm ở các Composition Service/Module thuộc tầng domain:
     - `work-management.composition.ts`: Điều phối giữa Task, Task Workflow, Comments, Task Links và QA Gate.
     - `hr-management.leaves.service.ts`: Điều phối giữa Đơn xin nghỉ phép, Phê duyệt nghỉ và trừ quỹ phép.
     - `hr-management.capacity.service.ts`: Điều phối giữa Quỹ giờ nhân sự và Phân bổ dự án.
     - `accounts-credentials.ts` & `permission-audit.ts`: Điều phối tài khoản, phân quyền và kiểm toán.
   - Tầng core chỉ chứa hạ tầng, không chứa nghiệp vụ. Root `AppModule` ghép `CoreModule` và đúng 4 main modules (`TenantSystemModule`, `HrManagementModule`, `WorkManagementModule`, `CrmModule`).

4. **Kiểm soát dữ liệu & Kiểu:**
   - DTO validation ở BE sử dụng Zod schema nghiêm ngặt (`.strict()`); transport types ở FE được định nghĩa riêng trong `types.ts`.
   - Frontend không import NestJS, Prisma, `@oneops/database` hoặc source code backend.
   - Backend chưa triển khai và frontend chưa triển khai được giữ trống hoàn toàn; không tạo stub hay mock endpoint giả mạo.

---

## 2. Cơ sở dữ liệu & Vận hành

1. **Multi-Schema PostgreSQL Federation:**
   - Mỗi chức năng sở hữu database schema riêng biệt:
     - `tenant-system`: `tenant_auth`, `tenant_accounts`, `tenant_permissions`, `tenant_checklog`, `tenant_policies`, `tenant_automation`.
     - `hr-management`: `hr_departments`, `hr_positions`, `hr_employees`, `hr_capacity`, `hr_attendance`, `hr_workforce`, `hr_checkin_explanations`, `hr_shifts`, `hr_attendance_reports`, `hr_leaves`, `hr_leave_approvals`.
     - `work-management`: `work_tasks`, `work_task_workflow`, `work_task_comments`, `work_task_links`, `work_milestones_qa`, `work_timesheets`, `work_calendar`, `work_requests`, `work_messages`, `work_notes`, `work_reports`, `work_notifications`, `work_dashboard`, `work_projects`.
   - Prisma đọc trực tiếp **53 models gốc** tại `apps/api/src/features/*/*/*/prisma/*.prisma` qua directory junction `packages/database/prisma/schema/features`.
   - Gói `@oneops/database` quản lý cấu hình, client và lịch sử migration (21 migrations).

2. **Tính toàn vẹn & Cơ chế an toàn:**
   - **Optimistic Concurrency Control:** Các model nghiệp vụ đều duy trì trường `version: Int` để ngăn chặn race conditions và xung đột ghi đè.
   - **Xóa mềm (Soft Delete) & Append-Only Log:** Dữ liệu thông báo (`work_notifications`), hồ sơ nhân sự và tổ chức áp dụng xóa mềm `deletedAt` để bảo toàn vết; dữ liệu nhật ký kiểm toán (`tenant_checklog`) là bất biến (không có lệnh UPDATE/DELETE).
   - **Chu kỳ kiểm thử:** API và E2E tests chỉ chạy trên database riêng có tên kết thúc bằng `_test` (ví dụ: `etctha_test`). Không áp dụng migration phá hủy hoặc reset dữ liệu để sửa drift.

3. **Động cơ Tự động hóa & Bus Sự kiện:**
   - `core/events/workflow-events.ts`: Định nghĩa bus sự kiện nghiệp vụ nội bộ `WorkflowSnapshot` và `WorkflowAction`.
   - `tenant-system/automation-hub/workflow-rules`: Động cơ quy tắc `rule-engine.ts` đánh giá biểu thức điều kiện AND, thực thi hành động tự động (giao việc, đổi trạng thái, ghi bình luận, thông báo) và có khóa `lockSeconds` chống vòng lặp đệ quy. Lịch sử lượt chạy được lưu trữ độc lập tại `AutomationRun`.

---

## 3. Hệ thống kiểm định & Trạng thái hiện tại

- **Boundary Check (`npm run architecture:check`):**
  - Xác minh 4 nhóm chính, 39 thư mục đối xứng FE/BE.
  - Kiểm tra tính hợp lệ của **31 implementation dữ liệu** (9 record APIs, 22 resource APIs) và **53 models** thuộc quyền sở hữu của các chức năng.
  - Chặn triệt để các vi phạm ranh giới, import nội bộ chéo hoặc cấu trúc ngoài quy chuẩn.
- **Unused Check (`npm run unused:check`):**
  - Quét toàn bộ đồ thị import từ các entrypoint ứng dụng. Xác nhận toàn bộ **592 source files** đều đang được sử dụng và liên kết hợp lệ.
- **Tokens Check (`npm run tokens:check`):**
  - Xác minh **233 design tokens** được ánh xạ nhất quán qua 10 tệp dẫn xuất theo ngôn ngữ thiết kế Aurora Ops (`#f06000` & `#00204d`).
- **Phân hệ hoàn thiện:**
  - `tenant-system`: 6/9 chức năng (`tenant-auth`, `accounts`, `roles-permissions`, `checklog`, `work-policies`, `workflow-rules`).
  - `hr-management`: 11/11 chức năng hoàn thiện đầy đủ 100%.
  - `work-management`: 14 chức năng hoàn thiện đầy đủ 100% (bao gồm Kanban, Task Links, Sprints, QA Gate).
- **Các phần tiếp tục để trống theo quy chuẩn:**
  - `company-profile` (chờ thiết kế hồ sơ doanh nghiệp).
  - `automation-hub` (`external-integrations`, `ai-copilot`).
  - Phân hệ `crm` (7 nhánh: tiền bán hàng, hợp đồng, chăm sóc khách hàng).

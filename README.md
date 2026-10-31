# OneOps — Nền Tảng Điều Hành & Quản Lý Doanh Nghiệp Hợp Nhất

> **OneOps** (One-stop Operations Management Platform) là hệ thống quản trị vận hành doanh nghiệp toàn diện, tích hợp chặt chẽ giữa **Quản trị hệ thống (Tenant System)**, **Quản lý nhân sự (HR Management)**, **Điều phối công việc & Dự án (Work Management)** và **Quản lý quan hệ khách hàng (CRM)** trên nền tảng kiến trúc Monorepo hiện đại, an toàn và có khả năng mở rộng cao.

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Ngăn xếp công nghệ (Tech Stack)](#2-ngăn-xếp-công-nghệ-tech-stack)
3. [Kiến trúc, Sơ đồ tương tác & Ranh giới phân hệ](#3-kiến-trúc-sơ-đồ-tương-tác--ranh-giới-phân-hệ)
4. [Danh mục 31 chức năng dữ liệu & 53 Models Prisma](#4-danh-mục-31-chức-năng-dữ-liệu--53-models-prisma)
5. [Quy tắc nghiệp vụ cốt lõi & Cơ chế an toàn](#5-quy-tắc-nghiệp-vụ-cốt-lõi--cơ-chế-an-toàn)
6. [Động cơ Tự động hóa & Bus sự kiện nghiệp vụ](#6-động-cơ-tự-động-hóa--bus-sự-kiện-nghiệp-vụ)
7. [Hướng dẫn cài đặt & Khởi động nhanh](#7-hướng-dẫn-cài-đặt--khởi-động-nhanh)
8. [Hướng dẫn sử dụng hệ thống (User Guide)](#8-hướng-dẫn-sử-dụng-hệ-thống-user-guide)
9. [Hệ thống Design Tokens & Giao diện Aurora Ops](#9-hệ-thống-design-tokens--giao-diện-aurora-ops)
10. [Bộ lệnh phát triển & Cổng kiểm tra chất lượng](#10-bộ-lệnh-phát-triển--cổng-kiểm-tra-chất-lượng)
11. [Quy tắc phát triển & Hướng dẫn phối hợp AI](#11-quy-tắc-phát-triển--hướng-dẫn-phối-hợp-ai)

---

## 1. Tổng quan hệ thống

OneOps được thiết kế nhằm giải quyết bài toán phân mảnh dữ liệu trong doanh nghiệp, quy tụ mọi luồng nghiệp vụ hàng ngày về một không gian làm việc số thống nhất:

- **Quản trị hệ thống & Chính sách vận hành (Tenant System - 6/9 chức năng):** Định danh tổ chức, phiên làm việc an toàn với sliding-window, phân quyền vai trò (RBAC) và runtime context (ABAC), quản lý tài khoản, chính sách giờ làm việc & whitelist IP văn phòng (`work-policies`), nhật ký kiểm toán bất biến (`checklog`), và động cơ quy tắc tự động hóa theo sự kiện (`workflow-rules`).
- **Quản trị nhân lực toàn diện (HR Management - 11/11 chức năng hoàn thiện 100%):** Sơ đồ tổ chức phòng ban phân cấp không chu trình (`departments-teams`), danh mục chức danh ngạch bậc (`positions-grades`), hồ sơ nhân sự (`employee-directory`), điểm danh hàng ngày (`daily-checkin`), giải trình vi phạm (`checkin-explanations`), bảng theo dõi quân số hiện diện (`workforce-board`), quản lý ca kíp tuần hoàn (`shifts-schedules`), chốt công kỳ hạn bất biến (`attendance-reports`), luồng xin & duyệt nghỉ phép (`leave-requests` & `leave-approvals`), và quản lý công suất định biên nhân sự (`resource-capacity`).
- **Không gian điều hành công việc & Dự án Agile (Work Management - 14 chức năng hoàn thiện 100%):** Bảng tổng quan cá nhân hóa ("Workspace Today"), lịch làm việc (`calendar`), quản lý công việc (`tasks`) với bảng Kanban trực quan (`kanban`), máy trạng thái công việc (TR-02…TR-09), luồng thảo luận riêng biệt (`task-comments`), đồ thị liên kết phụ thuộc công việc (`task-links`), quản trị dự án & chu kỳ Sprint Agile/Scrum (`project-spaces`), mốc tiến độ & cổng kiểm định chất lượng (`milestones-qa`), chấm công thời gian thực 15 phút (`timesheets`), hệ thống đề xuất & phê duyệt đa cấp (`tickets-approvals`), ghi chú SOP nội bộ (`knowledge-sop`), báo cáo chỉ số (`reports`), và trung tâm thông báo thời gian thực qua Server-Sent Events (`notifications`).
- **Khung mở rộng thương mại (CRM - 7 chức năng sẵn sàng mở rộng):** Cấu trúc phân hệ sẵn sàng cho quy trình tiền bán hàng (`presales`), hợp đồng thương mại (`commercial`) và chăm sóc khách hàng sau bán (`customer-success`).

---

## 2. Ngăn xếp công nghệ (Tech Stack)

| Tầng hệ thống | Công nghệ chủ đạo | Phiên bản & Đặc điểm |
| :--- | :--- | :--- |
| **Monorepo** | npm Workspaces / pnpm | Quản lý đồng bộ giữa `apps/*` và `packages/*` |
| **Frontend Web** | Next.js, React, Tailwind CSS | **Next.js 16.4.3** (App Router, React 19.3.1), Tailwind CSS v4.3.3, Lucide Icons, kiến trúc Leaf Feature Components |
| **Backend API** | NestJS, TypeScript, Node.js | **NestJS 12.3.2**, Node.js ≥ 22.12.0, Zod DTO Validation (`.strict()`), Server-Sent Events (SSE), Session sliding-window, Event Emitter |
| **Database & ORM** | PostgreSQL, Prisma ORM | **PostgreSQL 16+**, **Prisma 7.10.1** với multi-schema database federation (**53 models** trên 25+ schemas), Optimistic Concurrency Control (`version: Int`) |
| **Design System** | Aurora Ops Token Studio | **233 design tokens**, hỗ trợ Light/Dark themes, Comfortable/Compact density, WCAG AA tương phản ≥ 4.5:1 |
| **Sơ đồ tri thức** | Graphify Knowledge Graph | **6.006 nodes**, **15.918 edges**, **202 communities**, báo cáo cấu trúc cộng đồng tại `graphify-out/` |
| **Kiểm định mã nguồn**| Architecture, Reachability, Tokens | **31 data implementations**, **592 source files** 100% reachable, **233 tokens** kiểm định tự động |

---

## 3. Kiến trúc, Sơ đồ tương tác & Ranh giới phân hệ

Hệ thống tuân thủ nghiêm ngặt **Kiến trúc Lục giác (Hexagonal / Clean Architecture)** và nguyên tắc cô lập ranh giới chức năng (**Strict Feature Boundaries**).

```text
oneops/
├── apps/
│   ├── web/                           # Next.js 16 App Router (Port 3002 - 31 web routes)
│   │   └── src/
│   │       ├── app/                   # Route mỏng (render public feature components)
│   │       ├── core/                  # Shell điều hướng, Context providers, Layout, Theme
│   │       ├── icons/                 # Bộ biểu tượng SVG và Lucide tích hợp
│   │       └── features/              # 39 feature folders tự sở hữu UI/Hooks/API clients/Formatters
│   │           ├── tenant-system/     # Xác thực, tài khoản, phân quyền, checklog, chính sách, workflow rules
│   │           ├── hr-management/     # 11/11 modules nhân sự hoàn thiện
│   │           ├── work-management/   # 14 modules điều phối công việc & dự án
│   │           └── crm/               # Phân hệ CRM (khung mở rộng)
│   └── api/                           # NestJS 12 Backend API (Port 4000)
│       └── src/
│           ├── core/                  # Auth Guards, Exception filters, Event emitter bus, Prisma service
│           └── features/              # Feature modules tự sở hữu Controller/Service/Repo/Prisma
│               ├── tenant-system/     # 6/9 modules hoàn thiện
│               ├── hr-management/     # 11/11 modules hoàn thiện
│               ├── work-management/   # 14 modules hoàn thiện
│               └── crm/               # 7 modules khung mở rộng
├── packages/
│   └── database/                      # Prisma schema base, migrations và generated client (53 models)
├── graphify-out/                      # Tri thức kiến trúc hệ thống (Graphify Engine)
│   ├── graph.html                     # Bản đồ tri thức tương tác 3D (6.006 nodes, 15.918 edges, 202 communities)
│   ├── graph.json                     # GraphRAG JSON format
│   └── GRAPH_REPORT.md                # Báo cáo phân tích cấu trúc cộng đồng hệ thống
├── tokens/                            # Single source of truth cho design tokens (source.json)
└── scripts/                           # Bộ công cụ build tokens, check boundaries, dev server
```

### Nguyên tắc ranh giới bất biến (Immutable Invariants)

1. **Không import chéo giữa các Leaf Feature:** Mỗi feature tự định nghĩa UI, primitives, hook, HTTP client, types, DTO, service, repository và model Prisma của chính nó. Không tạo "shared business component", generic CRUD factory hay base repository dùng chung.
2. **Tích hợp liên phân hệ qua Composition Module:** Khi cần điều phối nghiệp vụ giữa các chức năng, sử dụng Composition Service ở tầng domain (ví dụ: `work-management.composition.ts`, `hr-management.leaves.service.ts`, `hr-management.capacity.service.ts`, `permission-audit.ts`), gọi thông qua public interfaces đã được kiểm soát.
3. **Chỉ Repository chạm Database:** Controller chỉ xử lý HTTP; Service chỉ xử lý nghiệp vụ thuần túy; duy nhất Repository được phép import `@oneops/database` và truy vấn database delegate.
4. **Không tạo file placeholder:** Các chức năng chưa làm phải được để trống hoàn toàn; không sinh API giả hoặc file rỗng để "làm đẹp" cây thư mục.

---

## 4. Danh mục 31 chức năng dữ liệu & 53 Models Prisma

Hệ thống OneOps hiện sở hữu **31 chức năng dữ liệu hoàn chỉnh** (9 Record APIs, 22 Resource APIs) với **53 models Prisma** được bảo vệ phân quyền và lưu trữ an toàn:

| STT | Phân hệ (Domain) | Tên chức năng | Đường dẫn Feature | Route Web | Schema Database | Models Prisma sở hữu |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `work-management` | **Tổng quan làm việc** | `coordination/workspace-today` | `/` (Home) | `work_dashboard` | `WorkspaceWidget` |
| 2 | `work-management` | **Công việc & Nhiệm vụ** | `work/tasks` | `/work-management/tasks` | `work_tasks` | `WorkTask` |
| 3 | `work-management` | **Luồng quy trình việc** | `work/task-workflow` | `/work-management/tasks` | `work_task_workflow` | `WorkTaskTransition`, `WorkTaskProposal` |
| 4 | `work-management` | **Thảo luận công việc** | `work/task-comments` | `/work-management/tasks` | `work_task_comments` | `WorkTaskComment` |
| 5 | `work-management` | **Liên kết phụ thuộc việc** | `work/task-links` | `/work-management/tasks` | `work_task_links` | `WorkTaskLink` |
| 6 | `work-management` | **Không gian dự án & Sprint** | `projects/project-spaces` | `/work-management/projects` | `work_projects` | `WorkProject`, `ProjectSprint`, `ProjectBacklogItem` |
| 7 | `work-management` | **Mốc tiến độ & Cổng QA Gate** | `projects/milestones-qa` | `/work-management/milestones` | `work_milestones_qa` | `Milestone`, `MilestoneItem`, `AcceptanceItem`, `AcceptanceResult` |
| 8 | `work-management` | **Chấm công thời gian thực** | `projects/timesheets` | `/work-management/timesheets` | `work_timesheets` | `TimesheetPeriod`, `TimeEntry`, `TimeEntryAdjustment` |
| 9 | `work-management` | **Lịch sự kiện** | `coordination/workspace-today/calendar` | `/work-management/calendar` | `work_calendar` | `WorkEvent` |
| 10 | `work-management` | **Đề xuất & Phê duyệt** | `coordination/tickets-approvals` | `/work-management/tickets-approvals` | `work_requests` | `WorkRequest`, `WorkRequestApprovalStep`, `WorkRequestApprover` |
| 11 | `work-management` | **Trao đổi nội bộ** | `coordination/internal-chat` | `/work-management/internal-chat` | `work_messages` | `WorkThread` |
| 12 | `work-management` | **Kho tri thức & SOP** | `coordination/knowledge-sop` | `/work-management/knowledge-sop` | `work_notes` | `WorkNote` |
| 13 | `work-management` | **Báo cáo công việc** | `coordination/workspace-today/reports` | `/work-management/reports` | `work_reports` | `WorkReport` |
| 14 | `work-management` | **Trung tâm thông báo SSE** | `coordination/notifications` | `/work-management/notifications` | `work_notifications` | `WorkNotification` |
| 15 | `hr-management` | **Phòng ban & Đội ngũ** | `organization/departments-teams` | `/hr-management/organization` | `hr_departments` | `Department`, `Team` |
| 16 | `hr-management` | **Chức danh & Ngạch bậc** | `organization/positions-grades` | `/hr-management/positions` | `hr_positions` | `Position`, `Grade` |
| 17 | `hr-management` | **Hồ sơ nhân sự** | `employees/employee-directory` | `/hr-management/employees` | `hr_employees` | `Employee` |
| 18 | `tenant-system` | **Quản lý tài khoản** | `access-control/accounts` | `/tenant-system/accounts` | `tenant_accounts` | `Account`, `AccountAccessChange` |
| 19 | `tenant-system` | **Xác thực phiên trượt** | `access-control/tenant-auth` | `/tenant-system/auth` | `tenant_auth` | `AuthSession` |
| 20 | `tenant-system` | **Vai trò & Quyền hạn** | `access-control/roles-permissions` | `/tenant-system/roles-permissions` | `tenant_permissions` | `RolePermission`, `PermissionChange` |
| 21 | `tenant-system` | **Nhật ký kiểm toán** | `checklog` | `/tenant-system/checklog` | `tenant_checklog` | `AuditEntry` |
| 22 | `tenant-system` | **Động cơ quy tắc tự động** | `automation-hub/workflow-rules` | `/tenant-system/workflow-rules` | `tenant_automation` | `AutomationRule`, `AutomationRun` |
| 23 | `tenant-system` | **Chính sách vận hành** | `organization/work-policies` | `/tenant-system/work-policies` | `tenant_policies` | `WorkPolicy`, `WorkHoliday`, `OfficeNetwork`, `LeaveQuota` |
| 24 | `hr-management` | **Điểm danh hàng ngày** | `attendance/daily-checkin` | `/hr-management/attendance` | `hr_attendance` | `AttendanceRecord` |
| 25 | `hr-management` | **Bảng quân số hiện diện** | `attendance/workforce-board` | `/hr-management/workforce` | `hr_workforce` | `WorkforcePresence` |
| 26 | `hr-management` | **Giải trình điểm danh** | `attendance/checkin-explanations` | `/hr-management/explanations` | `hr_checkin_explanations` | `CheckinExplanation` |
| 27 | `hr-management` | **Ca làm & Phân ca** | `attendance/shifts-schedules` | `/hr-management/shifts` | `hr_shifts` | `ShiftTemplate`, `SchedulePattern`, `ScheduleAssignment` |
| 28 | `hr-management` | **Báo cáo chấm công** | `attendance/attendance-reports` | `/hr-management/attendance-reports` | `hr_attendance_reports` | `AttendancePeriod`, `AttendancePeriodLine` |
| 29 | `hr-management` | **Đơn xin nghỉ phép** | `leaves/leave-requests` | `/hr-management/leaves` | `hr_leaves` | `LeaveRequest` |
| 30 | `hr-management` | **Xét duyệt nghỉ phép** | `leaves/leave-approvals` | `/hr-management/leave-approvals` | `hr_leave_approvals` | `LeaveDecision` |
| 31 | `hr-management` | **Công suất định biên** | `employees/resource-capacity` | `/hr-management/capacity` | `hr_capacity` | `CapacityPeriod`, `ProjectAllocation` |

---

## 5. Quy tắc nghiệp vụ cốt lõi & Cơ chế an toàn

### 5.1. Khởi tạo Quản trị viên đầu tiên (First Admin Bootstrap)

- Khi cơ sở dữ liệu mới khởi tạo chưa có tài khoản (`needsSetup: true`), hệ thống tự động mở màn hình khởi tạo tài khoản Quản trị viên đầu tiên tại `/tenant-system/auth`.
- Ngay sau khi tài khoản đầu tiên được tạo, cờ `needsSetup` khóa vĩnh viễn, ngăn chặn mọi nỗ lực tạo tài khoản trái phép.

### 5.2. Quản lý phiên trượt & Kiểm soát truy cập (Sliding Window Session & RBAC)

- **Sliding Window:** Phiên đăng nhập có thời hạn mặc định 30 phút và tự động trượt gia hạn khi có tương tác mới của người dùng.
- **Strict RBAC + ABAC:** Hệ thống chỉ có 2 vai trò cơ sở trong DB: `EMPLOYEE` và `MANAGER`. Quản trị cấp cao là tài khoản `role = MANAGER` kèm cờ `is_system_admin = true`. Mọi API bắt buộc kiểm tra quan hệ runtime giữa actor và thực thể (assignee, reviewer, manager của team/project).

### 5.3. Không xóa cứng dữ liệu nghiệp vụ (Zero Hard-Delete Policy)

- Tài khoản bị khóa, phòng ban ngừng hoạt động, công việc bị hủy đều được lưu giữ để phục vụ kiểm toán và tính toàn vẹn dữ liệu.
- Xóa mềm (`deletedAt`) áp dụng cho các thông báo in-app và hồ sơ nhân sự; nhật ký kiểm toán (`checklog`) là bất biến (Append-Only).

### 5.4. Máy trạng thái công việc (Task State Machine: TR-02 → TR-09)

```text
[TODO / Draft] ──> [IN_PROGRESS] ──> [PENDING_REVIEW] ──> [COMPLETED]
       │                  │                  │
       └──> [CANCELLED]   └──> [ON_HOLD] <───┘
```

- Không thể chuyển sang `COMPLETED` nếu các tiêu chí kiểm định (QA Gate) chưa được nghiệm thu đạt chuẩn.
- Các hành động hoãn, hủy hoặc gia hạn deadline vượt quyền hạn sẽ tạo `WorkTaskProposal` chờ Quản lý độc lập phê duyệt.

### 5.5. Đồ thị liên kết công việc (Task Links)

- Quản lý các mối quan hệ: `BLOCKS`, `BLOCKED_BY`, `RELATES_TO`, `DUPLICATES`.
- Chặn tự động: Công việc bị chặn bởi một task chưa hoàn thành sẽ không thể chuyển sang `IN_PROGRESS` trừ khi có ghi đè từ Quản lý kèm lý do rõ ràng.

### 5.6. Chu kỳ phát triển Agile/Scrum & Cổng QA Gate

- **Sprints:** Mỗi dự án chỉ có tối đa 01 Active Sprint tại một thời điểm. Backlog items được gán Story Points theo dãy Fibonacci.
- **QA Gate:** Thiết lập các tiêu chí nghiệm thu bắt buộc (`AcceptanceItem`). Kết quả nghiệm thu (`AcceptanceResult`) phải đạt chuẩn trước khi đóng mốc tiến độ (Milestone).

---

## 6. Động cơ Tự động hóa & Bus sự kiện nghiệp vụ

Phân hệ `workflow-rules` cung cấp khả năng tự động hóa nghiệp vụ theo thời gian thực:

- **Bus sự kiện nội bộ (`core/events/workflow-events.ts`):** Các thay đổi nghiệp vụ công bố `WorkflowSnapshot` qua Event Emitter.
- **Động cơ luật (`rule-engine.ts`):** Đánh giá các điều kiện kết hợp bằng AND (ví dụ: Task thuộc dự án X, trạng thái chuyển sang PENDING_REVIEW, độ ưu tiên URGENT).
- **Hành động tự động (`WorkflowAction`):**
  - Tự động gán người phụ trách (`assign`).
  - Chuyển trạng thái công việc theo đúng cạnh chuyển tiếp hợp lệ (`status`).
  - Ghi bình luận hệ thống tự động (`comment`).
  - Phát thông báo tức thời tới các bên liên quan (`notify`).
- **Khóa chống lặp vô tận:** Sử dụng tham số `lockSeconds` trên từng `entityId` để ngăn chặn các quy tắc kích hoạt đệ quy.
- **Lưu vết thực thi:** Mọi lượt chạy đều được ghi nhận vào `AutomationRun` với trạng thái `APPLIED`, `SKIPPED`, hoặc `FAILED`.

---

## 7. Hướng dẫn cài đặt & Khởi động nhanh

### 7.1. Yêu cầu môi trường

- **Node.js:** Phiên bản `>= 22.12.0` (Khuyến nghị Node.js v24.x LTS).
- **npm / pnpm:** Phiên bản `>= 10.x`.
- **PostgreSQL:** Phiên bản `16+` đang hoạt động cục bộ.

### 7.2. Các bước cài đặt chi tiết

#### Bước 1: Cài đặt dependencies

```sh
# Cài đặt toàn bộ dependencies trong monorepo
npm ci
```

#### Bước 2: Cấu hình biến môi trường

```sh
# Cấu hình Backend
cp apps/api/.env.example apps/api/.env

# Cấu hình Frontend
cp apps/web/.env.example apps/web/.env.local
```

Cập nhật chuỗi kết nối PostgreSQL trong `apps/api/.env`:

```env
PORT=4000
HOST=127.0.0.1
DATABASE_URL="postgresql://<db_user>:<db_password>@127.0.0.1:5432/<db_name>?schema=public"
```

#### Bước 3: Chuẩn bị môi trường phát triển & sinh Tokens

```sh
npm run prepare:dev
```

#### Bước 4: Thực thi Migration cơ sở dữ liệu

```sh
npm run db:migrate
```

#### Bước 5: Khởi động Dev Server

```sh
npm run dev
```

Hệ thống sẽ đồng thời khởi động:
- **Web Frontend:** [http://localhost:3002](http://localhost:3002)
- **Backend API:** [http://127.0.0.1:4000/api/v1](http://127.0.0.1:4000/api/v1)

---

## 8. Hướng dẫn sử dụng hệ thống (User Guide)

Hệ thống OneOps được tổ chức thành **31 route giao diện** trực quan:

### 8.1. Bắt đầu phiên & Điều hướng toàn cục

- **Đăng nhập:** Truy cập `/tenant-system/auth`. Phiên trượt duy trì 30 phút.
- **Thanh Rail (68px):** Truy cập nhanh 5 phân hệ lớn: Tổng quan, Công việc, Nhân sự, Hệ thống, Thư viện Design System.
- **Panel Phân hệ (268px):** Liệt kê các chức năng con của phân hệ kèm bộ lọc nhanh.
- **Tạo nhanh toàn cục (+):** Nút dấu cộng trên Header cho phép tạo nhanh Task, Project, Event, Leave Request hoặc Employee từ bất kỳ trang nào.

### 8.2. Phân hệ Quản lý Nhân sự (HR Management - 11 Modules)

- **Sơ đồ tổ chức (`/hr-management/organization`):** Quản lý cây phòng ban, bổ nhiệm trưởng phòng.
- **Chức danh & Ngạch bậc (`/hr-management/positions`):** Danh mục vị trí và cấp bậc Rank 1-99.
- **Hồ sơ nhân sự (`/hr-management/employees`):** Danh bạ nhân viên, mã nhân sự, liên kết tài khoản.
- **Điểm danh hàng ngày (`/hr-management/attendance`):** Bấm giờ Check-in/Check-out, ghi nhận IP, cảnh báo vi phạm.
- **Bảng quân số hiện diện (`/hr-management/workforce`):** Theo dõi tức thời tỷ lệ có mặt, remote, nghỉ phép theo phòng ban.
- **Giải trình điểm danh (`/hr-management/explanations`):** Gửi và xét duyệt đơn giải trình vi phạm.
- **Ca làm & Phân ca (`/hr-management/shifts`):** Thiết lập ca kíp, mẫu tuần hoàn và phân ca nhân sự.
- **Báo cáo chấm công (`/hr-management/attendance-reports`):** Tổng hợp công kỳ hạn và chốt sổ bất biến.
- **Đơn xin nghỉ phép (`/hr-management/leaves`):** Đăng ký nghỉ, kiểm tra quỹ phép, bàn giao công việc.
- **Xét duyệt nghỉ phép (`/hr-management/leave-approvals`):** Phê duyệt đa cấp, chống tự duyệt.
- **Công suất & Định biên (`/hr-management/capacity`):** Quỹ giờ khả dụng và phân bổ giờ làm vào các dự án.

### 8.3. Phân hệ Điều phối Công việc (Work Management - 14 Modules)

- **Workspace Today (`/`):** Bảng điều khiển tổng hợp nhịp độ làm việc, việc cần làm, sự kiện trong ngày.
- **Quản lý Công việc & Kanban (`/work-management/tasks` & `/work-management/kanban`):** Quản lý danh sách công việc, checklist, chuyển trạng thái kéo thả Kanban, luồng bình luận và đồ thị liên kết task.
- **Dự án & Sprints (`/work-management/projects`):** Quản trị dự án, Backlog, Story Points và chu kỳ Sprint Agile.
- **Mốc tiến độ & QA Gate (`/work-management/milestones`):** Quản lý mốc bàn giao và kiểm định chất lượng bắt buộc.
- **Chấm công thời gian thực (`/work-management/timesheets`):** Bảng công tuần 15 phút, nộp và duyệt công.
- **Lịch sự kiện (`/work-management/calendar`):** Lịch công tác, cuộc họp, thời gian tập trung.
- **Đề xuất & Phê duyệt (`/work-management/tickets-approvals`):** Phiếu yêu cầu nội bộ và quy trình duyệt đa cấp.
- **Trao đổi nội bộ (`/work-management/internal-chat`):** Kênh thảo luận theo chủ đề trong không gian làm việc.
- **Kho tri thức SOP (`/work-management/knowledge-sop`):** Soạn thảo và tra cứu quy trình vận hành chuẩn.
- **Báo cáo tổng hợp (`/work-management/reports`):** Chỉ số tiến độ và năng suất công việc.
- **Trung tâm thông báo (`/work-management/notifications`):** Thông báo đẩy thời gian thực qua Server-Sent Events.

### 8.4. Phân hệ Quản trị Hệ thống (Tenant System - 6 Modules)

- **Chính sách làm việc (`/tenant-system/work-policies`):** Quy chuẩn giờ làm, giờ lõi, whitelist IP, ngày lễ, định mức phép.
- **Quản lý tài khoản (`/tenant-system/accounts`):** Cấp tài khoản, đổi mật khẩu, kích hoạt/tạm khóa.
- **Vai trò & Quyền hạn (`/tenant-system/roles-permissions`):** Thiết lập ma trận quyền RBAC chi tiết.
- **Động cơ quy tắc tự động (`/tenant-system/workflow-rules`):** Thiết lập quy tắc tự động hóa theo sự kiện, chạy thử mô phỏng.
- **Nhật ký kiểm toán (`/tenant-system/checklog`):** Tra cứu lịch sử thao tác bất biến dạng Append-Only.

---

## 9. Hệ thống Design Tokens & Giao diện Aurora Ops

OneOps sử dụng hệ thống thiết kế đồng nhất dựa trên **233 design tokens**, được định nghĩa duy nhất tại `tokens/source.json`:

- **Thư viện mẫu UI:** Xem trực tiếp tại [http://localhost:3002/design-system](http://localhost:3002/design-system)
- **Token Studio trực quan:** Xem trực tiếp tại [http://localhost:3002/design-tokens](http://localhost:3002/design-tokens)

```text
tokens/
├── source.json              # NGUỒN DUY NHẤT: Bảng 233 tokens gốc
├── README.md                # Tài liệu chi tiết về 3 lớp token & 4 cấu hình
└── generated/               # Các file sinh tự động qua scripts/build-tokens.mjs
    ├── tokens.css           # Biến CSS nạp tại root layout
    ├── tokens.d.ts          # Định nghĩa kiểu TypeScript
    └── tokens.json          # Mapping JSON cho công cụ build
```

---

## 10. Bộ lệnh phát triển & Cổng kiểm tra chất lượng

### 10.1. Các lệnh phát triển hàng ngày

| Lệnh | Chức năng |
| :--- | :--- |
| `npm run dev` | Khởi chạy toàn bộ hệ thống (Web + API) ở chế độ phát triển |
| `npm run dev:web` | Khởi chạy riêng ứng dụng Next.js frontend (Port 3002) |
| `npm run dev:api` | Khởi chạy riêng dịch vụ NestJS backend (Port 4000) |
| `npm run prepare:dev` | Chuẩn bị thư mục feature, build tokens và generate Prisma |
| `npm run db:generate` | Biên dịch lại Prisma client và build gói database |
| `npm run db:migrate` | Áp dụng các migration Prisma có sẵn lên database dev |
| `npm run tokens:build` | Biên dịch lại 233 design tokens sang CSS và TypeScript |
| `npm run format` | Tự động định dạng code bằng Prettier cho toàn bộ repo |

### 10.2. Cổng kiểm tra chất lượng trước khi bàn giao (Quality Gates)

Trước khi commit mã nguồn hoặc tạo Pull Request, bắt buộc phải vượt qua toàn bộ các cổng kiểm định sau:

```sh
# 1. Kiểm tra ranh giới kiến trúc & cấu trúc 4 phân hệ (31 data implementations, 53 models)
npm run architecture:check

# 2. Quét mã nguồn mồ côi (toàn bộ 592 source files reachable 100%)
npm run unused:check

# 3. Thẩm định tính nguyên vẹn của 233 Design Tokens
npm run tokens:check

# 4. Kiểm tra kiểu dữ liệu tĩnh toàn bộ monorepo (0 errors)
npm run typecheck

# 5. Kiểm tra quy chuẩn mã nguồn bằng ESLint (0 errors)
npm run lint

# 6. Kiểm tra chuẩn định dạng Prettier
npm run format:check

# 7. Kiểm thử tích hợp toàn bộ API nghiệp vụ
npm run test:api

# 8. Biên dịch production build cho cả Web và API
npm run build
```

---

## 11. Quy tắc phát triển & Hướng dẫn phối hợp AI

> Chi tiết quy định toàn diện xem tại: [AGENTS.md](AGENTS.md).

Khi làm việc độc lập hoặc phối hợp với các trợ lý AI phát triển hệ thống:

1. **Phạm vi hẹp & tập trung:** Chỉ sửa đổi mã nguồn bên trong đường dẫn chức năng được giao (`<feature-path>`). Tuyệt đối không format hoặc sửa đổi mã nguồn ngoài phạm vi được chỉ định.
2. **Component tự sở hữu (Leaf Feature Architecture):** Thành phần UI phải nằm trong thư mục `components/` của chính chức năng đó (`table.tsx`, `*-form.tsx`, `detail-sheet.tsx`, `create-dialog.tsx`, `primitives.tsx`). Không tạo barrel UI monolithic dùng chung.
3. **Tuân thủ Design Tokens:** Luôn sử dụng Tailwind utilities ngữ nghĩa (`bg-surface`, `text-foreground`, `border-border`, `rounded-control`, `bg-glass`). Không hardcode mã màu hex/RGB, không override CSS toàn cục.
4. **Không xóa cứng dữ liệu:** Mọi dữ liệu liên quan đến lịch sử kiểm toán, thông báo hoặc nghiệp vụ người dùng phải áp dụng cơ chế xóa mềm (`deletedAt`) hoặc append-only log.
5. **Đảm bảo tính trung thực:** Không nuốt lỗi (silent fail), không trả dữ liệu mẫu/mock data giả mạo trên môi trường production, và giữ nguyên tính xác thực phân quyền của hệ thống.

---

## Bản quyền & Đóng góp

Hệ thống được phát triển bởi đội ngũ kỹ thuật **OneOps**. Mọi quyền được bảo lưu. Để biết thêm thông tin chi tiết về tài liệu kỹ thuật, vui lòng tham khảo thư mục [docs/](docs/ARCHITECTURE.md) và sơ đồ tương tác tri thức tại [graphify-out/graph.html](graphify-out/graph.html).

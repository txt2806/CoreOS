# Cấu trúc thư mục hiện tại — OneOps

Cập nhật theo mã nguồn thực tế: **4 module chính, 39 chức năng con đối xứng FE/BE**, với **31 chức năng dữ liệu hoàn chỉnh** (9 Record APIs, 22 Resource APIs) và **53 models** Prisma thuộc quyền sở hữu riêng của từng chức năng. Toàn bộ **592 source files** đều được kết nối và xác minh hợp lệ.

- `[trống]`: chỉ có thư mục cấu trúc chuẩn; chưa tạo implementation, API hoặc trang giả.
- `[đã triển khai đầy đủ]`: có đầy đủ mã nguồn FE/BE, Controller, Service, Repository, DTO và Model Prisma.
- `[view FE]`: component hiển thị chuyên biệt phía client, tương tác qua public interface của module sở hữu dữ liệu.
- Cây rút gọn phần lặp trong từng chức năng; không liệt kê nội dung dependency, cache và đầu ra biên dịch.

```text
OneOps/
├── apps/                                                                            # Các ứng dụng chạy của hệ thống
│   ├── api/                                                                         # Backend NestJS 12 (Port 4000)
│   │   ├── src/                                                                     # Mã nguồn backend
│   │   │   ├── core/                                                                # Hạ tầng backend; không chứa nghiệp vụ
│   │   │   │   ├── auth/                                                            # Actor context hạ tầng xác thực (actor-context.ts)
│   │   │   │   ├── database/                                                        # Kết nối và vòng đời Prisma/PostgreSQL (database.module.ts, prisma.service.ts)
│   │   │   │   ├── events/                                                          # Hạ tầng phát sự kiện nội bộ (notification-events.ts, workflow-events.ts)
│   │   │   │   ├── filters/                                                         # Chuẩn hóa lỗi HTTP (errors.filter.ts)
│   │   │   │   ├── pipes/                                                           # Kiểm tra và biến đổi đầu vào Zod (validation.pipe.ts)
│   │   │   │   └── core.module.ts
│   │   │   ├── features/                                                            # 4 module chính và các chức năng con
│   │   │   │   ├── crm/                                                             # Khách hàng, bán hàng và hậu mãi (khung module)
│   │   │   │   │   ├── commercial/                                                  # Báo giá và hợp đồng [trống]
│   │   │   │   │   │   ├── contracts/                                               # [trống]
│   │   │   │   │   │   └── quotations-sow/                                          # [trống]
│   │   │   │   │   ├── customer-success/                                            # Chăm sóc và sau bán [trống]
│   │   │   │   │   │   ├── after-sales/                                             # [trống]
│   │   │   │   │   │   ├── customer-portal/                                         # [trống]
│   │   │   │   │   │   └── receivables/                                             # [trống]
│   │   │   │   │   ├── presales/                                                    # Tiền bán hàng [trống]
│   │   │   │   │   │   ├── discovery-briefs/                                        # [trống]
│   │   │   │   │   │   └── leads-customers/                                         # [trống]
│   │   │   │   │   ├── crm.module.ts                                                # Composition container
│   │   │   │   │   └── index.ts                                                     # Public exports
│   │   │   │   ├── hr-management/                                                   # Quản lý nhân sự và tổ chức (11/11 hoàn thiện)
│   │   │   │   │   ├── attendance/                                                  # Chấm công & Điểm danh
│   │   │   │   │   │   ├── attendance-reports/                                      # Báo cáo chấm công & kỳ chốt công [đã triển khai đầy đủ]
│   │   │   │   │   │   ├── checkin-explanations/                                    # Đơn giải trình vi phạm [đã triển khai đầy đủ]
│   │   │   │   │   │   ├── daily-checkin/                                           # Điểm danh bấm giờ vào/ra [đã triển khai đầy đủ]
│   │   │   │   │   │   ├── shifts-schedules/                                        # Ca làm và phân ca nhân sự [đã triển khai đầy đủ]
│   │   │   │   │   │   └── workforce-board/                                         # Bảng theo dõi quân số hiện diện [đã triển khai đầy đủ]
│   │   │   │   │   ├── employees/                                                   # Hồ sơ nhân viên và công suất
│   │   │   │   │   │   ├── employee-directory/                                      # Danh bạ & hồ sơ nhân sự [đã triển khai đầy đủ]
│   │   │   │   │   │   └── resource-capacity/                                       # Định biên & Quỹ giờ dự án [đã triển khai đầy đủ]
│   │   │   │   │   ├── leaves/                                                      # Quản lý nghỉ phép
│   │   │   │   │   │   ├── leave-approvals/                                         # Xét duyệt đơn nghỉ phép [đã triển khai đầy đủ]
│   │   │   │   │   │   └── leave-requests/                                          # Đơn xin nghỉ phép [đã triển khai đầy đủ]
│   │   │   │   │   ├── organization/                                                # Cơ cấu phòng ban và chức danh
│   │   │   │   │   │   ├── departments-teams/                                       # Quản lý sơ đồ phòng ban hình cây [đã triển khai đầy đủ]
│   │   │   │   │   │   └── positions-grades/                                        # Chức danh và ngạch bậc [đã triển khai đầy đủ]
│   │   │   │   │   ├── hr-management.capacity.controller.ts                         # Capacity composition controller
│   │   │   │   │   ├── hr-management.capacity.service.ts                            # Capacity composition service
│   │   │   │   │   ├── hr-management.capacity.module.ts                             # Capacity composition module
│   │   │   │   │   ├── hr-management.leaves.controller.ts                           # Leaves composition controller
│   │   │   │   │   ├── hr-management.leaves.service.ts                              # Leaves composition service
│   │   │   │   │   ├── hr-management.leaves.module.ts                               # Leaves composition module
│   │   │   │   │   ├── hr-management.module.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── tenant-system/                                                   # Quản trị hệ thống, tài khoản và kiểm toán (6/9 hoàn thiện)
│   │   │   │   │   ├── access-control/                                              # Quản lý truy cập và xác thực
│   │   │   │   │   │   ├── accounts/                                                # Vòng đời tài khoản [đã triển khai đầy đủ]
│   │   │   │   │   │   ├── roles-permissions/                                       # Vai trò, quyền hạn & PermissionGuard [đã triển khai đầy đủ]
│   │   │   │   │   │   └── tenant-auth/                                             # Phiên trượt, First Admin & SessionGuard [đã triển khai đầy đủ]
│   │   │   │   │   ├── automation-hub/                                              # Tự động hóa và tích hợp ngoài
│   │   │   │   │   │   ├── ai-copilot/                                              # [trống]
│   │   │   │   │   │   ├── external-integrations/                                   # [trống]
│   │   │   │   │   │   └── workflow-rules/                                          # Động cơ quy tắc tự động hóa theo sự kiện [đã triển khai đầy đủ]
│   │   │   │   │   ├── checklog/                                                    # Nhật ký kiểm toán bất biến append-only [đã triển khai đầy đủ]
│   │   │   │   │   ├── organization/                                                # Thông tin và chính sách vận hành
│   │   │   │   │   │   ├── company-profile/                                         # Hồ sơ doanh nghiệp [trống]
│   │   │   │   │   │   └── work-policies/                                           # Chính sách giờ làm, IP văn phòng & ngày nghỉ [đã triển khai đầy đủ]
│   │   │   │   │   ├── accounts-credentials.ts                                      # Composition bridge tài khoản
│   │   │   │   │   ├── permission-audit.ts                                          # Composition bridge kiểm toán
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── tenant-system.module.ts
│   │   │   │   └── work-management/                                                 # Điều phối công việc, dự án và cộng tác (14/12 hoàn thiện)
│   │   │   │       ├── coordination/                                                # Điều phối và không gian làm việc
│   │   │   │       │   ├── internal-chat/                                           # Kênh trao đổi nội bộ theo chủ đề [đã triển khai đầy đủ]
│   │   │   │       │   ├── knowledge-sop/                                           # Kho tri thức và SOP quy trình [đã triển khai đầy đủ]
│   │   │   │       │   ├── notifications/                                           # Trung tâm thông báo SSE & Soft Delete [đã triển khai đầy đủ]
│   │   │   │       │   ├── tickets-approvals/                                       # Phiếu yêu cầu & phê duyệt [đã triển khai đầy đủ]
│   │   │   │       │   └── workspace-today/                                         # Tổng quan hôm nay, lịch & báo cáo [đã triển khai đầy đủ]
│   │   │   │       │       ├── calendar/                                            # Lịch sự kiện [đã triển khai đầy đủ]
│   │   │   │       │       └── reports/                                             # Báo cáo chỉ số [đã triển khai đầy đủ]
│   │   │   │       ├── projects/                                                    # Dự án, mốc tiến độ và chấm công
│   │   │   │       │   ├── milestones-qa/                                           # Mốc tiến độ & Cổng QA Gate / Acceptance [đã triển khai đầy đủ]
│   │   │   │       │   ├── project-spaces/                                          # Quản trị dự án & Quản lý Sprint [đã triển khai đầy đủ]
│   │   │   │       │   └── timesheets/                                              # Chấm công thời gian thực 15 phút [đã triển khai đầy đủ]
│   │   │   │       ├── work/                                                        # Thực thi công việc hằng ngày
│   │   │   │       │   ├── kanban/                                                  # View Kanban tích hợp workflow [view FE]
│   │   │   │       │   ├── task-comments/                                           # Bình luận trao đổi & liên kết [đã triển khai đầy đủ]
│   │   │   │       │   ├── task-links/                                              # Liên kết phụ thuộc công việc (blocks, relates) [đã triển khai đầy đủ]
│   │   │   │       │   ├── task-workflow/                                           # Máy trạng thái TR-02…TR-09 [đã triển khai đầy đủ]
│   │   │   │       │   └── tasks/                                                   # Nhiệm vụ, checklist, phân công [đã triển khai đầy đủ]
│   │   │   │       ├── work-management.composition.ts                               # Domain composition điều phối liên chức năng
│   │   │   │       ├── work-management.insights.module.ts                           # Tổng hợp chỉ số
│   │   │   │       ├── work-management.module.ts
│   │   │   │       └── index.ts
│   │   │   ├── app.module.ts                                                        # Ghép CoreModule và 4 main modules
│   │   │   ├── bootstrap.ts                                                         # Khởi tạo Nest, prefix API và filters
│   │   │   └── main.ts
│   └── web/                                                                         # Frontend Next.js 16 (Port 3002)
│       └── src/
│           ├── app/                                                                 # App Router (31 routes điều hướng)
│           │   ├── (auth)/                                                          # Nhóm trang đăng nhập và xác thực
│           │   ├── crm/                                                             # Routes CRM (khung giao diện mở rộng)
│           │   ├── design-system/                                                   # Showcase UI Design System
│           │   ├── design-tokens/                                                   # Token Studio trực quan
│           │   ├── hr-management/                                                   # 11 routes quản lý nhân sự
│           │   ├── tenant-system/                                                   # 6 routes quản trị hệ thống
│           │   ├── work-management/                                                 # 11 routes quản lý công việc & dự án
│           │   ├── layout.tsx                                                       # Root layout nạp Aurora theme, CSS variables và AppShell
│           │   ├── not-found.tsx                                                    # Trang 404 tùy biến
│           │   └── page.tsx                                                         # Trang chủ / Dashboard chính
│           ├── core/                                                                # Hạ tầng web chung
│           │   ├── config/                                                          # Cấu hình môi trường và client
│           │   ├── context/                                                         # React context quản trị phiên
│           │   ├── layout/                                                          # AppShell, Sidebar, Header, Breadcrumb
│           │   ├── lib/                                                             # Utility dùng chung
│           │   └── ui/                                                              # Token-driven style variables & foundations
│           ├── icons/                                                               # Bộ icon SVG và Lucide tích hợp
│           └── features/                                                            # 39 feature folders đối xứng BE
│               ├── hr-management/                                                   # 11 thư mục chức năng nhân sự
│               ├── tenant-system/                                                   # 9 thư mục chức năng hệ thống
│               ├── work-management/                                                 # 12 thư mục chức năng công việc
│               └── crm/                                                             # 7 thư mục chức năng CRM
├── packages/
│   └── database/                                                                    # Package dữ liệu tập trung (@oneops/database)
│       ├── prisma/
│       │   ├── migrations/                                                          # 21 migrations SQL đã áp dụng an toàn
│       │   ├── schema/
│       │   │   ├── base.prisma                                                      # Datasource PostgreSQL & multi-schema namespaces
│       │   │   └── features/                                                        # Junction đọc trực tiếp 53 models từ api features
│       │   └── seed/                                                                # Dữ liệu khởi tạo hệ thống
│       └── index.ts                                                                 # Exports PrismaClient, Prisma namespace và Types
├── tokens/                                                                          # Design Token Single Source of Truth
│   ├── source.json                                                                  # 233 design tokens định nghĩa theo chuẩn Aurora Ops
│   └── README.md                                                                    # Tài liệu hướng dẫn sử dụng và mở rộng tokens
├── scripts/                                                                         # Bộ công cụ vận hành & kiểm định
│   ├── build-tokens.mjs                                                             # Trình biên dịch token sang CSS variables & TS types
│   ├── check-boundaries.mjs                                                         # Kiểm tra ranh giới kiến trúc bất biến
│   ├── check-unused.mjs                                                             # Kiểm tra mã nguồn mồ côi (reachability)
│   ├── dev.mjs                                                                      # Khởi động đồng thời web và api
│   └── ensure-feature-folders.mjs                                                   # Đảm bảo 39 thư mục đối xứng
└── graphify-out/                                                                    # Tri thức kiến trúc hệ thống (Graphify)
    ├── graph.html                                                                   # Bản đồ tri thức 3D (6.006 nodes, 15.918 edges, 202 communities)
    ├── graph.json                                                                   # Đồ thị GraphRAG JSON
    ├── GRAPH_REPORT.md                                                              # Báo cáo phân tích cấu trúc cộng đồng
    └── wiki/                                                                        # Các bài viết phân tích kiến trúc chi tiết
```

---

## Bảng phân bổ 31 chức năng dữ liệu và 53 Models Prisma

| STT | Phân hệ (Domain) | Tên chức năng | Route API | Route Web | Schema Database | Models Prisma sở hữu |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `work-management` | `workspace-today` | `/api/v1/home` | `/` | `work_dashboard` | `WorkspaceWidget` |
| 2 | `work-management` | `tasks` | `/api/v1/tasks` | `/work-management/tasks` | `work_tasks` | `WorkTask` |
| 3 | `work-management` | `task-workflow` | `/api/v1/task-workflow` | `/work-management/tasks` | `work_task_workflow` | `WorkTaskTransition`, `WorkTaskProposal` |
| 4 | `work-management` | `task-comments` | `/api/v1/task-comments` | `/work-management/tasks` | `work_task_comments` | `WorkTaskComment` |
| 5 | `work-management` | `task-links` | `/api/v1/task-links` | `/work-management/tasks` | `work_task_links` | `WorkTaskLink` |
| 6 | `work-management` | `project-spaces` | `/api/v1/projects` | `/work-management/projects` | `work_projects` | `WorkProject`, `ProjectSprint`, `ProjectBacklogItem` |
| 7 | `work-management` | `milestones-qa` | `/api/v1/milestones` | `/work-management/milestones` | `work_milestones_qa` | `Milestone`, `MilestoneItem`, `AcceptanceItem`, `AcceptanceResult` |
| 8 | `work-management` | `timesheets` | `/api/v1/timesheets` | `/work-management/timesheets` | `work_timesheets` | `TimesheetPeriod`, `TimeEntry`, `TimeEntryAdjustment` |
| 9 | `work-management` | `calendar` | `/api/v1/calendar` | `/work-management/calendar` | `work_calendar` | `WorkEvent` |
| 10 | `work-management` | `tickets-approvals` | `/api/v1/requests` | `/work-management/tickets-approvals` | `work_requests` | `WorkRequest`, `WorkRequestApprovalStep`, `WorkRequestApprover` |
| 11 | `work-management` | `internal-chat` | `/api/v1/messages` | `/work-management/internal-chat` | `work_messages` | `WorkThread` |
| 12 | `work-management` | `knowledge-sop` | `/api/v1/notes` | `/work-management/knowledge-sop` | `work_notes` | `WorkNote` |
| 13 | `work-management` | `reports` | `/api/v1/reports` | `/work-management/reports` | `work_reports` | `WorkReport` |
| 14 | `work-management` | `notifications` | `/api/v1/notifications` | `/work-management/notifications` | `work_notifications` | `WorkNotification` |
| 15 | `hr-management` | `departments-teams` | `/api/v1/org` | `/hr-management/organization` | `hr_departments` | `Department`, `Team` |
| 16 | `hr-management` | `positions-grades` | `/api/v1/positions` | `/hr-management/positions` | `hr_positions` | `Position`, `Grade` |
| 17 | `hr-management` | `employee-directory` | `/api/v1/employees` | `/hr-management/employees` | `hr_employees` | `Employee` |
| 18 | `tenant-system` | `accounts` | `/api/v1/accounts` | `/tenant-system/accounts` | `tenant_accounts` | `Account`, `AccountAccessChange` |
| 19 | `tenant-system` | `tenant-auth` | `/api/v1/auth` | `/tenant-system/auth` | `tenant_auth` | `AuthSession` |
| 20 | `tenant-system` | `roles-permissions` | `/api/v1/permissions` | `/tenant-system/roles-permissions` | `tenant_permissions` | `RolePermission`, `PermissionChange` |
| 21 | `tenant-system` | `checklog` | `/api/v1/checklog` | `/tenant-system/checklog` | `tenant_checklog` | `AuditEntry` |
| 22 | `tenant-system` | `workflow-rules` | `/api/v1/workflow-rules` | `/tenant-system/workflow-rules` | `tenant_automation` | `AutomationRule`, `AutomationRun` |
| 23 | `tenant-system` | `work-policies` | `/api/v1/work-policies` | `/tenant-system/work-policies` | `tenant_policies` | `WorkPolicy`, `WorkHoliday`, `OfficeNetwork`, `LeaveQuota` |
| 24 | `hr-management` | `daily-checkin` | `/api/v1/daily-checkin` | `/hr-management/attendance` | `hr_attendance` | `AttendanceRecord` |
| 25 | `hr-management` | `workforce-board` | `/api/v1/workforce-board` | `/hr-management/workforce` | `hr_workforce` | `WorkforcePresence` |
| 26 | `hr-management` | `checkin-explanations`| `/api/v1/checkin-explanations` | `/hr-management/explanations` | `hr_checkin_explanations` | `CheckinExplanation` |
| 27 | `hr-management` | `shifts-schedules` | `/api/v1/shifts-schedules` | `/hr-management/shifts` | `hr_shifts` | `ShiftTemplate`, `SchedulePattern`, `ScheduleAssignment` |
| 28 | `hr-management` | `attendance-reports` | `/api/v1/attendance-reports` | `/hr-management/attendance-reports` | `hr_attendance_reports` | `AttendancePeriod`, `AttendancePeriodLine` |
| 29 | `hr-management` | `leave-requests` | `/api/v1/leave-requests` | `/hr-management/leaves` | `hr_leaves` | `LeaveRequest` |
| 30 | `hr-management` | `leave-approvals` | `/api/v1/leave-approvals` | `/hr-management/leave-approvals` | `hr_leave_approvals` | `LeaveDecision` |
| 31 | `hr-management` | `resource-capacity` | `/api/v1/resource-capacity` | `/hr-management/capacity` | `hr_capacity` | `CapacityPeriod`, `ProjectAllocation` |

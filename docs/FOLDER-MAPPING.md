# Phân bổ theo “Cau Truc Thu Muc (1).md”

File gốc tại root là chuẩn đặt tên, kết hợp các nhánh được bổ sung và hoàn thiện qua các mốc phát triển. Có đúng **4 nhóm chính, 39 thư mục chức năng con đối xứng FE/BE**: `tenant-system` (9), `work-management` (12), `hr-management` (11), `crm` (7).

---

## 1. Danh mục 31 chức năng dữ liệu đã triển khai đầy đủ

Hiện hệ thống sở hữu **31 chức năng dữ liệu hoàn chỉnh** (gồm 9 Record APIs và 22 Resource APIs), phân bổ trên **53 models Prisma** được lưu trữ độc lập theo từng namespace:

| Phân hệ (Domain)  | Đường dẫn Feature                       | Loại Module | Phạm vi triển khai thực tế                                                                 | Model Prisma sở hữu                                        | Database Schema |
| ----------------- | --------------------------------------- | :---------: | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | --------------- |
| `work-management` | `coordination/workspace-today`          | `records`   | Dashboard tổng quan ngày, tiện ích cá nhân hóa                                             | `WorkspaceWidget`                                          | `work_dashboard` |
| `work-management` | `work/tasks`                            | `records`   | Thực thể công việc, người phụ trách, checklist, hạn chót, liên kết dự án                   | `WorkTask`                                                 | `work_tasks` |
| `work-management` | `work/task-workflow`                    | `resource`  | Máy trạng thái TR-02…TR-09, phân quyền actor, đề xuất hoãn/hủy/gia hạn                     | `WorkTaskTransition`, `WorkTaskProposal`                   | `work_task_workflow` |
| `work-management` | `work/task-comments`                    | `resource`  | API riêng `/task-comments`, bình luận trao đổi và log hệ thống, liên kết                   | `WorkTaskComment`                                          | `work_task_comments` |
| `work-management` | `work/task-links`                       | `resource`  | Đồ thị quan hệ công việc (blocks, blocked_by, relates_to, duplicates)                     | `WorkTaskLink`                                             | `work_task_links` |
| `work-management` | `projects/project-spaces`               | `records`   | Quản trị không gian dự án, phân loại danh mục, quản lý chu kỳ Sprint và Backlog            | `WorkProject`, `ProjectSprint`, `ProjectBacklogItem`       | `work_projects` |
| `work-management` | `projects/milestones-qa`                | `resource`  | Mốc tiến độ bàn giao, danh mục nghiệm thu và cổng kiểm định chất lượng (QA Gate)          | `Milestone`, `MilestoneItem`, `AcceptanceItem`, `AcceptanceResult` | `work_milestones_qa` |
| `work-management` | `projects/timesheets`                   | `resource`  | Chấm công thời gian thực bước 15 phút, điều chỉnh và duyệt bảng công                       | `TimesheetPeriod`, `TimeEntry`, `TimeEntryAdjustment`      | `work_timesheets` |
| `work-management` | `coordination/workspace-today/calendar` | `records`   | Lịch biểu sự kiện, cuộc họp, thời gian tập trung                                           | `WorkEvent`                                                | `work_calendar` |
| `work-management` | `coordination/tickets-approvals`        | `records`   | Phiếu yêu cầu, đề xuất nội bộ, bước duyệt đa cấp và phê duyệt viên                          | `WorkRequest`, `WorkRequestApprovalStep`, `WorkRequestApprover` | `work_requests` |
| `work-management` | `coordination/internal-chat`            | `records`   | Kênh trao đổi nội bộ theo chủ đề và tin nhắn thành viên                                    | `WorkThread`                                               | `work_messages` |
| `work-management` | `coordination/knowledge-sop`            | `records`   | Soạn thảo, lưu trữ quy trình vận hành chuẩn (SOP), ghi chú nghiệp vụ                       | `WorkNote`                                                 | `work_notes` |
| `work-management` | `coordination/workspace-today/reports`  | `records`   | Báo cáo và chỉ số tổng hợp công việc                                                       | `WorkReport`                                               | `work_reports` |
| `work-management` | `coordination/notifications`            | `records`   | Kênh Server-Sent Events (SSE) thời gian thực, đếm badge unread, xóa mềm                    | `WorkNotification`                                         | `work_notifications` |
| `hr-management`   | `organization/departments-teams`        | `resource`  | Sơ đồ phòng ban hình cây không chu trình (BR-ORG-10), bổ nhiệm Trưởng phòng/Trưởng nhóm    | `Department`, `Team`                                       | `hr_departments` |
| `hr-management`   | `organization/positions-grades`         | `resource`  | Danh mục vị trí công việc, ngạch bậc chuyên môn (Rank 1-99)                                | `Position`, `Grade`                                        | `hr_positions` |
| `hr-management`   | `employees/employee-directory`          | `resource`  | Hồ sơ, danh bạ nhân sự, liên kết tài khoản hệ thống                                        | `Employee`                                                 | `hr_employees` |
| `tenant-system`   | `access-control/accounts`               | `resource`  | Quản trị vòng đời tài khoản, đổi mật khẩu, kích hoạt/tạm khóa                              | `Account`, `AccountAccessChange`                           | `tenant_accounts` |
| `tenant-system`   | `access-control/tenant-auth`            | `resource`  | Xác thực phiên trượt (sliding window), thiết lập First Admin, cookie phiên, `SessionGuard` | `AuthSession`                                              | `tenant_auth` |
| `tenant-system`   | `access-control/roles-permissions`      | `resource`  | Vai trò (Role), gán quyền (RoleBinding), catalog quyền hạt nhân, `PermissionGuard`         | `RolePermission`, `PermissionChange`                       | `tenant_permissions` |
| `tenant-system`   | `checklog`                              | `resource`  | Nhật ký kiểm toán bất biến (append-only), lưu vết truy vết dữ liệu                         | `AuditEntry`                                               | `tenant_checklog` |
| `tenant-system`   | `automation-hub/workflow-rules`         | `resource`  | Động cơ quy tắc tự động hóa theo sự kiện, điều kiện AND, hành động, nhật ký chạy          | `AutomationRule`, `AutomationRun`                          | `tenant_automation` |
| `tenant-system`   | `organization/work-policies`            | `resource`  | Quy chuẩn giờ làm ngày/tuần, giờ lõi, whitelist IP, ngày lễ, định mức phép năm             | `WorkPolicy`, `WorkHoliday`, `OfficeNetwork`, `LeaveQuota` | `tenant_policies` |
| `hr-management`   | `attendance/daily-checkin`              | `resource`  | Điểm danh bấm giờ vào/ra thực tế, IP, tính thời lượng, phát hiện vi phạm                   | `AttendanceRecord`                                         | `hr_attendance` |
| `hr-management`   | `attendance/workforce-board`            | `resource`  | Bảng theo dõi quân số hiện diện tức thời theo phòng ban                                    | `WorkforcePresence`                                        | `hr_workforce` |
| `hr-management`   | `attendance/checkin-explanations`       | `resource`  | Đơn giải trình vi phạm điểm danh và luồng quản lý duyệt                                    | `CheckinExplanation`                                       | `hr_checkin_explanations` |
| `hr-management`   | `attendance/shifts-schedules`           | `resource`  | Thiết lập mẫu ca kíp, mẫu tuần hoàn và phân ca nhân sự                                     | `ShiftTemplate`, `SchedulePattern`, `ScheduleAssignment`   | `hr_shifts` |
| `hr-management`   | `attendance/attendance-reports`         | `resource`  | Báo cáo tổng hợp công kỳ hạn và chốt sổ bảng công bất biến                                 | `AttendancePeriod`, `AttendancePeriodLine`                 | `hr_attendance_reports` |
| `hr-management`   | `leaves/leave-requests`                 | `resource`  | Đơn xin nghỉ phép, kiểm tra hạn mức còn lại và bàn giao công việc                          | `LeaveRequest`                                             | `hr_leaves` |
| `hr-management`   | `leaves/leave-approvals`                | `resource`  | Xét duyệt nghỉ phép đa cấp, chống tự duyệt                                                 | `LeaveDecision`                                            | `hr_leave_approvals` |
| `hr-management`   | `employees/resource-capacity`           | `resource`  | Quản lý quỹ giờ khả dụng và phân bổ công suất dự án                                        | `CapacityPeriod`, `ProjectAllocation`                      | `hr_capacity` |

---

## 2. Phần chưa triển khai được để trống theo quy chuẩn

- **tenant-system:** `company-profile` (hồ sơ doanh nghiệp), `automation-hub` (`external-integrations`, `ai-copilot`).
- **crm:** Toàn bộ 7 nhánh con (`presales/*`, `commercial/*`, `customer-success/*`).
- **Hạ tầng core:** Thư mục cấu trúc chuẩn được giữ sạch sẽ, không tạo controller, service, page rỗng hay mock endpoint giả mạo.

---

## 3. Database chung, model độc lập

- Package `@oneops/database` sở hữu cấu hình Prisma, generated client, public exports và lịch sử migration.
- `prisma/schema/base.prisma` chỉ chứa datasource PostgreSQL, generator và danh sách các multi-schema namespaces.
- `prisma/schema/features` là directory junction kết nối tới `apps/api/src/features` để Prisma đọc trực tiếp các model gốc tại thư mục `prisma/` của từng feature.
- Hệ thống hiện nạp **53 models Prisma** phân tán trong các feature mà không xảy ra trùng lặp schema.

---

## 4. Định tuyến ứng dụng (App Router - 31 Routes)

Các trang được tổ chức trực tiếp dưới `apps/web/src/app/`:

- **Quản lý công việc (11 routes):**
  - `/` (Trang chủ / Workspace Today)
  - `/work-management/tasks`
  - `/work-management/kanban`
  - `/work-management/projects`
  - `/work-management/milestones`
  - `/work-management/timesheets`
  - `/work-management/calendar`
  - `/work-management/tickets-approvals`
  - `/work-management/internal-chat`
  - `/work-management/knowledge-sop`
  - `/work-management/reports`
  - `/work-management/notifications`
- **Quản lý nhân sự (11 routes):**
  - `/hr-management/organization`
  - `/hr-management/positions`
  - `/hr-management/employees`
  - `/hr-management/attendance`
  - `/hr-management/workforce`
  - `/hr-management/explanations`
  - `/hr-management/shifts`
  - `/hr-management/attendance-reports`
  - `/hr-management/leaves`
  - `/hr-management/leave-approvals`
  - `/hr-management/capacity`
- **Quản trị hệ thống (6 routes):**
  - `/tenant-system/auth`
  - `/tenant-system/accounts`
  - `/tenant-system/roles-permissions`
  - `/tenant-system/work-policies`
  - `/tenant-system/checklog`
  - `/tenant-system/workflow-rules`
- **Hệ thống thiết kế (2 routes):**
  - `/design-system`
  - `/design-tokens`

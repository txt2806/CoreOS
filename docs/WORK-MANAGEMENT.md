# Phân hệ Quản lý & Điều phối Công việc (Work Management)

---

## 1. Nguồn tham khảo & Định hướng kiến trúc

- [Base XSpace](https://base.vn/app/xspace): Không gian làm việc số, dashboard tổng quan ngày làm việc, giao tiếp nội bộ và quản trị lịch sự kiện.
- [Base WeWork](https://base.vn/app/wework): Không gian dự án, phân bổ công việc, bảng Kanban và theo dõi tiến độ đa chiều.
- [XCalendar My time](https://help.base.vn/support/solutions/articles/63000284083--xspace-xcalendar-b%E1%BA%ADt-ch%E1%BA%BF-%C4%91%E1%BB%99-my-time-%C4%91%E1%BB%83-theo-d%C3%B5i-l%E1%BB%8Bch-bi%E1%BB%83u-c%C3%B4ng-vi%E1%BB%87c): Lịch sự kiện và phân bổ thời gian làm việc tập trung.

Phân hệ Work Management của OneOps là nền tảng quản lý công việc và điều hành nội bộ doanh nghiệp, sở hữu dữ liệu thật trên PostgreSQL qua multi-schema federation và đồng bộ với hệ thống Design System 233 tokens.

---

## 2. Các thành phần nghiệp vụ đã triển khai hoàn chỉnh (14 thành phần)

1. **Tổng quan làm việc hôm nay (`workspace-today`):**
   - Bảng điều khiển cá nhân hóa, thống kê việc cần làm, việc đang làm, việc trễ hạn và các sự kiện trong ngày.
   - Tích hợp Lịch sự kiện (`calendar`) và Báo cáo chỉ số (`reports`).
2. **Quản lý công việc & Bảng Kanban (`tasks` & `kanban`):**
   - Quản lý công việc, checklist con, người phụ trách, reviewer, độ ưu tiên, hạn chót và dự án liên kết.
   - Bảng Kanban trực quan hỗ trợ kéo thả thẻ task giữa các cột trạng thái, tích hợp trực tiếp máy trạng thái.
3. **Máy trạng thái công việc (`task-workflow`):**
   - Chuyển trạng thái tuân thủ nghiêm ngặt quy tắc máy trạng thái TR-02…TR-09: `Draft` $\rightarrow$ `Open` $\rightarrow$ `In Progress` $\rightarrow$ `Review` $\rightarrow$ `Completed` (kèm `Blocked`, `On Hold` và `Cancelled`).
   - Tạo mới hoặc cập nhật thông thường không được phép sửa trực tiếp trường `status`.
   - Mỗi lần chuyển trạng thái tự động lưu lịch sử, lý do và sinh một bản ghi bình luận `SYSTEM`.
   - Cơ chế đề xuất: Người thực hiện có thể gửi đề xuất `HOLD`, `CANCEL` hoặc `DEADLINE`; Quản lý độc lập (khác người đề xuất) sẽ ra quyết định duyệt hoặc từ chối.
4. **Luồng bình luận công việc (`task-comments`):**
   - API riêng biệt `/api/v1/task-comments` (tách độc lập khỏi model Task).
   - Hỗ trợ phân loại bình luận `COMMENT` (người dùng) và `SYSTEM` (ghi nhận thay đổi tiến độ/lý do workflow), hỗ trợ @nhắc tên và đính kèm liên kết.
5. **Đồ thị liên kết công việc (`task-links`):**
   - Hỗ trợ các quan hệ: `BLOCKS`, `BLOCKED_BY`, `RELATES_TO`, `DUPLICATES`.
   - Cổng chặn khởi động: Task có quan hệ `BLOCKS` chưa giải quyết sẽ chặn bắt đầu công việc trừ khi có ghi đè từ Quản lý kèm lý do.
6. **Không gian dự án & Quản lý Sprint (`project-spaces`):**
   - Quản lý dự án, danh mục phân loại, mục tiêu, giám sát tiến độ và danh sách công việc liên thuộc.
   - Chu kỳ phát triển Agile/Scrum: Quản lý Product Backlog, xếp hạng Story Points, khởi tạo và theo dõi Sprint (`ProjectSprint`). Quy tắc tối đa 01 Active Sprint tại một thời điểm cho mỗi dự án.
7. **Mốc tiến độ & Cổng kiểm định chất lượng (`milestones-qa`):**
   - Quản lý mốc bàn giao dự án gắn liền với các công việc cần hoàn thành (`Milestone`, `MilestoneItem`).
   - Cổng QA Gate: Thiết lập các tiêu chí chấp nhận bắt buộc (`AcceptanceItem`, `AcceptanceResult`); tự động chặn chuyển trạng thái sang hoàn thành nếu chưa được kiểm định đạt.
8. **Chấm công thời gian thực (`timesheets`):**
   - Bảng chấm công tuần bắt đầu vào thứ Hai, ghi nhận thời gian theo bước 15 phút (`TimesheetPeriod`, `TimeEntry`, `TimeEntryAdjustment`).
   - Ngưỡng giới hạn: Ngày tối đa 480 phút (8 giờ), tuần tối đa 2400 phút (40 giờ).
   - Cơ chế phê duyệt: Quản lý không tự duyệt bảng công của chính mình; điều chỉnh số giờ chỉ được thực hiện sau khi có phê duyệt.
9. **Đề xuất & Phê duyệt (`tickets-approvals`):**
   - Tạo phiếu yêu cầu nội bộ (`WorkRequest`) và luồng xử lý đa cấp (`WorkRequestApprovalStep`, `WorkRequestApprover`) duyệt / từ chối kèm lý do phản hồi.
10. **Trao đổi nội bộ (`internal-chat`) & Kho tri thức (`knowledge-sop`):**
    - Kênh trao đổi trực tiếp theo luồng chủ đề công việc (`WorkThread`).
    - Kho lưu trữ quy trình vận hành tiêu chuẩn (SOP) và tài liệu hướng dẫn nghiệp vụ (`WorkNote`).
11. **Trung tâm thông báo thời gian thực (`notifications`):**
    - Kênh sự kiện Server-Sent Events (SSE) tại `/api/v1/notifications/stream` đẩy thông báo tức thì khi có việc mới được giao, cập nhật trạng thái, tin nhắn hoặc lịch họp.
    - Cơ chế **Xóa mềm (Soft Delete `deletedAt`)**: Thao tác xóa trên giao diện ẩn thông báo khỏi người dùng và cập nhật lại bộ đếm unread badge, trong khi bản ghi trong database vẫn được lưu trọn vẹn để bảo toàn kiểm toán.
12. **Lịch sự kiện (`calendar`):**
    - Quản lý lịch sự kiện, cuộc họp, thời gian làm việc tập trung (`WorkEvent`).
13. **Báo cáo tổng hợp (`reports`):**
    - Tổng hợp chỉ số năng suất, tiến độ hoàn thành theo dự án, phòng ban và cá nhân (`WorkReport`).
14. **Tích hợp Tự động hóa (`workflow-rules`):**
    - Kết nối với động cơ quy tắc tự động hóa: Tự động đổi trạng thái, gán người phụ trách hoặc phát thông báo khi task chuyển trạng thái hoặc đạt điều kiện.

---

## 3. Quản trị dữ liệu & Ranh giới

- Tất cả các chức năng thuộc Work Management lưu trữ dữ liệu tại các schema PostgreSQL độc lập với tiền tố `work_*` (ví dụ: `work_tasks`, `work_task_links`, `work_task_workflow`, `work_task_comments`, `work_milestones_qa`, `work_timesheets`, `work_calendar`, `work_requests`, `work_messages`, `work_notes`, `work_reports`, `work_notifications`, `work_dashboard`, `work_projects`).
- Liên kết giữa các thực thể (Task $\leftrightarrow$ Project $\leftrightarrow$ Assignee $\leftrightarrow$ Milestone) sử dụng định danh scalar ID, không tạo foreign key xuyên namespace để đảm bảo tính độc lập module.
- Tích hợp xuyên suốt giữa Task, Workflow, QA Gate và Comments được điều phối tập trung thông qua `work-management.composition.ts`.
- Tự động hóa nối với Work Management qua bus hạ tầng `core/events/workflow-events.ts`: nơi sở hữu dữ liệu công bố snapshot, quy tắc nằm ở `tenant-system/automation-hub/workflow-rules`.

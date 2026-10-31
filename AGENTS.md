\# AI SYSTEM SPECIFICATION & IMPLEMENTATION SKILL

\*\*Dự án:\*\* Hệ thống Quản lý Điểm danh, Công việc (Task/Kanban) & Dự án (Agile/Scrum) Nội bộ  

\*\*Mục đích tài liệu:\*\* Cung cấp ngữ cảnh toàn diện (Context), Quy tắc nghiệp vụ (Business Rules), Kiến trúc dữ liệu (Data Schema) và Kỹ năng lập trình (Coding Skill) cho AI Agent để tự động sinh mã nguồn, kiểm thử và xây dựng hệ thống chính xác 100% theo yêu cầu nghiệp vụ.



\---



\## PHẦN 1: AI IMPLEMENTATION SKILL (HƯỚNG DẪN KỸ NĂNG CHO AI AGENT)



\> \*\*Chỉ thị dành cho AI (System Prompt / \`.cursorrules\`):\*\*  

\> Khi bạn (AI Agent) đọc tài liệu này để thực hiện các yêu cầu viết code, thiết kế Database, tạo API hoặc xây dựng Frontend, bạn \*\*BẮT BUỘC\*\* phải tuân thủ nghiêm ngặt các nguyên tắc kỹ thuật và quy trình dưới đây:



\### 1.1. Nguyên tắc Cốt lõi (Core Engineering Principles)

1\. \*\*Strict RBAC + ABAC (Phân quyền theo Vai trò & Ngữ cảnh):\*\*

   - Hệ thống \*\*CHỈ CÓ 2 ROLE\*\* trong cơ sở dữ liệu: \`EMPLOYEE\` (Nhân viên) và \`MANAGER\` (Quản lý).

   - Chức danh nghề nghiệp (\`BA\`, \`Developer\`, \`Tester\`, \`Designer\`...) chỉ là thuộc tính (\`job_title\`) của hồ sơ nhân viên, \*\*tuyệt đối không\*\* dùng làm Role phân quyền hệ thống.

   - \*\*Quản trị cấp cao (Super Admin / Quản lý có quyền quản trị):\*\* Là tài khoản có \`role = MANAGER\` đi kèm cờ \`is_system_admin = true\` (cấp quyền quản trị toàn hệ thống, không phải Role thứ 3).

   - \*\*Kiểm tra quyền tại thời điểm thao tác (Runtime Context Check):\*\* Không chỉ dựa vào Role, mọi API phải kiểm tra quan hệ của User với thực thể:

     - Có phải Quản trị viên Department (\`Department Admin\`), Quản lý Team (\`Team Manager\`) hay Quản lý Dự án (\`Project Manager\`) không?

     - Có phải Người phụ trách (\`assignee_id\`) hoặc Người kiểm tra (\`reviewer_id\`) của Task không?

     - Trạng thái hiện tại của thực thể (Task, Sprint, Đơn từ) có cho phép thao tác không?



2\. \*\*Không Xóa Cứng Dữ Liệu Nghiệp Vụ (Zero Hard-Delete Policy):\*\*

   - Tài khoản bị khóa, Department/Team ngừng hoạt động, Project/Task bị hủy đều phải giữ nguyên dữ liệu lịch sử, bình luận, đơn từ.

   - Chỉ cho phép xóa vĩnh viễn (\`Hard Delete\`) khi thực thể mới khởi tạo nhầm và \*\*chưa phát sinh bất kỳ dữ liệu liên kết nào\*\* (VD: Department chưa có Team/Project; Project ở trạng thái \`PLANNING\` chưa có Sprint/Task).



3\. \*\*Bất biến Lịch sử & Kiểm toán (Immutable Audit Trail):\*\*

   - Mọi thao tác quản trị (tạo/sửa/khóa tài khoản, cấp/thu hồi quyền, đổi cấu hình, đổi cơ cấu tổ chức) và thao tác chuyển trạng thái Task/Đơn từ phải ghi vào bảng \`AuditLog\` / \`History\` gồm: \`actor_id\`, \`timestamp\`, \`action\`, \`old_value\`, \`new_value\`, \`reason\`.

   - \*\*Đặc biệt:\*\* Mọi thao tác của Quản trị cấp cao (\`is_system_admin = true\`) can thiệp vào dữ liệu nằm ngoài phạm vi phụ trách trực tiếp đều phải gắn cờ \`is_out_of_scope_override = true\` trong Audit Log. Không bao giờ lưu mật khẩu dạng rõ hoặc hash vào lịch sử.



4\. \*\*Xử lý Tự động Hệ quả Nghiệp vụ (Cascading Business Effects):\*\*

   - Khi Nhân viên \*\*Nghỉ phép / Nghỉ ốm được duyệt\*\*, \*\*Rời khỏi Team\*\*, hoặc \*\*Bị khóa tài khoản\*\*: Hệ thống tự động quét các Task chưa đóng (\`TODO\`, \`IN_PROGRESS\`, \`REOPENED\`, \`PENDING_REVIEW\`, \`ON_HOLD\`) bị ảnh hưởng, gắn cờ \`needs_reassignment = true\` ("Cần giao lại") và phát thông báo cho Quản lý. \*\*Tuyệt đối không\*\* tự động đổi người phụ trách hoặc tự động đổi Deadline.



5\. \*\*Idempotency & Real-time Sync (Chống gửi lặp & Đồng bộ Thời gian thực):\*\*

   - Mọi API tạo mới hoặc chuyển trạng thái (Check-in, Gửi đơn, Chuyển trạng thái Task, Đề xuất) phải có cơ chế chống gửi lặp (Idempotency Key hoặc Database Lock).

   - Thay đổi trạng thái điểm danh và tiến độ Task trên Kanban/Dashboard phải được đẩy qua WebSocket / SSE (Server-Sent Events) để cập nhật giao diện trong vòng \*\*$\le 2$ giây\*\* (\`NFR-PERF-02\`, \`NFR-PERF-04\`).



\---



\## PHẦN 2: KIẾN TRÚC TỔNG QUAN & MÔ HÌNH DỮ LIỆU (DATA SCHEMA)



\### 2.1. Sơ đồ Phân cấp Tổ chức (Organizational Hierarchy)

\`\`\`

CÔNG TY (Company)

 ├── NHÓM TÀI KHOẢN (Group - Tạo ở tài khoản gốc để gán quyền nhanh)

 └── DEPARTMENT (Khối / Chi nhánh - Đơn vị lớn nhất)

      ├── Người quản trị Department (1 hoặc nhiều tài khoản Role MANAGER)

      ├── Thành viên truy cập Department (Cá nhân hoặc Group - thấy Dept khi tạo Team/Project)

      │

      ├── TEAM (Phòng ban thường trực - Cùng cấp với Project, không lồng nhau)

      │    ├── Quản lý Team (Ít nhất 1 MANAGER, mặc định là thành viên Team)

      │    ├── Thành viên Team (Mỗi nhân viên CHỈ THUỘC ĐÚNG 1 TEAM tại 1 thời điểm - BR-ORG-15)

      │    └── Task vận hành của Team

      │

      └── PROJECT (Dự án Agile/Scrum liên phòng ban - Cùng cấp với Team)

           ├── Quản lý Dự án (MANAGER)

           ├── Thành viên Dự án (Lấy từ nhiều Team khác nhau)

           ├── Product Backlog (User Stories / Yêu cầu)

           ├── Sprints (Chu kỳ phát triển - Tối đa 01 Active Sprint tại 1 thời điểm)

           │    └── Sprint Tasks (Deadline phải nằm trong [Sprint.start_date, Sprint.end_date])

           ├── Hợp đồng & Ý kiến khách hàng (Contracts & Client Feedbacks)

           └── Ghi chú cuộc họp (Meeting Side Notes - Liên kết trực tiếp với Task/Story)

\`\`\`



\### 2.2. Thiết kế Thực thể Cốt lõi (Core Database Entities)



\`\`\`typescript

*// 1. TÀI KHOẢN & NHÂN SỰ (Account & Employee)*

enum SystemRole { EMPLOYEE = 'EMPLOYEE', MANAGER = 'MANAGER' }

enum AccountStatus { ACTIVE = 'ACTIVE', LOCKED = 'LOCKED' }



interface Account {

  id: string;

  employee_code: string;       *// Unique, liên kết 1-1 với Hồ sơ nhân viên (BR-ACC-01)*

  username: string;            *// Unique (BR-ACC-02)*

  email: string;               *// Unique, email công việc (BR-ACC-02)*

  password_hash: string;       *// Không bao giờ trả về qua API (BR-ACC-08)*

  role: SystemRole;            *// EMPLOYEE | MANAGER (BR-ACC-04)*

  is_system_admin: boolean;    *// True nếu là Quản trị cấp cao / Quản lý có quyền QT (BR-PER-01)*

  job_title?: string;          *// BA, Developer, Tester, Designer... (BR-PER-02)*

  status: AccountStatus;       *// ACTIVE | LOCKED (BR-ACC-05)*

  team_id?: string | null;     *// Mỗi nhân viên chỉ thuộc tối đa 1 Team (BR-ORG-15)*

  annual_leave_quota: number;  *// Hạn mức phép năm (BR-LV-11)*

  used_leave_days: number;     *// Số ngày phép đã dùng*

  created_at: Date;

}



*// 2. NHÓM TÀI KHOẢN (Base Group)*

interface AccountGroup {

  id: string;

  name: string;

  directory?: string;

  owner_id: string;

  description?: string;

  member_ids: string[];        *// Danh sách Account ID*

}



*// 3. CƠ CẤU TỔ CHỨC (Department & Team)*

enum OrgUnitStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE' }



interface Department {

  id: string;

  name: string;                *// Max 100 chars, Unique trong các Dept đang ACTIVE (BR-ORG-02)*

  description?: string;

  admin_ids: string[];         *// Ít nhất 1 MANAGER (BR-ORG-03, BR-ORG-18)*

  access_user_ids: string[];   *// Thành viên truy cập lẻ*

  access_group_ids: string[];  *// Thành viên truy cập theo Group (Dynamic sync - BR-ORG-05)*

  status: OrgUnitStatus;

  created_by: string;

  created_at: Date;

}



interface Team {

  id: string;

  department_id: string;       *// Thuộc đúng 1 Department (BR-ORG-01)*

  name: string;                *// Max 100 chars, Unique trong cùng Department (BR-ORG-02)*

  description?: string;

  manager_ids: string[];       *// Ít nhất 1 MANAGER, tự động là member (BR-ORG-03, BR-ORG-04)*

  member_ids: string[];        *// Snapshot khi thêm bằng Group, mỗi user 1 Team (BR-ORG-05, BR-ORG-15)*

  status: OrgUnitStatus;

  created_by: string;

  created_at: Date;

}



*// 4. ĐIỂM DANH & CẤU HÌNH (Attendance & System Config)*

interface SystemAttendanceConfig {

  work_start_time: string;            *// VD: "07:00"*

  work_end_time: string;              *// VD: "17:00"*

  working_days: number[];             *// VD: [1, 2, 3, 4, 5] (Thứ 2 - Thứ 6)*

  late_grace_minutes: number;         *// VD: 0 hoặc 5 phút*

  checkin_reminder_before_mins: number; *// VD: 5 phút*

  missing_checkin_alert_after_mins: number; *// VD: 120 phút*

  auto_close_record_time: string;     *// VD: "23:59"*

  explanation_deadline_workdays: number; *// VD: 3 ngày làm việc*

  office_ip_whitelist: string[];      *// Danh sách IP wifi văn phòng hợp lệ*

  public_holidays: string[];          *// Danh sách ngày nghỉ lễ YYYY-MM-DD*

  default_annual_leave_quota: number;

  effective_from_date: string;        *// Thay đổi chỉ áp dụng từ ngày làm việc kế tiếp (BR-ATT-10)*

}



enum WorkMode { OFFICE = 'OFFICE', BUSINESS_TRIP = 'BUSINESS_TRIP', REMOTE = 'REMOTE', ON_LEAVE = 'ON_LEAVE', UNCHECKED = 'UNCHECKED' }



interface AttendanceRecord {

  id: string;

  account_id: string;

  work_date: string;           *// YYYY-MM-DD, Unique (account_id + work_date) (BR-ATT-01)*

  check_in_time?: Date;

  check_out_time?: Date;

  current_mode: WorkMode;

  location_note?: string;      *// Bắt buộc khi chọn BUSINESS_TRIP*

  late_minutes: number;        *// Tính từ work_start_time nếu vượt quá grace_minutes (BR-ATT-03)*

  early_leave_minutes: number; *// Tính từ check_out_time đến work_end_time (BR-ATT-06)*

  actual_work_minutes?: number;*// Bỏ giây, null nếu thiếu check-out (BR-ATT-06)*

  is_missing_checkout: boolean;

  is_unexcused_absence: boolean; *// Nghỉ không phép (khi đơn bị từ chối sau ngày nghỉ - BR-LV-14)*

  is_unpaid_leave: boolean;    *// Nghỉ trừ lương (khi vượt hạn mức phép - BR-LV-12)*

}



*// 5. ĐƠN TỪ & NGHỈ PHÉP (Leave & Explanation Requests)*

enum RequestType { ANNUAL_LEAVE = 'ANNUAL_LEAVE', SICK_LEAVE = 'SICK_LEAVE', ATTENDANCE_EXPLANATION = 'ATTENDANCE_EXPLANATION' }

enum LeaveSession { FULL_DAY = 'FULL_DAY', MORNING = 'MORNING', AFTERNOON = 'AFTERNOON' }

enum RequestStatus { PENDING = 'PENDING', APPROVED = 'APPROVED', REJECTED = 'REJECTED', CANCELLED = 'CANCELLED' }



interface LeaveOrExplanationRequest {

  id: string;

  requester_id: string;

  type: RequestType;

  start_date: string;          *// YYYY-MM-DD*

  end_date: string;            *// YYYY-MM-DD (Với Giải trình: start_date = end_date = ngày cần sửa)*

  session?: LeaveSession;

  reason: string;

  attachment_url?: string;

  *// Dành riêng cho Giải trình điểm danh:*

  correct_checkin_time?: string;

  correct_checkout_time?: string;

  correct_work_mode?: WorkMode;

  *// Cờ cảnh báo hệ thống:*

  is_late_submission: boolean; *// Gửi trước < 3 ngày với Nghỉ phép (BR-LV-10)*

  is_over_quota: boolean;      *// Vượt hạn mức phép năm (BR-LV-12)*

  status: RequestStatus;

  approver_id?: string;

  rejection_reason?: string;   *// Bắt buộc khi REJECTED (BR-LV-04)*

  processed_at?: Date;

  created_at: Date;

}



*// 6. QUẢN LÝ DỰ ÁN AGILE/SCRUM (Project, Sprint, Meeting Note)*

enum ProjectStatus { PLANNING = 'PLANNING', IN_PROGRESS = 'IN_PROGRESS', ON_HOLD = 'ON_HOLD', COMPLETED = 'COMPLETED', CANCELLED = 'CANCELLED' }

enum SprintStatus { PLANNING = 'PLANNING', ACTIVE = 'ACTIVE', COMPLETED = 'COMPLETED' }



interface Project {

  id: string;

  department_id: string;       *// Thuộc đúng 1 Department (BR-ORG-01)*

  name: string;

  category?: string;

  manager_id: string;          *// Role MANAGER (BR-PRJ-01)*

  member_ids: string[];        *// Nhân viên & Quản lý tham gia*

  start_date: Date;

  expected_end_date: Date;

  definition_of_done?: string;

  status: ProjectStatus;

  contract_code?: string;

  contract_file_url?: string;

  contract_scope_note?: string;

  client_feedbacks: { id: string; content: string; created_by: string; created_at: Date }[];

}



interface Sprint {

  id: string;

  project_id: string;

  name: string;

  goal?: string;

  start_date: Date;

  end_date: Date;

  status: SprintStatus;        *// Tối đa 1 ACTIVE Sprint / Project (BR-PRJ-05)*

}



interface MeetingNote {

  id: string;

  project_id: string;

  title: string;

  content: string;

  created_by: string;

  created_at: Date;

  linked_task_ids: string[];   *// Liên kết 1 hoặc nhiều Task/Story (BR-PRJ-13)*

  mentioned_user_ids: string[];

}



*// 7. CÔNG VIỆC / TASK & KANBAN (Tasks & State Machine)*

enum TaskStatus {

  TODO = 'TODO',                     *// Cần làm*

  IN_PROGRESS = 'IN_PROGRESS',       *// Đang làm*

  PENDING_REVIEW = 'PENDING_REVIEW', *// Chờ kiểm tra*

  REOPENED = 'REOPENED',             *// Làm lại*

  ON_HOLD = 'ON_HOLD',               *// Hoãn lại*

  COMPLETED = 'COMPLETED',           *// Hoàn thành (Locked)*

  CANCELLED = 'CANCELLED'            *// Đã hủy (Locked)*

}

enum TaskPriority { URGENT = 'URGENT', HIGH = 'HIGH', MEDIUM = 'MEDIUM', LOW = 'LOW' }

enum ProposalType { CHANGE_DEADLINE = 'CHANGE_DEADLINE', HOLD_TASK = 'HOLD_TASK', CANCEL_TASK = 'CANCEL_TASK' }



interface Task {

  id: string;

  title: string;               *// Max 150 chars (8.2)*

  description?: string;

  *// Nguồn gốc: Thuộc Team HOẶC thuộc Project (Mục 2.9 - 8.2)*

  team_id?: string | null;

  project_id?: string | null;

  sprint_id?: string | null;   *// Tối đa 1 Sprint nếu thuộc Project (BR-PRJ-03)*

  story_points?: number | null;*// Dãy Fibonacci: 1, 2, 3, 5, 8, 13, 21... (AC-PRJ-11)*



  assignee_id: string;         *// Đúng 1 người phụ trách, phải thuộc Team/Project (BR-TSK-02)*

  reviewer_id: string;         *// Đúng 1 Người kiểm tra, != assignee_id (BR-TSK-11)*

  created_by: string;          *// Quản lý tạo task*



  deadline: Date;              *// Không ở quá khứ; Nếu trong Sprint phải <= Sprint.end_date (BR-PRJ-04)*

  priority: TaskPriority;

  status: TaskStatus;

  previous_status_before_hold?: TaskStatus | null; *// Dùng để khôi phục khi tiếp tục từ ON_HOLD (BR-ST-09)*



  needs_reassignment: boolean; *// Cờ "Cần giao lại" (BR-ACC-06, BR-ORG-09, BR-LV-06, BR-TSK-07)*

  pending_proposal?: {         *// Mỗi task chỉ có tối đa 1 đề xuất chờ duyệt (BR-TSK-04, BR-ST-04)*

    type: ProposalType;

    proposed_deadline?: Date;

    reason: string;

    proposed_by: string;

    created_at: Date;

  } | null;



  attachments: { url: string; type: 'FILE' | 'GOOGLE_DRIVE' | 'FIGMA' | 'GITHUB' | 'LINK' }[];

  created_at: Date;

}

\`\`\`



\---



\## PHẦN 3: ĐẶC TẢ CHI TIẾT CÁC MODULE & QUY TẮC NGHIỆP VỤ (BUSINESS RULES)



\### MODULE 1: QUẢN LÝ TÀI KHOẢN (ACCOUNT MANAGEMENT)

\- \*\*Phạm vi quyền (\`BR-ACC-03\`, \`BR-ACC-10\`):\*\* Chỉ Quản lý được cấp quyền quản trị (\`role == MANAGER && is_system_admin == true\`) mới được truy cập API và màn hình Quản lý tài khoản. Chặn hoàn toàn nếu truy cập trực tiếp bằng URL.

\- \*\*Ràng buộc dữ liệu (\`BR-ACC-01\`, \`BR-ACC-02\`):\*\*

  - Mỗi hồ sơ nhân viên chỉ liên kết tối đa 1 tài khoản.

  - \`username\` và \`email\` là duy nhất toàn hệ thống.

\- \*\*Khóa & Mở khóa tài khoản (\`BR-ACC-05\`, \`BR-ACC-06\`, \`BR-ACC-07\`):\*\*

  - Khi chuyển sang \`LOCKED\`: Thu hồi ngay lập tức phiên đăng nhập (Session/JWT), chặn đăng nhập mới. Giữ nguyên hồ sơ nhân viên và lịch sử nghiệp vụ.

  - \*\*Hệ quả khi khóa:\*\* Tìm toàn bộ Task của nhân viên đó đang ở trạng thái khác \`COMPLETED\` và \`CANCELLED\` $\rightarrow$ đặt \`needs_reassignment = true\`, gửi thông báo cho Quản lý phụ trách. Nếu người bị khóa là Quản lý dự án (\`Project.manager_id\`), phát cảnh báo khẩn cho Quản trị cấp cao để gán Quản lý mới (\`BR-PRJ-11\`).

  - Khi \`UNLOCK\` (Mở khóa): Chỉ khôi phục quyền truy cập theo role hiện hành, không tự động lấy lại các Task đã được giao lại trước đó.

\- \*\*Bảo mật mật khẩu & Audit (\`BR-ACC-08\`, \`BR-ACC-09\`):\*\* Quản trị viên có thể Reset mật khẩu nhưng không thể xem mật khẩu hiện tại. Mọi thao tác phải ghi Audit Log (không lưu giá trị password vào log).



\---



\### MODULE 2: CƠ CẤU TỔ CHỨC (DEPARTMENT & TEAM)

\- \*\*Cấu trúc phân cấp (\`BR-ORG-01\`, \`BR-ORG-02\`):\*\*

  - \`Department\` là cấp cao nhất. \`Team\` và \`Project\` cùng nằm trực tiếp dưới 1 \`Department\` (không lồng nhau).

  - Tên \`Department\` không trùng với \`Department\` đang hoạt động khác. Tên \`Team\` không trùng với \`Team\` khác trong cùng 1 \`Department\` (khác Department được phép trùng tên - \`AC-ORG-06\`).

\- \*\*Ràng buộc người đứng đầu (\`BR-ORG-03\`, \`BR-ORG-04\`, \`BR-ORG-18\`):\*\*

  - Mỗi \`Department\` phải có $\ge 1$ Người quản trị (\`role = MANAGER\`). Mỗi \`Team\` phải có $\ge 1$ Quản lý Team (\`role = MANAGER\`).

  - Hệ thống chặn thao tác xóa người quản trị/quản lý cuối cùng hoặc thu hồi quyền \`MANAGER\` của họ nếu chưa chỉ định người thay thế.

  - Người quản trị Department mặc định có quyền truy cập Department. Quản lý Team mặc định là thành viên của Team đó.

\- \*\*Cơ chế Thành viên & Nhóm (\`BR-ORG-05\`, \`BR-ORG-06\`, \`BR-ORG-07\`, \`BR-ORG-08\`):\*\*

  - \*\*Thành viên truy cập Department:\*\* Khi thêm bằng \`Group\`, quyền truy cập mang tính \*\*động (Dynamic)\*\* — ai vào Group sau này tự động thấy Department, ai rời Group tự động mất quyền. Chỉ người quản trị và thành viên truy cập mới thấy Department trong dropdown khi tạo Team/Project.

  - \*\*Thành viên Team:\*\* Khi thêm bằng \`Group\`, hệ thống chỉ lấy danh sách thành viên tại thời điểm thêm (\*\*Snapshot\*\*) và kiểm tra quy tắc 1 Team.

  - \*\*Quy tắc 1 Team duy nhất (\`BR-ORG-15\`):\*\* Mỗi nhân viên chỉ thuộc \*\*đúng 1 Team\*\*. Khi thêm nhân viên đang ở Team A vào Team B $\rightarrow$ Hiển thị cảnh báo rõ tên Team A. Nếu người thao tác xác nhận $\rightarrow$ Chuyển nhân viên sang Team B, xóa khỏi Team A, và toàn bộ Task chưa đóng của nhân viên đó tại Team A bị gắn cờ \`needs_reassignment = true\` kèm thông báo cho Quản lý Team A (\`BR-ORG-09\`).

\- \*\*Quy tắc Duyệt đơn theo Tổ chức (\`BR-ORG-16\`, \`BR-ORG-17\`):\*\*

  - Quản lý trực tiếp của nhân viên là tất cả Quản lý của Team mà nhân viên đó thuộc về. Bất kỳ Quản lý nào của Team cũng nhận thông báo và có quyền duyệt/từ chối đơn. Khi 1 Quản lý đã xử lý, các Quản lý còn lại chỉ được xem (\`AC-ORG-16\`).

  - Đơn của Quản lý Team do Người quản trị Department duyệt. Không ai được tự duyệt đơn của chính mình (\`BR-LV-05\`).

\- \*\*Ngừng hoạt động & Xóa (\`BR-ORG-10\`, \`BR-ORG-11\`, \`BR-ORG-12\`):\*\*

  - Chỉ ngừng hoạt động (\`INACTIVE\`) một \`Team\` khi không còn Task nào ở trạng thái \`TODO\`, \`IN_PROGRESS\`, \`REOPENED\`, \`PENDING_REVIEW\`, \`ON_HOLD\`.

  - Chỉ ngừng hoạt động một \`Department\` khi 100% \`Team\` và \`Project\` bên trong đã ngừng hoạt động.

  - Chỉ xóa vĩnh viễn khi tạo nhầm và chưa phát sinh bất kỳ dữ liệu con nào.



\---



\### MODULE 3: QUẢN LÝ PHÂN QUYỀN (RBAC + CONTEXTUAL ABAC MATRIX)



Khi xây dựng Middleware / Guard kiểm tra quyền, AI phải hiện thực hóa chính xác bảng kiểm tra dưới đây:



\| Nhóm chức năng | Thao tác cụ thể | Quản trị cấp cao (\`is_system_admin\`) | Quản lý (\`MANAGER\`) | Nhân viên (\`EMPLOYEE\`) | Điều kiện Nghiệp vụ Bắt buộc (Runtime Check) |

\| :--- | :--- | :---: | :---: | :---: | :--- |

\| \*\*Tài khoản & Cấu hình\*\* | Tạo/sửa/khóa/mở khóa TK, Reset mật khẩu, Cấp/thu hồi quyền Quản lý, Đổi cấu hình chung | ✓ | △ | – | \`MANAGER\` phải được cấp quyền quản trị (\`is_system_admin = true\`). Khi thu hồi role \`MANAGER\`, kiểm tra \`BR-ORG-18\`. |

\| \*\*Department\*\* | Tạo, Ngừng hoạt động / Kích hoạt lại Department | ✓ | △ | – | Quản lý được giao quyền quản trị. Ngừng hoạt động phải thỏa \`BR-ORG-10\`. |

\| \*\*Department\*\* | Sửa thông tin, Thêm/bớt người quản trị & thành viên truy cập | ✓ | △ | – | Phải là Người quản trị của Department đó. Giữ tối thiểu 1 người quản trị (\`BR-ORG-03\`). |

\| \*\*Team\*\* | Tạo Team trong Department | ✓ | △ | – | Là Người quản trị hoặc Thành viên truy cập của Department đó (\`BR-ORG-08\`). Nhân viên không được tạo Team (\`AC-ORG-17\`). |

\| \*\*Team\*\* | Sửa Team, đổi quản lý, thêm/bớt thành viên, ngừng hoạt động | ✓ | △ | – | Là Quản lý của Team đó hoặc Người quản trị Department chứa Team. Ngừng hoạt động phải thỏa \`BR-ORG-11\`. |

\| \*\*Team\*\* | Xem thông tin, thành viên & Kanban của Team | ✓ | △ | △ | Chỉ Thành viên Team, Quản lý Team và Người quản trị Department mới xem được (\`BR-ORG-07\`). |

\| \*\*Nhóm Chat\*\* | Tạo nhóm chat nội bộ | ✓ | ✓ | ✓ | Người tạo mặc định là Quản trị viên nhóm chat (\`BR-PER-13\`). |

\| \*\*Nhóm Chat\*\* | Đổi tên nhóm, thêm/bớt thành viên nhóm chat | ✓ | △ | △ | Chỉ người có quyền Quản trị nhóm chat (không phụ thuộc role hệ thống). |

\| \*\*Điểm danh\*\* | Check-in, đổi trạng thái, Check-out, Xem công cá nhân | ✓ | ✓ | ✓ | Chỉ thao tác trên bản ghi của chính mình. |

\| \*\*Điểm danh\*\* | Xem quân số chi tiết, xuất bảng công tháng | ✓ | ✓ | – | Quản lý xem trong phạm vi quản lý. Nhân viên chỉ thấy trạng thái làm việc của đồng nghiệp, \*\*ẩn\*\* giờ check-in và lý do nghỉ (\`BR-PER-14\`). |

\| \*\*Đơn từ\*\* | Gửi đơn, hủy đơn của bản thân | ✓ | ✓ | ✓ | Hủy khi đang \`PENDING\` hoặc \`APPROVED\` nhưng chưa đến ngày nghỉ. |

\| \*\*Đơn từ\*\* | Duyệt / Từ chối đơn nghỉ hoặc giải trình | ✓ | △ | – | Chỉ Quản lý trực tiếp (Quản lý Team duyệt cho Member; Quản trị Dept duyệt cho Quản lý Team). Cấm tự duyệt đơn của mình (\`BR-LV-05\`). |

\| \*\*Task\*\* | Tạo task, giao lại task, đổi Deadline, chỉ định Người kiểm tra, Duyệt/Chủ động Hoãn/Hủy | ✓ | △ | – | Quản lý trong phạm vi Team/Project mình quản lý. |

\| \*\*Task\*\* | Bắt đầu làm (\`TR-02\`), Nộp kiểm tra (\`TR-03\`, \`TR-09\`), Tiếp tục sau hoãn (\`TR-07\`), Đề xuất đổi Deadline/Hoãn/Hủy | ✓ | △ | △ | \*\*Chỉ Người phụ trách (\`assignee_id\`)\*\* của Task đó mới được thực hiện (\`BR-ST-01\`). |

\| \*\*Task\*\* | Kiểm tra task: Chuyển sang \`COMPLETED\` (\`TR-04\`) hoặc \`REOPENED\` (\`TR-05\`) | ✓ | △ | △ | \*\*Chỉ Người kiểm tra (\`reviewer_id\`)\*\* được chỉ định trên Task (có thể là Nhân viên như Tester - \`BR-TSK-11\`, \`BR-PER-06\`). |

\| \*\*Dự án (Scrum)\*\* | Tạo Project, tạo/kích hoạt/đóng Sprint, quản lý Product Backlog | ✓ | △ | – | Role \`MANAGER\` (Người quản trị/truy cập Dept tạo Project; Project Manager quản lý Backlog/Sprint - \`BR-PRJ-01\`). |

\| \*\*Dự án (Scrum)\*\* | Ước tính Story Points, nhận task (Pull), tạo Meeting Note & Ý kiến KH | ✓ | ✓ | △ | Là Thành viên tham gia dự án (\`BR-PRJ-02\`, \`BR-PRJ-12\`). Chỉ PM hoặc người tạo Note mới được sửa/xóa Note. |



\---



\### MODULE 4: ĐIỂM DANH & QUẢN LÝ TRẠNG THÁI LÀM VIỆC (ATTENDANCE)

\- \*\*Quy tắc Check-in (\`BR-ATT-01\`, \`BR-ATT-02\`, \`NFR-USA-01\`):\*\*

  - Hoàn thành tối đa trong 2-3 thao tác. Mỗi ngày tối đa 1 bản ghi/nhân viên.

  - Nếu chọn \`OFFICE\` ("Tại văn phòng"): Kiểm tra IP request có nằm trong \`office_ip_whitelist\` không. Nếu không khớp $\rightarrow$ Chặn và trả về thông báo: *\*"Bạn không kết nối wifi văn phòng"\**, gợi ý chọn \`REMOTE\` hoặc \`BUSINESS_TRIP\`.

\- \*\*Công thức tính Đi muộn, Về sớm, Giờ làm thực tế (Mục 6.3, \`BR-ATT-03\`, \`BR-ATT-06\`):\*\*

  - Mọi phép tính \*\*làm tròn xuống theo phút, bỏ phần giây\*\* (VD: Check-in \`07:00:59\` với giờ bắt đầu \`07:00\` $\rightarrow$ \`07:00\` $\rightarrow$ Không đi muộn).

  - \*\*Đi muộn (\`late_minutes\`):\*\* Nếu $\text{CheckInTime} > (\text{WorkStartTime} + \text{LateGraceMinutes})$, thì:

    $$\text{late\\\_minutes} = \text{ CheckInTime (phút)} - \text{WorkStartTime (phút)}$$

    *\*(Lưu ý: Khi đã vượt quá thời gian ân hạn, số phút đi muộn tính từ mốc \`WorkStartTime\` gốc, không trừ đi số phút ân hạn - \`AC-ATT-05\`).\**

  - \*\*Về sớm (\`early_leave_minutes\`):\*\* Nếu $\text{CheckOutTime} < \text{WorkEndTime}$, thì:

    $$\text{early\\\_leave\\\_minutes} = \text{WorkEndTime (phút)} - \text{CheckOutTime (phút)}$$

  - \*\*Giờ làm thực tế:\*\* $\text{CheckOutTime} - \text{CheckInTime}$.

  - \*\*Thiếu Check-out:\*\* Cronjob chạy lúc \`auto_close_record_time\` (VD \`23:59\`) tự động đóng các bản ghi chưa check-out, gán \`is_missing_checkout = true\`, \`actual_work_minutes = null\`, \`early_leave_minutes = 0\`.

  - \*\*Ngoại lệ Nghỉ nửa ngày (\`BR-ATT-11\`):\*\* Có đơn nghỉ buổi sáng đã duyệt $\rightarrow$ Không tính đi muộn. Có đơn nghỉ buổi chiều đã duyệt $\rightarrow$ Không tính về sớm.

\- \*\*Nhắc nhở & Cảnh báo tự động (\`BR-ATT-04\`, \`BR-ATT-05\`):\*\*

  - Không chạy nhắc nhở/cảnh báo vào ngày nghỉ cuối tuần, ngày lễ, hoặc khi nhân viên có đơn nghỉ \`APPROVED\` / \`PENDING\` trong ngày đó.

  - Tại mốc $\text{WorkStartTime} - \text{ReminderMins}$: Gửi thông báo nhắc nhân viên chưa check-in.

  - Tại mốc $\text{WorkStartTime} + \text{AlertMins}$: Chuyển trạng thái sang \`UNCHECKED\` ("Chưa điểm danh" - tô đỏ) và gửi cảnh báo cho các Quản lý trực tiếp của Team.

\- \*\*Thay đổi cấu hình (\`BR-ATT-10\`):\*\* Khi Quản trị cấp cao đổi tham số giờ làm việc, cấu hình mới \*\*chỉ áp dụng từ ngày làm việc tiếp theo\*\*, không tính lại dữ liệu của ngày hôm nay và các ngày quá khứ.



\---



\### MODULE 5: ĐƠN TỪ & NGHỈ PHÉP (LEAVE & EXPLANATION REQUESTS)

\- \*\*Các loại đơn (Mục 7.1):\*\*

  1. \`ANNUAL_LEAVE\` (Nghỉ phép): Gửi trước $\ge 3$ ngày. Nếu gửi sát ngày hơn ($< 3$ ngày), hệ thống \*\*vẫn cho phép gửi\*\* nhưng tự động gắn nhãn \`is_late_submission = true\` ("Gửi muộn") để Quản lý xem xét (\`BR-LV-10\`).

  2. \`SICK_LEAVE\` (Nghỉ ốm): Gửi ngay trong ngày, có thể đính kèm file, không bị gắn nhãn gửi muộn.

  3. \`ATTENDANCE_EXPLANATION\` (Giải trình điểm danh): Gửi trong vòng \`explanation_deadline_workdays\` (3 ngày làm việc). Khi được duyệt, hệ thống tính lại \`late_minutes\`, \`early_leave_minutes\`, \`actual_work_minutes\` và lưu giá trị cũ vào lịch sử (\`BR-ATT-12\`, \`BR-LV-07\`).

  *\*(Lưu ý: Làm Remote nhân viên chọn trực tiếp khi Check-in, không cần gửi đơn).\**

\- \*\*Kiểm tra Trùng & Hạn mức (\`BR-LV-02\`, \`BR-LV-11\`, \`BR-LV-12\`):\*\*

  - Chặn gửi đơn nếu trùng khoảng thời gian với đơn khác đang \`PENDING\` hoặc \`APPROVED\`.

  - Nếu số ngày xin nghỉ phép vượt quá số ngày phép còn lại (\`annual_leave_quota - used_leave_days\`): Cảnh báo nhân viên, \*\*vẫn cho gửi\*\* và gắn nhãn \`is_over_quota = true\` ("Vượt hạn mức"). Khi được duyệt, số ngày vượt được đánh dấu là \*\*"Nghỉ trừ lương"\*\* trên bảng điểm danh tháng.

\- \*\*Xử lý Đơn quá hạn duyệt & Duyệt sau ngày nghỉ (\`BR-LV-13\`, \`BR-LV-14\`):\*\*

  - Đơn \`PENDING\` quá 1 ngày làm việc $\rightarrow$ Nhắc Quản lý. Còn 1 ngày trước ngày nghỉ mà chưa duyệt $\rightarrow$ Nhắc Quản lý và \*\*báo cho cấp trên của Quản lý\*\*.

  - Đến ngày nghỉ mà đơn vẫn \`PENDING\` $\rightarrow$ Hiển thị \`"Chưa điểm danh (Đơn chờ duyệt)"\`, không nhắc check-in, không báo vắng.

  - Quản lý vẫn được Duyệt/Từ chối sau ngày nghỉ: Nếu \*\*Duyệt\*\* $\rightarrow$ Cập nhật thành Nghỉ phép/Nghỉ ốm và trừ phép. Nếu \*\*Từ chối\*\* (bắt buộc nhập lý do) $\rightarrow$ Những ngày đó chuyển thành \*\*"Nghỉ không phép"\*\* (\`is_unexcused_absence = true\`).



\---



\### MODULE 6: GIAO VIỆC, LUỒNG TRẠNG THÁI TASK & BẢNG KANBAN

\- \*\*Ràng buộc Khởi tạo Task (\`BR-TSK-01\` $\rightarrow$ \`BR-TSK-11\`, Mục 2.9):\*\*

  - Bắt buộc có: \`title\`, \`assignee_id\`, \`reviewer_id\` ($\neq$ \`assignee_id\`), \`deadline\` ($\ge \text{now}$), và nguồn gốc (\`team_id\` hoặc \`project_id\`).

  - \`assignee_id\` và \`reviewer_id\` bắt buộc phải là thành viên của Team hoặc Project chứa Task đó.

  - \*\*Cảnh báo thông minh (Không chặn lưu):\*\*

    - Nếu cùng \`assignee_id\` đang có task chưa đóng có \`title\` tương tự (Fuzzy match) $\rightarrow$ Cảnh báo trùng lặp (\`BR-TSK-03\`).

    - Nếu \`assignee_id\` đang có $\ge 3$ task \`IN_PROGRESS\` hoặc có đơn nghỉ \`APPROVED\` trùng trước \`deadline\` $\rightarrow$ Hiển thị cảnh báo quá tải/sắp nghỉ (\`BR-TSK-06\`).

\- \*\*Máy trạng thái Task (Task State Machine - Bảng 9.1b):\*\*

  Hệ thống chỉ cho phép đúng 9 luồng chuyển trạng thái hợp lệ sau (mọi luồng khác phải bị chặn ở tầng API):

  - \`TR-01\`: \`(New)\` $\rightarrow$ \`TODO\` (Bởi: Quản lý).

  - \`TR-02\`: \`TODO\` $\rightarrow$ \`IN_PROGRESS\` (Bởi: \`assignee_id\`).

  - \`TR-03\`: \`IN_PROGRESS\` $\rightarrow$ \`PENDING_REVIEW\` (Bởi: \`assignee_id\` $\rightarrow$ Thông báo \`reviewer_id\`).

  - \`TR-04\`: \`PENDING_REVIEW\` $\rightarrow$ \`COMPLETED\` (Bởi: \`reviewer_id\` $\rightarrow$ Khóa task, cập nhật % hoàn thành, báo \`assignee_id\` và Quản lý).

  - \`TR-05\`: \`PENDING_REVIEW\` $\rightarrow$ \`REOPENED\` (Bởi: \`reviewer_id\` $\rightarrow$ \*\*Bắt buộc nhập lý do\*\* lưu vào Comment. Nếu \`deadline\` đã qua, bắt buộc phải có \`deadline\` mới do Quản lý đặt trước thì mới chuyển được - \`AC-ST-23\`).

  - \`TR-06\`: \`TODO | IN_PROGRESS | REOPENED | PENDING_REVIEW\` $\rightarrow$ \`ON_HOLD\` (Nhân viên đề xuất kèm lý do & Quản lý duyệt, hoặc Quản lý chủ động kèm lý do. Lưu lại \`previous_status_before_hold\`, tạm dừng cảnh báo Deadline).

  - \`TR-07\`: \`ON_HOLD\` $\rightarrow$ \`previous_status_before_hold\` (Bởi: \`assignee_id\`. Nếu trạng thái quay về là \`TODO\`, \`IN_PROGRESS\`, \`REOPENED\` mà \`deadline\` đã qua, bắt buộc phải được Quản lý duyệt Deadline mới trước - \`BR-ST-10\`).

  - \`TR-08\`: \`TODO | IN_PROGRESS | REOPENED | PENDING_REVIEW | ON_HOLD\` $\rightarrow$ \`CANCELLED\` (Nhân viên đề xuất kèm lý do & Quản lý duyệt, hoặc Quản lý chủ động kèm lý do. Khóa task, không tính vào mẫu số tổng số task khi tính % hoàn thành - \`BR-ST-11\`).

  - \`TR-09\`: \`REOPENED\` $\rightarrow$ \`PENDING_REVIEW\` (Bởi: \`assignee_id\`).

  - *\*Quy tắc tự đóng đề xuất (\`BR-ST-15\`):\** Nếu Task đang ở \`PENDING_REVIEW\` và có đề xuất Hoãn/Hủy đang chờ duyệt, mà \`reviewer_id\` chuyển Task sang \`COMPLETED\` hoặc \`REOPENED\`, đề xuất đó tự động đóng và ghi vào lịch sử.

\- \*\*Quy tắc Bảng Kanban & Cảnh báo Màu sắc (Mục 10.1 - 10.3):\*\*

  - \*\*6 Cột hiển thị mặc định:\*\* \`Cần làm\` $\rightarrow$ \`Đang làm\` $\rightarrow$ \`Làm lại\` $\rightarrow$ \`Chờ kiểm tra\` $\rightarrow$ \`Hoãn lại\` $\rightarrow$ \`Hoàn thành\`. Cột \`Đã hủy\` mặc định ẩn, chỉ hiện khi bật bộ lọc *\*"Hiện task đã hủy"\** (hiển thị thẻ màu xám, gạch ngang chữ).

  - \*\*Kéo thả (Drag & Drop):\*\* Nhân viên được kéo thả để chuyển trạng thái hợp lệ hoặc kéo vào cột \`Hoãn lại\` / \`Đã hủy\` để mở popup gửi đề xuất (thẻ vẫn nằm ở cột cũ kèm nhãn *\*"Chờ duyệt hoãn/hủy"\** cho đến khi Quản lý duyệt). Riêng thao tác nghiệm thu (\`TR-04\`, \`TR-05\`) của \`reviewer_id\` phải bấm nút trong màn hình Chi tiết Task (\`SCR-03\`), \*\*không dùng kéo thả\*\*.

  - \*\*Cảnh báo Deadline (\`BR-KB-01\` $\rightarrow$ \`BR-KB-08\`):\*\* Chỉ áp dụng cho 3 trạng thái: \`TODO\`, \`IN_PROGRESS\`, \`REOPENED\` (gỡ ngay khi sang \`PENDING_REVIEW\`, \`ON_HOLD\`, \`COMPLETED\`, \`CANCELLED\`):

    - \*\*Bình thường:\*\* $\text{Deadline} - \text{Now} > 24\text{h}$ (Không màu).

    - \*\*Sắp đến hạn:\*\* $0 < \text{Deadline} - \text{Now} \le 24\text{h}$ (Màu Vàng + Nhãn chữ \`"Sắp đến hạn"\`).

    - \*\*Quá hạn:\*\* $\text{Now} > \text{Deadline}$ (Màu Đỏ + Nhãn chữ \`"Quá hạn"\`).

  - \*\*Thứ tự sắp xếp thẻ trong mỗi cột (\`BR-TSK-09\`):\*\* \`Quá hạn\` $\rightarrow$ \`Sắp đến hạn\` $\rightarrow$ \`Deadline gần nhất\`.

  - \*\*Công thức Tỷ lệ hoàn thành trên Dashboard (\`BR-TSK-08\`):\*\*

    $$\text{Completion Rate (\\%)} = \frac{\text{Số task COMPLETED}}{\text{Tổng số task (không tính CANCELLED)}} \times 100$$



\---



\### MODULE 7: QUẢN LÝ DỰ ÁN AGILE / SCRUM (PROJECT MANAGEMENT)

\- \*\*Quản lý Sprint & Story Points (\`BR-PRJ-03\` $\rightarrow$ \`BR-PRJ-07\`):\*\*

  - Tại một thời điểm, mỗi Project chỉ có tối đa \*\*01 \`ACTIVE\` Sprint\*\* (\`AC-PRJ-03\`).

  - \`story_points\` của Task/Story chỉ nhận giá trị thuộc dãy Fibonacci chuẩn: \`1, 2, 3, 5, 8, 13, 21...\` (\`AC-PRJ-11\`).

  - \`Deadline\` của mọi Task con trong Sprint \*\*bắt buộc\*\* nằm trong khoảng \`[Sprint.start_date, Sprint.end_date]\`. Chặn lưu và bôi đỏ nếu vượt quá (\`BR-PRJ-04\`, \`AC-PRJ-04\`).

  - \*\*Tiến độ Sprint tự động (\`BR-PRJ-06\`):\*\*

    $$\text{Sprint Progress (\\%)} = \frac{\sum \text{Story Points (COMPLETED)}}{\sum \text{Story Points (Cam kết trong Sprint)}} \times 100$$

  - \*\*Biểu đồ:\*\* Cung cấp dữ liệu real-time cho \*\*Burndown Chart\*\* (Đường lý tưởng \`Ideal Burn\` vs Đường thực tế \`Actual Remaining Points\` theo ngày) và \*\*Velocity Chart\*\* qua các Sprint.

  - \*\*Đóng Sprint & Rollover (\`BR-PRJ-07\`):\*\* Khi Quản lý đóng Sprint, nếu còn Task chưa \`COMPLETED\` hoặc \`CANCELLED\`, hiển thị Dialog yêu cầu Quản lý chọn: đẩy về \`Product Backlog\` hoặc chuyển sang Sprint kế tiếp. Nếu xóa một Sprint đang ở trạng thái \`PLANNING\`, toàn bộ Story bên trong tự động trả về \`Product Backlog\` (\`AC-PRJ-10\`).

\- \*\*Tạm dừng & Đóng Dự án (\`BR-PRJ-08\`, \`BR-PRJ-09\`, \`BR-PRJ-10\`):\*\*

  - Chuyển Project sang \`ON_HOLD\` ("Tạm dừng"): Tự động tạm dừng Active Sprint hiện tại, chuyển toàn bộ Task đang mở sang \`ON_HOLD\` và gỡ cảnh báo trễ hạn. Khi khôi phục dự án, trả Task về trạng thái trước đó.

  - Nút chuyển Project sang \`COMPLETED\` ("Hoàn thành") chỉ mở khi 100% Items trong Product Backlog và các Sprint đã ở trạng thái \`COMPLETED\` hoặc \`CANCELLED\`.

\- \*\*Hợp đồng, Ý kiến Khách hàng & Side Panel Meeting Notes (\`BR-PRJ-12\`, \`BR-PRJ-13\`):\*\*

  - Hỗ trợ lưu mã hợp đồng, file hợp đồng (PDF/Docx $\le 50\text{MB}$) và danh sách phản hồi khách hàng.

  - Trên màn hình Active Sprint Kanban / Backlog, có \*\*Bảng Note kế bên (Side Panel)\*\* bật/tắt linh hoạt để ghi chép nhanh khi họp, xem chi tiết Popup và gắn link trực tiếp Note với nhiều Task/User Story.



\---



\### MODULE 8: TRAO ĐỔI, BÌNH LUẬN & HỆ THỐNG THÔNG BÁO (COMMUNICATION & NOTIFICATIONS)

\- \*\*Không gian trao đổi (\`11.1\`, \`BR-TB-04\`, \`BR-TB-07\`):\*\*

  - \*\*Bình luận trong Task:\*\* Gắn trực tiếp tại \`SCR-03\`, hỗ trợ \`@mention\` và \*\*Rich Link Preview\*\* (tự động nhận diện icon và hiển thị preview cho Google Drive, Figma, GitHub).

  - \*\*2 Loại nhóm trò chuyện:\*\*

    1. *\*Kênh trao đổi của Team (Nhóm chính):\** Do Quản lý tạo theo Team, ưu tiên đẩy thông báo công việc tập thể.

    2. *\*Nhóm chat nội bộ (Nhóm tự do):\** Do bất kỳ người dùng nào tạo (chat 1-1 hoặc nhóm), người tạo là Admin nhóm chat.

\- \*\*Cơ chế Gửi Thông báo Đa kênh (\`11.2\`, \`BR-TB-01\`, \`BR-TB-02\`, \`BR-TB-05\`):\*\*

  - \*\*Kênh hỗ trợ:\*\* \`In-app Notification\` (Ưu tiên số 1, Real-time), \`Email\`, và \`Zalo\` qua API tích hợp (\`NFR-COM-03\`).

  - \*\*Fault Isolation (\`BR-TB-02\`):\*\* Gửi Email/Zalo phải xử lý bất đồng bộ (Background Queue). Nếu API Email/Zalo lỗi, \*\*tuyệt đối không\*\* làm rollback giao dịch nghiệp vụ chính hoặc làm mất thông báo In-app.

  - \*\*Chống Spam (\`BR-TB-05\`):\*\* Nếu một nhân viên có nhiều Task quá hạn cùng lúc, hệ thống phải gộp (Batch/Digest) thành \*\*01 Email/Thông báo tổng hợp duy nhất\*\*.

  - \*\*Kiểm tra trạng thái mới nhất trước khi bắn cảnh báo (\`BR-TB-06\`, \`BR-TB-09\`):\*\* Trước khi worker phát thông báo sắp đến hạn/quá hạn của Task hoặc Sprint (còn 24h trước \`Sprint.end_date\`), phải đọc lại DB để chắc chắn Task chưa chuyển sang \`PENDING_REVIEW\`, \`ON_HOLD\`, \`COMPLETED\`, \`CANCELLED\`.



\---



\## PHẦN 4: YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS CHECKLIST)



AI Agent cần áp dụng các thông số kỹ thuật sau khi thiết kế kiến trúc hệ thống:

1\. \*\*Hiệu năng (\`NFR-PERF\`):\*\*

   - API Check-in phản hồi $\le 1.5\text{s}$ cho $\ge 98\\%$ request.

   - Thời gian tải trang chính (Kanban, Dashboard, Danh sách) $\le 2.0\text{s}$.

   - Đồng bộ Real-time (Quân số, Trạng thái Task, % Tiến độ, Burndown Chart) lên màn hình Quản lý trong vòng $\le 2.0\text{s}$.

   - Đáp ứng tối thiểu \*\*500 CCU\*\* (người dùng đồng thời) trong khung giờ Check-in cao điểm (\`NFR-SCA-01\`).

2\. \*\*Bảo mật (\`NFR-SEC\`):\*\*

   - Mã hóa HTTPS toàn bộ kết nối.

   - Tự động hết hạn phiên đăng nhập (Session Timeout) sau \*\*30 phút\*\* không hoạt động (\`NFR-SEC-04\`).

3\. \*\*Độ tin cậy & Khả năng sử dụng (\`NFR-REL\`, \`NFR-USA\`):\*\*

   - Uptime đạt tối thiểu $99.5\\%/\text{tháng}$. Sao lưu dữ liệu tự động tối thiểu 1 lần/ngày.

   - Giao diện Responsive tương thích Desktop, Tablet, Mobile (trên Mobile bảng Kanban hỗ trợ cuộn ngang hoặc chuyển Tab cột mượt mà - \`NFR-USA-05\`).

   - Mọi nhãn màu cảnh báo (Vàng, Đỏ, Xám) đều phải đi kèm \*\*nhãn văn bản (Text Badge)\*\* để đảm bảo khả năng tiếp cận (\`BR-KB-03\`).





\---



\## PHẦN 5: FRONTEND UX/UI DESIGN AGENT SKILL



\> \*\*Phạm vi:\*\* Phần này bổ sung quy trình cho AI Agent phân tích UX, thiết kế giao diện và triển khai Frontend. Đây là lớp hướng dẫn bổ sung cho các Business Rules, Data Schema và NFR ở các phần trước; không thay thế hoặc tự ý sửa đổi chúng.



\### 5.1. Thứ tự ưu tiên khi Agent làm việc



Trước khi thiết kế hoặc sửa giao diện, Agent phải:



1\. Đọc toàn bộ tài liệu đặc tả này, đặc biệt là Data Schema, Business Rules, RBAC + Contextual ABAC Matrix và Non-Functional Requirements.

2\. Xác định module, màn hình và nhóm người dùng đang được giao.

3\. Đối chiếu quyền thao tác với bảng phân quyền ở Module 3. Không suy luận quyền chỉ từ tên chức danh hoặc nhãn hiển thị.

4\. Đối chiếu trạng thái và luồng nghiệp vụ với state machine/quy tắc tương ứng trước khi thiết kế nút, menu, drag-and-drop hoặc hành động.

5\. Kiểm tra API contract, dữ liệu và component hiện có trong repository trước khi đề xuất hoặc triển khai.

6\. Nếu có tài liệu Design System, design token hoặc UI guideline của dự án, phải đọc và tuân thủ chúng.



Khi có mâu thuẫn, không tự chọn một quy tắc để triển khai. Ghi rõ nội dung mâu thuẫn, vị trí tài liệu liên quan và yêu cầu xác nhận.



\### 5.2. Nguyên tắc thiết kế giao diện theo quyền



\- Giao diện phải phản ánh đúng quyền thao tác theo Role và Runtime Context. Không coi \`EMPLOYEE\` hoặc \`MANAGER\` là điều kiện đủ cho mọi hành động.

\- Chỉ hiển thị hoặc kích hoạt hành động khi người dùng đáp ứng điều kiện nghiệp vụ tương ứng; tuy nhiên, ẩn nút trên giao diện không thay thế kiểm tra quyền tại API.

\- Với hành động không được phép, không tạo trải nghiệm khiến người dùng tưởng rằng thao tác có thể thực hiện thành công.

\- Trạng thái không có quyền, ngoài phạm vi phụ trách, dữ liệu không tồn tại hoặc thao tác không hợp lệ phải có phản hồi rõ ràng, không để nút lỗi hoặc màn hình trống không giải thích.

\- Không đưa thông tin nhạy cảm hoặc dữ liệu ngoài phạm vi người dùng vào giao diện, kể cả trong tooltip, preview, HTML ẩn, log phía client hoặc dữ liệu tải trước.

\- Đối với Quản trị cấp cao, các hành động override ngoài phạm vi cần có nội dung xác nhận và lý do nếu nghiệp vụ yêu cầu; giao diện phải giúp người dùng nhận biết đây là thao tác đặc biệt.



\### 5.3. Quy tắc thiết kế theo module nghiệp vụ



\#### A. Tài khoản và nhân sự



\- Phân biệt rõ Role hệ thống (\`EMPLOYEE\`, \`MANAGER\`), cờ \`is_system_admin\` và chức danh \`job_title\`.

\- Trạng thái tài khoản \`ACTIVE\` và \`LOCKED\` phải có nhãn chữ rõ ràng, không chỉ phân biệt bằng màu.

\- Hành động khóa/mở khóa và reset mật khẩu cần xác nhận phù hợp; tuyệt đối không hiển thị mật khẩu hiện tại hoặc \`password_hash\`.

\- Khi khóa tài khoản làm phát sinh Task cần giao lại hoặc cảnh báo liên quan Project Manager, giao diện cần thể hiện kết quả và cảnh báo theo dữ liệu API trả về.



\#### B. Department và Team



\- Thể hiện đúng cấu trúc: Company → Department; Team và Project cùng cấp trực tiếp dưới Department.

\- Không thiết kế Team lồng trong Team hoặc Project lồng trong Team.

\- Khi chuyển nhân viên từ Team này sang Team khác, phải hiển thị cảnh báo có tên Team hiện tại và giải thích hệ quả Task cần giao lại trước khi người dùng xác nhận.

\- Phân biệt thành viên truy cập Department theo Group (Dynamic) với thành viên Team được thêm từ Group theo Snapshot; không dùng một cách diễn đạt khiến người dùng hiểu nhầm hai cơ chế này giống nhau.

\- Các thao tác ngừng hoạt động phải giải thích điều kiện chưa đáp ứng nếu Department/Team còn dữ liệu hoặc Task đang mở.



\#### C. Phân quyền



\- Thiết kế trạng thái và hành động theo đúng ma trận RBAC + Contextual ABAC tại Module 3.

\- Những hành động phụ thuộc \`assignee_id\`, \`reviewer_id\`, quản lý Team, quản lý Project hoặc Department Admin phải được thể hiện đúng đối tượng chịu trách nhiệm.

\- Không suy ra quyền duyệt đơn chỉ từ việc người dùng có Role \`MANAGER\`.

\- Trường hợp người dùng có thể xem nhưng không thể sửa cần phân biệt rõ quyền View và quyền Manage.



\#### D. Điểm danh



\- Luồng Check-in phải hoàn thành trong 2–3 thao tác theo yêu cầu nghiệp vụ.

\- Các lựa chọn \`OFFICE\`, \`BUSINESS_TRIP\`, \`REMOTE\`, \`ON_LEAVE\` và \`UNCHECKED\` phải có nhãn dễ hiểu.

\- Khi chọn \`OFFICE\` nhưng IP không hợp lệ, hiển thị đúng thông báo nghiệp vụ: “Bạn không kết nối wifi văn phòng”, đồng thời gợi ý lựa chọn phù hợp theo đặc tả.

\- Khi chọn \`BUSINESS_TRIP\`, yêu cầu nhập \`location_note\`.

\- Thể hiện rõ đi muộn, về sớm, thiếu Check-out, nghỉ không phép và nghỉ trừ lương. Không chỉ dùng màu để biểu thị.

\- Không hiển thị giờ Check-in hoặc lý do nghỉ của đồng nghiệp cho nhân viên nếu đặc tả quy định phải ẩn thông tin đó.

\- Không tự tính hoặc suy diễn kết quả công ở frontend nếu API là nguồn dữ liệu nghiệp vụ chính thức.



\#### E. Đơn từ và nghỉ phép



\- Phân biệt rõ loại đơn: \`ANNUAL_LEAVE\`, \`SICK_LEAVE\`, \`ATTENDANCE_EXPLANATION\`.

\- Hiển thị trạng thái \`PENDING\`, \`APPROVED\`, \`REJECTED\`, \`CANCELLED\` cùng thời gian và người xử lý nếu API cung cấp.

\- Với đơn nghỉ phép gửi sát ngày, vẫn cho phép gửi theo đặc tả nhưng cần thể hiện nhãn “Gửi muộn”.

\- Với đơn vượt hạn mức, hiển thị cảnh báo “Vượt hạn mức”; không tự chặn gửi đơn.

\- Khi từ chối đơn, yêu cầu nhập lý do theo nghiệp vụ.

\- Không cho người dùng tự duyệt đơn của chính mình; chỉ hiển thị hành động duyệt cho đúng người có thẩm quyền.

\- Các trạng thái đơn đang chờ duyệt sau ngày nghỉ phải được trình bày đúng, tránh hiển thị thành nghỉ không phép trước khi có kết quả xử lý.



\#### F. Task và Kanban



\- Giữ đúng các trạng thái Task và các chuyển trạng thái hợp lệ được mô tả tại Module 6. Không tự thêm trạng thái hoặc cho phép chuyển trạng thái tùy ý.

\- Kanban mặc định có sáu cột: Cần làm, Đang làm, Làm lại, Chờ kiểm tra, Hoãn lại, Hoàn thành. Cột Đã hủy mặc định ẩn và chỉ hiện khi bật bộ lọc tương ứng.

\- Chỉ người phụ trách (\`assignee_id\`) được thực hiện các thao tác dành cho người phụ trách; chỉ người kiểm tra (\`reviewer_id\`) được nghiệm thu Task.

\- Nghiệm thu \`COMPLETED\` hoặc \`REOPENED\` phải thực hiện bằng hành động trong màn hình Chi tiết Task, không thiết kế drag-and-drop cho hai thao tác này.

\- Kéo Task vào Hoãn lại/Đã hủy khi cần đề xuất phải mở luồng đề xuất; thẻ vẫn ở cột cũ và có nhãn chờ duyệt cho đến khi được xử lý.

\- Hiển thị \`needs_reassignment\` như một cảnh báo “Cần giao lại”, không tự thay đổi người phụ trách.

\- Cảnh báo Deadline phải tuân thủ đúng trạng thái được áp dụng và các ngưỡng 24 giờ trong đặc tả. Luôn có nhãn văn bản đi kèm màu cảnh báo.

\- Giữ đúng thứ tự ưu tiên sắp xếp: Quá hạn → Sắp đến hạn → Deadline gần nhất.



\#### G. Project và Agile/Scrum



\- Phân biệt Product Backlog, Sprint Planning, Active Sprint và Sprint đã hoàn thành.

\- Không thiết kế luồng cho phép có nhiều hơn một Active Sprint trong cùng Project.

\- Khi tạo hoặc chỉnh sửa Task thuộc Sprint, hiển thị và kiểm tra giới hạn Deadline trong khoảng ngày của Sprint theo dữ liệu nghiệp vụ.

\- Khi đóng Sprint còn Task chưa hoàn thành/hủy, phải có Dialog để Quản lý chọn đưa Task về Product Backlog hoặc chuyển sang Sprint kế tiếp.

\- Thể hiện rõ tiến độ Sprint, Burndown Chart và Velocity Chart; chú giải biểu đồ phải phân biệt đường lý tưởng và dữ liệu thực tế.

\- Với Side Panel Meeting Notes, hỗ trợ bật/tắt, xem chi tiết và thể hiện liên kết Note với Task/Story theo dữ liệu API.



\#### H. Trao đổi và thông báo



\- Phân biệt kênh Team với nhóm chat nội bộ tự do.

\- Thể hiện rõ người quản trị nhóm chat và quyền quản lý thành viên.

\- Bình luận Task cần hỗ trợ \`@mention\` và Rich Link Preview theo khả năng API/tích hợp thực tế.

\- Phân biệt thông báo In-app, Email và Zalo; không hiển thị trạng thái gửi thành công nếu hệ thống chưa xác nhận.

\- Không để lỗi gửi Email/Zalo làm người dùng hiểu rằng giao dịch nghiệp vụ chính đã thất bại nếu In-app hoặc giao dịch chính đã thành công.



\### 5.4. Trạng thái UI bắt buộc phải xem xét



Mỗi màn hình hoặc component dữ liệu cần xác định các trạng thái phù hợp:



\- Initial: trạng thái ban đầu trước khi có dữ liệu.

\- Loading: đang tải dữ liệu hoặc đang xử lý thao tác.

\- Success: thao tác thành công và dữ liệu đã được xác nhận.

\- Empty: chưa có dữ liệu; hướng dẫn bước tiếp theo nếu phù hợp.

\- Error: lỗi tải dữ liệu hoặc lỗi thao tác; có cách thử lại khi phù hợp.

\- Disabled: thao tác không khả dụng và có giải thích khi cần.

\- Forbidden: người dùng không có quyền.

\- Conflict: dữ liệu thay đổi đồng thời hoặc trạng thái hiện tại không còn cho phép thao tác.

\- Partial data: một phần dữ liệu tải thất bại hoặc chưa sẵn sàng, nếu API hỗ trợ trạng thái này.



Không dùng dữ liệu mock để giả lập trạng thái thành công trong môi trường tích hợp thật. Không nuốt lỗi API hoặc hiển thị thông báo thành công giả.



\### 5.5. Responsive, Accessibility và hiệu năng



\- Giao diện phải hỗ trợ Desktop, Tablet và Mobile theo NFR-USA.

\- Trên Mobile, Kanban phải hỗ trợ cuộn ngang hoặc chuyển Tab cột mượt mà.

\- Bảng dữ liệu cần có cách xử lý trên màn hình nhỏ; không làm mất các thông tin hoặc hành động nghiệp vụ quan trọng.

\- Mọi nhãn cảnh báo màu Vàng, Đỏ, Xám phải đi kèm Text Badge hoặc nội dung văn bản tương đương.

\- Hỗ trợ keyboard navigation, focus-visible, label/accessibility name, dialog semantics và thứ tự tab hợp lý.

\- Tôn trọng \`prefers-reduced-motion\`; animation không được cản trở thao tác hoặc làm giảm khả năng đọc.

\- Tối ưu tải trang chính theo mục tiêu NFR: Kanban, Dashboard và danh sách có thời gian tải mục tiêu không quá 2 giây. Không tuyên bố đạt mục tiêu nếu chưa đo kiểm trong môi trường phù hợp.

\- Dữ liệu real-time cần phản ánh cập nhật WebSocket/SSE theo đặc tả; UI phải có trạng thái kết nối hoặc cơ chế đồng bộ lại khi mất kết nối nếu hệ thống hỗ trợ.



\### 5.6. Quy trình làm việc của Frontend Design Agent



\*\*Bước 1 — Phân tích yêu cầu\*\*



\- Xác định module, màn hình, persona và tác vụ chính.

\- Liệt kê các quyền cần kiểm tra và các trạng thái nghiệp vụ liên quan.

\- Tìm API/type/component hiện có.

\- Ghi nhận các điểm chưa rõ; không tự bịa quy tắc.



\*\*Bước 2 — Lập đặc tả UX/UI\*\*



\- Đề xuất cấu trúc trang, thứ bậc thông tin và luồng thao tác.

\- Xác định bảng, form, filter, dialog, drawer, tabs, chart hoặc Kanban cần dùng.

\- Mô tả hành vi của từng hành động theo Business Rules.

\- Định nghĩa trạng thái loading/empty/error/forbidden/conflict.

\- Nêu responsive behavior và yêu cầu accessibility.



\*\*Bước 3 — Kiểm tra thiết kế\*\*



\- Đối chiếu lại với RBAC + ABAC, Business Rules, Data Schema và NFR.

\- Đối chiếu Design System/token/component hiện có.

\- Kiểm tra các tình huống ngoại lệ và dữ liệu thực tế.

\- Nếu có mâu thuẫn, báo cáo trước khi triển khai.



\*\*Bước 4 — Triển khai Frontend\*\*



\- Chỉ triển khai trong phạm vi frontend được giao.

\- Tái sử dụng cấu trúc, component và API client hiện có.

\- Không tự sửa Backend, Database, API contract hoặc nghiệp vụ để làm UI dễ triển khai hơn.

\- Không thêm dependency hoặc thay đổi cấu hình toàn cục nếu chưa được yêu cầu/phê duyệt.



\*\*Bước 5 — Visual QA và bàn giao\*\*



\- Kiểm tra Desktop/Tablet/Mobile.

\- Kiểm tra quyền, trạng thái nghiệp vụ, loading/empty/error/forbidden/conflict.

\- Kiểm tra keyboard, focus, contrast, text badge và reduced motion.

\- Chạy các lệnh lint, typecheck, test và build phù hợp với repository.

\- Báo cáo file đã sửa, màn hình đã kiểm tra, kết quả kiểm thử và các điểm còn thiếu.



\### 5.7. Quy tắc phối hợp nhiều Agent



\- \*\*UX/UI Designer Agent:\*\* phân tích nghiệp vụ hiển thị, luồng người dùng, layout, component và trạng thái; không tự ý sửa Backend/Database.

\- \*\*Frontend Developer Agent:\*\* triển khai giao diện theo đặc tả đã thống nhất và API hiện có.

\- \*\*QA/Review Agent:\*\* kiểm tra tính nhất quán với Business Rules, quyền truy cập, responsive, accessibility và các trạng thái lỗi.

\- Mỗi file chỉ nên có một Agent chịu trách nhiệm chỉnh sửa trong cùng một lượt làm việc.

\- Không để nhiều Agent tự tạo các biến thể design token hoặc component nền tảng khác nhau.

\- Khi phát hiện tài liệu nghiệp vụ chưa đủ để xác định UI, Agent phải nêu câu hỏi hoặc ghi rõ giả định cần xác nhận; không biến giả định thành Business Rule.



\### 5.8. Checklist hoàn thành cho màn hình Frontend



Trước khi báo hoàn thành, Agent phải tự kiểm tra:



\- [ ] Đúng module và đúng phạm vi chức năng.

\- [ ] Đúng Role và Runtime Context; không để UI cấp nhầm hành động.

\- [ ] Đúng trạng thái và luồng chuyển trạng thái nghiệp vụ.

\- [ ] Không hiển thị dữ liệu người dùng không có quyền xem.

\- [ ] Có loading, empty, error và forbidden state phù hợp.

\- [ ] Có xác nhận và phản hồi cho hành động quan trọng.

\- [ ] Responsive trên Desktop, Tablet và Mobile.

\- [ ] Cảnh báo màu có nhãn văn bản đi kèm.

\- [ ] Keyboard, focus, label và reduced motion được xem xét.

\- [ ] Không tạo API giả, dữ liệu thành công giả hoặc thay đổi Backend/Database ngoài phạm vi.

\- [ ] Đã chạy và báo cáo các lệnh kiểm tra phù hợp.

---

## PHẦN 6: KHÁM PHÁ, LỰA CHỌN VÀ ĐIỀU PHỐI AGENT TRONG `.qoder/agents/`

> **Mục đích:** Hướng dẫn Agent điều phối tự kiểm tra thư mục `.qoder/agents/`, tìm Agent chuyên trách phù hợp và giao đúng nhiệm vụ. Quy định này áp dụng cho mọi công việc trong dự án, bao gồm UX/UI, Frontend, Backend, Database, QA và kiến trúc.

### 6.1. Bắt buộc khám phá Agent trước khi thực hiện nhiệm vụ

Khi nhận một yêu cầu mới, Agent điều phối MUST:

1. Kiểm tra thư mục `.qoder/agents/` tại repository hiện tại.
2. Liệt kê các file Agent có trong thư mục và thư mục con (nếu có).
3. Đọc phần mô tả, metadata/frontmatter, phạm vi trách nhiệm, công cụ và giới hạn của từng Agent liên quan.
4. Chọn Agent dựa trên nội dung hướng dẫn thực tế, không chỉ dựa vào tên file.
5. Đọc đầy đủ hướng dẫn của Agent được chọn trước khi giao nhiệm vụ.

Không được:
- Tự giả định một Agent tồn tại khi chưa kiểm tra file thực tế.
- Tự tạo tên Agent hoặc đường dẫn Agent không có trong repository.
- Bỏ qua Agent chuyên trách phù hợp chỉ vì Agent điều phối có thể tự làm.
- Tuyên bố đã gọi hoặc giao việc cho Agent nếu môi trường Qoder không thực sự thực hiện thao tác đó.

Nếu `.qoder/agents/` không tồn tại, trống hoặc không có Agent phù hợp, Agent điều phối tiếp tục thực hiện theo tài liệu hiện có và phải nêu rõ giới hạn khi cần thiết.

### 6.2. Bản đồ lựa chọn Agent theo loại công việc

Bảng dưới đây là định hướng tìm Agent. Tên Agent thực tế phải được xác định bằng cách đọc các file trong `.qoder/agents/`.

| Loại công việc | Chuyên môn/Agent cần tìm |
| --- | --- |
| Phân tích yêu cầu, user journey, wireframe, UX, design system | UI/UX Designer |
| React, page, component, responsive, interaction, animation | Frontend Developer |
| API, controller, service, authentication, business logic | Backend Developer |
| Schema, migration, query, index, data integrity | Database Engineer |
| Test plan, test case, functional test, regression | QA Engineer / Tester |
| Module boundary, architecture, integration, technical decision | Software Architect |
| Security review, performance review, code review | Agent có chuyên môn tương ứng |

Nếu một Agent đảm nhiệm nhiều chuyên môn, có thể chọn Agent đó khi phạm vi trong file hướng dẫn cho phép.

### 6.3. Quy trình phân rã và giao nhiệm vụ

Trước khi giao việc, Agent điều phối phải xác định:

- **Goal:** Kết quả cuối cùng cần đạt.
- **Scope:** Module, chức năng và file/thư mục được phép tác động.
- **Context:** Tài liệu nghiệp vụ, kiến trúc, API contract, design system cần đọc.
- **Constraints:** Các quy tắc không được vi phạm.
- **Deliverables:** Code, tài liệu, test hoặc báo cáo cần bàn giao.
- **Acceptance Criteria:** Điều kiện để xác nhận nhiệm vụ hoàn thành.

Khi giao nhiệm vụ cho Agent chuyên trách:

1. Cung cấp yêu cầu và ngữ cảnh đầy đủ, không chỉ gửi một câu lệnh ngắn thiếu thông tin.
2. Chỉ rõ tài liệu cần đọc, đặc biệt là các phần Business Rules, Data Schema, RBAC/ABAC, NFR và Frontend UX/UI Skill khi liên quan.
3. Nêu rõ phạm vi file được phép sửa và những phần không được thay đổi.
4. Yêu cầu Agent báo cáo file đã sửa, quyết định kỹ thuật, kiểm tra đã chạy và vấn đề còn tồn tại.
5. Agent điều phối kiểm tra kết quả trước khi tích hợp hoặc báo hoàn thành.

### 6.4. Quy tắc phối hợp một Agent và nhiều Agent

- Dùng một Agent khi nhiệm vụ nằm gọn trong một chuyên môn và không cần phân chia.
- Dùng nhiều Agent khi có các phần việc độc lập, có thể thực hiện song song mà không gây xung đột.
- Với các công việc phụ thuộc nhau, phải xác định thứ tự và điều kiện bàn giao trước khi triển khai.
- Không giao nhiều Agent cùng sửa một file hoặc cùng một phạm vi code nếu chưa có kế hoạch phối hợp rõ ràng.
- Với file dùng chung như route registry, API contract, design token, cấu hình root, migration hoặc dependency lockfile, phải chỉ định rõ Agent chịu trách nhiệm chỉnh sửa.
- Không chia nhỏ nhiệm vụ đến mức tạo thêm overhead hoặc khiến các Agent đưa ra các quyết định mâu thuẫn.

### 6.5. Ranh giới trách nhiệm và thứ tự ưu tiên

Mọi Agent được lựa chọn đều phải tuân thủ:

1. Yêu cầu cụ thể của người dùng trong nhiệm vụ hiện tại.
2. Các quy tắc an toàn, bảo mật và ràng buộc của repository.
3. Tài liệu kiến trúc, Business Rules, Data Schema và NFR của dự án.
4. Hướng dẫn chung trong `AGENTS.md` và hướng dẫn chuyên trách trong `.qoder/agents/`.
5. Các quy ước code và cấu trúc hiện có.

Hướng dẫn Agent chuyên trách chỉ bổ sung cách thực hiện trong phạm vi chuyên môn; không được tự ý vô hiệu hóa Business Rules hoặc thay đổi kiến trúc đã được xác định.

Không Agent nào được tự ý:
- Thay đổi API contract hoặc backend khi nhiệm vụ chỉ yêu cầu chỉnh sửa Frontend.
- Thay đổi database schema, migration hoặc dữ liệu nghiệp vụ khi chưa được cho phép.
- Tự thêm Role, trạng thái nghiệp vụ, quyền thao tác hoặc quy tắc mới.
- Thay đổi design token hoặc component dùng chung ngoài phạm vi được giao.
- Xóa hoặc ghi đè nội dung/tài liệu hiện có mà không có căn cứ và sự cho phép phù hợp.

### 6.6. Kiểm tra và nghiệm thu sau khi Agent hoàn thành

Agent điều phối chịu trách nhiệm cuối cùng và MUST:

- Kiểm tra các file đã thay đổi có đúng phạm vi nhiệm vụ không.
- Đối chiếu kết quả với Business Rules, kiến trúc và design system liên quan.
- Kiểm tra lỗi tích hợp, import, type, lint, build và test phù hợp với dự án.
- Kiểm tra responsive, loading/empty/error/success states và accessibility nếu có thay đổi UI.
- Xác nhận các thay đổi không làm hỏng chức năng hiện có.
- Tổng hợp kết quả, file đã sửa, kiểm tra đã thực hiện và các vấn đề chưa giải quyết.

Không được coi kết quả Agent chuyên trách là mặc nhiên chính xác; mọi thay đổi đều phải qua bước kiểm tra phù hợp.

### 6.7. Trường hợp Qoder không thể gọi Agent chuyên trách

Nếu phiên làm việc hoặc cấu hình Qoder hiện tại không hỗ trợ gọi/chạy Agent khác:

- Đọc file hướng dẫn Agent phù hợp trong `.qoder/agents/`.
- Áp dụng vai trò, quy trình và checklist của Agent đó trong khả năng hiện có.
- Không giả vờ rằng một Agent khác đã được khởi chạy hoặc đã trả kết quả.
- Báo rõ rằng hướng dẫn chuyên trách đã được tham chiếu nhưng việc thực thi vẫn do Agent hiện tại đảm nhiệm.

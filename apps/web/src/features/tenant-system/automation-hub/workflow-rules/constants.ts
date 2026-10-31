import type {
  ActionKind,
  Operator,
  RuleField,
  RunOutcome,
  Trigger,
} from "./types";

/** Exact `FEATURE` used by `@RequirePermission` in the controller. */
export const FEATURE_KEY = "tenant-system/automation-hub/workflow-rules";

export const PAGE_SIZES = [10, 25, 50];
export const DEFAULT_PAGE_SIZE = 10;

/** Server limits from `ruleInput` / `conditionSchema`. */
export const MAX_CONDITIONS = 10;
export const MAX_ACTIONS = 5;
export const MAX_CONDITION_VALUE = 200;
export const MAX_POSITION = 1000;
export const MAX_LOCK_SECONDS = 60;
export const DEFAULT_POSITION = 100;
export const DEFAULT_LOCK_SECONDS = 3;
/** `runsQuery.limit` is capped at 100; the sheet asks for one page worth. */
export const RUN_LIMIT = 30;

export const TRIGGERS: readonly Trigger[] = ["created", "updated"];

export const TRIGGER_LABELS: Record<Trigger, string> = {
  created: "Khi tạo mới",
  updated: "Khi cập nhật",
};

export const FIELDS: readonly RuleField[] = [
  "status",
  "assignee",
  "reviewer",
  "scope",
  "code",
  "name",
  "date",
];

export const FIELD_LABELS: Record<RuleField, string> = {
  status: "Trạng thái",
  assignee: "Người phụ trách",
  reviewer: "Người kiểm tra",
  scope: "Phạm vi",
  code: "Mã công việc",
  name: "Tên công việc",
  date: "Hạn hoàn thành",
};

export const OPERATORS: readonly Operator[] = [
  "is",
  "isNot",
  "in",
  "notIn",
  "contains",
  "exists",
  "changedTo",
];

export const OPERATOR_LABELS: Record<Operator, string> = {
  is: "bằng",
  isNot: "khác",
  in: "thuộc danh sách",
  notIn: "không thuộc danh sách",
  contains: "chứa",
  exists: "có giá trị",
  changedTo: "vừa đổi thành",
};

/** Mirrors how `rule-engine.ts` reads each value. */
export const OPERATOR_HINTS: Record<Operator, string> = {
  is: "So khớp đầy đủ, không phân biệt hoa thường.",
  isNot: "Đúng khi giá trị khác hẳn.",
  in: "Nhiều giá trị, cách nhau bằng dấu phẩy.",
  notIn: "Đúng khi giá trị không nằm trong danh sách.",
  contains: "Đúng khi giá trị chứa đoạn này.",
  exists: "Không dùng ô giá trị; đúng khi trường có nội dung.",
  changedTo: "Chỉ đúng khi trường vừa đổi sang giá trị này (tạo mới cũng tính).",
};

export const ACTION_KINDS: readonly ActionKind[] = [
  "assign",
  "status",
  "comment",
  "notify",
];

export const ACTION_LABELS: Record<ActionKind, string> = {
  assign: "Giao người phụ trách",
  status: "Chuyển trạng thái",
  comment: "Thêm bình luận",
  notify: "Gửi thông báo",
};

export const OUTCOME_LABELS: Record<RunOutcome, string> = {
  APPLIED: "Đã áp dụng",
  SKIPPED: "Bỏ qua",
  FAILED: "Lỗi",
  SIMULATED: "Mô phỏng",
};

export const PLACEHOLDER_HINT =
  "Có thể chèn {{code}}, {{name}}, {{status}}, {{assignee}} hoặc {{previous.status}} vào nội dung; máy chủ thay bằng giá trị thật lúc chạy.";

export const ORDER_NOTE =
  "Quy tắc chạy theo thứ tự vị trí tăng dần, cùng vị trí thì theo thời điểm tạo. Bật “dừng sau khi khớp” để chặn các quy tắc phía sau.";

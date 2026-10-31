/** Mirrors `apps/api/src/features/work-management/coordination/tickets-approvals/dto/tickets-approvals.dto.ts`. */
export const REQUEST_STATUSES = ["Chờ duyệt", "Đã duyệt", "Từ chối", "Đã hủy"] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_CATEGORIES = ["Mua sắm", "Nghỉ phép", "Thanh toán", "Khác"] as const;

export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];

export interface RequestFields {
  category?: RequestCategory;
  requester?: string;
  amount?: number;
}

export interface ApprovalRequest {
  id: string;
  module: "requests";
  code: string;
  name: string;
  scope: string;
  status: RequestStatus;
  date: string;
  assignee: string;
  note: string;
  fields: RequestFields;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export const QUORUMS = ["ANY", "ALL", "MAJORITY"] as const;

export type Quorum = (typeof QUORUMS)[number];

export const STEP_STATUSES = ["WAITING", "PENDING", "APPROVED", "REJECTED", "SKIPPED"] as const;

export type StepStatus = (typeof STEP_STATUSES)[number];

export const VOTE_DECISIONS = ["PENDING", "APPROVED", "REJECTED"] as const;

export type VoteDecision = (typeof VOTE_DECISIONS)[number];

export const SLA_STATES = ["ON_TRACK", "DUE_SOON", "OVERDUE"] as const;

export type SlaState = (typeof SLA_STATES)[number];

export interface Approver {
  id: string;
  approver: string;
  displayName: string;
  decision: VoteDecision;
  comment: string;
  decidedAt: string | null;
}

export interface ApprovalStep {
  id: string;
  position: number;
  name: string;
  quorum: Quorum;
  status: StepStatus;
  slaHours: number;
  startedAt: string;
  dueAt: string;
  decidedAt: string | null;
  decidedBy: string;
  escalatedAt: string | null;
  note: string;
  sla: SlaState;
  remainingMinutes: number;
  approvers: Approver[];
}

export interface ApprovalChain {
  requestId: string;
  status: RequestStatus;
  activeStepId: string | null;
  nextDueAt: string | null;
  canDecide: boolean;
  canManage: boolean;
  canCancel: boolean;
  steps: ApprovalStep[];
}

export interface InboxEntry {
  request: ApprovalRequest;
  step: ApprovalStep;
}

export interface InboxPage {
  items: InboxEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DecisionInput {
  decision: "APPROVE" | "REJECT";
  note: string;
  version: number;
}

export interface PermissionSnapshot {
  role: "EMPLOYEE" | "MANAGER";
  isSystemAdmin: boolean;
  actions: string[];
}

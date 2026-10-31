/**
 * Mirrors `apps/api/src/features/work-management/projects/milestones-qa/dto/milestones-qa.dto.ts`.
 * `status` on a milestone is the *effective* status the API returns; `storedStatus`
 * is what the row holds. `MISSED` is derived from `targetDate`, never stored by hand.
 */
export const MILESTONE_STATUSES = [
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "MISSED",
  "CANCELLED",
] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

/** Allowed moves copied from `MILESTONE_MOVES`; the API still rejects a bad move. */
export const MILESTONE_MOVES: Record<MilestoneStatus, MilestoneStatus[]> = {
  PLANNED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  MISSED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  targetDate: string;
  contractRef: string;
  status: MilestoneStatus;
  storedStatus: MilestoneStatus;
  itemCount: number;
  completedCount: number;
  overdue: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneTask {
  taskId: string;
  code: string;
  name: string;
  status: string;
  completed: boolean;
}

/** `GET /milestones/:id` returns the milestone plus its linked tasks. */
export type MilestoneDetail = Milestone & { items: MilestoneTask[] };

export interface MilestoneInput {
  projectId: string;
  name: string;
  description: string;
  targetDate: string;
  contractRef: string;
  status: MilestoneStatus;
}

export const QA_OUTCOMES = ["PASS", "FAIL", "BLOCKED"] as const;
export type QaOutcome = (typeof QA_OUTCOMES)[number];

export interface AcceptanceEvidence {
  label: string;
  url: string;
}

export interface AcceptanceResult {
  id: string;
  itemId: string;
  outcome: QaOutcome;
  note: string;
  evidence: AcceptanceEvidence[];
  testedByName: string;
  isOverride: boolean;
  createdAt: string;
}

export interface AcceptanceItem {
  id: string;
  taskId: string;
  title: string;
  steps: string;
  expected: string;
  mandatory: boolean;
  version: number;
  latestResult: AcceptanceResult | null;
  resultCount: number;
  createdAt: string;
  updatedAt: string;
}

/** A criterion passes only when its newest result is PASS; empty means "chưa chạy". */
export interface QaGate {
  required: boolean;
  passed: boolean;
  blocking: string[];
}

/** Shape of `GET /acceptance?taskId=…` — the only way to read criteria for a task. */
export interface AcceptanceQueue {
  items: AcceptanceItem[];
  gate: QaGate;
}

export interface AcceptanceInput {
  taskId: string;
  title: string;
  steps: string;
  expected: string;
  mandatory: boolean;
}

/** Minimal project shape needed to choose a milestone owner; no cross-feature import. */
export interface ProjectRef {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PermissionSnapshot {
  role: "EMPLOYEE" | "MANAGER";
  isSystemAdmin: boolean;
  actions: string[];
}

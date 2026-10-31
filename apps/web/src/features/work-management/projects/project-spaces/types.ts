/**
 * Mirrors `apps/api/src/features/work-management/projects/project-spaces/dto/project-spaces.dto.ts`
 * and `.../dto/sprints.dto.ts`. Field names, enum members and nullability follow
 * the zod schemas exactly; nothing here is guessed.
 */
export const PROJECT_STATUSES = [
  "Lên kế hoạch",
  "Đang triển khai",
  "Tạm dừng",
  "Hoàn thành",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface ProjectFields {
  team?: string;
  progress?: number;
  objective?: string;
  members?: string;
}

export interface Project {
  id: string;
  module: "projects";
  code: string;
  name: string;
  scope: string;
  status: ProjectStatus;
  date: string;
  assignee: string;
  note: string;
  fields: ProjectFields;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInput {
  code: string;
  name: string;
  scope: string;
  status: ProjectStatus;
  date: string;
  assignee: string;
  note: string;
  fields: ProjectFields;
}

export const SPRINT_STATUSES = ["PLANNED", "ACTIVE", "CLOSED"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export type CommitmentState = "EMPTY" | "UNDER" | "BALANCED" | "OVER";

export interface Commitment {
  capacity: number;
  committed: number;
  ratio: number;
  overBy: number;
  state: CommitmentState;
}

export interface SprintTask {
  taskId: string;
  code: string;
  name: string;
  status: string;
  assignee: string;
  done: boolean;
}

export interface BacklogItem {
  id: string;
  projectId: string;
  taskId: string;
  sprintId: string | null;
  rank: number;
  points: number;
  carriedFrom: string | null;
  carriedTimes: number;
  completedAt: string | null;
  version: number;
  task: SprintTask | null;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  capacity: number;
  committed: number;
  completed: number;
  carried: number;
  itemCount: number;
  doneCount: number;
  plannedPoints: number;
  donePoints: number;
  remainingPoints: number;
  daysLeft: number;
  committedOnPlan: boolean;
  activatedAt: string | null;
  closedAt: string | null;
  note: string;
  commitment: Commitment;
  items: BacklogItem[];
  version: number;
}

/** Shape of `GET /projects/:projectId/board`. */
export interface SprintBoard {
  projectId: string;
  sprints: Sprint[];
  backlog: BacklogItem[];
  candidates: SprintTask[];
  velocity: {
    closedSprints: number;
    average: number;
    last: number;
  };
}

/** Create payload for `POST /projects/:projectId/sprints`. */
export interface SprintInput {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  capacity: number;
  note: string;
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

export type ProjectAction = "view" | "create" | "update" | "delete" | "approve";

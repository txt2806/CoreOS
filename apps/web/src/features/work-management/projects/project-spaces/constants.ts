import type { CommitmentState, ProjectStatus, SprintStatus } from "./types";

/**
 * Exact key the backend guards with `@RequirePermission` in
 * `project-spaces/sprint.controller.ts`. The CRUD controller in
 * `project-spaces.controller.ts` carries no guard of its own, so this is the only
 * key the module enforces — the screen still reads it before offering a write.
 */
export const FEATURE_KEY = "work-management/projects/project-spaces";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/** Vietnamese labels live in one place so filters, badges and forms agree. */
export const STATUS_TONE: Record<ProjectStatus, string> = {
  "Lên kế hoạch": "badge",
  "Đang triển khai": "badge badge-info",
  "Tạm dừng": "badge badge-warning",
  "Hoàn thành": "badge badge-success",
};

/** The API stores sprint states in English; the screen shows Vietnamese. */
export const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  PLANNED: "Lập kế hoạch",
  ACTIVE: "Đang chạy",
  CLOSED: "Đã đóng",
};

export const SPRINT_STATUS_TONE: Record<SprintStatus, string> = {
  PLANNED: "badge",
  ACTIVE: "badge badge-accent",
  CLOSED: "badge badge-success",
};

export const COMMITMENT_TONE: Record<CommitmentState, string> = {
  EMPTY: "subtle",
  UNDER: "muted",
  BALANCED: "muted",
  OVER: "deadline deadline-danger",
};

export const COMMITMENT_LABEL: Record<CommitmentState, string> = {
  EMPTY: "Chưa cam kết",
  UNDER: "Dưới năng lực",
  BALANCED: "Vừa năng lực",
  OVER: "Vượt năng lực",
};

/** The API refuses an activation above capacity + 25%, so the UI warns earlier. */
export const COMMITMENT_TOLERANCE = 1.25;

/** A project finishing inside this window is called out in the table. */
export const SOON_WINDOW_DAYS = 7;

export const EXPORT_FILE_PREFIX = "du-an";

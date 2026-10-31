import type { AuditResult } from "./types";

/** Exact key used by `@RequirePermission` in the checklog controller. */
export const FEATURE_KEY = "tenant-system/checklog";

export const PAGE_SIZES = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export const RESULT_LABEL: Record<AuditResult, string> = {
  SUCCESS: "Thành công",
  DENIED: "Bị từ chối",
  FAILED: "Thất bại",
};

export const RESULT_TONE: Record<AuditResult, string> = {
  SUCCESS: "badge badge-success",
  DENIED: "badge badge-warning",
  FAILED: "badge badge-danger",
};

/** The override flag is a separate signal from the result, so it gets its own badge. */
export const OVERRIDE_LABEL = "Ngoài phạm vi";

export const DIFF_PREVIEW_LENGTH = 80;

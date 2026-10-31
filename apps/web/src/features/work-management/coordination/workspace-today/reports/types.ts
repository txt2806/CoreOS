/** Mirrors `apps/api/src/features/work-management/coordination/workspace-today/reports/dto/reports.dto.ts`. */
export const REPORT_STATUSES = ["Bản nháp", "Đã phát hành"] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface ReportFields {
  period?: string;
  goal?: string;
  result?: string;
}

export interface WorkReport {
  id: string;
  module: "reports";
  code: string;
  name: string;
  scope: string;
  status: ReportStatus;
  date: string;
  assignee: string;
  note: string;
  fields: ReportFields;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportInput {
  code: string;
  name: string;
  scope: string;
  status: ReportStatus;
  date: string;
  assignee: string;
  note: string;
  fields: ReportFields;
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

/** Mirrors `apps/api/src/features/work-management/coordination/workspace-today/calendar/dto/calendar.dto.ts`. */
export const EVENT_STATUSES = [
  "Đã lên lịch",
  "Đang diễn ra",
  "Hoàn thành",
  "Đã hủy",
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_KINDS = ["Cuộc họp", "Thời gian tập trung", "Sự kiện"] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export interface EventFields {
  kind?: EventKind;
  startTime?: string;
  endTime?: string;
  location?: string;
  attendees?: string;
}

export interface CalendarEvent {
  id: string;
  module: "calendar";
  code: string;
  name: string;
  scope: string;
  status: EventStatus;
  date: string;
  assignee: string;
  note: string;
  fields: EventFields;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventInput {
  code: string;
  name: string;
  scope: string;
  status: EventStatus;
  date: string;
  assignee: string;
  note: string;
  fields: EventFields;
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

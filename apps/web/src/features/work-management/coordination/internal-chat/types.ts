/** Mirrors `apps/api/src/features/work-management/coordination/internal-chat/dto/internal-chat.dto.ts`. */
export const CONVERSATION_STATUSES = ["Đang mở", "Đã đóng"] as const;

export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export interface ChatComment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface ConversationFields {
  channel?: string;
  participants?: string;
  comments?: ChatComment[];
}

export interface Conversation {
  id: string;
  module: "messages";
  code: string;
  name: string;
  scope: string;
  status: ConversationStatus;
  date: string;
  assignee: string;
  note: string;
  fields: ConversationFields;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationInput {
  code: string;
  name: string;
  scope: string;
  status: ConversationStatus;
  date: string;
  assignee: string;
  note: string;
  fields: ConversationFields;
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

/** Only the fields the chat screen reads from `GET /auth/session`. */
export interface SessionView {
  actor: { displayName: string; employeeId: string };
}

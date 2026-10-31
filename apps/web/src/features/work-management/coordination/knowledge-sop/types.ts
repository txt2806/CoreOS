/**
 * Mirrors `apps/api/src/features/work-management/coordination/knowledge-sop/dto/knowledge-sop.dto.ts`.
 * The `ARTICLE`/`SOP` lifecycle in `docs/specifications/KNOWLEDGE-SOP.md` is not in the
 * contract yet — the API only stores a WorkNote with `fields.category/content/tags`.
 */
export const NOTE_STATUSES = ["Bản nháp", "Đã xuất bản", "Lưu trữ"] as const;

export type NoteStatus = (typeof NOTE_STATUSES)[number];

export interface NoteFields {
  category?: string;
  content?: string;
  tags?: string;
}

export interface KnowledgeNote {
  id: string;
  module: "notes";
  code: string;
  name: string;
  scope: string;
  status: NoteStatus;
  date: string;
  assignee: string;
  note: string;
  fields: NoteFields;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  code: string;
  name: string;
  scope: string;
  status: NoteStatus;
  date: string;
  assignee: string;
  note: string;
  fields: NoteFields;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

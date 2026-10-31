/** Mirrors `apps/api/src/features/work-management/work/task-comments/dto`. */
export interface TaskComment {
  id: string;
  taskId: string;
  author: string;
  body: string;
  mentions: string[];
  attachments: { label: string; url: string; provider: string }[];
  kind: "COMMENT" | "SYSTEM";
  createdAt: string;
}

export interface CommentPage {
  items: TaskComment[];
  total: number;
  page: number;
  pageSize: number;
}

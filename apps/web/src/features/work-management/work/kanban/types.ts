/** The board never imports the tasks feature; it receives a structural shape. */
export interface BoardTask {
  id: string;
  code: string;
  name: string;
  status: string;
  date: string;
  assignee: string;
  reviewer: string;
  version: number;
  fields: { priority?: string };
}

export interface BoardMove {
  to: string;
  blockedBy: number;
}

export interface BoardColumn {
  status: string;
  label: string;
}

export interface KanbanBoardProps {
  tasks: BoardTask[];
  /** Legal target statuses per task id, straight from the workflow rules. */
  allowed: Record<string, BoardMove[]>;
  pendingId?: string | null;
  onMove: (task: BoardTask, to: string) => void;
  onOpen: (task: BoardTask) => void;
}

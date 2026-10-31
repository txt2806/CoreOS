"use client";

import { Modal } from "./primitives";
import { TaskForm } from "./task-form";
import type { TaskInput } from "../types";

interface CreateTaskDialogProps {
  onCreate: (input: TaskInput) => Promise<unknown>;
  onClose: () => void;
}

/**
 * Creation only. A new task always starts at “Cần làm”; the status control lives
 * in the detail sheet because changes must pass through the workflow.
 */
export function CreateTaskDialog({ onCreate, onClose }: CreateTaskDialogProps) {
  return (
    <Modal title="Tạo công việc" onClose={onClose} wide>
      <p className="muted" style={{ marginBottom: "var(--space-4)" }}>
        Công việc mới luôn bắt đầu ở trạng thái “Cần làm”. Trạng thái chỉ thay đổi qua
        luồng công việc để giữ lịch sử chuyển bước.
      </p>
      <TaskForm
        submitLabel="Tạo công việc"
        onCancel={onClose}
        onSubmit={async (values) => {
          await onCreate(values);
          onClose();
        }}
      />
    </Modal>
  );
}

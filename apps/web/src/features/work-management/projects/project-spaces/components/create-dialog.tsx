"use client";

import type { ProjectInput } from "../types";
import { Modal } from "./primitives";
import { ProjectForm } from "./project-form";

interface CreateProjectDialogProps {
  onCreate: (input: ProjectInput) => Promise<unknown>;
  onClose: () => void;
}

/**
 * Creation only. The API accepts a status on create but not every later move is
 * free-form, so the dialog explains that the detail sheet is where a project is
 * edited after the first sprint exists.
 */
export function CreateProjectDialog({ onCreate, onClose }: CreateProjectDialogProps) {
  return (
    <Modal title="Tạo dự án" onClose={onClose} wide>
      <p className="muted" style={{ marginBottom: "var(--space-4)" }}>
        Dự án mới thường bắt đầu ở “Lên kế hoạch”. Sau khi tạo, mở chi tiết để thêm
        sprint và theo dõi cam kết năng lực.
      </p>
      <ProjectForm
        submitLabel="Tạo dự án"
        onCancel={onClose}
        onSubmit={async (values) => {
          await onCreate(values);
          onClose();
        }}
      />
    </Modal>
  );
}

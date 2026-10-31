"use client";

import type { LeaveInput, Session } from "../types";
import type { QuotaContext } from "../hooks/use-leave-requests";
import { LeaveForm } from "./leave-form";
import { Modal } from "./primitives";

interface CreateLeaveDialogProps {
  actor: Session["actor"] | null;
  canFileForOthers: boolean;
  quota: QuotaContext | null;
  quotaProblem: string | null;
  usedDaysOf: (employeeId: string) => Promise<number | null>;
  onCreate: (input: LeaveInput) => Promise<unknown>;
  onClose: () => void;
}

/**
 * Creation only. A new request is always `PENDING`; the decision belongs to the
 * leave-approvals branch, so no status control is offered here.
 */
export function CreateLeaveDialog({
  actor,
  canFileForOthers,
  quota,
  quotaProblem,
  usedDaysOf,
  onCreate,
  onClose,
}: CreateLeaveDialogProps) {
  return (
    <Modal title="Gửi đơn nghỉ phép" onClose={onClose} wide>
      <p className="muted" style={{ marginBottom: "var(--space-4)" }}>
        Đơn mới luôn ở trạng thái chờ duyệt. Số ngày làm việc do máy chủ tính khi lưu; các cảnh
        báo dưới đây chỉ giúp bạn cân nhắc trước khi gửi.
      </p>
      <LeaveForm
        actor={actor}
        canFileForOthers={canFileForOthers}
        quota={quota}
        quotaProblem={quotaProblem}
        usedDaysOf={usedDaysOf}
        submitLabel="Gửi đơn"
        onCancel={onClose}
        onSubmit={async (values) => {
          await onCreate(values);
          onClose();
        }}
      />
    </Modal>
  );
}

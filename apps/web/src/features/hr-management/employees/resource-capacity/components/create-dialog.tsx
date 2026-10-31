"use client";

import type { PeriodInput } from "../types";
import { Modal } from "./primitives";
import { PeriodForm } from "./period-form";

/**
 * Creation only. The dialog closes on success; a refusal stays inside the form so
 * the typed values are not lost.
 */
export function CreatePeriodDialog({
  onCreate,
  onClose,
}: {
  onCreate: (values: PeriodInput) => Promise<unknown>;
  onClose: () => void;
}) {
  return (
    <Modal title="Tạo kỳ công suất" onClose={onClose} wide>
      <PeriodForm
        submitLabel="Tạo kỳ"
        onSubmit={async (values) => {
          await onCreate(values);
          onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}

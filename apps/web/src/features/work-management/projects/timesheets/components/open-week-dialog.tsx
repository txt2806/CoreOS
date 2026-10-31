"use client";

import { useId, useState } from "react";
import { mondayOf, today, weekRange } from "../format";
import { Field, Modal, TextInput } from "./primitives";

interface OpenWeekDialogProps {
  busy: boolean;
  onSubmit: (weekStart: string) => Promise<void>;
  onClose: () => void;
}

/**
 * The API snaps any date to its Monday, so the dialog only needs a date: the
 * preview shows the week that will actually be opened.
 */
export function OpenWeekDialog({ busy, onSubmit, onClose }: OpenWeekDialogProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [date, setDate] = useState(mondayOf(today()));
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!date) {
      setError("Chọn một ngày trong tuần cần mở.");
      return;
    }
    setError(null);
    await onSubmit(mondayOf(date));
  };

  return (
    <Modal
      title="Mở kỳ timesheet theo tuần"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={busy}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang mở…" : "Mở tuần"}
          </button>
        </>
      }
    >
      <div className="stack gap-4">
        <p className="muted">
          Mỗi tuần chỉ có một kỳ cho mỗi nhân viên. Mở lại tuần đã có sẽ trả về đúng kỳ đó
          chứ không tạo bản ghi mới.
        </p>
        <Field
          label="Chọn một ngày trong tuần"
          htmlFor={`open-week-${uid}`}
          required
          error={error ?? undefined}
          hint={`Tuần ${weekRange(mondayOf(date))} · bắt đầu thứ Hai`}
        >
          <TextInput
            id={`open-week-${uid}`}
            type="date"
            value={date}
            invalid={Boolean(error)}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { EVENT_KINDS, EVENT_STATUSES } from "../types";
import type { EventInput, EventKind, EventStatus } from "../types";
import { todayIso } from "../format";
import { Field, Modal, Select, TextInput } from "./primitives";

interface CreateEventDialogProps {
  defaultDate: string;
  onCreate: (input: EventInput) => Promise<unknown>;
  onClose: () => void;
}

interface Draft {
  code: string;
  name: string;
  kind: EventKind | "";
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  attendees: string;
  assignee: string;
  scope: string;
  note: string;
  status: EventStatus;
}

/**
 * Creation only. The dialog owns the client-side checks the API repeats, so the
 * user sees “giờ kết thúc phải sau giờ bắt đầu” before the round trip.
 */
export function CreateEventDialog({ defaultDate, onCreate, onClose }: CreateEventDialogProps) {
  const [draft, setDraft] = useState<Draft>({
    code: "",
    name: "",
    kind: "Cuộc họp",
    date: defaultDate || todayIso(),
    startTime: "",
    endTime: "",
    location: "",
    attendees: "",
    assignee: "",
    scope: "",
    note: "",
    status: "Đã lên lịch",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!draft.code.trim()) next.code = "Nhập mã sự kiện, ví dụ LICH-011.";
    if (!draft.name.trim()) next.name = "Nhập tên sự kiện.";
    if (!draft.date) next.date = "Chọn ngày diễn ra.";
    if (draft.startTime && draft.endTime && draft.endTime <= draft.startTime)
      next.endTime = "Giờ kết thúc phải sau giờ bắt đầu.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setProblem(null);
    try {
      await onCreate({
        code: draft.code.trim(),
        name: draft.name.trim(),
        scope: draft.scope.trim(),
        status: draft.status,
        date: draft.date,
        assignee: draft.assignee.trim(),
        note: draft.note.trim(),
        fields: {
          ...(draft.kind ? { kind: draft.kind } : {}),
          ...(draft.startTime ? { startTime: draft.startTime } : {}),
          ...(draft.endTime ? { endTime: draft.endTime } : {}),
          ...(draft.location.trim() ? { location: draft.location.trim() } : {}),
          ...(draft.attendees.trim() ? { attendees: draft.attendees.trim() } : {}),
        },
      });
      onClose();
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : "Chưa tạo được sự kiện.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Thêm sự kiện"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={busy}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang lưu…" : "Lưu sự kiện"}
          </button>
        </>
      }
    >
      {problem ? (
        <div className="alert alert-danger" role="alert">
          {problem}
        </div>
      ) : null}

      <div className="field-grid">
        <Field label="Mã sự kiện" htmlFor="event-code" required error={errors.code}>
          <TextInput
            id="event-code"
            value={draft.code}
            invalid={Boolean(errors.code)}
            maxLength={100}
            autoComplete="off"
            placeholder="LICH-011"
            onChange={(event) => set("code", event.target.value)}
          />
        </Field>
        <Field label="Loại" htmlFor="event-kind" hint="Không bắt buộc">
          <Select
            id="event-kind"
            value={draft.kind}
            onChange={(event) => set("kind", event.target.value as EventKind | "")}
          >
            <option value="">Chưa phân loại</option>
            {EVENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Tên sự kiện" htmlFor="event-name" required error={errors.name}>
        <TextInput
          id="event-name"
          value={draft.name}
          invalid={Boolean(errors.name)}
          maxLength={500}
          autoComplete="off"
          placeholder="Họp giao ban tuần"
          onChange={(event) => set("name", event.target.value)}
        />
      </Field>

      <div className="field-grid">
        <Field label="Ngày" htmlFor="event-date" required error={errors.date}>
          <TextInput
            id="event-date"
            type="date"
            value={draft.date}
            invalid={Boolean(errors.date)}
            onChange={(event) => set("date", event.target.value)}
          />
        </Field>
        <Field label="Trạng thái" htmlFor="event-status">
          <Select
            id="event-status"
            value={draft.status}
            onChange={(event) => set("status", event.target.value as EventStatus)}
          >
            {EVENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Bắt đầu" htmlFor="event-start" hint="HH:mm">
          <TextInput
            id="event-start"
            type="time"
            value={draft.startTime}
            onChange={(event) => set("startTime", event.target.value)}
          />
        </Field>
        <Field label="Kết thúc" htmlFor="event-end" error={errors.endTime} hint="HH:mm">
          <TextInput
            id="event-end"
            type="time"
            value={draft.endTime}
            invalid={Boolean(errors.endTime)}
            onChange={(event) => set("endTime", event.target.value)}
          />
        </Field>
      </div>

      <div className="field-grid">
        <Field label="Địa điểm" htmlFor="event-location" hint="Không bắt buộc">
          <TextInput
            id="event-location"
            value={draft.location}
            maxLength={1000}
            placeholder="Phòng họp 3A"
            onChange={(event) => set("location", event.target.value)}
          />
        </Field>
        <Field
          label="Người tham dự"
          htmlFor="event-attendees"
          hint="Cách nhau bằng dấu phẩy"
        >
          <TextInput
            id="event-attendees"
            value={draft.attendees}
            maxLength={1000}
            placeholder="Nguyễn An, Trần Bình"
            onChange={(event) => set("attendees", event.target.value)}
          />
        </Field>
      </div>

      <div className="field-grid">
        <Field label="Phụ trách" htmlFor="event-assignee" hint="Không bắt buộc">
          <TextInput
            id="event-assignee"
            value={draft.assignee}
            maxLength={150}
            autoComplete="off"
            onChange={(event) => set("assignee", event.target.value)}
          />
        </Field>
        <Field label="Phạm vi" htmlFor="event-scope" hint="Không bắt buộc">
          <TextInput
            id="event-scope"
            value={draft.scope}
            maxLength={250}
            autoComplete="off"
            placeholder="Khối vận hành"
            onChange={(event) => set("scope", event.target.value)}
          />
        </Field>
      </div>

      <Field label="Ghi chú" htmlFor="event-note" hint="Tối đa 2000 ký tự">
        <textarea
          id="event-note"
          className="textarea"
          value={draft.note}
          maxLength={2000}
          rows={3}
          onChange={(event) => set("note", event.target.value)}
        />
      </Field>
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { REPORT_STATUSES } from "../types";
import type { ReportInput, ReportStatus } from "../types";
import { todayIso } from "../format";
import { Field, Modal, Select, TextInput } from "./primitives";

interface CreateReportDialogProps {
  onCreate: (input: ReportInput) => Promise<unknown>;
  onClose: () => void;
}

interface Draft {
  code: string;
  name: string;
  scope: string;
  date: string;
  status: ReportStatus;
  assignee: string;
  period: string;
  goal: string;
  result: string;
  note: string;
}

/**
 * Creation only. The client repeats the API's required fields so the user sees
 * “nhập mã báo cáo” before the round trip.
 */
export function CreateReportDialog({ onCreate, onClose }: CreateReportDialogProps) {
  const [draft, setDraft] = useState<Draft>({
    code: "",
    name: "",
    scope: "",
    date: todayIso(),
    status: "Bản nháp",
    assignee: "",
    period: "",
    goal: "",
    result: "",
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!draft.code.trim()) next.code = "Nhập mã báo cáo, ví dụ BC-2026-11.";
    if (!draft.name.trim()) next.name = "Nhập tên báo cáo.";
    if (!draft.date) next.date = "Chọn ngày lập báo cáo.";
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
          ...(draft.period.trim() ? { period: draft.period.trim() } : {}),
          ...(draft.goal.trim() ? { goal: draft.goal.trim() } : {}),
          ...(draft.result.trim() ? { result: draft.result.trim() } : {}),
        },
      });
      onClose();
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : "Chưa tạo được báo cáo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Tạo báo cáo"
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
            {busy ? "Đang lưu…" : "Lưu báo cáo"}
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
        <Field label="Mã báo cáo" htmlFor="report-code" required error={errors.code}>
          <TextInput
            id="report-code"
            value={draft.code}
            invalid={Boolean(errors.code)}
            maxLength={100}
            autoComplete="off"
            placeholder="BC-2026-11"
            onChange={(event) => set("code", event.target.value)}
          />
        </Field>
        <Field label="Ngày lập" htmlFor="report-date" required error={errors.date}>
          <TextInput
            id="report-date"
            type="date"
            value={draft.date}
            invalid={Boolean(errors.date)}
            onChange={(event) => set("date", event.target.value)}
          />
        </Field>
      </div>

      <Field label="Tên báo cáo" htmlFor="report-name" required error={errors.name}>
        <TextInput
          id="report-name"
          value={draft.name}
          invalid={Boolean(errors.name)}
          maxLength={500}
          autoComplete="off"
          placeholder="Báo cáo vận hành tháng 11"
          onChange={(event) => set("name", event.target.value)}
        />
      </Field>

      <div className="field-grid">
        <Field label="Kỳ báo cáo" htmlFor="report-period" hint="Không bắt buộc">
          <TextInput
            id="report-period"
            value={draft.period}
            maxLength={1000}
            autoComplete="off"
            placeholder="01/11/2026 – 30/11/2026"
            onChange={(event) => set("period", event.target.value)}
          />
        </Field>
        <Field label="Phạm vi" htmlFor="report-scope" hint="Không bắt buộc">
          <TextInput
            id="report-scope"
            value={draft.scope}
            maxLength={250}
            autoComplete="off"
            placeholder="Khối vận hành"
            onChange={(event) => set("scope", event.target.value)}
          />
        </Field>
      </div>

      <div className="field-grid">
        <Field label="Người lập" htmlFor="report-assignee" hint="Không bắt buộc">
          <TextInput
            id="report-assignee"
            value={draft.assignee}
            maxLength={150}
            autoComplete="off"
            onChange={(event) => set("assignee", event.target.value)}
          />
        </Field>
        <Field label="Trạng thái" htmlFor="report-status">
          <Select
            id="report-status"
            value={draft.status}
            onChange={(event) => set("status", event.target.value as ReportStatus)}
          >
            {REPORT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Mục tiêu kỳ" htmlFor="report-goal" hint="Tối đa 20.000 ký tự">
        <textarea
          id="report-goal"
          className="textarea"
          value={draft.goal}
          maxLength={20000}
          rows={3}
          onChange={(event) => set("goal", event.target.value)}
        />
      </Field>

      <Field label="Kết quả đạt được" htmlFor="report-result" hint="Tối đa 20.000 ký tự">
        <textarea
          id="report-result"
          className="textarea"
          value={draft.result}
          maxLength={20000}
          rows={4}
          onChange={(event) => set("result", event.target.value)}
        />
      </Field>

      <Field label="Ghi chú" htmlFor="report-note" hint="Tối đa 2.000 ký tự">
        <textarea
          id="report-note"
          className="textarea"
          value={draft.note}
          maxLength={2000}
          rows={2}
          onChange={(event) => set("note", event.target.value)}
        />
      </Field>
    </Modal>
  );
}

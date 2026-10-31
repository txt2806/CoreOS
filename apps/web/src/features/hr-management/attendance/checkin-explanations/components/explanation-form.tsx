"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { EXPLANATION_DEADLINE_WORKDAYS, TYPE_HINT, TYPE_LABEL } from "../constants";
import { deadlineFor, formatDate, todayIso } from "../format";
import {
  EXPLANATION_TYPES,
  type Explanation,
  type ExplanationInput,
  type ExplanationPatch,
  type ExplanationType,
} from "../types";
import { Field, Modal, Select, TextInput } from "./primitives";

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

interface ExplanationFormProps {
  /** Present when a pending request is being edited. */
  record?: Explanation;
  me: { id: string; name: string } | null;
  onSubmit: (input: ExplanationInput) => Promise<unknown>;
  onPatch?: (record: Explanation, change: Omit<ExplanationPatch, "version">) => Promise<unknown>;
  onClose: () => void;
}

export function ExplanationDialog({ record, me, onSubmit, onPatch, onClose }: ExplanationFormProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (key: string) => `explanation-${uid}-${key}`;
  const [employeeId, setEmployeeId] = useState(record?.employeeId ?? me?.id ?? "");
  const [employeeName, setEmployeeName] = useState(record?.employeeName ?? me?.name ?? "");
  const [workDate, setWorkDate] = useState(record?.workDate ?? todayIso());
  const [type, setType] = useState<ExplanationType>(record?.type ?? "FORGOT_CHECKIN");
  const [requestedCheckIn, setRequestedCheckIn] = useState(record?.requestedCheckIn ?? "");
  const [requestedCheckOut, setRequestedCheckOut] = useState(record?.requestedCheckOut ?? "");
  const [reason, setReason] = useState(record?.reason ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const deadline = deadlineFor(workDate, EXPLANATION_DEADLINE_WORKDAYS);

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    if (!employeeId.trim()) found.employeeId = "Chọn nhân sự trong hồ sơ.";
    else if (employeeId.length > 64) found.employeeId = "Mã nhân sự tối đa 64 ký tự.";
    if (!employeeName.trim()) found.employeeName = "Nhập tên nhân sự để quản lý đối chiếu.";
    else if (employeeName.length > 200) found.employeeName = "Tên tối đa 200 ký tự.";
    if (!workDate) found.workDate = "Chọn ngày cần điều chỉnh giờ công.";
    if (reason.trim().length < 10) found.reason = "Giải trình cần ít nhất 10 ký tự.";
    else if (reason.length > 1000) found.reason = "Giải trình tối đa 1.000 ký tự.";
    if (!requestedCheckIn && !requestedCheckOut)
      found.requestedCheckIn = "Đề nghị ít nhất một mốc giờ: giờ vào hoặc giờ ra.";
    if (requestedCheckIn && !CLOCK.test(requestedCheckIn))
      found.requestedCheckIn = "Giờ vào phải có dạng HH:mm.";
    if (requestedCheckOut && !CLOCK.test(requestedCheckOut))
      found.requestedCheckOut = "Giờ ra phải có dạng HH:mm.";
    if (type === "WRONG_TIME" && (!requestedCheckIn || !requestedCheckOut)) {
      found.requestedCheckIn = "Kiểu “sai giờ” cần cả giờ vào và giờ ra đúng.";
    }
    return found;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    const first = [
      "employeeId",
      "employeeName",
      "workDate",
      "reason",
      "requestedCheckIn",
      "requestedCheckOut",
    ].find((key) => found[key]);
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    setBusy(true);
    try {
      if (record && onPatch) {
        await onPatch(record, {
          reason: reason.trim(),
          type,
          requestedCheckIn,
          requestedCheckOut,
        });
      } else {
        await onSubmit({
          employeeId: employeeId.trim(),
          employeeName: employeeName.trim(),
          workDate,
          type,
          reason: reason.trim(),
          requestedCheckIn,
          requestedCheckOut,
        });
      }
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const mapped: Record<string, string> = {};
        for (const issue of caught.issues) {
          const key = issue.path.split(/[.[\]]/).filter(Boolean).pop();
          if (key && ["reason", "type", "requestedCheckIn", "requestedCheckOut"].includes(key))
            mapped[key] = issue.message;
        }
        setErrors(mapped);
        setFormError(
          Object.keys(mapped).length
            ? "Một số trường chưa hợp lệ. Sửa theo gợi ý bên dưới rồi gửi lại."
            : caught.message,
        );
      } else {
        setFormError(caught instanceof Error ? caught.message : "Chưa gửi được giải trình.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={record ? "Sửa đơn giải trình" : "Gửi giải trình chấm công"}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button
            type="submit"
            form={id("form")}
            className="btn btn-primary"
            disabled={busy}
            aria-busy={busy ? "true" : undefined}
          >
            {busy ? "Đang gửi…" : record ? "Lưu thay đổi" : "Gửi giải trình"}
          </button>
        </>
      }
    >
      <form id={id("form")} className="stack gap-4" onSubmit={submit} noValidate>
        {formError ? (
          <div className="alert alert-danger" role="alert">
            <span>{formError}</span>
          </div>
        ) : null}

        <p className="muted">
          Hạn gửi giải trình là {EXPLANATION_DEADLINE_WORKDAYS} ngày làm việc sau ngày công.
          {deadline ? (
            <>
              {" "}
              Với ngày <strong className="tabular">{formatDate(workDate)}</strong>, hạn cuối là{" "}
              <strong className="tabular">{formatDate(deadline)}</strong>.
            </>
          ) : null}
        </p>

        <div className="field-grid">
          <Field label="Mã nhân sự" htmlFor={id("employeeId")} required error={errors.employeeId}>
            <TextInput
              id={id("employeeId")}
              value={employeeId}
              maxLength={64}
              autoComplete="off"
              readOnly={Boolean(record)}
              invalid={Boolean(errors.employeeId)}
              placeholder="EMP-0142"
              onChange={(event) => setEmployeeId(event.target.value)}
            />
          </Field>

          <Field label="Tên nhân sự" htmlFor={id("employeeName")} required error={errors.employeeName}>
            <TextInput
              id={id("employeeName")}
              value={employeeName}
              maxLength={200}
              autoComplete="off"
              readOnly={Boolean(record)}
              invalid={Boolean(errors.employeeName)}
              placeholder="Tên như trong hồ sơ nhân sự"
              onChange={(event) => setEmployeeName(event.target.value)}
            />
          </Field>

          <Field
            label="Ngày cần điều chỉnh"
            htmlFor={id("workDate")}
            required
            error={errors.workDate}
            hint="Mỗi ngày chỉ có một đơn cho mỗi kiểu giải trình."
          >
            <TextInput
              id={id("workDate")}
              type="date"
              value={workDate}
              max={todayIso()}
              readOnly={Boolean(record)}
              invalid={Boolean(errors.workDate)}
              onChange={(event) => {
                if (event.target.value) setWorkDate(event.target.value);
              }}
            />
          </Field>

          <Field label="Kiểu giải trình" htmlFor={id("type")} required hint={TYPE_HINT[type]}>
            <Select
              id={id("type")}
              value={type}
              onChange={(event) => {
                const next = event.target.value as ExplanationType;
                if (EXPLANATION_TYPES.includes(next)) setType(next);
              }}
            >
              {EXPLANATION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {TYPE_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Giờ vào đề nghị"
            htmlFor={id("requestedCheckIn")}
            error={errors.requestedCheckIn}
            hint="Bỏ trống nếu giờ vào đã đúng."
          >
            <TextInput
              id={id("requestedCheckIn")}
              type="time"
              value={requestedCheckIn}
              invalid={Boolean(errors.requestedCheckIn)}
              onChange={(event) => setRequestedCheckIn(event.target.value)}
            />
          </Field>

          <Field
            label="Giờ ra đề nghị"
            htmlFor={id("requestedCheckOut")}
            error={errors.requestedCheckOut}
            hint="Bỏ trống nếu giờ ra đã đúng."
          >
            <TextInput
              id={id("requestedCheckOut")}
              type="time"
              value={requestedCheckOut}
              invalid={Boolean(errors.requestedCheckOut)}
              onChange={(event) => setRequestedCheckOut(event.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Giải trình"
          htmlFor={id("reason")}
          required
          error={errors.reason}
          counter={`${reason.length}/1000`}
          hint="Nêu việc đã xảy ra và căn cứ để quản lý đối chiếu. Tối thiểu 10 ký tự."
        >
          <textarea
            id={id("reason")}
            className="textarea"
            rows={4}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>

        <p className="muted">
          Hệ thống chỉ lưu nội dung giải trình và hai mốc giờ đề nghị; chưa có trường tệp đính
          kèm trong dữ liệu giải trình.
        </p>
      </form>
    </Modal>
  );
}

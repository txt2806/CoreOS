"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  HOLIDAY_NAME_MAX,
  NETWORK_LABEL_MAX,
  NOTE_MAX,
  QUOTA_DAYS_MAX,
  STATUS_LABELS,
  YEAR_MAX,
  YEAR_MIN,
} from "../constants";
import type {
  Holiday,
  HolidayInput,
  Network,
  NetworkInput,
  Quota,
  QuotaInput,
  Status,
} from "../types";
import { AlertGlyph, Modal } from "./primitives";

const STATUSES: readonly Status[] = ["ACTIVE", "INACTIVE"];

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const ipv4 = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
/** Same shape the DTO enforces, so the operator sees the rule before the server does. */
const CIDR = new RegExp(`^${ipv4}(\\.${ipv4}){3}(/(3[0-2]|[12]?\\d))?$`);

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

function ProblemAlert({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <div className="alert alert-warning" role="alert">
      <AlertGlyph />
      <div className="stack gap-1">
        <span>Còn {messages.length.toLocaleString("vi-VN")} mục cần sửa:</span>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DiscardBar({ onDiscard, onStay }: { onDiscard: () => void; onStay: () => void }) {
  return (
    <div className="alert alert-warning" role="alert">
      <AlertGlyph />
      <div className="stack gap-2">
        <span>Bỏ các thay đổi chưa lưu trong biểu mẫu này?</span>
        <div className="row gap-2">
          <button type="button" className="btn btn-danger btn-sm" onClick={onDiscard}>
            Bỏ thay đổi
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onStay}>
            Tiếp tục sửa
          </button>
        </div>
      </div>
    </div>
  );
}

interface HolidayDialogProps {
  holiday?: Holiday;
  busy: boolean;
  serverError: string | null;
  onSubmit: (input: HolidayInput) => void;
  onClose: () => void;
}

export function HolidayDialog({ holiday, busy, serverError, onSubmit, onClose }: HolidayDialogProps) {
  const base = useId();
  const formId = `${base}-form`;
  const initial = {
    date: holiday?.date ?? "",
    name: holiday?.name ?? "",
    paid: holiday?.paid ?? true,
    status: holiday?.status ?? "ACTIVE",
    note: holiday?.note ?? "",
  };
  const [draft, setDraft] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const messages = [
    DATE_KEY.test(draft.date) ? "" : "Chọn ngày lễ (dd/mm/yyyy).",
    draft.name.trim() ? "" : "Nhập tên ngày lễ.",
    draft.name.trim().length > HOLIDAY_NAME_MAX ? `Tên tối đa ${HOLIDAY_NAME_MAX} ký tự.` : "",
    draft.note.length > NOTE_MAX ? `Ghi chú tối đa ${NOTE_MAX} ký tự.` : "",
  ].filter(Boolean);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (messages.length > 0) return;
    onSubmit({
      date: draft.date,
      name: draft.name.trim(),
      paid: draft.paid,
      status: draft.status,
      note: draft.note.trim(),
    });
  };

  const requestClose = () => {
    if (busy) return;
    if (dirty) setConfirming(true);
    else onClose();
  };

  return (
    <Modal
      title={holiday ? "Sửa ngày lễ" : "Thêm ngày lễ"}
      onClose={requestClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={requestClose} disabled={busy}>
            Quay lại
          </button>
          <button type="submit" className="btn btn-primary" form={formId} disabled={busy} aria-busy={busy}>
            {busy ? "Đang lưu…" : holiday ? "Lưu thay đổi" : "Thêm ngày lễ"}
          </button>
        </>
      }
    >
      <form id={formId} className="stack gap-4" onSubmit={submit} noValidate>
        {serverError ? (
          <div className="alert alert-danger" role="alert">
            <AlertGlyph />
            <span>{serverError}</span>
          </div>
        ) : null}
        {attempted ? <ProblemAlert messages={messages} /> : null}
        {confirming ? (
          <DiscardBar
            onDiscard={() => {
              setDraft(initial);
              onClose();
            }}
            onStay={() => setConfirming(false)}
          />
        ) : null}

        <div className="field-grid">
          <Field
            id={`${base}-date`}
            label="Ngày"
            error={attempted && !DATE_KEY.test(draft.date) ? "Chọn ngày lễ." : undefined}
            hint="Ngày nghỉ không tính vào quỹ phép của năm."
          >
            <input
              id={`${base}-date`}
              className="input"
              type="date"
              value={draft.date}
              aria-invalid={attempted && !DATE_KEY.test(draft.date)}
              aria-describedby={
                attempted && !DATE_KEY.test(draft.date) ? `${base}-date-error` : undefined
              }
              onChange={(event) =>
                setDraft((current) => ({ ...current, date: event.target.value }))
              }
            />
          </Field>

          <Field
            id={`${base}-status`}
            label="Trạng thái"
            hint="Tạm ngưng thay vì xoá: ngày lễ đã dùng vẫn giữ trong lịch sử."
          >
            <select
              id={`${base}-status`}
              className="select"
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value === "INACTIVE" ? "INACTIVE" : "ACTIVE",
                }))
              }
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          id={`${base}-name`}
          label="Tên ngày lễ"
          error={
            attempted && !draft.name.trim()
              ? "Nhập tên ngày lễ."
              : draft.name.trim().length > HOLIDAY_NAME_MAX
                ? `Tên tối đa ${HOLIDAY_NAME_MAX} ký tự.`
                : undefined
          }
        >
          <input
            id={`${base}-name`}
            className="input"
            type="text"
            value={draft.name}
            maxLength={HOLIDAY_NAME_MAX}
            autoComplete="off"
            aria-invalid={draft.name.trim().length > HOLIDAY_NAME_MAX}
            aria-describedby={attempted && !draft.name.trim() ? `${base}-name-error` : undefined}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
        </Field>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={draft.paid}
            onChange={(event) =>
              setDraft((current) => ({ ...current, paid: event.target.checked }))
            }
          />
          Ngày lễ có hưởng lương
        </label>

        <Field
          id={`${base}-note`}
          label="Ghi chú"
          hint={`Không bắt buộc, tối đa ${NOTE_MAX} ký tự.`}
          error={draft.note.length > NOTE_MAX ? `Ghi chú tối đa ${NOTE_MAX} ký tự.` : undefined}
        >
          <textarea
            id={`${base}-note`}
            className="textarea"
            rows={3}
            value={draft.note}
            maxLength={NOTE_MAX}
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          />
        </Field>
      </form>
    </Modal>
  );
}

interface NetworkDialogProps {
  network?: Network;
  busy: boolean;
  serverError: string | null;
  onSubmit: (input: NetworkInput) => void;
  onClose: () => void;
}

export function NetworkDialog({ network, busy, serverError, onSubmit, onClose }: NetworkDialogProps) {
  const base = useId();
  const formId = `${base}-form`;
  const initial = {
    label: network?.label ?? "",
    cidr: network?.cidr ?? "",
    status: network?.status ?? "ACTIVE",
    note: network?.note ?? "",
  };
  const [draft, setDraft] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const cidrOk = CIDR.test(draft.cidr.trim());
  const messages = [
    draft.label.trim() ? "" : "Nhập tên mạng.",
    draft.label.trim().length > NETWORK_LABEL_MAX ? `Tên tối đa ${NETWORK_LABEL_MAX} ký tự.` : "",
    cidrOk ? "" : "Nhập IPv4 hợp lệ, ví dụ 203.0.113.10 hoặc 203.0.113.0/24.",
    draft.note.length > NOTE_MAX ? `Ghi chú tối đa ${NOTE_MAX} ký tự.` : "",
  ].filter(Boolean);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (messages.length > 0) return;
    onSubmit({
      label: draft.label.trim(),
      cidr: draft.cidr.trim(),
      status: draft.status,
      note: draft.note.trim(),
    });
  };

  const requestClose = () => {
    if (busy) return;
    if (dirty) setConfirming(true);
    else onClose();
  };

  return (
    <Modal
      title={network ? "Sửa mạng văn phòng" : "Khai báo mạng văn phòng"}
      onClose={requestClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={requestClose} disabled={busy}>
            Quay lại
          </button>
          <button type="submit" className="btn btn-primary" form={formId} disabled={busy} aria-busy={busy}>
            {busy ? "Đang lưu…" : network ? "Lưu thay đổi" : "Thêm mạng"}
          </button>
        </>
      }
    >
      <form id={formId} className="stack gap-4" onSubmit={submit} noValidate>
        {serverError ? (
          <div className="alert alert-danger" role="alert">
            <AlertGlyph />
            <span>{serverError}</span>
          </div>
        ) : null}
        {attempted ? <ProblemAlert messages={messages} /> : null}
        {confirming ? (
          <DiscardBar
            onDiscard={() => {
              setDraft(initial);
              onClose();
            }}
            onStay={() => setConfirming(false)}
          />
        ) : null}

        <div className="field-grid">
          <Field
            id={`${base}-label`}
            label="Tên mạng"
            error={attempted && !draft.label.trim() ? "Nhập tên mạng." : undefined}
          >
            <input
              id={`${base}-label`}
              className="input"
              type="text"
              value={draft.label}
              maxLength={NETWORK_LABEL_MAX}
              autoComplete="off"
              aria-invalid={attempted && !draft.label.trim()}
              aria-describedby={attempted && !draft.label.trim() ? `${base}-label-error` : undefined}
              onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
            />
          </Field>

          <Field
            id={`${base}-status`}
            label="Trạng thái"
            hint="Tạm ngưng để ngừng nhận chấm công từ dải này."
          >
            <select
              id={`${base}-status`}
              className="select"
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value === "INACTIVE" ? "INACTIVE" : "ACTIVE",
                }))
              }
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          id={`${base}-cidr`}
          label="Địa chỉ IPv4 hoặc dải CIDR"
          error={attempted && !cidrOk ? "Nhập IPv4 hợp lệ, ví dụ 203.0.113.10 hoặc 203.0.113.0/24." : undefined}
          hint="Mỗi dòng một dải; máy chủ chặn trùng dải đã khai báo."
        >
          <input
            id={`${base}-cidr`}
            className="input mono"
            type="text"
            value={draft.cidr}
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={attempted && !cidrOk}
            aria-describedby={attempted && !cidrOk ? `${base}-cidr-error` : undefined}
            onChange={(event) => setDraft((current) => ({ ...current, cidr: event.target.value }))}
          />
        </Field>

        <Field
          id={`${base}-note`}
          label="Ghi chú"
          hint={`Không bắt buộc, tối đa ${NOTE_MAX} ký tự.`}
          error={draft.note.length > NOTE_MAX ? `Ghi chú tối đa ${NOTE_MAX} ký tự.` : undefined}
        >
          <textarea
            id={`${base}-note`}
            className="textarea"
            rows={3}
            value={draft.note}
            maxLength={NOTE_MAX}
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          />
        </Field>
      </form>
    </Modal>
  );
}

interface QuotaDialogProps {
  quota?: Quota;
  busy: boolean;
  serverError: string | null;
  onSubmit: (input: QuotaInput) => void;
  onClose: () => void;
}

export function QuotaDialog({ quota, busy, serverError, onSubmit, onClose }: QuotaDialogProps) {
  const base = useId();
  const formId = `${base}-form`;
  const initial = {
    year: String(quota?.year ?? new Date().getFullYear()),
    daysPerYear: String(quota?.daysPerYear ?? 12),
    maxCarryOverDays: String(quota?.maxCarryOverDays ?? 0),
    note: quota?.note ?? "",
  };
  const [draft, setDraft] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const year = Number(draft.year);
  const days = Number(draft.daysPerYear);
  const carry = Number(draft.maxCarryOverDays);
  const yearOk = Number.isInteger(year) && year >= YEAR_MIN && year <= YEAR_MAX;
  const daysOk = Number.isInteger(days) && days >= 0 && days <= QUOTA_DAYS_MAX;
  const carryOk = Number.isInteger(carry) && carry >= 0 && carry <= QUOTA_DAYS_MAX;

  const messages = [
    yearOk ? "" : `Năm phải là số nguyên từ ${YEAR_MIN} đến ${YEAR_MAX}.`,
    daysOk ? "" : `Số ngày phép phải là số nguyên từ 0 đến ${QUOTA_DAYS_MAX}.`,
    carryOk ? "" : `Số ngày mang sang phải là số nguyên từ 0 đến ${QUOTA_DAYS_MAX}.`,
    draft.note.length > NOTE_MAX ? `Ghi chú tối đa ${NOTE_MAX} ký tự.` : "",
  ].filter(Boolean);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (messages.length > 0) return;
    onSubmit({
      year,
      daysPerYear: days,
      maxCarryOverDays: carry,
      note: draft.note.trim(),
    });
  };

  const requestClose = () => {
    if (busy) return;
    if (dirty) setConfirming(true);
    else onClose();
  };

  return (
    <Modal
      title={quota ? `Sửa hạn mức phép năm ${quota.year}` : "Thêm hạn mức phép"}
      onClose={requestClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={requestClose} disabled={busy}>
            Quay lại
          </button>
          <button type="submit" className="btn btn-primary" form={formId} disabled={busy} aria-busy={busy}>
            {busy ? "Đang lưu…" : quota ? "Lưu thay đổi" : "Thêm hạn mức"}
          </button>
        </>
      }
    >
      <form id={formId} className="stack gap-4" onSubmit={submit} noValidate>
        {serverError ? (
          <div className="alert alert-danger" role="alert">
            <AlertGlyph />
            <span>{serverError}</span>
          </div>
        ) : null}
        {attempted ? <ProblemAlert messages={messages} /> : null}
        {confirming ? (
          <DiscardBar
            onDiscard={() => {
              setDraft(initial);
              onClose();
            }}
            onStay={() => setConfirming(false)}
          />
        ) : null}

        <div className="field-grid">
          <Field
            id={`${base}-year`}
            label="Năm"
            error={attempted && !yearOk ? `Năm phải từ ${YEAR_MIN} đến ${YEAR_MAX}.` : undefined}
            hint="Mỗi năm một bản ghi; máy chủ chặn trùng năm."
          >
            <input
              id={`${base}-year`}
              className="input tabular"
              type="number"
              inputMode="numeric"
              min={YEAR_MIN}
              max={YEAR_MAX}
              step={1}
              value={draft.year}
              aria-invalid={attempted && !yearOk}
              aria-describedby={attempted && !yearOk ? `${base}-year-error` : undefined}
              onChange={(event) => setDraft((current) => ({ ...current, year: event.target.value }))}
            />
          </Field>

          <Field
            id={`${base}-days`}
            label="Số ngày phép trong năm"
            error={attempted && !daysOk ? `Số ngày phép từ 0 đến ${QUOTA_DAYS_MAX}.` : undefined}
          >
            <input
              id={`${base}-days`}
              className="input tabular"
              type="number"
              inputMode="numeric"
              min={0}
              max={QUOTA_DAYS_MAX}
              step={1}
              value={draft.daysPerYear}
              aria-invalid={attempted && !daysOk}
              aria-describedby={attempted && !daysOk ? `${base}-days-error` : undefined}
              onChange={(event) =>
                setDraft((current) => ({ ...current, daysPerYear: event.target.value }))
              }
            />
          </Field>

          <Field
            id={`${base}-carry`}
            label="Số ngày được mang sang năm sau"
            error={
              attempted && !carryOk ? `Số ngày mang sang từ 0 đến ${QUOTA_DAYS_MAX}.` : undefined
            }
            hint="Đặt 0 nếu không cho phép chuyển tiếp."
          >
            <input
              id={`${base}-carry`}
              className="input tabular"
              type="number"
              inputMode="numeric"
              min={0}
              max={QUOTA_DAYS_MAX}
              step={1}
              value={draft.maxCarryOverDays}
              aria-invalid={attempted && !carryOk}
              aria-describedby={attempted && !carryOk ? `${base}-carry-error` : undefined}
              onChange={(event) =>
                setDraft((current) => ({ ...current, maxCarryOverDays: event.target.value }))
              }
            />
          </Field>
        </div>

        <Field
          id={`${base}-note`}
          label="Ghi chú"
          hint={`Không bắt buộc, tối đa ${NOTE_MAX} ký tự.`}
          error={draft.note.length > NOTE_MAX ? `Ghi chú tối đa ${NOTE_MAX} ký tự.` : undefined}
        >
          <textarea
            id={`${base}-note`}
            className="textarea"
            rows={3}
            value={draft.note}
            maxLength={NOTE_MAX}
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          />
        </Field>
      </form>
    </Modal>
  );
}

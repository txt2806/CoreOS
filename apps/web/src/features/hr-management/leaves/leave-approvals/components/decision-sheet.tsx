"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { LEAVE_TYPE_LABEL, NOTE_MAX, NOTE_MIN } from "../constants";
import { daysBetween, formatDate, formatDateTime, number, sessionOf, today } from "../format";
import type { DecisionStatus, QueueItem } from "../types";
import type { QuotaContext } from "../hooks/use-leave-approvals";
import { CloseGlyph, Field, TextArea } from "./primitives";

interface DecisionSheetProps {
  item: QueueItem;
  initialMode: DecisionStatus;
  canApprove: boolean;
  pending: boolean;
  quota: QuotaContext | null;
  quotaProblem: string | null;
  usedDaysOf: (employeeId: string) => Promise<number | null>;
  onDecide: (status: DecisionStatus, note: string) => Promise<boolean>;
  onClose: () => void;
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="spread gap-3 py-1">
      <dt className="muted">{term}</dt>
      <dd className="tabular">{children}</dd>
    </div>
  );
}

export function DecisionSheet({
  item,
  initialMode,
  canApprove,
  pending,
  quota,
  quotaProblem,
  usedDaysOf,
  onDecide,
  onClose,
}: DecisionSheetProps) {
  const titleId = useId();
  const noteId = `${titleId}-note`;
  const [mode, setMode] = useState<DecisionStatus>(initialMode);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [used, setUsed] = useState<number | null>(null);
  const [usedState, setUsedState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Quota impact is fetched per applicant so the manager sees what approving costs. */
  useEffect(() => {
    let cancelled = false;
    setUsedState("loading");
    usedDaysOf(item.employeeId)
      .then((days) => {
        if (cancelled) return;
        setUsed(days);
        setUsedState(days === null ? "failed" : "ready");
      })
      .catch(() => {
        if (!cancelled) setUsedState("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [item.employeeId, usedDaysOf]);

  const remaining = useMemo(() => {
    if (!quota || used === null) return null;
    return quota.daysPerYear - used;
  }, [quota, used]);

  const after = remaining === null ? null : remaining - item.days;
  const untilStart = daysBetween(today(), item.fromDate);
  const blocking = mode === "REJECTED" && note.trim().length < NOTE_MIN;

  const submit = async () => {
    if (mode === "REJECTED" && note.trim().length < NOTE_MIN) {
      setNoteError(`Cần ghi lý do từ chối tối thiểu ${NOTE_MIN} ký tự để nhân sự hiểu và xử lý.`);
      return;
    }
    setNoteError(null);
    const done = await onDecide(mode, note.trim());
    if (done) onClose();
  };

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-2">
            <span className="eyebrow mono">{item.employeeId}</span>
            <h2 className="page-heading" id={titleId}>
              {item.employeeName}
            </h2>
            <div className="row items-center gap-2 wrap">
              <span className="badge badge-warning">
                <span className="dot" />
                Chờ duyệt
              </span>
              <span className="badge">{LEAVE_TYPE_LABEL[item.leaveType]}</span>
              <span className="chip">{sessionOf(item)}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết đơn chờ duyệt"
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="sheet-body">
          <dl className="stack gap-0">
            <Row term="Từ ngày">{formatDate(item.fromDate)}</Row>
            <Row term="Đến ngày">{formatDate(item.toDate)}</Row>
            <Row term="Số ngày làm việc">{number(item.days)} ngày</Row>
            <Row term="Phiên nghỉ">{sessionOf(item)}</Row>
            <Row term="Ngày gửi">{formatDateTime(item.createdAt)}</Row>
            <Row term="Khởi hành">
              {untilStart < 0 ? (
                <span className="deadline deadline-danger">
                  Đã qua {number(Math.abs(untilStart))} ngày
                </span>
              ) : untilStart === 0 ? (
                <span className="deadline deadline-danger">Bắt đầu hôm nay</span>
              ) : (
                <span className="deadline">Còn {number(untilStart)} ngày</span>
              )}
            </Row>
          </dl>

          <section className="stack gap-2">
            <h3 className="surface-title">Lý do nhân sự gửi</h3>
            <p className="list-main">{item.reason}</p>
          </section>

          <section className="stack gap-2" aria-label="Ảnh hưởng hạn mức phép năm">
            <h3 className="surface-title">Ảnh hưởng hạn mức phép năm</h3>
            {quota ? (
              <div className="list" aria-live="polite">
                <div className="list-row">
                  <div className="list-main">
                    <span>Hạn mức {quota.year}</span>
                    <span className="list-meta">Theo Chính sách làm việc của tổ chức</span>
                  </div>
                  <span className="tabular">{number(quota.daysPerYear)} ngày</span>
                </div>
                <div className="list-row">
                  <div className="list-main">
                    <span>Đã dùng (đơn đã duyệt)</span>
                    <span className="list-meta">
                      {usedState === "loading"
                        ? "Đang tính…"
                        : usedState === "failed"
                          ? "Không đọc được số ngày đã dùng"
                          : `Tính đến hết năm ${quota.year}`}
                    </span>
                  </div>
                  <span className="tabular">
                    {used === null ? "—" : `${number(used)} ngày`}
                  </span>
                </div>
                <div className="list-row">
                  <div className="list-main">
                    <span>Đơn đang xét</span>
                    <span className="list-meta">{LEAVE_TYPE_LABEL[item.leaveType]}</span>
                  </div>
                  <span className="tabular">{number(item.days)} ngày</span>
                </div>
                <div className="list-row">
                  <div className="list-main">
                    <span>Còn lại sau khi duyệt</span>
                    <span className="list-meta">
                      {remaining === null
                        ? "Chưa tính được"
                        : `Hiện còn ${number(remaining)} ngày`}
                    </span>
                  </div>
                  <span
                    className="tabular"
                    style={{
                      color:
                        after !== null && after < 0
                          ? "var(--color-danger, #b42318)"
                          : undefined,
                    }}
                  >
                    {after === null ? "—" : `${number(after)} ngày`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="alert alert-warning" role="status">
                <span>
                  {quotaProblem ??
                    "Chưa đọc được hạn mức phép năm nên màn hình chỉ hiển thị số ngày của đơn."}
                </span>
              </div>
            )}
            {after !== null && after < 0 ? (
              <p className="muted">
                Duyệt đơn này sẽ đưa số ngày phép năm đã dùng vượt hạn mức hiện hành. Hệ thống vẫn
                cho duyệt, nhưng nên xác nhận lại với nhân sự.
              </p>
            ) : null}
          </section>

          <section className="stack gap-3" aria-label="Ghi quyết định">
            <h3 className="surface-title">Quyết định</h3>
            <div className="segmented" role="group" aria-label="Chọn quyết định cho đơn này">
              <button
                type="button"
                className="segment"
                aria-pressed={mode === "APPROVED"}
                onClick={() => {
                  setMode("APPROVED");
                  setNoteError(null);
                }}
              >
                Duyệt
              </button>
              <button
                type="button"
                className="segment"
                aria-pressed={mode === "REJECTED"}
                onClick={() => setMode("REJECTED")}
              >
                Từ chối
              </button>
            </div>

            <Field
              label={mode === "REJECTED" ? "Lý do từ chối" : "Ghi chú cho nhân sự"}
              htmlFor={noteId}
              required={mode === "REJECTED"}
              error={noteError ?? undefined}
              counter={`${note.length}/${NOTE_MAX}`}
              hint={
                mode === "REJECTED"
                  ? `Bắt buộc, tối thiểu ${NOTE_MIN} ký tự. Nhân sự nhận được lý do này ngay trong đơn.`
                  : "Không bắt buộc. Nên ghi hướng dẫn bàn giao công việc nếu cần."
              }
            >
              <TextArea
                id={noteId}
                rows={3}
                maxLength={NOTE_MAX}
                value={note}
                invalid={Boolean(noteError)}
                onChange={(event) => {
                  setNote(event.target.value);
                  if (noteError) setNoteError(null);
                }}
                placeholder={
                  mode === "REJECTED"
                    ? "Ví dụ: trùng lịch giao hàng tuần 32, đề nghị dời sang tuần 34."
                    : "Ví dụ: nhớ bàn giao danh sách khách hàng trước khi nghỉ."
                }
              />
            </Field>

            {mode === "REJECTED" ? (
              <div className="alert alert-warning" role="status">
                <span>
                  Nếu từ chối sau ngày nghỉ đã bắt đầu, khoảng nghỉ đó được tính là nghỉ không phép
                  theo quy định.
                </span>
              </div>
            ) : null}
          </section>
        </div>

        <div className="sheet-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ marginRight: "auto" }}>
            Đóng
          </button>
          <button
            type="button"
            className={mode === "REJECTED" ? "btn btn-danger" : "btn btn-primary"}
            onClick={submit}
            disabled={!canApprove || pending || blocking}
            aria-busy={pending ? "true" : undefined}
            title={
              !canApprove
                ? "Bạn không có quyền duyệt đơn nghỉ phép"
                : blocking
                  ? `Cần ghi lý do từ chối tối thiểu ${NOTE_MIN} ký tự`
                  : undefined
            }
          >
            {pending
              ? "Đang ghi quyết định…"
              : mode === "REJECTED"
                ? "Từ chối đơn"
                : "Duyệt đơn"}
          </button>
        </div>
      </aside>
    </>
  );
}

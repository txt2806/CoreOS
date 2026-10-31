"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { approvalChain, ApiError } from "../api/client";
import { QUORUM_LABEL, MIN_REJECT_NOTE } from "../constants";
import { formatDate, formatDateTime, money, remainingLabel } from "../format";
import type { ApprovalChain, InboxEntry } from "../types";
import {
  AlertGlyph,
  CheckGlyph,
  CloseGlyph,
  Person,
  RejectGlyph,
  SlaBadge,
  StatusBadge,
  StepBadge,
  VoteBadge,
} from "./primitives";

interface ReviewSheetProps {
  entry: InboxEntry;
  pending: boolean;
  canApprove: boolean;
  onSubmit: (decision: "APPROVE" | "REJECT", note: string) => Promise<boolean>;
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

/**
 * Review surface for one gate. The queue entry already carries the active step;
 * the full chain is fetched so approvers see who voted before them.
 */
export function ReviewSheet({ entry, pending, canApprove, onSubmit, onClose }: ReviewSheetProps) {
  const titleId = useId();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [chain, setChain] = useState<ApprovalChain | null>(null);
  const [chainProblem, setChainProblem] = useState<string | null>(null);
  const [chainLoading, setChainLoading] = useState(true);
  const { request, step } = entry;

  useEffect(() => {
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setChainLoading(true);
    approvalChain(request.id)
      .then((body) => {
        if (!cancelled) setChain(body);
      })
      .catch((caught: unknown) => {
        /* The chain is context only; deciding does not depend on this call. */
        if (!cancelled)
          setChainProblem(
            caught instanceof ApiError ? caught.message : "Không tải được tiến trình duyệt.",
          );
      })
      .finally(() => {
        if (!cancelled) setChainLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request.id]);

  const decide = async (decision: "APPROVE" | "REJECT") => {
    setProblem(null);
    setError(null);
    if (decision === "REJECT" && note.trim().length < MIN_REJECT_NOTE) {
      setError("Lý do từ chối cần ít nhất 3 ký tự để người gửi hiểu vấn đề.");
      return;
    }
    const ok = await onSubmit(decision, note.trim());
    if (ok) onClose();
    else setProblem("Quyết định chưa được ghi. Đề xuất vẫn nằm trong hàng đợi.");
  };

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-2">
            <span className="eyebrow mono">{request.code}</span>
            <h2 className="page-heading" id={titleId}>
              {request.name}
            </h2>
            <div className="row items-center gap-2 wrap">
              <StatusBadge status={request.status} />
              <StepBadge status={step.status} />
              <SlaBadge sla={step.sla} />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết đề xuất"
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="sheet-body">
          {problem ? (
            <div className="alert alert-danger" role="alert">
              <AlertGlyph />
              <span>{problem}</span>
            </div>
          ) : null}

          <dl className="stack gap-0">
            <Row term="Người gửi">{request.fields.requester || "Chưa ghi"}</Row>
            <Row term="Loại đề xuất">{request.fields.category ?? "Khác"}</Row>
            <Row term="Số tiền">{money(request.fields.amount)}</Row>
            <Row term="Ngày cần">{formatDate(request.date)}</Row>
            <Row term="Phạm vi">{request.scope || "Chưa gắn phạm vi"}</Row>
            <Row term="Người phụ trách">{request.assignee || "Chưa giao"}</Row>
            <Row term="Cập nhật">{formatDateTime(request.updatedAt)}</Row>
          </dl>

          {request.note ? (
            <section className="stack gap-2">
              <h3 className="surface-title">Nội dung đề xuất</h3>
              <p className="list-main" style={{ whiteSpace: "pre-wrap" }}>
                {request.note}
              </p>
            </section>
          ) : null}

          <section className="stack gap-2" aria-label="Bước đang chờ quyết định">
            <div className="spread items-center">
              <h3 className="surface-title">
                Bước {step.position} · {step.name}
              </h3>
              <SlaBadge sla={step.sla} />
            </div>
            <p className="muted">
              {QUORUM_LABEL[step.quorum] ?? step.quorum} · hạn {formatDateTime(step.dueAt)} ·{" "}
              <span className="tabular">{remainingLabel(step.remainingMinutes)}</span>
            </p>
            <div className="stack gap-2">
              {step.approvers.map((approver) => (
                <div className="spread items-center gap-2" key={approver.id}>
                  <Person name={approver.displayName} />
                  <span className="row items-center gap-2">
                    {approver.comment ? (
                      <span className="muted truncate" title={approver.comment}>
                        {approver.comment}
                      </span>
                    ) : null}
                    <VoteBadge decision={approver.decision} />
                  </span>
                </div>
              ))}
              {step.approvers.length === 0 ? (
                <p className="muted">Bước này chưa có người duyệt nào được gán.</p>
              ) : null}
            </div>
          </section>

          <section className="stack gap-2" aria-label="Tiến trình duyệt">
            <h3 className="surface-title">Tiến trình duyệt</h3>
            {chainLoading ? (
              <p className="muted">Đang tải tiến trình…</p>
            ) : chainProblem ? (
              <p className="muted">{chainProblem} Vẫn có thể quyết định bước hiện tại.</p>
            ) : chain ? (
              <ol className="timeline">
                {chain.steps.map((item) => (
                  <li key={item.id} className="stack gap-2">
                    <div className="spread items-center gap-2">
                      <span>
                        Bước {item.position} · {item.name}
                      </span>
                      <StepBadge status={item.status} />
                    </div>
                    <span className="muted">
                      {QUORUM_LABEL[item.quorum] ?? item.quorum} · hạn{" "}
                      {formatDateTime(item.dueAt)}
                      {item.decidedAt
                        ? ` · quyết định ${formatDateTime(item.decidedAt)} bởi ${item.decidedBy || "—"}`
                        : ""}
                    </span>
                    {item.approvers.length > 0 ? (
                      <span className="row wrap items-center gap-3">
                        {item.approvers.map((approver) => (
                          <span className="row items-center gap-1" key={approver.id}>
                            <span className="muted">{approver.displayName}</span>
                            <VoteBadge decision={approver.decision} />
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}
          </section>

          <section className="stack gap-2" aria-label="Ghi quyết định">
            <label className="field-label" htmlFor="decision-note">
              Ý kiến cho người gửi
              <span className="muted"> (bắt buộc khi từ chối, tối thiểu 3 ký tự)</span>
            </label>
            <textarea
              id="decision-note"
              className="textarea"
              rows={3}
              maxLength={2000}
              value={note}
              aria-describedby={error ? "decision-note-error" : undefined}
              aria-invalid={error ? "true" : undefined}
              onChange={(event) => setNote(event.target.value)}
            />
            {error ? (
              <span className="field-error" id="decision-note-error" role="alert">
                {error}
              </span>
            ) : null}
            {!canApprove ? (
              <p className="muted">
                Bạn không có quyền “Duyệt” trên phân hệ này nên không ghi được quyết định.
              </p>
            ) : null}
          </section>
        </div>

        <div className="sheet-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Để sau
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => decide("REJECT")}
            disabled={!canApprove || pending}
            aria-busy={pending ? "true" : undefined}
          >
            <RejectGlyph /> Từ chối
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => decide("APPROVE")}
            disabled={!canApprove || pending}
            aria-busy={pending ? "true" : undefined}
          >
            <CheckGlyph /> {pending ? "Đang ghi…" : "Duyệt đề xuất"}
          </button>
        </div>
      </aside>
    </>
  );
}

"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { REPORT_STATUSES } from "../types";
import type { ReportStatus, WorkReport } from "../types";
import { formatDate, formatDateTime } from "../format";
import { AlertGlyph, CloseGlyph, Confirm, StatusBadge } from "./primitives";

interface ReportSheetProps {
  report: WorkReport;
  status: ReportStatus;
  canUpdate: boolean;
  canDelete: boolean;
  pending: boolean;
  onChangeStatus: (status: ReportStatus) => void;
  onDelete: () => Promise<unknown>;
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

/** Reading surface for one report: the numbers first, then the narrative. */
export function ReportSheet({
  report,
  status,
  canUpdate,
  canDelete,
  pending,
  onChangeStatus,
  onDelete,
  onClose,
}: ReportSheetProps) {
  const titleId = useId();
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : "Chưa xoá được báo cáo.");
      setAskDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-2">
            <span className="eyebrow mono">{report.code}</span>
            <h2 className="page-heading" id={titleId}>
              {report.name}
            </h2>
            <div className="row items-center gap-2 wrap">
              <StatusBadge status={status} />
              <span className="muted tabular">{formatDate(report.date)}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết báo cáo"
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
            <Row term="Kỳ báo cáo">{report.fields.period || "Chưa ghi kỳ"}</Row>
            <Row term="Người lập">{report.assignee || "Chưa giao"}</Row>
            <Row term="Phạm vi">{report.scope || "Chưa gắn phạm vi"}</Row>
            <Row term="Cập nhật">{formatDateTime(report.updatedAt)}</Row>
            <Row term="Bản ghi">phiên bản {report.version}</Row>
          </dl>

          {report.fields.goal ? (
            <section className="stack gap-2">
              <h3 className="surface-title">Mục tiêu kỳ</h3>
              <p className="list-main" style={{ whiteSpace: "pre-wrap" }}>
                {report.fields.goal}
              </p>
            </section>
          ) : null}

          {report.fields.result ? (
            <section className="stack gap-2">
              <h3 className="surface-title">Kết quả đạt được</h3>
              <p className="list-main" style={{ whiteSpace: "pre-wrap" }}>
                {report.fields.result}
              </p>
            </section>
          ) : null}

          {!report.fields.goal && !report.fields.result ? (
            <div className="empty-state">
              <span className="empty-title">Báo cáo chưa có nội dung</span>
              <p className="empty-body">
                Bản ghi này mới có phần đầu mục. Ghi mục tiêu và kết quả trước khi phát hành.
              </p>
            </div>
          ) : null}

          {report.note ? (
            <section className="stack gap-2">
              <h3 className="surface-title">Ghi chú</h3>
              <p className="list-main" style={{ whiteSpace: "pre-wrap" }}>
                {report.note}
              </p>
            </section>
          ) : null}

          <section className="stack gap-3" aria-label="Đổi trạng thái báo cáo">
            <div className="spread items-center">
              <h3 className="surface-title">Trạng thái</h3>
              <span className="muted">Áp dụng ngay, hoàn tác nếu máy chủ từ chối</span>
            </div>
            <div className="row wrap gap-2">
              {REPORT_STATUSES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === status ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                  aria-pressed={option === status}
                  disabled={!canUpdate || pending || option === status}
                  title={canUpdate ? `Chuyển sang ${option}` : "Bạn không có quyền sửa báo cáo"}
                  onClick={() => onChangeStatus(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            {!canUpdate ? (
              <p className="muted">Bạn chỉ có quyền xem báo cáo, không đổi được trạng thái.</p>
            ) : null}
          </section>
        </div>

        <div className="sheet-foot">
          {canDelete ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setAskDelete(true)}
              style={{ marginRight: "auto" }}
            >
              Xoá báo cáo
            </button>
          ) : null}
          <span className="muted tabular">{formatDate(report.date)}</span>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </aside>

      {askDelete ? (
        <Confirm
          title="Xoá báo cáo này?"
          body={`${report.code} — ${report.name}. Bản ghi sẽ rời khỏi danh sách của mọi người đọc.`}
          confirmLabel="Xoá vĩnh viễn"
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => setAskDelete(false)}
        />
      ) : null}
    </>
  );
}

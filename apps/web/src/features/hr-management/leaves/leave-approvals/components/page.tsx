"use client";

import { useMemo, useState } from "react";
import { DEFAULT_PAGE_SIZE, DECISION_LABEL, LEAVE_TYPE_LABEL, QUEUE_LIMIT } from "../constants";
import { daysBetween, downloadCsv, formatDate, number, today } from "../format";
import { useLeaveApprovals, type Feedback } from "../hooks/use-leave-approvals";
import { DECISION_STATUSES, type DecisionStatus, type QueueItem } from "../types";
import { DecisionSheet } from "./decision-sheet";
import {
  CloseGlyph,
  DownloadGlyph,
  Pagination,
  SearchGlyph,
} from "./primitives";
import {
  HistoryTable,
  QueueTable,
  sortHistory,
  sortQueue,
  type HistorySort,
  type QueueSort,
} from "./table";

const ALERT_TONE: Record<Feedback["tone"], string> = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
};

export function LeaveApprovalsPage() {
  const approvals = useLeaveApprovals();
  const [queueSort, setQueueSort] = useState<QueueSort>({ key: "fromDate", dir: "asc" });
  const [historySort, setHistorySort] = useState<HistorySort>({
    key: "decidedAt",
    dir: "desc",
  });
  const [queuePage, setQueuePage] = useState(1);
  const [queueSize, setQueueSize] = useState(DEFAULT_PAGE_SIZE);
  const [sheet, setSheet] = useState<{ item: QueueItem; mode: DecisionStatus } | null>(null);

  /* The queue endpoint accepts no query string, so its search runs in the browser. */
  const needle = approvals.term.trim().toLowerCase();
  const matched = useMemo(() => {
    const rows = needle
      ? approvals.queue.filter(
          (row) =>
            row.employeeName.toLowerCase().includes(needle) ||
            row.employeeId.toLowerCase().includes(needle) ||
            row.reason.toLowerCase().includes(needle),
        )
      : approvals.queue;
    return sortQueue(rows, queueSort);
  }, [approvals.queue, needle, queueSort]);

  const queuePages = Math.max(1, Math.ceil(matched.length / queueSize));
  const safeQueuePage = Math.min(queuePage, queuePages);
  const queueSlice = matched.slice((safeQueuePage - 1) * queueSize, safeQueuePage * queueSize);

  const historyRows = useMemo(
    () => sortHistory(approvals.history.items, historySort),
    [approvals.history.items, historySort],
  );

  const now = today();
  const urgent = approvals.queue.filter((row) => daysBetween(now, row.fromDate) <= 3).length;
  const queueDays = approvals.queue.reduce((sum, row) => sum + row.days, 0);
  const decided = (approvals.counts?.approved ?? 0) + (approvals.counts?.rejected ?? 0);

  const exportQueue = (rows: QueueItem[]) => {
    const header = [
      "Mã nhân sự",
      "Nhân sự",
      "Loại nghỉ",
      "Từ ngày",
      "Đến ngày",
      "Số ngày",
      "Ngày gửi",
      "Lý do",
    ];
    const body = rows.map((row) => [
      row.employeeId,
      row.employeeName,
      LEAVE_TYPE_LABEL[row.leaveType],
      formatDate(row.fromDate),
      formatDate(row.toDate),
      String(row.days),
      formatDate(row.createdAt),
      row.reason,
    ]);
    downloadCsv(`don-cho-duyet-${now}.csv`, [header, ...body]);
    approvals.setFeedback({
      tone: "info",
      message: `Đã xuất ${number(rows.length)} đơn đang chờ duyệt ra tệp CSV.`,
    });
  };

  const activeError = approvals.tab === "queue" ? approvals.queueError : approvals.historyError;
  const activeLoading = approvals.tab === "queue" ? approvals.queueLoading : approvals.historyLoading;
  const forbidden = activeError?.status === 403;
  const canApprove = approvals.can("approve");

  const reloadBoth = () => {
    approvals.reload();
    setQueuePage(1);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Nhân sự · Nghỉ phép</p>
          <h1>Duyệt đơn nghỉ phép</h1>
          <p className="page-lede">
            Hàng đợi đơn đang chờ quyết định, kèm ảnh hưởng hạn mức phép năm của từng nhân sự.
            Từ chối bắt buộc ghi lý do để nhân sự biết cách xử lý.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={reloadBoth}
            disabled={activeLoading}
            title="Tải lại hàng đợi và lịch sử quyết định"
          >
            Tải lại
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => exportQueue(matched)}
            disabled={matched.length === 0}
            title="Xuất các đơn đang chờ duyệt ra CSV"
          >
            <DownloadGlyph /> Xuất CSV
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Tình hình duyệt nghỉ phép">
        <div className="metric">
          <span className="metric-value tabular">{number(approvals.queueTotal)}</span>
          <span className="metric-label">Đơn chờ duyệt</span>
          <span className="metric-note">
            {urgent > 0 ? `${number(urgent)} đơn bắt đầu trong 3 ngày tới` : "không có đơn gấp"}
          </span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{number(queueDays)}</span>
          <span className="metric-label">Ngày đang chờ</span>
          <span className="metric-note">cần cân đối với hạn mức phép năm</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{number(approvals.counts?.approved ?? 0)}</span>
          <span className="metric-label">Đã duyệt</span>
          <span className="metric-note">
            {decided > 0
              ? `${Math.round(((approvals.counts?.approved ?? 0) / decided) * 100)}% trên tổng quyết định`
              : "chưa có dữ liệu"}
          </span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{number(approvals.counts?.rejected ?? 0)}</span>
          <span className="metric-label">Đã từ chối</span>
          <span className="metric-note">bị từ chối sau ngày nghỉ là nghỉ không phép</span>
        </div>
      </section>

      {approvals.feedback ? (
        <div className={ALERT_TONE[approvals.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{approvals.feedback.message}</span>
            {approvals.feedback.hint ? (
              <span className="muted">{approvals.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => approvals.setFeedback(null)}
            aria-label="Đóng thông báo"
            style={{ marginLeft: "auto" }}
          >
            <CloseGlyph />
          </button>
        </div>
      ) : null}

      <div className="surface">
        <div className="surface-head">
          <div className="toolbar">
            <div className="toolbar-filters">
              <div className="segmented" role="group" aria-label="Chọn danh sách hiển thị">
                <button
                  type="button"
                  className="segment"
                  aria-pressed={approvals.tab === "queue"}
                  onClick={() => approvals.setTab("queue")}
                >
                  Hàng đợi ({number(approvals.queueTotal)})
                </button>
                <button
                  type="button"
                  className="segment"
                  aria-pressed={approvals.tab === "history"}
                  onClick={() => approvals.setTab("history")}
                >
                  Lịch sử quyết định
                </button>
              </div>

              <div className="search">
                <SearchGlyph />
                <input
                  id="approval-search"
                  className="input"
                  type="search"
                  value={approvals.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo tên, mã nhân sự hoặc lý do…"
                  aria-label="Tìm đơn nghỉ phép"
                  onChange={(event) =>
                    approvals.patchQuery({ q: event.target.value, page: 1 })
                  }
                />
                {approvals.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => approvals.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              {approvals.tab === "history" ? (
                <select
                  className="select"
                  value={approvals.query.status ?? ""}
                  aria-label="Lọc theo quyết định"
                  onChange={(event) =>
                    approvals.patchQuery({
                      status: event.target.value as DecisionStatus | "",
                      page: 1,
                    })
                  }
                  style={{ width: 172 }}
                >
                  <option value="">Mọi quyết định</option>
                  {DECISION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {DECISION_LABEL[status]}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {approvals.tab === "queue"
                  ? `${number(matched.length)}/${number(approvals.queueTotal)} đơn`
                  : `${number(approvals.history.total)} quyết định`}
                {approvals.filtersActive ? " · đang lọc" : ""}
              </span>
            </div>
          </div>

          {approvals.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {approvals.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{approvals.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => approvals.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {approvals.query.status ? (
                <span className="chip" data-active="true">
                  Quyết định: {DECISION_LABEL[approvals.query.status]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => approvals.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc quyết định"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={approvals.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="status">
            <h2 className="empty-title">Bạn không có quyền duyệt đơn nghỉ phép</h2>
            <p className="empty-body">
              Màn hình này cần quyền xem và duyệt trên phân hệ Duyệt nghỉ phép. Liên hệ quản trị
              viên nếu bạn cần được cấp quyền.
            </p>
            <div className="row items-center gap-2">
              <button type="button" className="btn btn-ghost" onClick={approvals.reload}>
                Thử lại
              </button>
            </div>
          </div>
        ) : activeError ? (
          <div className="error-state" role="alert">
            <h2 className="empty-title">Không tải được dữ liệu</h2>
            <p className="empty-body">{activeError.message}</p>
            <div className="row items-center gap-2">
              <button type="button" className="btn btn-primary" onClick={approvals.reload}>
                Thử lại
              </button>
            </div>
          </div>
        ) : approvals.tab === "queue" ? (
          <>
            {!activeLoading && matched.length === 0 ? (
              approvals.queueTotal === 0 ? (
                <div className="empty-state">
                  <h2 className="empty-title">Không còn đơn nào chờ duyệt</h2>
                  <p className="empty-body">
                    Mọi đơn nghỉ phép đã được xử lý. Lịch sử quyết định vẫn lưu lại để tra cứu sau.
                  </p>
                  <div className="row items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => approvals.setTab("history")}
                    >
                      Xem lịch sử quyết định
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={approvals.reload}>
                      Tải lại
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <h2 className="empty-title">Không có đơn nào khớp bộ lọc</h2>
                  <p className="empty-body">
                    Hàng đợi đang có {number(approvals.queueTotal)} đơn nhưng không đơn nào khớp từ
                    khoá “{approvals.term}”.
                  </p>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => approvals.patchQuery({ q: "", page: 1 })}
                  >
                    Xoá từ khoá
                  </button>
                </div>
              )
            ) : (
              <>
                <QueueTable
                  rows={queueSlice}
                  loading={activeLoading}
                  canApprove={canApprove}
                  pendingId={approvals.pendingId}
                  sort={queueSort}
                  onSort={setQueueSort}
                  onOpen={(item) => setSheet({ item, mode: "APPROVED" })}
                  onApprove={(item) => {
                    void approvals.decide(item, "APPROVED", "");
                  }}
                  onReject={(item) => setSheet({ item, mode: "REJECTED" })}
                />
                <div aria-live="polite" className="sr-only">
                  {approvals.pendingId ? "Đang ghi quyết định cho đơn đã chọn." : ""}
                </div>
                <Pagination
                  page={safeQueuePage}
                  pageSize={queueSize}
                  total={matched.length}
                  onPage={setQueuePage}
                  onPageSize={(size) => {
                    setQueueSize(size);
                    setQueuePage(1);
                  }}
                  idPrefix="approval-queue"
                />
              </>
            )}
          </>
        ) : !activeLoading && historyRows.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-title">
              {approvals.filtersActive ? "Không có quyết định nào khớp bộ lọc" : "Chưa có quyết định nào"}
            </h2>
            <p className="empty-body">
              {approvals.filtersActive
                ? "Bỏ bộ lọc để xem toàn bộ lịch sử duyệt nghỉ phép."
                : "Khi bạn duyệt hoặc từ chối một đơn, quyết định sẽ được lưu tại đây kèm người duyệt và ghi chú."}
            </p>
            <div className="row items-center gap-2">
              {approvals.filtersActive ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={approvals.clearFilters}
                >
                  Xoá bộ lọc
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => approvals.setTab("queue")}
                >
                  Về hàng đợi chờ duyệt
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <HistoryTable rows={historyRows} loading={activeLoading} sort={historySort} onSort={setHistorySort} />
            <Pagination
              page={approvals.history.page}
              pageSize={approvals.history.pageSize}
              total={approvals.history.total}
              onPage={(page) => approvals.patchQuery({ page })}
              onPageSize={(size) => approvals.patchQuery({ pageSize: size, page: 1 })}
              idPrefix="approval-history"
            />
          </>
        )}
      </div>

      <p className="page-footnote">
        Hàng đợi lấy tối đa {number(QUEUE_LIMIT)} đơn chờ duyệt gần nhất theo ngày nghỉ nên được phân
        trang tại trình duyệt; lịch sử quyết định phân trang từ máy chủ. Quyết định được ghi ngay khi
        bấm, đơn bị từ chối sau ngày nghỉ được tính là nghỉ không phép.
      </p>

      {sheet ? (
        <DecisionSheet
          item={sheet.item}
          initialMode={sheet.mode}
          canApprove={canApprove}
          pending={approvals.pendingId === sheet.item.id}
          quota={approvals.quota}
          quotaProblem={approvals.quotaProblem}
          usedDaysOf={approvals.usedDaysOf}
          onDecide={(status, note) => approvals.decide(sheet.item, status, note)}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </div>
  );
}

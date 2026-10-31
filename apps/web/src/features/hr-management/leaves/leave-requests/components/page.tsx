"use client";

import { useMemo, useState } from "react";
import { EXPORT_FILE_PREFIX, LEAVE_TYPE_LABEL } from "../constants";
import {
  downloadCsv,
  formatDate,
  number,
  today,
} from "../format";
import { useLeaveRequests, type Feedback } from "../hooks/use-leave-requests";
import { LEAVE_STATUSES, LEAVE_TYPES, type LeaveRequest } from "../types";
import { CreateLeaveDialog } from "./create-dialog";
import { LeaveDetailSheet } from "./detail-sheet";
import {
  CloseGlyph,
  DownloadGlyph,
  Pagination,
  PlusGlyph,
  SearchGlyph,
} from "./primitives";
import {
  LeaveTable,
  nextSort,
  sortRequests,
  type SortState,
} from "./table";

const ALERT_TONE: Record<Feedback["tone"], string> = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
};

function share(value: number, total: number): string {
  if (!total) return "chưa có dữ liệu";
  return `${Math.round((value / total) * 100)}% trên tổng`;
}

export function LeaveRequestsPage() {
  const leave = useLeaveRequests();
  const [sort, setSort] = useState<SortState>({ key: "createdAt", dir: "desc" });
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(
    () => sortRequests(leave.data.items, sort),
    [leave.data.items, sort],
  );

  const exportRows = (list: LeaveRequest[]) => {
    const header = [
      "Mã nhân sự",
      "Nhân sự",
      "Loại nghỉ",
      "Từ ngày",
      "Đến ngày",
      "Số ngày",
      "Trạng thái",
      "Người quyết định",
      "Ngày gửi",
      "Lý do",
    ];
    const body = list.map((row) => [
      row.employeeId,
      row.employeeName,
      LEAVE_TYPE_LABEL[row.leaveType],
      formatDate(row.fromDate),
      formatDate(row.toDate),
      String(row.days),
      row.status,
      row.decidedBy,
      formatDate(row.createdAt),
      row.reason,
    ]);
    downloadCsv(`${EXPORT_FILE_PREFIX}-${today()}.csv`, [header, ...body]);
    leave.setFeedback({ tone: "info", message: `Đã xuất ${list.length} đơn ra tệp CSV.` });
  };

  const detail = openId ? (leave.data.items.find((row) => row.id === openId) ?? null) : null;
  const total = leave.data.total;
  const sums = Object.values(leave.totals);
  const all = sums.reduce((sum, value) => sum + value, 0);
  const forbidden = leave.error?.status === 403;
  const canFileForOthers = leave.permission?.role === "MANAGER";

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Nhân sự · Nghỉ phép</p>
          <h1>Đơn nghỉ phép của tôi</h1>
          <p className="page-lede">
            Gửi đơn nghỉ và theo dõi đơn đang chờ duyệt. Hạn mức phép năm được đối chiếu trước
            khi gửi để bạn biết mình còn bao nhiêu ngày.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => exportRows(rows)}
            disabled={rows.length === 0}
            title="Xuất các đơn đang hiển thị ra CSV"
          >
            <DownloadGlyph /> Xuất CSV
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreating(true)}
            disabled={!leave.can("create")}
            title={
              leave.can("create") ? "Gửi đơn nghỉ phép" : "Bạn không có quyền gửi đơn nghỉ phép"
            }
          >
            <PlusGlyph /> Gửi đơn nghỉ
          </button>
        </div>
      </header>

      {sums.length > 0 ? (
        <section className="metric-strip" aria-label="Số lượng đơn nghỉ theo trạng thái">
          <div className="metric">
            <span className="metric-value tabular">{number(leave.totals.pending ?? 0)}</span>
            <span className="metric-label">Chờ duyệt</span>
            <span className="metric-note">{share(leave.totals.pending ?? 0, all)}</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{number(leave.totals.approved ?? 0)}</span>
            <span className="metric-label">Đã duyệt</span>
            <span className="metric-note">{share(leave.totals.approved ?? 0, all)}</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{number(leave.totals.rejected ?? 0)}</span>
            <span className="metric-label">Từ chối</span>
            <span className="metric-note">bị từ chối sau ngày nghỉ là nghỉ không phép</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{number(leave.totals.cancelled ?? 0)}</span>
            <span className="metric-label">Đã hủy</span>
            <span className="metric-note">{share(leave.totals.cancelled ?? 0, all)}</span>
          </div>
        </section>
      ) : null}

      {leave.feedback ? (
        <div className={ALERT_TONE[leave.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{leave.feedback.message}</span>
            {leave.feedback.hint ? <span className="muted">{leave.feedback.hint}</span> : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => leave.setFeedback(null)}
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
              <div className="search">
                <SearchGlyph />
                <input
                  id="leave-search"
                  className="input"
                  type="search"
                  value={leave.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo tên nhân sự hoặc lý do…"
                  aria-label="Tìm đơn nghỉ phép"
                  onChange={(event) => leave.patchQuery({ q: event.target.value, page: 1 })}
                />
                {leave.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => leave.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={leave.query.status ?? ""}
                aria-label="Lọc theo trạng thái"
                onChange={(event) =>
                  leave.patchQuery({
                    status: event.target.value as LeaveRequest["status"] | "",
                    page: 1,
                  })
                }
                style={{ width: 168 }}
              >
                <option value="">Mọi trạng thái</option>
                {LEAVE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                className="select"
                value={leave.query.leaveType ?? ""}
                aria-label="Lọc theo loại nghỉ"
                onChange={(event) => leave.patchQuery({ leaveType: event.target.value, page: 1 })}
                style={{ width: 168 }}
              >
                <option value="">Mọi loại nghỉ</option>
                {LEAVE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {LEAVE_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {number(total)} đơn
                {leave.filtersActive ? ` · ${rows.length} dòng khớp` : ""}
              </span>
            </div>
          </div>

          {leave.filtersActive ? (
            <div
              className="row wrap items-center gap-2"
              style={{ paddingTop: "var(--space-3)" }}
            >
              {leave.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{leave.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => leave.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {leave.query.status ? (
                <span className="chip" data-active="true">
                  Trạng thái: {leave.query.status}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => leave.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {leave.query.leaveType ? (
                <span className="chip" data-active="true">
                  Loại: {LEAVE_TYPE_LABEL[leave.query.leaveType as keyof typeof LEAVE_TYPE_LABEL] ??
                    leave.query.leaveType}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => leave.patchQuery({ leaveType: "", page: 1 })}
                    aria-label="Bỏ lọc loại nghỉ"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={leave.clearFilters}
              >
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem đơn nghỉ phép</span>
            <p className="empty-body">
              Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Đơn nghỉ phép rồi tải lại
              trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={leave.reload}>
              Tải lại
            </button>
          </div>
        ) : leave.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được danh sách đơn nghỉ phép</span>
            <p className="empty-body">{leave.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={leave.reload}>
              Thử lại
            </button>
          </div>
        ) : !leave.loading && rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {leave.filtersActive ? "Không có đơn nào khớp bộ lọc" : "Chưa có đơn nghỉ phép nào"}
            </span>
            <p className="empty-body">
              {leave.filtersActive
                ? "Thử bỏ một vài điều kiện, hoặc xoá hết bộ lọc để xem toàn bộ đơn."
                : "Gửi đơn đầu tiên để quản lý biết ngày bạn nghỉ và việc cần bàn giao."}
            </p>
            {leave.filtersActive ? (
              <button type="button" className="btn btn-ghost" onClick={leave.clearFilters}>
                Xoá bộ lọc
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCreating(true)}
                disabled={!leave.can("create")}
              >
                <PlusGlyph /> Gửi đơn nghỉ
              </button>
            )}
          </div>
        ) : (
          <LeaveTable
            rows={rows}
            loading={leave.loading}
            sort={sort}
            onSort={(key) => setSort((current) => nextSort(current, key))}
            onOpen={(request) => setOpenId(request.id)}
            optimistic={leave.optimistic}
          />
        )}

        {!forbidden && !leave.error && rows.length > 0 ? (
          <Pagination
            page={leave.query.page}
            pageSize={leave.query.pageSize}
            total={total}
            idPrefix="leave"
            onPage={(page) => leave.patchQuery({ page })}
            onPageSize={(pageSize) => leave.patchQuery({ pageSize, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Đơn nghỉ tính theo ngày làm việc (bỏ thứ Bảy và Chủ nhật) và do máy chủ chốt khi lưu. Sắp
        xếp áp dụng cho các dòng đang tải trên trang này. Hạn mức phép năm lấy từ Chính sách làm
        việc {leave.year}.
      </p>

      {creating ? (
        <CreateLeaveDialog
          actor={leave.actor}
          canFileForOthers={canFileForOthers}
          quota={leave.quota}
          quotaProblem={leave.quotaProblem}
          usedDaysOf={leave.usedDaysOf}
          onCreate={leave.create}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {detail ? (
        <LeaveDetailSheet
          request={detail}
          canUpdate={leave.can("update")}
          pending={leave.pendingCancel === detail.id}
          actor={leave.actor}
          canFileForOthers={canFileForOthers}
          quota={leave.quota}
          quotaProblem={leave.quotaProblem}
          usedDaysOf={leave.usedDaysOf}
          onSave={(patch) => leave.patch(detail, patch)}
          onCancel={() => leave.cancel(detail)}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { REPORT_STATUSES } from "../types";
import type { ReportStatus, WorkReport } from "../types";
import { formatDate, share } from "../format";
import { useReports, type Feedback } from "../hooks/use-reports";
import { CreateReportDialog } from "./create-dialog";
import { ReportSheet } from "./report-sheet";
import { ReportBreakdowns } from "./breakdowns";
import {
  CloseGlyph,
  Pagination,
  PlusGlyph,
  SearchGlyph,
  SkeletonRows,
  SortButton,
  StatusBadge,
} from "./primitives";

const ALERT_TONE: Record<Feedback["tone"], string> = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
};

const COLUMNS = 6;

type SortKey = "name" | "date";

function sortReports(reports: WorkReport[], key: SortKey, dir: "asc" | "desc") {
  const factor = dir === "asc" ? 1 : -1;
  return [...reports].sort((left, right) => {
    if (key === "date") return (left.date.localeCompare(right.date) || left.id.localeCompare(right.id)) * factor;
    return left.name.localeCompare(right.name, "vi") * factor;
  });
}

export function ReportsPage() {
  const reports = useReports();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "date",
    dir: "desc",
  });
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  /* Optimistic statuses are applied at render so every count agrees. */
  const rows = useMemo(
    () =>
      reports.data.items.map((report) => {
        const next = reports.optimistic[report.id];
        return next ? { ...report, status: next } : report;
      }),
    [reports.data.items, reports.optimistic],
  );

  const sorted = useMemo(() => sortReports(rows, sort.key, sort.dir), [rows, sort]);

  const canCreate = reports.can("create");
  const canUpdate = reports.can("update");
  const canDelete = reports.can("delete");
  const forbidden = reports.error?.status === 403;

  const total = reports.data.total;
  const draft = reports.totals["Bản nháp"] ?? 0;
  const published = reports.totals["Đã phát hành"] ?? 0;
  const all = draft + published;
  const known = Object.keys(reports.totals).length > 0;
  const detail = openId ? (rows.find((report) => report.id === openId) ?? null) : null;

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "date" ? "desc" : "asc" },
    );

  const ariaSort = (key: SortKey) =>
    sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none";

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Điều phối công việc</p>
          <h1>Báo cáo</h1>
          <p className="page-lede">
            Báo cáo vận hành theo kỳ, kèm phân tích trên dữ liệu đang tải: nhịp phát hành
            theo tháng, tỷ trọng trạng thái và phân bổ theo người lập, phạm vi.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreating(true)}
            disabled={!canCreate}
            title={canCreate ? "Tạo báo cáo mới" : "Bạn không có quyền tạo báo cáo"}
          >
            <PlusGlyph /> Tạo báo cáo
          </button>
        </div>
      </header>

      {known ? (
        <section className="metric-strip" aria-label="Tình hình báo cáo">
          <div className="metric">
            <span className="metric-value tabular">{all.toLocaleString("vi-VN")}</span>
            <span className="metric-label">Tổng báo cáo</span>
            <span className="metric-note">toàn hệ thống theo quyền của bạn</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{published.toLocaleString("vi-VN")}</span>
            <span className="metric-label">Đã phát hành</span>
            <span className="metric-note">{share(published, all)}</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{draft.toLocaleString("vi-VN")}</span>
            <span className="metric-label">Bản nháp</span>
            <span className="metric-note">{share(draft, all)}</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">
              {all ? `${Math.round((published / all) * 100)}%` : "—"}
            </span>
            <span className="metric-label">Tỷ lệ phát hành</span>
            <span className="metric-note">
              {all ? "trên tổng số báo cáo" : "chưa có dữ liệu"}
            </span>
          </div>
        </section>
      ) : null}

      {reports.feedback ? (
        <div className={ALERT_TONE[reports.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{reports.feedback.message}</span>
            {reports.feedback.hint ? (
              <span className="muted">{reports.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => reports.setFeedback(null)}
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
                  id="report-search"
                  className="input"
                  type="search"
                  value={reports.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo mã hoặc tên báo cáo…"
                  aria-label="Tìm báo cáo"
                  onChange={(event) => reports.patchQuery({ q: event.target.value, page: 1 })}
                />
                {reports.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => reports.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={reports.query.status ?? ""}
                aria-label="Lọc theo trạng thái báo cáo"
                onChange={(event) =>
                  reports.patchQuery({
                    status: event.target.value as ReportStatus | "",
                    page: 1,
                  })
                }
                style={{ width: 176 }}
              >
                <option value="">Mọi trạng thái</option>
                {REPORT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {total.toLocaleString("vi-VN")} báo cáo
                {reports.filtersActive ? ` · ${rows.length} dòng khớp` : ""}
              </span>
            </div>
          </div>

          {reports.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {reports.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{reports.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => reports.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {reports.query.status ? (
                <span className="chip" data-active="true">
                  Trạng thái: {reports.query.status}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => reports.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {reports.query.assignee ? (
                <span className="chip" data-active="true">
                  Người lập: {reports.query.assignee}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => reports.patchQuery({ assignee: "", page: 1 })}
                    aria-label="Bỏ lọc người lập"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {reports.query.scope ? (
                <span className="chip" data-active="true">
                  Phạm vi: {reports.query.scope}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => reports.patchQuery({ scope: "", page: 1 })}
                    aria-label="Bỏ lọc phạm vi"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={reports.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem báo cáo</span>
            <p className="empty-body">
              Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Điều phối công việc rồi
              tải lại trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={reports.reload}>
              Tải lại
            </button>
          </div>
        ) : reports.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được danh sách báo cáo</span>
            <p className="empty-body">{reports.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={reports.reload}>
              Thử lại
            </button>
          </div>
        ) : (
          <>
            {reports.loading || rows.length > 0 ? (
              <div className="surface-body">
                <ReportBreakdowns
                  reports={rows}
                  loading={reports.loading}
                  onFilterAssignee={(assignee) =>
                    reports.patchQuery({
                      assignee: assignee === "Chưa gán người lập" ? "" : assignee,
                      page: 1,
                    })
                  }
                  onFilterScope={(scope) =>
                    reports.patchQuery({
                      scope: scope === "Chưa gắn phạm vi" ? "" : scope,
                      page: 1,
                    })
                  }
                />
                <div className="divider" />
              </div>
            ) : null}

            {!reports.loading && rows.length === 0 ? (
              <div className="empty-state">
                <span className="empty-title">
                  {reports.filtersActive
                    ? "Không có báo cáo nào khớp bộ lọc"
                    : "Chưa có báo cáo nào"}
                </span>
                <p className="empty-body">
                  {reports.filtersActive
                    ? "Bộ lọc hiện tại không trả về báo cáo nào. Xoá bớt điều kiện để xem toàn bộ."
                    : "Tạo báo cáo đầu tiên để bắt đầu tổng hợp số liệu theo kỳ và phát hành cho người đọc."}
                </p>
                {reports.filtersActive ? (
                  <button type="button" className="btn btn-ghost" onClick={reports.clearFilters}>
                    Xoá bộ lọc
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setCreating(true)}
                    disabled={!canCreate}
                  >
                    <PlusGlyph /> Tạo báo cáo
                  </button>
                )}
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <caption>Báo cáo theo bộ lọc hiện tại, sắp xếp áp dụng trên trang này</caption>
                  <thead>
                    <tr>
                      <th scope="col">Mã</th>
                      <th scope="col" aria-sort={ariaSort("name")}>
                        <SortButton
                          label="Tên báo cáo"
                          active={sort.key === "name"}
                          direction={sort.dir}
                          onClick={() => toggleSort("name")}
                        />
                      </th>
                      <th scope="col">Kỳ</th>
                      <th scope="col">Người lập</th>
                      <th scope="col" aria-sort={ariaSort("date")}>
                        <SortButton
                          label="Ngày"
                          active={sort.key === "date"}
                          direction={sort.dir}
                          onClick={() => toggleSort("date")}
                        />
                      </th>
                      <th scope="col">Trạng thái</th>
                    </tr>
                  </thead>
                  {reports.loading ? (
                    <SkeletonRows rows={5} columns={COLUMNS} />
                  ) : (
                    <tbody>
                      {sorted.map((report) => (
                        <tr key={report.id}>
                          <td>
                            <span className="mono">{report.code}</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="link truncate"
                              onClick={() => setOpenId(report.id)}
                              title={report.name}
                            >
                              {report.name}
                            </button>
                          </td>
                          <td className="truncate">{report.fields.period || "—"}</td>
                          <td>{report.assignee || "Chưa giao"}</td>
                          <td className="tabular">
                            <span>{formatDate(report.date)}</span>
                          </td>
                          <td>
                            <StatusBadge status={report.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
              </div>
            )}
          </>
        )}

        {!forbidden && !reports.error && rows.length > 0 ? (
          <Pagination
            id="reports"
            page={reports.query.page}
            pageSize={reports.query.pageSize}
            total={total}
            onPage={(page) => reports.patchQuery({ page })}
            onPageSize={(pageSize) => reports.patchQuery({ pageSize, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Phân tích chỉ đếm các báo cáo đang tải trên trang này — máy chủ chưa mở endpoint tổng
        hợp nên không có chuỗi thời gian toàn hệ thống. Thu hẹp bộ lọc hoặc tăng số dòng để
        phân tích đủ hơn.
      </p>

      {creating ? (
        <CreateReportDialog onCreate={reports.create} onClose={() => setCreating(false)} />
      ) : null}

      {detail ? (
        <ReportSheet
          report={detail}
          status={detail.status}
          canUpdate={canUpdate}
          canDelete={canDelete}
          pending={reports.pending === detail.id}
          onChangeStatus={(status) => reports.changeStatus(detail, status)}
          onDelete={() => reports.remove(detail)}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

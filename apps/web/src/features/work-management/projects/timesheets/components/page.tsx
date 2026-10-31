"use client";

import { useMemo, useState } from "react";
import { EXPORT_FILE_PREFIX, FILTER_STATUSES, PERIOD_STATUS_LABEL } from "../constants";
import { downloadCsv, formatDate, formatMinutes, today, weekRange } from "../format";
import { useTimesheets, type Feedback } from "../hooks/use-timesheets";
import type { Period, PeriodStatus } from "../types";
import { PeriodDetailSheet } from "./detail-sheet";
import { OpenWeekDialog } from "./open-week-dialog";
import { CloseGlyph, DownloadGlyph, Pagination, PlusGlyph, SearchGlyph } from "./primitives";
import { PeriodTable, nextSort, sortPeriods, type SortState } from "./table";

const ALERT_TONE: Record<Feedback["tone"], string> = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
};

/**
 * `GET /timesheets/periods` has no free-text field, so the search box narrows the
 * rows already on screen instead of pretending to query the server.
 */
function matches(period: Period, term: string): boolean {
  const needle = term.trim().toLocaleLowerCase("vi");
  if (!needle) return true;
  return [period.employeeName, weekRange(period.weekStart), PERIOD_STATUS_LABEL[period.status]]
    .join(" ")
    .toLocaleLowerCase("vi")
    .includes(needle);
}

export function TimesheetsPage() {
  const timesheets = useTimesheets();
  const [sort, setSort] = useState<SortState>({ key: "week", dir: "desc" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [openBusy, setOpenBusy] = useState(false);

  const rows = useMemo(
    () => sortPeriods(timesheets.data.items.filter((period) => matches(period, timesheets.term)), sort),
    [timesheets.data.items, timesheets.term, sort],
  );

  const total = timesheets.data.total;
  const loadedMinutes = rows.reduce((sum, period) => sum + period.totalMinutes, 0);
  const over = rows.filter((period) => period.overThreshold).length;
  const pending = rows.filter((period) => period.status === "SUBMITTED").length;
  const approved = rows.filter((period) => period.status === "APPROVED").length;
  const forbidden = timesheets.error?.status === 403;
  const scopeNote = `${rows.length.toLocaleString("vi-VN")} kỳ đang tải`;

  const exportRows = (list: Period[]) => {
    const header = [
      "Tuần",
      "Từ ngày",
      "Đến ngày",
      "Nhân viên",
      "Trạng thái",
      "Tổng phút",
      "Tổng giờ",
      "Vượt ngưỡng",
      "Người duyệt",
      "Ghi chú duyệt",
    ];
    const body = list.map((period) => [
      weekRange(period.weekStart),
      formatDate(period.weekStart),
      formatDate(period.weekEnd),
      period.employeeName,
      PERIOD_STATUS_LABEL[period.status],
      String(period.totalMinutes),
      (period.totalMinutes / 60).toLocaleString("vi-VN", { maximumFractionDigits: 2 }),
      period.overThreshold ? "Có" : "Không",
      period.decidedByName,
      period.decisionNote,
    ]);
    downloadCsv(`${EXPORT_FILE_PREFIX}-${today()}.csv`, [header, ...body]);
    timesheets.setFeedback({
      tone: "info",
      message: `Đã xuất ${list.length} kỳ ra tệp CSV.`,
    });
  };

  const openWeek = async (weekStart: string) => {
    setOpenBusy(true);
    try {
      const detail = await timesheets.openWeek(weekStart);
      setOpening(false);
      setOpenId(detail.id);
    } catch (caught) {
      setOpening(false);
      timesheets.setFeedback({
        tone: "error",
        message:
          caught instanceof Error ? caught.message : "Chưa mở được kỳ timesheet.",
        hint: "Tài khoản cần được gắn mã nhân viên thì mới dùng được timesheet.",
      });
    } finally {
      setOpenBusy(false);
    }
  };

  /* The sheet reads the period by id, so a filter change cannot close it mid-edit. */

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Quản lý dự án</p>
          <h1>Timesheet tuần</h1>
          <p className="page-lede">
            Mỗi nhân viên ghi thời gian theo tuần, mỗi dòng thuộc một ngày trong tuần. Tuần
            nằm trong ngưỡng được duyệt ngay khi gửi; tuần vượt ngưỡng chờ Quản lý quyết
            định. Kỳ đã duyệt chỉ đọc và sửa bằng điều chỉnh.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => exportRows(rows)}
            disabled={rows.length === 0}
            title="Xuất các kỳ đang hiển thị ra CSV"
          >
            <DownloadGlyph /> Xuất CSV
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setOpening(true)}
            title="Mở kỳ timesheet của một tuần"
          >
            <PlusGlyph /> Mở tuần
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Tổng hợp timesheet">
        <div className="metric">
          <span className="metric-value tabular">{formatMinutes(loadedMinutes)}</span>
          <span className="metric-label">Tổng thời gian</span>
          <span className="metric-note">trên {scopeNote}</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{over.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Vượt ngưỡng</span>
          <span className="metric-note">trên {scopeNote}</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{pending.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Chờ duyệt</span>
          <span className="metric-note">trên {scopeNote}</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{approved.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Đã duyệt</span>
          <span className="metric-note">trên {scopeNote}</span>
        </div>
      </section>

      {timesheets.feedback ? (
        <div className={ALERT_TONE[timesheets.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{timesheets.feedback.message}</span>
            {timesheets.feedback.hint ? (
              <span className="muted">{timesheets.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => timesheets.setFeedback(null)}
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
                  id="timesheet-search"
                  className="input"
                  type="search"
                  value={timesheets.term}
                  autoComplete="off"
                  placeholder="Lọc trong các kỳ đang tải…"
                  aria-label="Lọc theo nhân viên hoặc tuần trong các kỳ đang tải"
                  onChange={(event) => timesheets.setTerm(event.target.value)}
                />
                {timesheets.term ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => timesheets.setTerm("")}
                    aria-label="Xoá từ khoá lọc"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={timesheets.query.status ?? ""}
                aria-label="Lọc theo trạng thái kỳ"
                onChange={(event) =>
                  timesheets.patchQuery({
                    status: event.target.value as PeriodStatus | "",
                    page: 1,
                  })
                }
                style={{ width: 176 }}
              >
                <option value="">Mọi trạng thái</option>
                {FILTER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PERIOD_STATUS_LABEL[status]}
                  </option>
                ))}
              </select>

              <label className="muted" htmlFor="timesheet-from">
                Tuần từ
              </label>
              <input
                id="timesheet-from"
                className="input tabular"
                type="date"
                value={timesheets.query.from ?? ""}
                onChange={(event) =>
                  timesheets.patchQuery({ from: event.target.value, page: 1 })
                }
                style={{ width: 152 }}
              />

              <label className="muted" htmlFor="timesheet-to">
                đến
              </label>
              <input
                id="timesheet-to"
                className="input tabular"
                type="date"
                value={timesheets.query.to ?? ""}
                onChange={(event) =>
                  timesheets.patchQuery({ to: event.target.value, page: 1 })
                }
                style={{ width: 152 }}
              />
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {total.toLocaleString("vi-VN")} kỳ
                {timesheets.filtersActive ? ` · ${rows.length} dòng khớp` : ""}
              </span>
            </div>
          </div>

          {timesheets.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {timesheets.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{timesheets.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => timesheets.setTerm("")}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {timesheets.query.status ? (
                <span className="chip" data-active="true">
                  Trạng thái: {PERIOD_STATUS_LABEL[timesheets.query.status]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => timesheets.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {timesheets.query.from ? (
                <span className="chip" data-active="true">
                  Từ tuần {formatDate(timesheets.query.from)}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => timesheets.patchQuery({ from: "", page: 1 })}
                    aria-label="Bỏ lọc ngày bắt đầu"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {timesheets.query.to ? (
                <span className="chip" data-active="true">
                  Đến tuần {formatDate(timesheets.query.to)}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => timesheets.patchQuery({ to: "", page: 1 })}
                    aria-label="Bỏ lọc ngày kết thúc"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={timesheets.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem timesheet</span>
            <p className="empty-body">
              Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Timesheet rồi tải lại
              trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={timesheets.reload}>
              Tải lại
            </button>
          </div>
        ) : timesheets.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được danh sách kỳ timesheet</span>
            <p className="empty-body">{timesheets.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={timesheets.reload}>
              Thử lại
            </button>
          </div>
        ) : !timesheets.loading && rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {timesheets.filtersActive ? "Không có kỳ nào khớp bộ lọc" : "Chưa có kỳ timesheet nào"}
            </span>
            <p className="empty-body">
              {timesheets.filtersActive
                ? "Thử bỏ một vài điều kiện, hoặc xoá hết bộ lọc để xem toàn bộ danh sách."
                : "Mở tuần hiện tại để bắt đầu ghi thời gian; mỗi tuần chỉ có một kỳ cho mỗi nhân viên."}
            </p>
            {timesheets.filtersActive ? (
              <button type="button" className="btn btn-ghost" onClick={timesheets.clearFilters}>
                Xoá bộ lọc
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setOpening(true)}>
                <PlusGlyph /> Mở tuần
              </button>
            )}
          </div>
        ) : (
          <PeriodTable
            periods={rows}
            loading={timesheets.loading}
            sort={sort}
            onSort={(key) => setSort((current) => nextSort(current, key))}
            hidden={[]}
            onOpen={(period) => setOpenId(period.id)}
          />
        )}

        {!forbidden && !timesheets.error && rows.length > 0 ? (
          <Pagination
            page={timesheets.query.page}
            pageSize={timesheets.query.pageSize}
            total={total}
            idPrefix="timesheet"
            onPage={(page) => timesheets.patchQuery({ page })}
            onPageSize={(pageSize) => timesheets.patchQuery({ pageSize, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Ô tìm kiếm lọc trên các dòng đang tải vì API timesheet không có tham số từ khoá;
        khoảng ngày lọc theo tuần của kỳ. Tổng thời gian của từng kỳ do máy chủ tính lại sau
        mỗi lần ghi. Quản lý xem được mọi kỳ nhưng không tự duyệt kỳ của chính mình.
      </p>

      {opening ? (
        <OpenWeekDialog
          busy={openBusy}
          onSubmit={openWeek}
          onClose={() => setOpening(false)}
        />
      ) : null}

      {openId ? (
        <PeriodDetailSheet
          periodId={openId}
          canManage={timesheets.isManager}
          projects={timesheets.projects}
          onChanged={timesheets.reload}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { EXPORT_FILE_PREFIX } from "../constants";
import { downloadCsv, formatDate, formatHours, formatPercent, today } from "../format";
import { useCapacity, type Feedback } from "../hooks/use-capacity";
import type { CapacitySummary, Period } from "../types";
import { CapacityBoard } from "./board";
import { CreatePeriodDialog } from "./create-dialog";
import { PeriodDetailSheet } from "./detail-sheet";
import {
  CloseGlyph,
  DownloadGlyph,
  Pagination,
  PlusGlyph,
  SearchGlyph,
} from "./primitives";
import {
  ALL_COLUMNS,
  COLUMN_LABELS,
  CapacityTable,
  OPTIONAL_COLUMNS,
  nextSort,
  sortRows,
  type CapacityRow,
  type ColumnKey,
  type SortState,
} from "./table";

const ALERT_TONE: Record<Feedback["tone"], string> = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
};

type View = "table" | "board";

export function ResourceCapacityPage() {
  const capacity = useCapacity();
  const [sort, setSort] = useState<SortState>({ key: "window", dir: "desc" });
  const [hidden, setHidden] = useState<ColumnKey[]>([]);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [view, setView] = useState<View>("table");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo<CapacityRow[]>(
    () =>
      sortRows(
        capacity.data.items.map((period) => ({
          period,
          summary: capacity.summaries[period.id] ?? null,
        })),
        sort,
      ),
    [capacity.data.items, capacity.summaries, sort],
  );

  useEffect(() => {
    if (!columnsOpen) return;
    const close = () => setColumnsOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setColumnsOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [columnsOpen]);

  const toggleColumn = (key: ColumnKey) => {
    setHidden((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  /* Only rows whose summary arrived take part in the totals — no guessed hours. */
  const known = rows.reduce<CapacitySummary[]>((list, row) => {
    if (row.summary) list.push(row.summary);
    return list;
  }, []);
  const available = known.reduce((sum, item) => sum + item.availableHours, 0);
  const allocated = known.reduce((sum, item) => sum + item.allocatedHours, 0);
  const remaining = known.reduce((sum, item) => sum + item.remainingHours, 0);
  const over = known.filter((item) => item.overCapacity).length;
  const total = capacity.data.total;
  /* A failed summary read is left out of the totals, so the note names the real sample. */
  const scopeNote =
    known.length === rows.length
      ? `${rows.length.toLocaleString("vi-VN")} kỳ đang tải`
      : `${known.length.toLocaleString("vi-VN")}/${rows.length.toLocaleString("vi-VN")} kỳ đọc được công suất`;
  const forbidden = capacity.error?.status === 403;

  const exportRows = (list: CapacityRow[]) => {
    const header = [
      "Mã nhân sự",
      "Nhân sự",
      "Từ ngày",
      "Đến ngày",
      "Ngày công",
      "Ngày lễ",
      "Ngày phép",
      "Giờ chuẩn/ngày",
      "Giờ khả dụng",
      "Tỉ lệ phân bổ (%)",
      "Giờ đã phân bổ",
      "Giờ còn trống",
      "Sử dụng (%)",
      "Vượt công suất",
    ];
    const body = list.map(({ period, summary }) => [
      period.employeeId,
      period.employeeName,
      formatDate(period.fromDate),
      formatDate(period.toDate),
      String(period.workingDays),
      String(period.holidayDays),
      String(period.leaveDays),
      String(period.standardHoursPerDay),
      summary ? formatHours(summary.availableHours) : "",
      summary ? formatPercent(summary.allocatedPercent) : "",
      summary ? formatHours(summary.allocatedHours) : "",
      summary ? formatHours(summary.remainingHours) : "",
      summary ? formatPercent(summary.utilization) : "",
      summary ? (summary.overCapacity ? "Có" : "Không") : "",
    ]);
    downloadCsv(`${EXPORT_FILE_PREFIX}-${today()}.csv`, [header, ...body]);
    capacity.setFeedback({
      tone: "info",
      message: `Đã xuất ${list.length} kỳ ra tệp CSV.`,
      hint: "Dòng chưa đọc được công suất sẽ để trống các cột giờ.",
    });
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Nhân sự</p>
          <h1>Công suất &amp; phân bổ</h1>
          <p className="page-lede">
            Mỗi kỳ công suất của một nhân sự tính giờ khả dụng từ ngày làm việc, ngày lễ và
            ngày phép. Phân bổ dự án theo phần trăm sẽ trừ dần vào giờ khả dụng; phần còn lại
            là công suất chưa dùng.
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
            onClick={() => setCreating(true)}
            disabled={!capacity.can("create")}
            title={
              capacity.can("create")
                ? "Tạo kỳ công suất"
                : "Bạn không có quyền tạo kỳ công suất"
            }
          >
            <PlusGlyph /> Tạo kỳ
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Tổng hợp công suất">
        <div className="metric">
          <span className="metric-value tabular">{formatHours(available)}</span>
          <span className="metric-label">Giờ khả dụng</span>
          <span className="metric-note">trên {scopeNote}</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{formatHours(allocated)}</span>
          <span className="metric-label">Đã phân bổ</span>
          <span className="metric-note">trên {scopeNote}</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{formatHours(remaining)}</span>
          <span className="metric-label">Còn trống</span>
          <span className="metric-note">trên {scopeNote}</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{over.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Vượt công suất</span>
          <span className="metric-note">trên {scopeNote}</span>
        </div>
      </section>

      {capacity.feedback ? (
        <div className={ALERT_TONE[capacity.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{capacity.feedback.message}</span>
            {capacity.feedback.hint ? (
              <span className="muted">{capacity.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => capacity.setFeedback(null)}
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
                  id="capacity-search"
                  className="input"
                  type="search"
                  value={capacity.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo tên nhân sự hoặc ghi chú…"
                  aria-label="Tìm kỳ công suất theo nhân sự hoặc ghi chú"
                  onChange={(event) =>
                    capacity.patchQuery({ q: event.target.value, page: 1 })
                  }
                />
                {capacity.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => capacity.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <label className="muted" htmlFor="capacity-from">
                Chồng với kỳ từ
              </label>
              <input
                id="capacity-from"
                className="input tabular"
                type="date"
                value={capacity.query.from ?? ""}
                onChange={(event) =>
                  capacity.patchQuery({ from: event.target.value, page: 1 })
                }
                style={{ width: 152 }}
              />

              <label className="muted" htmlFor="capacity-to">
                đến
              </label>
              <input
                id="capacity-to"
                className="input tabular"
                type="date"
                value={capacity.query.to ?? ""}
                onChange={(event) =>
                  capacity.patchQuery({ to: event.target.value, page: 1 })
                }
                style={{ width: 152 }}
              />

              <div className="popover-anchor">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-expanded={columnsOpen}
                  aria-haspopup="true"
                  onClick={() => setColumnsOpen((open) => !open)}
                >
                  Cột hiển thị
                </button>
                {columnsOpen ? (
                  <div className="menu" role="group" aria-label="Chọn cột hiển thị">
                    {OPTIONAL_COLUMNS.map((key) => (
                      <label key={key} className="menu-item">
                        <input
                          type="checkbox"
                          checked={!hidden.includes(key)}
                          onChange={() => toggleColumn(key)}
                        />
                        {COLUMN_LABELS[key]}
                      </label>
                    ))}
                    <button type="button" className="menu-item" onClick={() => setHidden([])}>
                      Hiện tất cả {ALL_COLUMNS.length} cột
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="toolbar-actions">
              <div className="segmented" role="group" aria-label="Cách hiển thị">
                <button
                  type="button"
                  className="segment"
                  aria-pressed={view === "table"}
                  data-active={view === "table" ? "true" : undefined}
                  onClick={() => setView("table")}
                >
                  Bảng
                </button>
                <button
                  type="button"
                  className="segment"
                  aria-pressed={view === "board"}
                  data-active={view === "board" ? "true" : undefined}
                  onClick={() => setView("board")}
                >
                  Thẻ
                </button>
              </div>
              <span className="result-count">
                {total.toLocaleString("vi-VN")} kỳ
                {capacity.filtersActive ? ` · ${rows.length} dòng khớp` : ""}
              </span>
            </div>
          </div>

          {capacity.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {capacity.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{capacity.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => capacity.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {capacity.query.from ? (
                <span className="chip" data-active="true">
                  Chồng với kỳ từ {formatDate(capacity.query.from)}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => capacity.patchQuery({ from: "", page: 1 })}
                    aria-label="Bỏ lọc ngày bắt đầu"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {capacity.query.to ? (
                <span className="chip" data-active="true">
                  Đến {formatDate(capacity.query.to)}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => capacity.patchQuery({ to: "", page: 1 })}
                    aria-label="Bỏ lọc ngày kết thúc"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={capacity.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem công suất</span>
            <p className="empty-body">
              Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Công suất nhân sự rồi tải
              lại trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={capacity.reload}>
              Tải lại
            </button>
          </div>
        ) : capacity.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được danh sách kỳ công suất</span>
            <p className="empty-body">{capacity.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={capacity.reload}>
              Thử lại
            </button>
          </div>
        ) : !capacity.loading && rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {capacity.filtersActive ? "Không có kỳ nào khớp bộ lọc" : "Chưa có kỳ công suất nào"}
            </span>
            <p className="empty-body">
              {capacity.filtersActive
                ? "Thử bỏ một vài điều kiện, hoặc xoá hết bộ lọc để xem toàn bộ danh sách."
                : "Tạo kỳ công suất cho một nhân sự để bắt đầu phân bổ dự án theo phần trăm."}
            </p>
            {capacity.filtersActive ? (
              <button type="button" className="btn btn-ghost" onClick={capacity.clearFilters}>
                Xoá bộ lọc
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCreating(true)}
                disabled={!capacity.can("create")}
              >
                <PlusGlyph /> Tạo kỳ
              </button>
            )}
          </div>
        ) : view === "board" ? (
          <CapacityBoard
            rows={rows}
            onOpen={(period: Period) => setOpenId(period.id)}
          />
        ) : (
          <CapacityTable
            rows={rows}
            loading={capacity.loading}
            sort={sort}
            onSort={(key) => setSort((current) => nextSort(current, key))}
            hidden={hidden}
            onOpen={(period) => setOpenId(period.id)}
          />
        )}

        {!forbidden && !capacity.error && rows.length > 0 ? (
          <Pagination
            page={capacity.query.page}
            pageSize={capacity.query.pageSize}
            total={total}
            idPrefix="capacity"
            onPage={(page) => capacity.patchQuery({ page })}
            onPageSize={(pageSize) => capacity.patchQuery({ pageSize, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Danh sách kỳ trả về dữ liệu đầu vào; mỗi dòng cần một lần đọc
        <span className="mono"> /summary</span> để có giờ khả dụng và tỉ lệ phân bổ, nên trang
        mặc định 10 dòng và chỉ cộng các dòng đã đọc được. Khoảng ngày lọc theo kiểu “chồng
        lấn” với kỳ. Ngày phép chỉ nhập được khi tạo kỳ vì API cập nhật không nhận trường này.
        Tên dự án trong phân bổ là chuỗi tự do, không gắn với mã dự án.
      </p>

      {creating ? (
        <CreatePeriodDialog onCreate={capacity.create} onClose={() => setCreating(false)} />
      ) : null}

      {openId ? (
        <PeriodDetailSheet
          periodId={openId}
          canCreate={capacity.can("create")}
          canUpdate={capacity.can("update")}
          onChanged={capacity.reload}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

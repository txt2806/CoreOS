"use client";

import { useMemo, useState } from "react";
import {
  EXPORT_FILE_PREFIX,
  PERIOD_STATUS_HINT,
  PERIOD_STATUS_LABEL,
  PERIOD_STATUS_TONE,
  UNAVAILABLE_METRICS,
} from "../constants";
import {
  downloadCsv,
  formatDate,
  formatDateTime,
  formatPeriodKey,
  numberLabel,
  todayIso,
} from "../format";
import { useAttendanceReports } from "../hooks/use-attendance-reports";
import {
  PERIOD_STATUSES,
  type AttendancePeriod,
  type PeriodLine,
  type PeriodStatus,
} from "../types";
import { LineDialog } from "./line-form";
import { PeriodDialog } from "./period-form";
import {
  CloseGlyph,
  DownloadGlyph,
  LockGlyph,
  Pagination,
  PlusGlyph,
  RefreshGlyph,
  SearchGlyph,
  SkeletonRows,
  SortButton,
  StatusBadge,
  UnlockGlyph,
} from "./primitives";

const ALERT_TONE = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
} as const;

type SortKey = "employeeName" | "workedDays" | "overtimeHours";

export function AttendanceReportsPage() {
  const report = useAttendanceReports();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "employeeName",
    dir: "asc",
  });
  const [periodDialog, setPeriodDialog] = useState<{ record?: AttendancePeriod } | null>(null);
  const [lineDialog, setLineDialog] = useState<{ record?: PeriodLine } | null>(null);

  const rows = useMemo(() => {
    const factor = sort.dir === "asc" ? 1 : -1;
    const value = (line: PeriodLine): number | string => {
      if (sort.key === "workedDays") return line.workedDays;
      if (sort.key === "overtimeHours") return line.overtimeHours;
      return line.employeeName;
    };
    return [...report.lines.items].sort((left, right) => {
      const a = value(left);
      const b = value(right);
      if (typeof a === "number" && typeof b === "number") return factor * (a - b);
      return factor * String(a).localeCompare(String(b), "vi");
    });
  }, [report.lines.items, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  const ariaSort = (key: SortKey): "ascending" | "descending" | "none" =>
    sort.key !== key ? "none" : sort.dir === "asc" ? "ascending" : "descending";

  const forbidden =
    report.periodError?.status === 403 || report.lineError?.status === 403;
  const canCreate = report.can("create");
  const canUpdate = report.can("update");
  const summary = report.summary;

  const exportRows = () => {
    const period = report.selected;
    const header = [
      "Kỳ công",
      "Nhân sự",
      "Mã nhân sự",
      "Ngày công",
      "Nghỉ có lương",
      "Nghỉ không lương",
      "Giờ làm thêm",
      "Ghi chú",
    ];
    const body = rows.map((line) => [
      period ? period.periodKey : "",
      line.employeeName,
      line.employeeId,
      numberLabel(line.workedDays, 2),
      numberLabel(line.paidLeaveDays, 2),
      numberLabel(line.unpaidLeaveDays, 2),
      numberLabel(line.overtimeHours, 2),
      line.note,
    ]);
    downloadCsv(
      `${EXPORT_FILE_PREFIX}-${period?.periodKey ?? todayIso()}.csv`,
      [header, ...body],
    );
    report.setFeedback({
      tone: "info",
      message: `Đã xuất ${rows.length} dòng công đang hiển thị ra tệp CSV.`,
      hint: "Tệp chỉ chứa trang hiện tại; đổi số dòng mỗi trang nếu cần xuất nhiều hơn.",
    });
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Nhân sự · Chấm công</p>
          <h1>Bảng công &amp; báo cáo kỳ</h1>
          <p className="page-lede">
            Tổng hợp ngày công, nghỉ có lương, nghỉ không lương và giờ làm thêm theo từng kỳ
            công. Kỳ đã chốt là chỉ đọc; mở lại thành nháp rồi mới sửa được dòng công.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={exportRows}
            disabled={rows.length === 0}
            title="Xuất các dòng đang hiển thị ra CSV"
          >
            <DownloadGlyph /> Xuất CSV
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={report.reload}
            title="Tải lại kỳ công và bảng công"
          >
            <RefreshGlyph /> Tải lại
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setPeriodDialog({})}
            disabled={!canCreate}
            title={canCreate ? "Tạo kỳ công mới" : "Bạn không có quyền tạo kỳ công"}
          >
            <PlusGlyph /> Tạo kỳ công
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Tổng hợp của kỳ công đang chọn">
        <div className="metric">
          <span className="metric-value tabular">
            {(summary?.headcount ?? 0).toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Nhân sự có dòng công</span>
          <span className="metric-note">Đếm theo dòng công trong kỳ.</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{numberLabel(summary?.workedDays ?? 0, 2)}</span>
          <span className="metric-label">Ngày công</span>
          <span className="metric-note">Cộng ngày công thực tế của mọi dòng.</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {numberLabel(summary?.paidLeaveDays ?? 0, 2)}
          </span>
          <span className="metric-label">Nghỉ có lương</span>
          <span className="metric-note">Phép và nghỉ lễ được tính lương.</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {numberLabel(summary?.unpaidLeaveDays ?? 0, 2)}
          </span>
          <span className="metric-label">Nghỉ không lương</span>
          <span className="metric-note">Không hưởng lương trong kỳ.</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {numberLabel(summary?.overtimeHours ?? 0, 2)}
          </span>
          <span className="metric-label">Giờ làm thêm</span>
          <span className="metric-note">Cộng giờ làm thêm đã khai báo.</span>
        </div>
      </section>

      {report.summaryIssue ? (
        <div className="alert alert-warning" role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>Không tải được tổng hợp của kỳ đang chọn.</span>
            <span className="muted">{report.summaryIssue}</span>
          </div>
        </div>
      ) : null}

      {report.feedback ? (
        <div className={ALERT_TONE[report.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{report.feedback.message}</span>
            {report.feedback.hint ? (
              <span className="muted">{report.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => report.setFeedback(null)}
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
              <div className="row items-center gap-2">
                <label className="muted" htmlFor="reports-period">
                  Kỳ công
                </label>
                <select
                  id="reports-period"
                  className="select"
                  value={report.selectedId}
                  onChange={(event) => report.setSelectedId(event.target.value)}
                  disabled={report.loadingPeriods || report.periods.length === 0}
                  style={{ minWidth: 232 }}
                >
                  {report.periods.length === 0 ? <option value="">Chưa có kỳ công</option> : null}
                  {report.periods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {formatPeriodKey(period.periodKey)} · {period.name} ·{" "}
                      {PERIOD_STATUS_LABEL[period.status]}
                    </option>
                  ))}
                </select>
              </div>

              <select
                className="select"
                value={report.periodStatusFilter}
                aria-label="Lọc kỳ công theo trạng thái"
                onChange={(event) =>
                  report.setPeriodStatusFilter(event.target.value as PeriodStatus | "")
                }
                style={{ width: 176 }}
              >
                <option value="">Mọi trạng thái kỳ</option>
                {PERIOD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PERIOD_STATUS_LABEL[status]}
                  </option>
                ))}
              </select>

              <div className="search">
                <SearchGlyph />
                <input
                  id="reports-search"
                  className="input"
                  type="search"
                  value={report.lineQuery.q}
                  autoComplete="off"
                  placeholder="Tìm theo tên hoặc mã nhân sự…"
                  aria-label="Tìm dòng công trong kỳ đang chọn"
                  disabled={!report.selectedId}
                  onChange={(event) =>
                    report.patchLineQuery({ q: event.target.value, page: 1 })
                  }
                />
                {report.lineQuery.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => report.patchLineQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {report.lines.total.toLocaleString("vi-VN")} dòng công
              </span>
              {report.selected ? (
                <>
                  {canUpdate ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setPeriodDialog({ record: report.selected ?? undefined })}
                    >
                      Sửa kỳ
                    </button>
                  ) : null}
                  {canUpdate ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        report.selected && report.togglePeriodStatus(report.selected)
                      }
                      disabled={report.savingId === report.selected.id}
                      aria-label={
                        report.readOnly
                          ? "Mở lại kỳ công để chỉnh sửa"
                          : "Chốt kỳ công này"
                      }
                    >
                      {report.readOnly ? <UnlockGlyph /> : <LockGlyph />}
                      {report.readOnly ? "Mở lại" : "Chốt kỳ"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setLineDialog({})}
                    disabled={!canCreate || report.readOnly}
                    title={
                      report.readOnly
                        ? "Kỳ công đã chốt nên không thêm dòng công"
                        : canCreate
                          ? "Thêm dòng công cho nhân sự"
                          : "Bạn không có quyền thêm dòng công"
                    }
                  >
                    <PlusGlyph /> Thêm dòng công
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {report.lineQuery.q ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              <span className="chip" data-active="true">
                Từ khoá: “{report.term}”
                <button
                  type="button"
                  className="chip-remove"
                  onClick={() => report.patchLineQuery({ q: "", page: 1 })}
                  aria-label="Bỏ lọc từ khoá"
                >
                  <CloseGlyph />
                </button>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => report.patchLineQuery({ q: "", page: 1 })}
              >
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem bảng công</span>
            <p className="empty-body">
              Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Bảng công rồi tải lại trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={report.reload}>
              Tải lại
            </button>
          </div>
        ) : report.periodError ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được danh sách kỳ công</span>
            <p className="empty-body">{report.periodError.message}</p>
            <button type="button" className="btn btn-primary" onClick={report.reload}>
              Thử lại
            </button>
          </div>
        ) : report.periods.length === 0 && !report.loadingPeriods ? (
          <div className="empty-state">
            <span className="empty-title">
              {report.periodStatusFilter
                ? "Không có kỳ công ở trạng thái này"
                : "Chưa có kỳ công nào"}
            </span>
            <p className="empty-body">
              {report.periodStatusFilter
                ? "Bỏ lọc trạng thái để xem mọi kỳ công đã tạo."
                : "Tạo kỳ công theo tháng trước, sau đó thêm dòng công cho từng nhân sự."}
            </p>
            {report.periodStatusFilter ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => report.setPeriodStatusFilter("")}
              >
                Bỏ lọc trạng thái
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setPeriodDialog({})}
                disabled={!canCreate}
              >
                <PlusGlyph /> Tạo kỳ công
              </button>
            )}
          </div>
        ) : report.selected ? (
          <div className="surface-body stack gap-3">
            <div className="spread wrap items-center gap-2">
              <div className="stack gap-1">
                <span className="surface-title">
                  {formatPeriodKey(report.selected.periodKey)} · {report.selected.name}
                </span>
                <span className="muted">
                  <span className="tabular">
                    {formatDate(report.selected.fromDate)} – {formatDate(report.selected.toDate)}
                  </span>
                  {" · "}
                  {report.selected.lineCount.toLocaleString("vi-VN")} dòng công · cập nhật{" "}
                  <span className="tabular">{formatDateTime(report.selected.updatedAt)}</span>
                </span>
                {report.selected.note ? (
                  <span className="muted">{report.selected.note}</span>
                ) : null}
              </div>
              <StatusBadge
                label={PERIOD_STATUS_LABEL[report.selected.status]}
                tone={PERIOD_STATUS_TONE[report.selected.status]}
              />
            </div>

            <p className="muted">{PERIOD_STATUS_HINT[report.selected.status]}</p>

            <div className="alert" role="note">
              <div className="stack gap-1">
                <span>
                  Báo cáo này chỉ có số liệu máy chủ tổng hợp được: ngày công, nghỉ có lương,
                  nghỉ không lương và giờ làm thêm.
                </span>
                <span className="muted">
                  Chưa hiển thị: {UNAVAILABLE_METRICS.map((item) => item.label).join(", ")} —{" "}
                  {UNAVAILABLE_METRICS[0]?.reason ?? ""}. Các cột này sẽ xuất hiện khi máy chủ bổ
                  sung trường tương ứng.
                </span>
              </div>
            </div>

            {report.lineError ? (
              <div className="error-state" role="alert">
                <span className="empty-title">Không tải được dòng công của kỳ</span>
                <p className="empty-body">{report.lineError.message}</p>
                <button type="button" className="btn btn-primary" onClick={report.reload}>
                  Thử lại
                </button>
              </div>
            ) : !report.loadingLines && rows.length === 0 ? (
              <div className="empty-state">
                <span className="empty-title">
                  {report.lineQuery.q
                    ? "Không có nhân sự nào khớp từ khoá"
                    : "Kỳ này chưa có dòng công nào"}
                </span>
                <p className="empty-body">
                  {report.lineQuery.q
                    ? "Bỏ từ khoá để xem toàn bộ dòng công trong kỳ."
                    : "Thêm dòng công cho từng nhân sự; mỗi người chỉ một dòng trong một kỳ."}
                </p>
                {report.lineQuery.q ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => report.patchLineQuery({ q: "", page: 1 })}
                  >
                    Xoá từ khoá
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setLineDialog({})}
                    disabled={!canCreate || report.readOnly}
                  >
                    <PlusGlyph /> Thêm dòng công
                  </button>
                )}
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <caption className="sr-only">
                    Bảng công của kỳ đang chọn, sắp xếp theo cột đang chọn trong trang hiện tại.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" aria-sort={ariaSort("employeeName")}>
                        <SortButton
                          label="Nhân sự"
                          active={sort.key === "employeeName"}
                          direction={sort.dir}
                          onClick={() => toggleSort("employeeName")}
                        />
                      </th>
                      <th scope="col" aria-sort={ariaSort("workedDays")}>
                        <SortButton
                          label="Ngày công"
                          active={sort.key === "workedDays"}
                          direction={sort.dir}
                          onClick={() => toggleSort("workedDays")}
                        />
                      </th>
                      <th scope="col">Nghỉ có lương</th>
                      <th scope="col">Nghỉ không lương</th>
                      <th scope="col" aria-sort={ariaSort("overtimeHours")}>
                        <SortButton
                          label="Giờ làm thêm"
                          active={sort.key === "overtimeHours"}
                          direction={sort.dir}
                          onClick={() => toggleSort("overtimeHours")}
                        />
                      </th>
                      <th scope="col">Ghi chú</th>
                      <th scope="col">
                        <span className="sr-only">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  {report.loadingLines ? (
                    <SkeletonRows rows={Math.min(8, Math.max(3, rows.length || 6))} columns={7} />
                  ) : (
                    <tbody>
                      {rows.map((line) => (
                        <tr key={line.id}>
                          <td>
                            <div className="stack gap-1">
                              <span className="cell-title">{line.employeeName}</span>
                              <span className="muted mono">{line.employeeId}</span>
                            </div>
                          </td>
                          <td className="tabular">{numberLabel(line.workedDays, 2)}</td>
                          <td className="tabular">{numberLabel(line.paidLeaveDays, 2)}</td>
                          <td className="tabular">{numberLabel(line.unpaidLeaveDays, 2)}</td>
                          <td className="tabular">{numberLabel(line.overtimeHours, 2)}</td>
                          <td className="truncate" title={line.note}>
                            {line.note || <span className="subtle">—</span>}
                          </td>
                          <td>
                            <div className="row justify-end gap-2">
                              {canUpdate && !report.readOnly ? (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setLineDialog({ record: line })}
                                >
                                  Sửa
                                </button>
                              ) : (
                                <span className="subtle">
                                  {report.readOnly ? "Kỳ đã chốt" : "Chỉ đọc"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )}
                  {!report.loadingLines && rows.length > 0 ? (
                    <tfoot>
                      <tr>
                        <td>
                          <span className="cell-title">
                            Tổng trang này ({rows.length.toLocaleString("vi-VN")} dòng)
                          </span>
                        </td>
                        <td className="tabular">
                          {numberLabel(
                            rows.reduce((sum, line) => sum + line.workedDays, 0),
                            2,
                          )}
                        </td>
                        <td className="tabular">
                          {numberLabel(
                            rows.reduce((sum, line) => sum + line.paidLeaveDays, 0),
                            2,
                          )}
                        </td>
                        <td className="tabular">
                          {numberLabel(
                            rows.reduce((sum, line) => sum + line.unpaidLeaveDays, 0),
                            2,
                          )}
                        </td>
                        <td className="tabular">
                          {numberLabel(
                            rows.reduce((sum, line) => sum + line.overtimeHours, 0),
                            2,
                          )}
                        </td>
                        <td colSpan={2} className="muted">
                          Tổng của cả kỳ nằm ở dải chỉ số phía trên.
                        </td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            )}

            {rows.length > 0 ? (
              <Pagination
                page={report.lineQuery.page}
                pageSize={report.lineQuery.pageSize}
                total={report.lines.total}
                onPage={(page) => report.patchLineQuery({ page })}
                onPageSize={(pageSize) => report.patchLineQuery({ pageSize, page: 1 })}
              />
            ) : null}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-title">Chọn một kỳ công để xem bảng công</span>
            <p className="empty-body">
              Dùng ô “Kỳ công” ở thanh công cụ để chuyển giữa các kỳ đã tạo.
            </p>
          </div>
        )}
      </div>

      <p className="page-footnote">
        Dải chỉ số phía trên lấy từ endpoint tổng hợp của kỳ nên luôn khớp toàn bộ dòng công,
        kể cả khi bảng bên dưới chỉ tải một trang. Tổng ở chân bảng chỉ tính các dòng đang hiển
        thị. Báo cáo theo nhân sự và theo kỳ dùng cùng bộ số liệu này; các chỉ số đi muộn, về
        sớm, thiếu giờ ra và vắng không phép chưa có trong dữ liệu máy chủ.
      </p>

      {periodDialog ? (
        <PeriodDialog
          record={periodDialog.record}
          onCreate={report.createPeriodRow}
          onPatch={report.patchPeriodRow}
          onClose={() => setPeriodDialog(null)}
        />
      ) : null}

      {lineDialog && report.selected ? (
        <LineDialog
          period={report.selected}
          record={lineDialog.record}
          onCreate={report.createLineRow}
          onPatch={report.patchLineRow}
          onClose={() => setLineDialog(null)}
        />
      ) : null}

      {report.savingId ? (
        <p className="sr-only" role="status" aria-live="polite">
          Đang cập nhật trạng thái kỳ công.
        </p>
      ) : null}
    </div>
  );
}

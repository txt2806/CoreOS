"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_PAGE_SIZE,
  EXPORT_FILE_PREFIX,
  SHIFT_STATUS_LABEL,
  SHIFT_STATUS_TONE,
  SOURCE_LABEL,
  SOURCE_TONE,
  TAB_LABEL,
  WEEKDAYS,
  type WorkspaceTab,
} from "../constants";
import {
  downloadCsv,
  formatClock,
  formatDate,
  formatDateTime,
  hoursLabel,
  todayIso,
  weekdayLabel,
} from "../format";
import { useShiftsSchedules } from "../hooks/use-shifts-schedules";
import {
  SHIFT_STATUSES,
  type ScheduleAssignment,
  type SchedulePattern,
  type ShiftStatus,
  type ShiftTemplate,
} from "../types";
import { AssignmentDialog, BulkAssignDialog } from "./assignment-form";
import { ApplyPatternDialog, PatternDialog } from "./pattern-form";
import {
  CloseGlyph,
  CopyGlyph,
  DownloadGlyph,
  Pagination,
  PlusGlyph,
  RefreshGlyph,
  SearchGlyph,
  SkeletonRows,
  SortButton,
  StatusBadge,
} from "./primitives";
import { ShiftDialog } from "./shift-form";

const ALERT_TONE = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
} as const;

type SortDir = "asc" | "desc";

const TAB_ORDER: WorkspaceTab[] = ["assignments", "shifts", "patterns"];

export function ShiftsSchedulesPage() {
  const workspace = useShiftsSchedules();
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({
    key: "workDate",
    dir: "asc",
  });

  const [shiftDialog, setShiftDialog] = useState<{ record?: ShiftTemplate } | null>(null);
  const [patternDialog, setPatternDialog] = useState<{ record?: SchedulePattern } | null>(null);
  const [applyTarget, setApplyTarget] = useState<SchedulePattern | null>(null);
  const [assignmentDialog, setAssignmentDialog] = useState<{ record?: ScheduleAssignment } | null>(
    null,
  );
  const [bulkOpen, setBulkOpen] = useState(false);

  const shiftNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const shift of workspace.pickerShifts) map.set(shift.id, `${shift.name} (${shift.startTime}–${shift.endTime})`);
    for (const shift of workspace.shifts.items) {
      if (!map.has(shift.id)) map.set(shift.id, `${shift.name} (${shift.startTime}–${shift.endTime})`);
    }
    return map;
  }, [workspace.pickerShifts, workspace.shifts.items]);

  const sortWith = <T,>(rows: T[], value: (row: T) => number | string): T[] => {
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((left, right) => {
      const a = value(left);
      const b = value(right);
      if (typeof a === "number" && typeof b === "number") return factor * (a - b);
      return factor * String(a).localeCompare(String(b), "vi");
    });
  };

  const shiftRows = useMemo(
    () =>
      sortWith(
        workspace.shifts.items.map((shift) => {
          const next = workspace.shiftStatus[shift.id];
          return next ? { ...shift, status: next } : shift;
        }),
        (shift) => {
          if (sort.key === "startTime") return shift.startTime;
          if (sort.key === "status") return SHIFT_STATUSES.indexOf(shift.status);
          return shift.name;
        },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspace.shifts.items, workspace.shiftStatus, sort],
  );

  const patternRows = useMemo(
    () =>
      sortWith(workspace.patterns.items, (pattern) => {
        if (sort.key === "status") return SHIFT_STATUSES.indexOf(pattern.status);
        return pattern.name;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspace.patterns.items, sort],
  );

  const assignmentRows = useMemo(
    () =>
      sortWith(workspace.assignments.items, (assignment) => {
        if (sort.key === "workDate") return assignment.workDate;
        if (sort.key === "source") return assignment.source;
        return assignment.employeeName;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspace.assignments.items, sort],
  );

  const toggleSort = (key: string) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  const ariaSort = (key: string): "ascending" | "descending" | "none" =>
    sort.key !== key ? "none" : sort.dir === "asc" ? "ascending" : "descending";

  const forbidden = workspace.error?.status === 403;
  const tab = workspace.tab;
  const canCreate = workspace.can("create");
  const canUpdate = workspace.can("update");

  const rowCount =
    tab === "shifts" ? shiftRows.length : tab === "patterns" ? patternRows.length : assignmentRows.length;

  const exportRows = () => {
    const today = todayIso();
    if (tab === "shifts") {
      const header = [
        "Tên ca",
        "Bắt đầu",
        "Kết thúc",
        "Nghỉ (phút)",
        "Ca đêm",
        "Hiệu lực từ",
        "Lịch đã gán",
        "Trạng thái",
      ];
      const body = shiftRows.map((shift) => [
        shift.name,
        formatClock(shift.startTime),
        formatClock(shift.endTime),
        String(shift.breakMinutes),
        shift.nightShift ? "Có" : "Không",
        formatDate(shift.effectiveFrom),
        String(shift.assignmentCount),
        SHIFT_STATUS_LABEL[shift.status],
      ]);
      downloadCsv(`${EXPORT_FILE_PREFIX}-ca-${today}.csv`, [header, ...body]);
    } else if (tab === "patterns") {
      const header = ["Tên mẫu", "Các ngày", "Trạng thái", "Ghi chú"];
      const body = patternRows.map((pattern) => [
        pattern.name,
        pattern.slots
          .map((slot) => {
            const day = WEEKDAYS.find((item) => item.value === slot.weekday);
            return `${day?.short ?? slot.weekday}: ${shiftNames.get(slot.shiftId) ?? "—"}`;
          })
          .join("; "),
        SHIFT_STATUS_LABEL[pattern.status],
        pattern.note,
      ]);
      downloadCsv(`${EXPORT_FILE_PREFIX}-mau-${today}.csv`, [header, ...body]);
    } else {
      const header = ["Nhân sự", "Mã nhân sự", "Ngày", "Ca", "Nguồn", "Ghi chú"];
      const body = assignmentRows.map((assignment) => [
        assignment.employeeName,
        assignment.employeeId,
        formatDate(assignment.workDate),
        shiftNames.get(assignment.shiftId) ?? "",
        SOURCE_LABEL[assignment.source],
        assignment.note,
      ]);
      downloadCsv(`${EXPORT_FILE_PREFIX}-${today}.csv`, [header, ...body]);
    }
    workspace.setFeedback({
      tone: "info",
      message: `Đã xuất ${rowCount} dòng đang hiển thị ra tệp CSV.`,
    });
  };

  const openPrimary = () => {
    if (tab === "shifts") setShiftDialog({});
    else if (tab === "patterns") setPatternDialog({});
    else setAssignmentDialog({});
  };

  const primaryLabel =
    tab === "shifts" ? "Tạo ca" : tab === "patterns" ? "Tạo mẫu tuần" : "Gán ca";

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Nhân sự · Chấm công</p>
          <h1>Ca làm việc &amp; phân ca</h1>
          <p className="page-lede">
            Khai báo khung giờ ca, lưu mẫu tuần dùng lại, rồi gán ca cho từng nhân sự theo ngày.
            Mỗi nhân sự chỉ có một ca trong một ngày; ca đã được gán thì không đổi được khung giờ.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={exportRows}
            disabled={rowCount === 0}
            title="Xuất các dòng đang hiển thị ra CSV"
          >
            <DownloadGlyph /> Xuất CSV
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={workspace.reload}
            title="Tải lại dữ liệu ca và lịch"
          >
            <RefreshGlyph /> Tải lại
          </button>
          {tab === "assignments" ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setBulkOpen(true)}
              disabled={!canUpdate || workspace.pickerShifts.length === 0}
              title={
                canUpdate
                  ? "Gán một ca cho nhiều nhân sự trong khoảng ngày"
                  : "Bạn không có quyền gán ca hàng loạt"
              }
            >
              <CopyGlyph /> Gán hàng loạt
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            onClick={openPrimary}
            disabled={!canCreate}
            title={canCreate ? primaryLabel : "Bạn không có quyền tạo mới trong phân hệ này"}
          >
            <PlusGlyph /> {primaryLabel}
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Số lượng ca, mẫu tuần và lịch phân ca">
        <div className="metric">
          <span className="metric-value tabular">
            {workspace.totals.active.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Ca đang áp dụng</span>
          <span className="metric-note">Gán được cho ngày mới.</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {workspace.totals.inactive.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Ca đã ngừng</span>
          <span className="metric-note">Không gán mới, lịch cũ vẫn giữ.</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {workspace.totals.patterns.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Mẫu tuần</span>
          <span className="metric-note">Áp dụng lại cho nhiều nhân sự.</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {workspace.totals.assignments.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Lịch phân ca</span>
          <span className="metric-note">Một dòng cho mỗi nhân sự mỗi ngày.</span>
        </div>
      </section>

      {workspace.feedback ? (
        <div className={ALERT_TONE[workspace.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{workspace.feedback.message}</span>
            {workspace.feedback.hint ? (
              <span className="muted">{workspace.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => workspace.setFeedback(null)}
            aria-label="Đóng thông báo"
            style={{ marginLeft: "auto" }}
          >
            <CloseGlyph />
          </button>
        </div>
      ) : null}

      <div className="tabs" role="tablist" aria-label="Nhóm dữ liệu lịch làm việc">
        {TAB_ORDER.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`schedules-tab-${value}`}
            aria-selected={tab === value}
            aria-controls={`schedules-panel-${value}`}
            className="tab"
            onClick={() => {
              workspace.setTab(value);
              setSort(
                value === "assignments"
                  ? { key: "workDate", dir: "asc" }
                  : { key: "name", dir: "asc" },
              );
            }}
          >
            {TAB_LABEL[value]}
          </button>
        ))}
      </div>

      <div
        className="surface"
        role="tabpanel"
        id={`schedules-panel-${tab}`}
        aria-labelledby={`schedules-tab-${tab}`}
      >
        <div className="surface-head">
          <div className="toolbar">
            <div className="toolbar-filters">
              <div className="search">
                <SearchGlyph />
                <input
                  id="schedules-search"
                  className="input"
                  type="search"
                  value={workspace.activeQuery.q ?? ""}
                  autoComplete="off"
                  placeholder={
                    tab === "shifts"
                      ? "Tìm theo tên ca hoặc ghi chú…"
                      : tab === "patterns"
                        ? "Tìm theo tên mẫu…"
                        : "Tìm theo tên nhân sự hoặc ghi chú…"
                  }
                  aria-label="Tìm trong nhóm dữ liệu đang chọn"
                  onChange={(event) =>
                    workspace.patchActiveQuery({ q: event.target.value, page: 1 })
                  }
                />
                {workspace.activeQuery.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => workspace.patchActiveQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              {tab === "assignments" ? (
                <>
                  <div className="row items-center gap-2">
                    <label className="muted" htmlFor="schedules-from">
                      Từ ngày
                    </label>
                    <input
                      id="schedules-from"
                      className="input"
                      type="date"
                      value={workspace.assignmentsQuery.from ?? ""}
                      max={workspace.assignmentsQuery.to || undefined}
                      onChange={(event) =>
                        workspace.patchActiveQuery({ from: event.target.value, page: 1 })
                      }
                      style={{ width: 148 }}
                    />
                    <label className="muted" htmlFor="schedules-to">
                      đến
                    </label>
                    <input
                      id="schedules-to"
                      className="input"
                      type="date"
                      value={workspace.assignmentsQuery.to ?? ""}
                      min={workspace.assignmentsQuery.from || undefined}
                      onChange={(event) =>
                        workspace.patchActiveQuery({ to: event.target.value, page: 1 })
                      }
                      style={{ width: 148 }}
                    />
                  </div>
                  <div className="row items-center gap-2">
                    <label className="muted" htmlFor="schedules-employee">
                      Mã nhân sự
                    </label>
                    <input
                      id="schedules-employee"
                      className="input"
                      type="search"
                      value={workspace.assignmentsQuery.employeeId ?? ""}
                      autoComplete="off"
                      placeholder="EMP-0142"
                      onChange={(event) =>
                        workspace.patchActiveQuery({ employeeId: event.target.value, page: 1 })
                      }
                      style={{ width: 148 }}
                    />
                  </div>
                </>
              ) : (
                <select
                  className="select"
                  value={workspace.activeQuery.status ?? ""}
                  aria-label="Lọc theo trạng thái"
                  onChange={(event) =>
                    workspace.patchActiveQuery({
                      status: event.target.value as ShiftStatus | "",
                      page: 1,
                    })
                  }
                  style={{ width: 176 }}
                >
                  <option value="">Mọi trạng thái</option>
                  <option value="ACTIVE">{SHIFT_STATUS_LABEL.ACTIVE}</option>
                  <option value="INACTIVE">{SHIFT_STATUS_LABEL.INACTIVE}</option>
                </select>
              )}
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {workspace.total.toLocaleString("vi-VN")} {TAB_LABEL[tab].toLowerCase()}
              </span>
            </div>
          </div>

          {workspace.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {workspace.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{workspace.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => workspace.patchActiveQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {tab !== "assignments" && workspace.activeQuery.status ? (
                <span className="chip" data-active="true">
                  {SHIFT_STATUS_LABEL[workspace.activeQuery.status as ShiftStatus]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => workspace.patchActiveQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {tab === "assignments" && workspace.assignmentsQuery.employeeId ? (
                <span className="chip" data-active="true">
                  Mã: {workspace.assignmentsQuery.employeeId}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => workspace.patchActiveQuery({ employeeId: "", page: 1 })}
                    aria-label="Bỏ lọc mã nhân sự"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {tab === "assignments" && workspace.assignmentsQuery.from ? (
                <span className="chip" data-active="true">
                  Từ <span className="tabular">{formatDate(workspace.assignmentsQuery.from)}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => workspace.patchActiveQuery({ from: "", page: 1 })}
                    aria-label="Bỏ mốc ngày bắt đầu"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {tab === "assignments" && workspace.assignmentsQuery.to ? (
                <span className="chip" data-active="true">
                  Đến <span className="tabular">{formatDate(workspace.assignmentsQuery.to)}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => workspace.patchActiveQuery({ to: "", page: 1 })}
                    aria-label="Bỏ mốc ngày kết thúc"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={workspace.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem lịch làm việc</span>
            <p className="empty-body">
              Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Ca làm việc rồi tải lại trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={workspace.reload}>
              Tải lại
            </button>
          </div>
        ) : workspace.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được dữ liệu lịch làm việc</span>
            <p className="empty-body">{workspace.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={workspace.reload}>
              Thử lại
            </button>
          </div>
        ) : !workspace.loading && rowCount === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {workspace.filtersActive
                ? "Không có dòng nào khớp bộ lọc"
                : tab === "shifts"
                  ? "Chưa có ca làm việc nào"
                  : tab === "patterns"
                    ? "Chưa có mẫu tuần nào"
                    : "Chưa ai được gán ca"}
            </span>
            <p className="empty-body">
              {workspace.filtersActive
                ? "Bỏ một vài điều kiện lọc để xem toàn bộ dữ liệu."
                : tab === "shifts"
                  ? "Bắt đầu bằng một ca chuẩn, ví dụ 08:00–17:00 nghỉ 60 phút, rồi gán cho nhân sự."
                  : tab === "patterns"
                    ? "Mẫu tuần gom sẵn lịch của một tuần để áp dụng lại cho nhiều người."
                    : "Gán ca cho từng người hoặc dùng “Gán hàng loạt” để phủ cả khoảng ngày."}
            </p>
            {workspace.filtersActive ? (
              <button type="button" className="btn btn-ghost" onClick={workspace.clearFilters}>
                Xoá bộ lọc
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openPrimary}
                disabled={!canCreate}
              >
                <PlusGlyph /> {primaryLabel}
              </button>
            )}
          </div>
        ) : tab === "shifts" ? (
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">
                Danh sách ca làm việc, sắp xếp theo cột đang chọn trong trang hiện tại.
              </caption>
              <thead>
                <tr>
                  <th scope="col" aria-sort={ariaSort("name")}>
                    <SortButton
                      label="Tên ca"
                      active={sort.key === "name"}
                      direction={sort.dir}
                      onClick={() => toggleSort("name")}
                    />
                  </th>
                  <th scope="col" aria-sort={ariaSort("startTime")}>
                    <SortButton
                      label="Khung giờ"
                      active={sort.key === "startTime"}
                      direction={sort.dir}
                      onClick={() => toggleSort("startTime")}
                    />
                  </th>
                  <th scope="col">Nghỉ giữa ca</th>
                  <th scope="col">Giờ tính công</th>
                  <th scope="col">Hiệu lực từ</th>
                  <th scope="col">Lịch đã gán</th>
                  <th scope="col" aria-sort={ariaSort("status")}>
                    <SortButton
                      label="Trạng thái"
                      active={sort.key === "status"}
                      direction={sort.dir}
                      onClick={() => toggleSort("status")}
                    />
                  </th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              {workspace.loading ? (
                <SkeletonRows rows={Math.min(8, Math.max(3, rowCount || 6))} columns={8} />
              ) : (
                <tbody>
                  {shiftRows.map((shift) => (
                    <tr key={shift.id}>
                      <td>
                        <div className="stack gap-1">
                          <span className="cell-title">{shift.name}</span>
                          {shift.nightShift ? (
                            <span className="muted">Ca đêm, kết thúc sang hôm sau</span>
                          ) : null}
                          {shift.note ? (
                            <span className="muted truncate" title={shift.note}>
                              {shift.note}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="tabular">
                        {formatClock(shift.startTime)} – {formatClock(shift.endTime)}
                      </td>
                      <td className="tabular">{shift.breakMinutes.toLocaleString("vi-VN")} phút</td>
                      <td className="tabular">{hoursLabel(shift.hours)}</td>
                      <td className="tabular">{formatDate(shift.effectiveFrom)}</td>
                      <td className="tabular">{shift.assignmentCount.toLocaleString("vi-VN")}</td>
                      <td>
                        <StatusBadge
                          label={SHIFT_STATUS_LABEL[shift.status]}
                          tone={SHIFT_STATUS_TONE[shift.status]}
                        />
                      </td>
                      <td>
                        <div className="row wrap justify-end gap-2">
                          {canUpdate ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setShiftDialog({ record: shift })}
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => workspace.toggleShiftStatus(shift)}
                                disabled={workspace.savingId === shift.id}
                                aria-label={`Chuyển ca ${shift.name} sang ${
                                  SHIFT_STATUS_LABEL[shift.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"]
                                }`}
                              >
                                {shift.status === "ACTIVE" ? "Ngừng áp dụng" : "Kích hoạt lại"}
                              </button>
                            </>
                          ) : (
                            <span className="subtle">Chỉ đọc</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        ) : tab === "patterns" ? (
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">
                Danh sách mẫu tuần, sắp xếp theo cột đang chọn trong trang hiện tại.
              </caption>
              <thead>
                <tr>
                  <th scope="col" aria-sort={ariaSort("name")}>
                    <SortButton
                      label="Tên mẫu"
                      active={sort.key === "name"}
                      direction={sort.dir}
                      onClick={() => toggleSort("name")}
                    />
                  </th>
                  <th scope="col">Các ngày trong tuần</th>
                  <th scope="col" aria-sort={ariaSort("status")}>
                    <SortButton
                      label="Trạng thái"
                      active={sort.key === "status"}
                      direction={sort.dir}
                      onClick={() => toggleSort("status")}
                    />
                  </th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              {workspace.loading ? (
                <SkeletonRows rows={Math.min(8, Math.max(3, rowCount || 5))} columns={4} />
              ) : (
                <tbody>
                  {patternRows.map((pattern) => (
                    <tr key={pattern.id}>
                      <td>
                        <div className="stack gap-1">
                          <span className="cell-title">{pattern.name}</span>
                          {pattern.note ? (
                            <span className="muted truncate" title={pattern.note}>
                              {pattern.note}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div className="row wrap items-center gap-2">
                          {pattern.slots.map((slot) => {
                            const day = WEEKDAYS.find((item) => item.value === slot.weekday);
                            return (
                              <span key={slot.weekday} className="chip">
                                {day?.short ?? slot.weekday} ·{" "}
                                {shiftNames.get(slot.shiftId) ?? "Ca đã xoá"}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        <StatusBadge
                          label={SHIFT_STATUS_LABEL[pattern.status]}
                          tone={SHIFT_STATUS_TONE[pattern.status]}
                        />
                      </td>
                      <td>
                        <div className="row wrap justify-end gap-2">
                          {canUpdate ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setPatternDialog({ record: pattern })}
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => setApplyTarget(pattern)}
                                disabled={pattern.status !== "ACTIVE"}
                                title={
                                  pattern.status === "ACTIVE"
                                    ? "Áp dụng mẫu cho nhân sự trong khoảng ngày"
                                    : "Mẫu đã ngừng áp dụng"
                                }
                              >
                                Áp dụng
                              </button>
                            </>
                          ) : (
                            <span className="subtle">Chỉ đọc</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">
                Danh sách lịch phân ca, sắp xếp theo cột đang chọn trong trang hiện tại.
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
                  <th scope="col" aria-sort={ariaSort("workDate")}>
                    <SortButton
                      label="Ngày"
                      active={sort.key === "workDate"}
                      direction={sort.dir}
                      onClick={() => toggleSort("workDate")}
                    />
                  </th>
                  <th scope="col">Ca</th>
                  <th scope="col" aria-sort={ariaSort("source")}>
                    <SortButton
                      label="Nguồn"
                      active={sort.key === "source"}
                      direction={sort.dir}
                      onClick={() => toggleSort("source")}
                    />
                  </th>
                  <th scope="col">Ghi chú</th>
                  <th scope="col">Cập nhật</th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              {workspace.loading ? (
                <SkeletonRows rows={Math.min(8, Math.max(3, rowCount || 8))} columns={7} />
              ) : (
                <tbody>
                  {assignmentRows.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>
                        <div className="stack gap-1">
                          <span className="cell-title">{assignment.employeeName}</span>
                          <span className="muted mono">{assignment.employeeId}</span>
                        </div>
                      </td>
                      <td>
                        <div className="stack gap-1">
                          <span className="tabular">{formatDate(assignment.workDate)}</span>
                          <span className="muted">{weekdayLabel(assignment.workDate)}</span>
                        </div>
                      </td>
                      <td>{shiftNames.get(assignment.shiftId) ?? "Ca đã xoá"}</td>
                      <td>
                        <StatusBadge
                          label={SOURCE_LABEL[assignment.source]}
                          tone={SOURCE_TONE[assignment.source]}
                        />
                      </td>
                      <td className="truncate" title={assignment.note}>
                        {assignment.note || <span className="subtle">—</span>}
                      </td>
                      <td className="tabular">{formatDateTime(assignment.updatedAt)}</td>
                      <td>
                        <div className="row justify-end gap-2">
                          {canUpdate ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setAssignmentDialog({ record: assignment })}
                            >
                              Sửa
                            </button>
                          ) : (
                            <span className="subtle">Chỉ đọc</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}

        {!forbidden && !workspace.error && rowCount > 0 ? (
          <Pagination
            page={workspace.page}
            pageSize={workspace.pageSize || DEFAULT_PAGE_SIZE}
            total={workspace.total}
            onPage={(page) => workspace.patchActiveQuery({ page })}
            onPageSize={(pageSize) => workspace.patchActiveQuery({ pageSize, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Sắp xếp áp dụng cho trang đang tải. Máy chủ từ chối gán hai ca cho cùng một nhân sự trong
        một ngày và từ chối đổi khung giờ của ca đã có lịch. Gán hàng loạt và áp dụng mẫu tuần trả
        về số lịch đã tạo cùng số ngày bị bỏ qua để bạn đối chiếu.
      </p>

      {shiftDialog ? (
        <ShiftDialog
          record={shiftDialog.record}
          onCreate={workspace.createShiftRow}
          onPatch={workspace.patchShift}
          onClose={() => setShiftDialog(null)}
        />
      ) : null}

      {patternDialog ? (
        <PatternDialog
          record={patternDialog.record}
          shifts={workspace.pickerShifts}
          onCreate={workspace.createPatternRow}
          onPatch={workspace.patchPattern}
          onClose={() => setPatternDialog(null)}
        />
      ) : null}

      {applyTarget ? (
        <ApplyPatternDialog
          pattern={applyTarget}
          shiftNames={shiftNames}
          onApply={(input) => workspace.runApply(applyTarget, input)}
          onClose={() => setApplyTarget(null)}
        />
      ) : null}

      {assignmentDialog ? (
        <AssignmentDialog
          record={assignmentDialog.record}
          shifts={workspace.pickerShifts}
          me={workspace.me}
          onCreate={workspace.createAssignmentRow}
          onPatch={workspace.patchAssignment}
          onClose={() => setAssignmentDialog(null)}
        />
      ) : null}

      {bulkOpen ? (
        <BulkAssignDialog
          shifts={workspace.pickerShifts}
          onBulk={workspace.runBulk}
          onClose={() => setBulkOpen(false)}
        />
      ) : null}

      {workspace.savingId ? (
        <p className="sr-only" role="status" aria-live="polite">
          Đang cập nhật trạng thái ca làm việc.
        </p>
      ) : null}
    </div>
  );
}

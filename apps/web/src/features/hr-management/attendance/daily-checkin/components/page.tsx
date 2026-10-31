"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AUTO_CLOSE_TIME, EXPORT_FILE_PREFIX, SOURCE_LABEL, STATUS_LABEL, STATUS_TONE } from "../constants";
import {
  durationLabel,
  downloadCsv,
  formatClock,
  formatDate,
  minutesBetween,
  nowClock,
  todayIso,
  weekdayLabel,
} from "../format";
import { useDailyCheckin } from "../hooks/use-daily-checkin";
import type { AttendanceRecord, AttendanceStatus } from "../types";
import { AttendanceEditSheet } from "./edit-sheet";
import {
  ClockGlyph,
  CloseGlyph,
  Confirm,
  DownloadGlyph,
  EditGlyph,
  LockGlyph,
  Pagination,
  RefreshGlyph,
  SearchGlyph,
  SkeletonRows,
  SortButton,
  StatusBadge,
} from "./primitives";

const ALERT_TONE = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
} as const;

type SortKey = "workDate" | "employeeName" | "status" | "duration";

const STATUS_RANK: Record<AttendanceStatus, number> = { OPEN: 0, COMPLETE: 1, LOCKED: 2 };

function durationOf(record: AttendanceRecord): number | null {
  return record.checkOut ? minutesBetween(record.checkIn, record.checkOut) : null;
}

function sortRows(rows: AttendanceRecord[], key: SortKey, dir: "asc" | "desc") {
  const factor = dir === "asc" ? 1 : -1;
  const value = (record: AttendanceRecord): number | string => {
    switch (key) {
      case "status":
        return STATUS_RANK[record.status];
      case "duration":
        return durationOf(record) ?? -1;
      case "employeeName":
        return record.employeeName;
      default:
        return record.workDate;
    }
  };
  return [...rows].sort((left, right) => {
    const a = value(left);
    const b = value(right);
    if (typeof a === "number" && typeof b === "number") return factor * (a - b);
    return factor * String(a).localeCompare(String(b), "vi");
  });
}

export function DailyCheckinPage() {
  const screen = useDailyCheckin();
  const [now, setNow] = useState<Date | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "workDate",
    dir: "desc",
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [askLock, setAskLock] = useState<AttendanceRecord | null>(null);
  const [locking, setLocking] = useState(false);

  /* Time-dependent text renders after mount so SSR and client agree exactly. */
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(
    () =>
      sortRows(
        screen.data.items.map((record) => {
          const override = screen.locked[record.id];
          return override ? { ...record, status: override } : record;
        }),
        sort.key,
        sort.dir,
      ),
    [screen.data.items, screen.locked, sort],
  );

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "workDate" ? "desc" : "asc" },
    );

  const today = screen.todayRecord;
  const worked = today?.checkOut ? minutesBetween(today.checkIn, today.checkOut) : null;
  const forbidden = screen.error?.status === 403;
  const isEmployee = screen.permission?.role === "EMPLOYEE";
  const detail = openId ? (rows.find((record) => record.id === openId) ?? null) : null;

  const exportRows = () => {
    const header = [
      "Ngày",
      "Mã nhân sự",
      "Nhân sự",
      "Giờ vào",
      "Giờ ra",
      "Số giờ",
      "Nguồn",
      "Trạng thái",
      "Ghi chú",
    ];
    const body = rows.map((record) => [
      formatDate(record.workDate),
      record.employeeId,
      record.employeeName,
      record.checkIn,
      record.checkOut ?? "",
      durationLabel(durationOf(record)),
      SOURCE_LABEL[record.source],
      STATUS_LABEL[record.status],
      record.note,
    ]);
    downloadCsv(`${EXPORT_FILE_PREFIX}-${todayIso()}.csv`, [header, ...body]);
    screen.setFeedback({
      tone: "info",
      message: `Đã xuất ${rows.length} dòng đang hiển thị ra tệp CSV.`,
    });
  };

  const confirmLock = async () => {
    if (!askLock) return;
    setLocking(true);
    await screen.lock(askLock);
    setLocking(false);
    setAskLock(null);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Nhân sự · Điểm danh</p>
          <h1>Chấm công hằng ngày</h1>
          <p className="page-lede">
            Ghi giờ vào, giờ ra trong ngày và tra cứu lịch sử chấm công. Số giờ làm chỉ
            được tính khi bản ghi có đủ giờ ra; bản ghi đã chốt là chỉ đọc.
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
            onClick={screen.reload}
            title="Tải lại dữ liệu chấm công"
          >
            <RefreshGlyph /> Tải lại
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Tình hình chấm công hôm nay">
        <div className="metric">
          <span className="metric-value tabular">{formatClock(today?.checkIn)}</span>
          <span className="metric-label">Giờ vào hôm nay</span>
          <span className="metric-note">
            {now ? `Bây giờ ${nowClock(now)}` : "Đang tải giờ hệ thống…"}
          </span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{formatClock(today?.checkOut)}</span>
          <span className="metric-label">Giờ ra hôm nay</span>
          <span className="metric-note">
            {today ? "Ghi khi kết thúc ngày làm" : "Chưa có bản ghi hôm nay"}
          </span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{durationLabel(worked)}</span>
          <span className="metric-label">Đã làm hôm nay</span>
          <span className="metric-note">Tính từ giờ vào đến giờ ra</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {(screen.totals.open ?? 0).toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Bản ghi chưa có giờ ra</span>
          <span className="metric-note">
            {(screen.totals.complete ?? 0).toLocaleString("vi-VN")} đã đủ giờ ·{" "}
            {(screen.totals.locked ?? 0).toLocaleString("vi-VN")} đã chốt
          </span>
        </div>
      </section>

      {screen.feedback ? (
        <div className={ALERT_TONE[screen.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{screen.feedback.message}</span>
            {screen.feedback.hint ? (
              <span className="muted">{screen.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => screen.setFeedback(null)}
            aria-label="Đóng thông báo"
            style={{ marginLeft: "auto" }}
          >
            <CloseGlyph />
          </button>
        </div>
      ) : null}

      <section className="surface" aria-labelledby="today-heading">
        <div className="surface-head">
          <div className="spread wrap items-center gap-3">
            <div className="stack gap-1">
              <h2 className="surface-title" id="today-heading">
                Hôm nay
              </h2>
              <span className="muted">
                {now ? weekdayLabel(now) : "Đang tải ngày làm việc…"}
              </span>
            </div>
            <div className="row items-center gap-2">
              <ClockGlyph />
              <span className="tabular">{now ? nowClock(now) : "--:--"}</span>
            </div>
          </div>
        </div>
        <div className="surface-body stack gap-3">
          {screen.todayIssue ? (
            <div className="error-state" role="alert">
              <span className="empty-title">Không đọc được bản ghi hôm nay</span>
              <p className="empty-body">{screen.todayIssue}</p>
              <button type="button" className="btn btn-primary" onClick={screen.reload}>
                Thử lại
              </button>
            </div>
          ) : screen.todayLoading ? (
            <div className="stack gap-2" aria-busy="true">
              <span className="skeleton skeleton-line" style={{ width: "40%" }} />
              <span className="skeleton skeleton-line" style={{ width: "62%" }} />
            </div>
          ) : (
            <div className="spread wrap items-center gap-4">
              <div className="stack gap-1">
                <span className="hero-priority-value tabular">{today?.checkIn ?? "--:--"}</span>
                <span className="muted">
                  {today
                    ? `Giờ vào · ${STATUS_LABEL[today.status]}`
                    : "Hôm nay chưa có bản ghi chấm công."}
                </span>
              </div>
              <div className="row wrap gap-4">
                <span>
                  Ra:{" "}
                  <strong className="tabular">{today?.checkOut ?? "chưa ghi"}</strong>
                </span>
                <span>
                  Đã làm: <strong className="tabular">{durationLabel(worked)}</strong>
                </span>
                <span className="muted">
                  Nguồn: {today ? SOURCE_LABEL[today.source] : "—"}
                </span>
              </div>
              <div className="row wrap gap-2">
                {today && !today.checkOut && today.status !== "LOCKED" ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={screen.clockOut}
                    disabled={screen.busy !== null || !screen.can("update")}
                    aria-busy={screen.busy === "out" ? "true" : undefined}
                    title={
                      screen.can("update")
                        ? "Ghi giờ ra cho bản ghi hôm nay"
                        : "Bạn không có quyền sửa bản ghi chấm công"
                    }
                  >
                    {screen.busy === "out" ? "Đang ghi…" : "Chấm công ra"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={screen.clockIn}
                    disabled={Boolean(today) || screen.busy !== null || !screen.can("create")}
                    aria-busy={screen.busy === "in" ? "true" : undefined}
                    title={
                      today
                        ? "Hôm nay đã có bản ghi chấm công"
                        : screen.can("create")
                          ? "Ghi giờ vào ngay bây giờ"
                          : "Bạn không có quyền chấm công"
                    }
                  >
                    {screen.busy === "in" ? "Đang ghi…" : "Chấm công vào"}
                  </button>
                )}
              </div>
            </div>
          )}
          <p className="muted">
            Bản ghi chưa có giờ ra được hệ thống tự đóng lúc {AUTO_CLOSE_TIME} và ghi nhận
            là thiếu giờ ra, không tự cộng giờ làm.
          </p>
        </div>
      </section>

      <div className="surface">
        <div className="surface-head">
          <div className="toolbar">
            <div className="toolbar-filters">
              <div className="search">
                <SearchGlyph />
                <input
                  id="attendance-search"
                  className="input"
                  type="search"
                  value={screen.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo tên nhân sự hoặc ghi chú…"
                  aria-label="Tìm bản ghi chấm công"
                  onChange={(event) => screen.patchQuery({ q: event.target.value, page: 1 })}
                />
                {screen.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => screen.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={screen.query.status ?? ""}
                aria-label="Lọc theo trạng thái bản ghi"
                onChange={(event) =>
                  screen.patchQuery({
                    status: event.target.value as AttendanceStatus | "",
                    page: 1,
                  })
                }
                style={{ width: 176 }}
              >
                <option value="">Mọi trạng thái</option>
                <option value="OPEN">{STATUS_LABEL.OPEN}</option>
                <option value="COMPLETE">{STATUS_LABEL.COMPLETE}</option>
                <option value="LOCKED">{STATUS_LABEL.LOCKED}</option>
              </select>

              <div className="row items-center gap-2">
                <label className="muted" htmlFor="attendance-from">
                  Từ ngày
                </label>
                <input
                  id="attendance-from"
                  className="input"
                  type="date"
                  value={screen.query.from ?? ""}
                  max={screen.query.to || undefined}
                  onChange={(event) =>
                    screen.patchQuery({ from: event.target.value, page: 1 })
                  }
                  style={{ width: 156 }}
                />
                <label className="muted" htmlFor="attendance-to">
                  đến
                </label>
                <input
                  id="attendance-to"
                  className="input"
                  type="date"
                  value={screen.query.to ?? ""}
                  min={screen.query.from || undefined}
                  onChange={(event) => screen.patchQuery({ to: event.target.value, page: 1 })}
                  style={{ width: 156 }}
                />
              </div>
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {screen.data.total.toLocaleString("vi-VN")} bản ghi
              </span>
              <div className="segmented" role="group" aria-label="Phạm vi bản ghi">
                <button
                  type="button"
                  className="segment"
                  aria-pressed={screen.scope === "mine"}
                  onClick={() => screen.changeScope("mine")}
                >
                  Của tôi
                </button>
                <button
                  type="button"
                  className="segment"
                  aria-pressed={screen.scope === "all"}
                  onClick={() => screen.changeScope("all")}
                  disabled={isEmployee}
                  title={
                    isEmployee
                      ? "Tài khoản nhân viên chỉ xem được bản ghi của chính mình"
                      : "Xem bản ghi của mọi nhân sự"
                  }
                >
                  Toàn bộ nhân sự
                </button>
              </div>
            </div>
          </div>

          {screen.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {screen.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{screen.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => screen.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {screen.query.status ? (
                <span className="chip" data-active="true">
                  Trạng thái: {STATUS_LABEL[screen.query.status]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => screen.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {screen.query.from || screen.query.to ? (
                <span className="chip" data-active="true">
                  Khoảng ngày: {formatDate(screen.query.from)} – {formatDate(screen.query.to)}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => screen.patchQuery({ from: "", to: "", page: 1 })}
                    aria-label="Bỏ lọc khoảng ngày"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={screen.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem chấm công</span>
            <p className="empty-body">
              Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Chấm công rồi tải lại
              trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={screen.reload}>
              Tải lại
            </button>
          </div>
        ) : screen.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được danh sách chấm công</span>
            <p className="empty-body">{screen.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={screen.reload}>
              Thử lại
            </button>
          </div>
        ) : !screen.loading && rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {screen.filtersActive
                ? "Không có bản ghi nào khớp bộ lọc"
                : "Chưa có bản ghi chấm công"}
            </span>
            <p className="empty-body">
              {screen.filtersActive
                ? "Thử mở rộng khoảng ngày hoặc xoá bớt điều kiện lọc."
                : "Chấm công vào để tạo bản ghi đầu tiên cho hôm nay."}
            </p>
            {screen.filtersActive ? (
              <button type="button" className="btn btn-ghost" onClick={screen.clearFilters}>
                Xoá bộ lọc
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={screen.clockIn}
                disabled={Boolean(today) || !screen.can("create")}
              >
                <ClockGlyph /> Chấm công vào
              </button>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">
                Bản ghi chấm công của trang hiện tại, sắp xếp theo cột đang chọn.
              </caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    aria-sort={
                      sort.key === "workDate"
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <SortButton
                      label="Ngày"
                      active={sort.key === "workDate"}
                      direction={sort.dir}
                      onClick={() => toggleSort("workDate")}
                    />
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      sort.key === "employeeName"
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <SortButton
                      label="Nhân sự"
                      active={sort.key === "employeeName"}
                      direction={sort.dir}
                      onClick={() => toggleSort("employeeName")}
                    />
                  </th>
                  <th scope="col">Giờ vào</th>
                  <th scope="col">Giờ ra</th>
                  <th
                    scope="col"
                    className="num"
                    aria-sort={
                      sort.key === "duration"
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <SortButton
                      label="Đã làm"
                      active={sort.key === "duration"}
                      direction={sort.dir}
                      onClick={() => toggleSort("duration")}
                    />
                  </th>
                  <th scope="col">Nguồn</th>
                  <th
                    scope="col"
                    aria-sort={
                      sort.key === "status"
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
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
              {screen.loading ? (
                <SkeletonRows rows={Math.min(8, Math.max(3, rows.length || 6))} columns={8} />
              ) : (
                <tbody>
                  {rows.map((record) => (
                    <tr key={record.id}>
                      <td className="tabular">{formatDate(record.workDate)}</td>
                      <td>
                        <div className="stack gap-1">
                          <span className="cell-title">{record.employeeName}</span>
                          <span className="muted mono">{record.employeeId}</span>
                        </div>
                      </td>
                      <td className="tabular">{record.checkIn}</td>
                      <td className="tabular">
                        {record.checkOut ?? <span className="subtle">chưa ghi</span>}
                      </td>
                      <td className="num tabular">{durationLabel(durationOf(record))}</td>
                      <td>{SOURCE_LABEL[record.source]}</td>
                      <td>
                        <StatusBadge
                          label={STATUS_LABEL[record.status]}
                          tone={STATUS_TONE[record.status]}
                        />
                      </td>
                      <td>
                        <div className="row justify-end gap-2">
                          {record.status !== "LOCKED" && screen.can("update") ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setOpenId(record.id)}
                              aria-label={`Sửa bản ghi ngày ${formatDate(record.workDate)} của ${record.employeeName}`}
                            >
                              <EditGlyph /> Sửa
                            </button>
                          ) : null}
                          {record.status !== "LOCKED" && screen.can("approve") ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setAskLock(record)}
                              aria-label={`Chốt bản ghi ngày ${formatDate(record.workDate)} của ${record.employeeName}`}
                            >
                              <LockGlyph /> Chốt
                            </button>
                          ) : null}
                          {record.status === "LOCKED" ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setOpenId(record.id)}
                              aria-label={`Xem bản ghi đã chốt ngày ${formatDate(record.workDate)} của ${record.employeeName}`}
                            >
                              Xem
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}

        {!forbidden && !screen.error && rows.length > 0 ? (
          <Pagination
            page={screen.query.page}
            pageSize={screen.query.pageSize}
            total={screen.data.total}
            onPage={(page) => screen.patchQuery({ page })}
            onPageSize={(pageSize) => screen.patchQuery({ pageSize, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Sắp xếp chỉ áp dụng cho các dòng đang tải trên trang này; bộ lọc ngày do máy chủ xử
        lý. Tài khoản nhân viên chỉ thấy bản ghi của mình. Bản ghi đã chốt cần điều chỉnh
        qua{" "}
        <Link className="link" href="/hr-management/explanations">
          đơn giải trình điểm danh
        </Link>
        .
      </p>

      {detail ? (
        <AttendanceEditSheet
          record={detail}
          locked={detail.status === "LOCKED"}
          onSave={(changes) => screen.patch(detail.id, changes)}
          onClose={() => setOpenId(null)}
        />
      ) : null}

      {askLock ? (
        <Confirm
          title={`Chốt bản ghi ngày ${formatDate(askLock.workDate)}?`}
          body={`${askLock.employeeName} · vào ${askLock.checkIn} · ra ${askLock.checkOut ?? "chưa ghi"}. Sau khi chốt, bản ghi không sửa được từ màn hình này và chỉ điều chỉnh được qua đơn giải trình.`}
          confirmLabel="Chốt bản ghi"
          busy={locking}
          onConfirm={confirmLock}
          onClose={() => setAskLock(null)}
        />
      ) : null}

      {screen.savingId ? (
        <p className="sr-only" role="status" aria-live="polite">
          Đang lưu bản ghi chấm công.
        </p>
      ) : null}
    </div>
  );
}

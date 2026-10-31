"use client";

import { useMemo, useState } from "react";
import { EVENT_STATUSES } from "../types";
import type { CalendarEvent, EventStatus } from "../types";
import { WEEKDAYS } from "../constants";
import {
  byTime,
  formatDate,
  monthCells,
  monthLabel,
  shiftMonth,
  todayIso,
  toDate,
  weekdayLong,
} from "../format";
import { useCalendar, type Feedback } from "../hooks/use-calendar";
import { CreateEventDialog } from "./create-dialog";
import { EventSheet } from "./detail-sheet";
import {
  CloseGlyph,
  KindChip,
  Pagination,
  PlusGlyph,
  SearchGlyph,
  SkeletonLines,
  StatusBadge,
} from "./primitives";

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

function initialCursor() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function CalendarPage() {
  const calendar = useCalendar();
  const [cursor, setCursor] = useState(initialCursor);
  const [selected, setSelected] = useState(todayIso);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  /* Optimistic statuses are applied at render so the grid and sheet agree. */
  const rows = useMemo(
    () =>
      calendar.data.items.map((event) => {
        const next = calendar.optimistic[event.id];
        return next ? { ...event, status: next } : event;
      }),
    [calendar.data.items, calendar.optimistic],
  );

  const perDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of rows) {
      const bucket = map.get(event.date);
      if (bucket) bucket.push(event);
      else map.set(event.date, [event]);
    }
    return map;
  }, [rows]);

  const cells = useMemo(() => monthCells(cursor.year, cursor.month), [cursor]);
  const agenda = useMemo(() => [...(perDay.get(selected) ?? [])].sort(byTime), [perDay, selected]);

  const canCreate = calendar.can("create");
  const canUpdate = calendar.can("update");
  const canDelete = calendar.can("delete");
  const forbidden = calendar.error?.status === 403;

  const stepMonth = (delta: number) => {
    setCursor((current) => shiftMonth(current.year, current.month, delta));
  };

  const jumpToday = () => {
    const iso = todayIso();
    const date = toDate(iso);
    setCursor({ year: date.getFullYear(), month: date.getMonth() + 1 });
    setSelected(iso);
  };

  const total = calendar.data.total;
  const sums = Object.values(calendar.totals);
  const all = sums.reduce((sum, value) => sum + value, 0);
  const truncated = total > calendar.data.items.length;
  const detail = openId ? (rows.find((event) => event.id === openId) ?? null) : null;

  const metric = (status: EventStatus) => calendar.totals[status] ?? 0;

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Điều phối công việc</p>
          <h1>Lịch làm việc</h1>
          <p className="page-lede">
            Lưới tháng theo tuần làm việc bắt đầu từ thứ Hai. Chọn một ngày để xem danh sách
            cuộc họp, thời gian tập trung và sự kiện của ngày đó.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-ghost" onClick={jumpToday}>
            Hôm nay
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreating(true)}
            disabled={!canCreate}
            title={canCreate ? "Thêm sự kiện mới" : "Bạn không có quyền tạo sự kiện"}
          >
            <PlusGlyph /> Thêm sự kiện
          </button>
        </div>
      </header>

      {sums.length > 0 ? (
        <section className="metric-strip" aria-label="Sự kiện theo trạng thái">
          {EVENT_STATUSES.map((status) => (
            <div className="metric" key={status}>
              <span className="metric-value tabular">{metric(status)}</span>
              <span className="metric-label">{status}</span>
              <span className="metric-note">{share(metric(status), all)}</span>
            </div>
          ))}
        </section>
      ) : null}

      {calendar.feedback ? (
        <div className={ALERT_TONE[calendar.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{calendar.feedback.message}</span>
            {calendar.feedback.hint ? (
              <span className="muted">{calendar.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => calendar.setFeedback(null)}
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
                  id="calendar-search"
                  className="input"
                  type="search"
                  value={calendar.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo mã, tên, địa điểm…"
                  aria-label="Tìm sự kiện"
                  onChange={(event) => calendar.patchQuery({ q: event.target.value, page: 1 })}
                />
                {calendar.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => calendar.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={calendar.query.status ?? ""}
                aria-label="Lọc theo trạng thái sự kiện"
                onChange={(event) =>
                  calendar.patchQuery({
                    status: event.target.value as EventStatus | "",
                    page: 1,
                  })
                }
                style={{ width: 176 }}
              >
                <option value="">Mọi trạng thái</option>
                {EVENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {total.toLocaleString("vi-VN")} sự kiện
                {calendar.filtersActive ? ` · ${rows.length} dòng khớp` : ""}
              </span>
              <div className="segmented" role="group" aria-label="Chuyển tháng">
                <button
                  type="button"
                  className="segment"
                  onClick={() => stepMonth(-1)}
                  aria-label="Tháng trước"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="segment"
                  onClick={jumpToday}
                  title="Về tháng hiện tại"
                >
                  {monthLabel(cursor.year, cursor.month)}
                </button>
                <button
                  type="button"
                  className="segment"
                  onClick={() => stepMonth(1)}
                  aria-label="Tháng sau"
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          {calendar.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {calendar.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{calendar.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => calendar.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {calendar.query.status ? (
                <span className="chip" data-active="true">
                  Trạng thái: {calendar.query.status}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => calendar.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={calendar.clearFilters}
              >
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem lịch làm việc</span>
            <p className="empty-body">
              Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Điều phối công việc rồi
              tải lại trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={calendar.reload}>
              Tải lại
            </button>
          </div>
        ) : calendar.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được lịch làm việc</span>
            <p className="empty-body">{calendar.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={calendar.reload}>
              Thử lại
            </button>
          </div>
        ) : calendar.loading ? (
          <div className="surface-body stack gap-3" aria-busy="true">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 42 }, (_, index) => (
                <span key={index} className="skeleton h-16" />
              ))}
            </div>
            <SkeletonLines rows={4} />
          </div>
        ) : (
          <>
            {calendar.filtersActive && rows.length === 0 ? (
              <div className="empty-state">
                <span className="empty-title">Không có sự kiện nào khớp bộ lọc</span>
                <p className="empty-body">
                  Lưới tháng chỉ tô sáng các sự kiện khớp điều kiện hiện tại. Xoá bộ lọc để
                  xem toàn bộ lịch.
                </p>
                <button type="button" className="btn btn-ghost" onClick={calendar.clearFilters}>
                  Xoá bộ lọc
                </button>
              </div>
            ) : null}

            <div className="surface-body grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <section className="stack gap-2" aria-label={`Lưới tháng ${monthLabel(cursor.year, cursor.month)}`}>
                <div className="table-scroll">
                  <table className="data-table">
                    <caption>{monthLabel(cursor.year, cursor.month)}</caption>
                    <thead>
                      <tr>
                        {WEEKDAYS.map((day) => (
                          <th key={day} scope="col">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.ceil(cells.length / 7) }, (_, week) => (
                        <tr key={week}>
                          {cells.slice(week * 7, week * 7 + 7).map((cell, index) =>
                            cell ? (
                              <td key={cell.iso} className="align-top" style={{ padding: 2 }}>
                                <button
                                  type="button"
                                  className={`stack w-full items-start gap-1 rounded-[var(--radius-md)] px-2 py-1 text-left hover:bg-inset ${
                                    cell.iso === selected ? "bg-accent/10" : ""
                                  }`}
                                  style={
                                    cell.isToday
                                      ? { boxShadow: "inset 0 0 0 1px var(--accent)" }
                                      : undefined
                                  }
                                  aria-pressed={cell.iso === selected}
                                  aria-label={`${formatDate(cell.iso)} — ${(
                                    perDay.get(cell.iso)?.length ?? 0
                                  ).toLocaleString("vi-VN")} sự kiện`}
                                  onClick={() => setSelected(cell.iso)}
                                >
                                  <span className="row items-center gap-2">
                                    <span className="tabular">{cell.day}</span>
                                    {cell.isToday ? (
                                      <span className="badge badge-accent">Hôm nay</span>
                                    ) : null}
                                  </span>
                                  {(perDay.get(cell.iso)?.length ?? 0) > 0 ? (
                                    <span className="muted tabular">
                                      {(perDay.get(cell.iso)?.length ?? 0).toLocaleString(
                                        "vi-VN",
                                      )}{" "}
                                      sự kiện
                                    </span>
                                  ) : null}
                                </button>
                              </td>
                            ) : (
                              <td
                                key={`blank-${week}-${index}`}
                                className="align-top"
                                aria-hidden="true"
                              />
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!calendar.filtersActive && total === 0 ? (
                  <div className="empty-state">
                    <span className="empty-title">Chưa có sự kiện nào trên lịch</span>
                    <p className="empty-body">
                      Thêm cuộc họp hoặc khung thời gian tập trung đầu tiên để cả nhóm cùng
                      thấy.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setCreating(true)}
                      disabled={!canCreate}
                    >
                      <PlusGlyph /> Thêm sự kiện
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="stack gap-3" aria-label={`Sự kiện ngày ${formatDate(selected)}`}>
                <div className="spread items-start gap-2">
                  <h2 className="surface-title">{weekdayLong(selected)}</h2>
                  <span className="muted tabular" aria-live="polite">
                    {agenda.length.toLocaleString("vi-VN")} sự kiện
                  </span>
                </div>

                {agenda.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-title">Ngày này chưa có sự kiện</span>
                    <p className="empty-body">
                      Chọn ngày khác trên lưới, hoặc thêm sự kiện cho riêng ngày này.
                    </p>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setCreating(true)}
                      disabled={!canCreate}
                    >
                      <PlusGlyph /> Thêm vào ngày này
                    </button>
                  </div>
                ) : (
                  <div className="list">
                    {agenda.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className="list-row"
                        onClick={() => setOpenId(event.id)}
                        aria-label={`Mở chi tiết ${event.code} — ${event.name}`}
                      >
                        <span className="list-main">
                          <span className="row items-center gap-2 wrap">
                            <span className="mono tabular">
                              {event.fields.startTime ?? "Cả ngày"}
                            </span>
                            <StatusBadge status={event.status} />
                            <KindChip kind={event.fields.kind} />
                          </span>
                          <strong>{event.name}</strong>
                          <span className="list-meta">
                            {event.assignee || "Chưa giao phụ trách"}
                            {event.fields.location ? ` · ${event.fields.location}` : ""}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {!forbidden && !calendar.error && rows.length > 0 ? (
          <Pagination
            id="calendar"
            page={calendar.query.page}
            pageSize={calendar.query.pageSize}
            total={total}
            onPage={(page) => calendar.patchQuery({ page })}
            onPageSize={(pageSize) => calendar.patchQuery({ pageSize, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Lưới tháng chỉ hiển thị sự kiện đến từ phân hệ Lịch; lịch nghỉ lễ và hạn công việc
        không có trong dữ liệu trả về nên không được vẽ thêm.{" "}
        {truncated
          ? `Đang tải ${calendar.data.items.length.toLocaleString("vi-VN")} trong ${total.toLocaleString("vi-VN")} sự kiện — thu hẹp bộ lọc để thấy đủ lưới tháng.`
          : "Số sự kiện đang tải đã bao trùm toàn bộ bộ lọc hiện tại."}
      </p>

      {creating ? (
        <CreateEventDialog
          defaultDate={selected}
          onCreate={calendar.create}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {detail ? (
        <EventSheet
          event={detail}
          status={detail.status}
          canUpdate={canUpdate}
          canDelete={canDelete}
          pending={calendar.pending === detail.id}
          onChangeStatus={(status) => calendar.changeStatus(detail, status)}
          onDelete={() => calendar.remove(detail)}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

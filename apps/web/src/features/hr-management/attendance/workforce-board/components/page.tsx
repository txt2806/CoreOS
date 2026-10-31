"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BOARD_ORDER,
  EXPORT_FILE_PREFIX,
  STATUS_HINT,
  STATUS_LABEL,
  STATUS_TONE,
} from "../constants";
import { downloadCsv, formatDate, formatDateTime, todayIso, weekdayLabel } from "../format";
import { useWorkforceBoard } from "../hooks/use-workforce-board";
import type { Presence, PresenceStatus } from "../types";
import { PresenceDialog } from "./presence-form";
import {
  ChevronGlyph,
  CloseGlyph,
  DownloadGlyph,
  Pagination,
  PlusGlyph,
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

type SortKey = "employeeName" | "status";
type View = "groups" | "table";

/** Row-level status switch: optimistic upstream, closed by Esc or an outside click. */
function StatusMenu({
  presence,
  busy,
  onPick,
}: {
  presence: Presence;
  busy: boolean;
  onPick: (status: PresenceStatus) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="popover-anchor">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        {busy ? "Đang lưu…" : "Đổi trạng thái"} <ChevronGlyph down />
      </button>
      {open ? (
        <div className="menu" role="menu" aria-label={`Đổi trạng thái cho ${presence.employeeName}`}>
          {BOARD_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              className="menu-item"
              role="menuitem"
              disabled={status === presence.status}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                onPick(status);
              }}
            >
              {STATUS_LABEL[status]}
              {status === presence.status ? <span className="muted"> · hiện tại</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function WorkforceBoardPage() {
  const board = useWorkforceBoard();
  const [view, setView] = useState<View>("groups");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "employeeName",
    dir: "asc",
  });
  const [declaring, setDeclaring] = useState(false);

  const rows = useMemo(() => {
    const withOverride = board.data.items.map((presence) => {
      const next = board.optimistic[presence.id];
      return next ? { ...presence, status: next } : presence;
    });
    const factor = sort.dir === "asc" ? 1 : -1;
    const value = (presence: Presence): number | string =>
      sort.key === "status"
        ? BOARD_ORDER.indexOf(presence.status)
        : presence.employeeName;
    return [...withOverride].sort((left, right) => {
      const a = value(left);
      const b = value(right);
      if (typeof a === "number" && typeof b === "number") return factor * (a - b);
      return factor * String(a).localeCompare(String(b), "vi");
    });
  }, [board.data.items, board.optimistic, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  const countOf = (status: PresenceStatus): number =>
    board.summary?.items.find((item) => item.status === status)?.count ?? 0;

  const forbidden = board.error?.status === 403;
  const isEmployee = board.permission?.role === "EMPLOYEE";

  const exportRows = () => {
    const header = ["Ngày", "Mã nhân sự", "Nhân sự", "Trạng thái", "Ca", "Ghi chú", "Cập nhật"];
    const body = rows.map((presence) => [
      formatDate(presence.workDate),
      presence.employeeId,
      presence.employeeName,
      STATUS_LABEL[presence.status],
      presence.shiftLabel,
      presence.note,
      formatDateTime(presence.updatedAt),
    ]);
    downloadCsv(`${EXPORT_FILE_PREFIX}-${board.workDate || todayIso()}.csv`, [header, ...body]);
    board.setFeedback({
      tone: "info",
      message: `Đã xuất ${rows.length} dòng đang hiển thị ra tệp CSV.`,
    });
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Nhân sự · Hiện diện</p>
          <h1>Mọi người đang ở đâu</h1>
          <p className="page-lede">
            Bảng hiện diện theo ngày: ai đang ở văn phòng, ai làm từ xa, ai đi công tác và
            ai đang nghỉ. Bảng chỉ đọc dữ liệu đã khai báo, không tự suy ra người vắng mặt.
          </p>
        </div>
        <div className="page-actions">
          <div className="field">
            <label className="field-label" htmlFor="workforce-date">
              Ngày xem
            </label>
            <input
              id="workforce-date"
              className="input"
              type="date"
              value={board.workDate}
              max={todayIso()}
              onChange={(event) => {
                if (event.target.value) board.setWorkDate(event.target.value);
              }}
              style={{ width: 168 }}
            />
          </div>
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
            onClick={board.reload}
            title="Tải lại bảng hiện diện"
          >
            <RefreshGlyph /> Tải lại
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setDeclaring(true)}
            disabled={!board.can("create")}
            title={
              board.can("create")
                ? "Khai báo trạng thái hiện diện"
                : "Bạn không có quyền khai báo trạng thái"
            }
          >
            <PlusGlyph /> Khai báo
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Số người theo trạng thái hiện diện">
        {BOARD_ORDER.map((status) => (
          <div className="metric" key={status}>
            <span className="metric-value tabular">{countOf(status).toLocaleString("vi-VN")}</span>
            <span className="metric-label">{STATUS_LABEL[status]}</span>
            <span className="metric-note">{STATUS_HINT[status]}</span>
          </div>
        ))}
      </section>

      {board.summaryIssue ? (
        <div className="alert alert-warning" role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>Không tải được số liệu tổng hợp của ngày {formatDate(board.workDate)}.</span>
            <span className="muted">{board.summaryIssue}</span>
          </div>
        </div>
      ) : null}

      {board.feedback ? (
        <div className={ALERT_TONE[board.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{board.feedback.message}</span>
            {board.feedback.hint ? (
              <span className="muted">{board.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => board.setFeedback(null)}
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
                  id="workforce-search"
                  className="input"
                  type="search"
                  value={board.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo tên nhân sự…"
                  aria-label="Tìm người trong bảng hiện diện"
                  onChange={(event) => board.patchQuery({ q: event.target.value, page: 1 })}
                />
                {board.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => board.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={board.query.status ?? ""}
                aria-label="Lọc theo trạng thái hiện diện"
                onChange={(event) =>
                  board.patchQuery({
                    status: event.target.value as PresenceStatus | "",
                    page: 1,
                  })
                }
                style={{ width: 184 }}
              >
                <option value="">Mọi trạng thái</option>
                {BOARD_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {board.data.total.toLocaleString("vi-VN")} người ·{" "}
                {formatDate(board.workDate)}
              </span>
              <div className="segmented" role="group" aria-label="Kiểu hiển thị">
                <button
                  type="button"
                  className="segment"
                  aria-pressed={view === "groups"}
                  onClick={() => setView("groups")}
                >
                  Theo nhóm
                </button>
                <button
                  type="button"
                  className="segment"
                  aria-pressed={view === "table"}
                  onClick={() => setView("table")}
                >
                  Danh sách
                </button>
              </div>
            </div>
          </div>

          {board.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {board.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{board.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => board.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {board.query.status ? (
                <span className="chip" data-active="true">
                  {STATUS_LABEL[board.query.status]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => board.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={board.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem bảng hiện diện</span>
            <p className="empty-body">
              Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Hiện diện rồi tải lại
              trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={board.reload}>
              Tải lại
            </button>
          </div>
        ) : board.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được bảng hiện diện</span>
            <p className="empty-body">{board.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={board.reload}>
              Thử lại
            </button>
          </div>
        ) : !board.loading && rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {board.filtersActive
                ? "Không có ai khớp bộ lọc"
                : `Chưa ai khai báo trạng thái ngày ${formatDate(board.workDate)}`}
            </span>
            <p className="empty-body">
              {board.filtersActive
                ? "Bỏ một vài điều kiện lọc để xem toàn bộ ngày đang chọn."
                : "Chưa có bản ghi nghĩa là chưa ai khai báo, không phải cả công ty vắng mặt. Khai báo giúp đồng nghiệp biết bạn đang ở đâu."}
            </p>
            {board.filtersActive ? (
              <button type="button" className="btn btn-ghost" onClick={board.clearFilters}>
                Xoá bộ lọc
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setDeclaring(true)}
                disabled={!board.can("create")}
              >
                <PlusGlyph /> Khai báo trạng thái
              </button>
            )}
          </div>
        ) : view === "groups" ? (
          <div className="surface-body stack gap-3">
            <p className="muted">
              Người không có bản ghi trong ngày không xuất hiện ở đây và{" "}
              <strong>chưa bị coi là vắng mặt</strong>. Nhắc họ khai báo trạng thái để bảng
              phản ánh đúng.
            </p>
            {board.loading ? (
              <div className="stack gap-2" aria-busy="true">
                <span className="skeleton skeleton-row" />
                <span className="skeleton skeleton-row" />
                <span className="skeleton skeleton-row" />
              </div>
            ) : (
              <div className="bento">
                {BOARD_ORDER.map((status) => {
                  const group = rows.filter((presence) => presence.status === status);
                  return (
                    <section
                      className="widget bento-6"
                      key={status}
                      aria-labelledby={`group-${status}`}
                    >
                      <div className="widget-head">
                        <div className="stack gap-1">
                          <h2 className="widget-title" id={`group-${status}`}>
                            {STATUS_LABEL[status]}
                          </h2>
                          <span className="widget-note">
                            {countOf(status).toLocaleString("vi-VN")} người khai báo trong
                            ngày
                          </span>
                        </div>
                        <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
                      </div>
                      <div className="widget-body">
                        {group.length === 0 ? (
                          <p className="muted">
                            Không có bản ghi nào ở nhóm này trong ngày đang xem.
                          </p>
                        ) : (
                          <ul className="list">
                            {group.map((presence) => (
                              <li key={presence.id} className="list-row">
                                <div className="list-main">
                                  <strong>{presence.employeeName}</strong>
                                  <span className="list-meta">
                                    {presence.employeeId}
                                    {presence.shiftLabel ? ` · ${presence.shiftLabel}` : ""}
                                    {presence.note ? ` · ${presence.note}` : ""}
                                  </span>
                                </div>
                                {!isEmployee && board.can("update") ? (
                                  <StatusMenu
                                    presence={presence}
                                    busy={board.savingId === presence.id}
                                    onPick={(next) => board.changeStatus(presence, next)}
                                  />
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">
                Bảng hiện diện của ngày đang chọn, sắp xếp theo cột đang chọn.
              </caption>
              <thead>
                <tr>
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
                  <th scope="col">Ca làm</th>
                  <th scope="col">Ghi chú</th>
                  <th scope="col">Cập nhật</th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              {board.loading ? (
                <SkeletonRows rows={Math.min(8, Math.max(3, rows.length || 6))} columns={6} />
              ) : (
                <tbody>
                  {rows.map((presence) => (
                    <tr key={presence.id}>
                      <td>
                        <div className="stack gap-1">
                          <span className="cell-title">{presence.employeeName}</span>
                          <span className="muted mono">{presence.employeeId}</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge
                          label={STATUS_LABEL[presence.status]}
                          tone={STATUS_TONE[presence.status]}
                        />
                      </td>
                      <td>{presence.shiftLabel || <span className="subtle">Chưa khai báo</span>}</td>
                      <td className="truncate" title={presence.note}>
                        {presence.note || <span className="subtle">—</span>}
                      </td>
                      <td className="tabular">{formatDateTime(presence.updatedAt)}</td>
                      <td>
                        <div className="row justify-end gap-2">
                          {!isEmployee && board.can("update") ? (
                            <StatusMenu
                              presence={presence}
                              busy={board.savingId === presence.id}
                              onPick={(next) => board.changeStatus(presence, next)}
                            />
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

        {!forbidden && !board.error && rows.length > 0 ? (
          <Pagination
            page={board.query.page}
            pageSize={board.query.pageSize}
            total={board.data.total}
            onPage={(page) => board.patchQuery({ page })}
            onPageSize={(pageSize) => board.patchQuery({ pageSize, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Ngày đang xem là {weekdayLabel(board.workDate)}. Số trên đầu trang do máy chủ tổng
        hợp cho cả ngày; danh sách bên dưới chỉ tải trang hiện tại (tối đa{" "}
        {board.query.pageSize} dòng). Tài khoản nhân viên chỉ thấy bản ghi của mình.
      </p>

      {declaring ? (
        <PresenceDialog
          workDate={board.workDate}
          me={board.me}
          onDeclare={board.declare}
          onClose={() => setDeclaring(false)}
        />
      ) : null}

      {board.savingId ? (
        <p className="sr-only" role="status" aria-live="polite">
          Đang cập nhật trạng thái hiện diện.
        </p>
      ) : null}
    </div>
  );
}

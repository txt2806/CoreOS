"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_LABELS } from "../constants";
import type { PagedList } from "../hooks/use-work-policies";
import { formatDate, formatDateTime } from "../format";
import type { Holiday, Network, Quota, Status } from "../types";
import { AlertGlyph, CloseGlyph, Pagination, PencilGlyph, PlusGlyph, SearchGlyph, StatusBadge } from "./primitives";

const STATUS_FILTERS: readonly { value: Status | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "ACTIVE", label: STATUS_LABELS.ACTIVE },
  { value: "INACTIVE", label: STATUS_LABELS.INACTIVE },
];

/** Years around today; the server accepts 2000–2100 but nobody filters by 2003 on purpose. */
function yearOptions(): number[] {
  const now = new Date().getFullYear();
  return Array.from({ length: 7 }, (_, index) => now - 3 + index);
}

interface ListSurfaceProps<T extends { id: string }> {
  label: string;
  list: PagedList<T>;
  unit: string;
  placeholder: string;
  searchable: boolean;
  filterByStatus: boolean;
  filterByYear: boolean;
  createLabel: string;
  onCreate: () => void;
  emptyTitle: string;
  emptyBody: string;
  forbiddenTitle: string;
  children: (rows: T[]) => ReactNode;
}

export function ListSurface<T extends { id: string }>({
  label,
  list,
  unit,
  placeholder,
  searchable,
  filterByStatus,
  filterByYear,
  createLabel,
  onCreate,
  emptyTitle,
  emptyBody,
  forbiddenTitle,
  children,
}: ListSurfaceProps<T>) {
  const unauthorized = list.error?.status === 401;
  const forbidden = list.error?.status === 403;
  const blocked = unauthorized || forbidden;

  return (
    <section className="surface" aria-label={label}>
      <div className="surface-head">
        <div className="toolbar">
          <div className="toolbar-filters">
            {searchable ? (
              <div className="search">
                <SearchGlyph />
                <input
                  id="policy-search"
                  className="input"
                  type="search"
                  value={list.q}
                  autoComplete="off"
                  placeholder={placeholder}
                  aria-label={`Tìm ${unit}`}
                  onChange={(event) => list.setQ(event.target.value)}
                />
                {list.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => list.setQ("")}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>
            ) : null}

            {filterByStatus ? (
              <div className="segmented" role="group" aria-label="Lọc theo trạng thái">
                {STATUS_FILTERS.map((item) => (
                  <button
                    key={item.value || "all"}
                    type="button"
                    className="segment"
                    aria-pressed={list.status === item.value}
                    onClick={() => list.setStatus(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}

            {filterByYear ? (
              <>
                <label className="sr-only" htmlFor="policy-year">
                  Lọc theo năm
                </label>
                <select
                  id="policy-year"
                  className="select"
                  value={list.year === "" ? "" : String(list.year)}
                  onChange={(event) =>
                    list.setYear(event.target.value === "" ? "" : Number(event.target.value))
                  }
                  style={{ width: 132 }}
                >
                  <option value="">Mọi năm</option>
                  {yearOptions().map((year) => (
                    <option key={year} value={year}>
                      Năm {year}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
          </div>

          <div className="toolbar-actions">
            <span className="result-count" aria-live="polite">
              {list.total.toLocaleString("vi-VN")} {unit}
              {list.filtersActive ? ` · ${list.items.length.toLocaleString("vi-VN")} dòng khớp` : ""}
              {list.refreshing ? " · đang cập nhật…" : ""}
            </span>
            <button type="button" className="btn btn-primary btn-sm" onClick={onCreate} disabled={blocked}>
              <PlusGlyph />
              {createLabel}
            </button>
          </div>
        </div>

        {list.filtersActive ? (
          <div className="row wrap items-center gap-2 px-4 pb-3">
            {list.q.trim() ? (
              <span className="chip" data-active="true">
                Từ khoá: {list.q.trim()}
                <button
                  type="button"
                  className="chip-remove"
                  aria-label="Bỏ từ khoá tìm kiếm"
                  onClick={() => list.setQ("")}
                >
                  <CloseGlyph />
                </button>
              </span>
            ) : null}
            {list.status ? (
              <span className="chip" data-active="true">
                {STATUS_LABELS[list.status]}
                <button
                  type="button"
                  className="chip-remove"
                  aria-label="Bỏ lọc trạng thái"
                  onClick={() => list.setStatus("")}
                >
                  <CloseGlyph />
                </button>
              </span>
            ) : null}
            {list.year !== "" ? (
              <span className="chip" data-active="true">
                Năm {list.year}
                <button
                  type="button"
                  className="chip-remove"
                  aria-label="Bỏ lọc năm"
                  onClick={() => list.setYear("")}
                >
                  <CloseGlyph />
                </button>
              </span>
            ) : null}
            <button type="button" className="btn btn-ghost btn-sm" onClick={list.clearFilters}>
              Xoá bộ lọc
            </button>
          </div>
        ) : null}
      </div>

      {blocked ? (
        <div className="forbidden-state" role="alert">
          <span className="empty-title">
            {unauthorized ? "Phiên đăng nhập đã hết hạn" : forbiddenTitle}
          </span>
          <p className="empty-body">
            {unauthorized
              ? "Đăng nhập lại để tiếp tục. Thay đổi chưa lưu trong biểu mẫu phía trên sẽ mất khi tải lại."
              : "Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Chính sách làm việc rồi tải lại trang."}
          </p>
          {unauthorized ? (
            <Link className="btn btn-primary" href="/tenant-system/auth">
              Đăng nhập
            </Link>
          ) : (
            <button type="button" className="btn btn-primary" onClick={list.reload}>
              Thử lại
            </button>
          )}
        </div>
      ) : list.error ? (
        <div className="error-state" role="alert">
          <span className="empty-title">Không tải được {unit}</span>
          <p className="empty-body">{list.error.message}</p>
          <button type="button" className="btn btn-primary" onClick={list.reload}>
            Thử lại
          </button>
        </div>
      ) : list.loading ? (
        <div className="surface-body stack gap-2" aria-busy="true">
          <span className="sr-only">Đang tải {unit}…</span>
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="skeleton skeleton-row" aria-hidden="true" />
          ))}
        </div>
      ) : list.total === 0 ? (
        <div className="empty-state">
          <span className="empty-title">
            {list.filtersActive ? `Không có ${unit} nào khớp bộ lọc` : emptyTitle}
          </span>
          <p className="empty-body">
            {list.filtersActive
              ? "Thử từ khoá ngắn hơn hoặc bỏ bớt bộ lọc để xem toàn bộ danh sách."
              : emptyBody}
          </p>
          {list.filtersActive ? (
            <button type="button" className="btn btn-primary" onClick={list.clearFilters}>
              Xoá bộ lọc
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onCreate}>
              <PlusGlyph />
              {createLabel}
            </button>
          )}
        </div>
      ) : (
        <div className="table-scroll">{children(list.items)}</div>
      )}

      {!blocked && !list.error && list.total > 0 ? (
        <Pagination
          page={list.page}
          pageSize={list.pageSize}
          total={list.total}
          onPage={list.setPage}
          onPageSize={list.setPageSize}
        />
      ) : null}
    </section>
  );
}

function EditButton({ onEdit }: { onEdit: () => void }) {
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
      <PencilGlyph />
      Sửa
    </button>
  );
}

function StatusToggle({
  status,
  pending,
  onToggle,
}: {
  status: Status;
  pending: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={onToggle}
      disabled={pending}
      aria-busy={pending}
    >
      {status === "ACTIVE" ? "Tạm ngưng" : "Áp dụng lại"}
    </button>
  );
}

export function HolidayTable({
  rows,
  pendingId,
  onEdit,
  onToggle,
}: {
  rows: Holiday[];
  pendingId: string | null;
  onEdit: (row: Holiday) => void;
  onToggle: (row: Holiday) => void;
}) {
  return (
    <table className="data-table">
      <caption className="sr-only">Danh sách ngày lễ, sắp xếp theo ngày tăng dần</caption>
      <thead>
        <tr>
          <th scope="col">Ngày</th>
          <th scope="col">Tên ngày lễ</th>
          <th scope="col">Hưởng lương</th>
          <th scope="col">Trạng thái</th>
          <th scope="col">Cập nhật</th>
          <th scope="col">
            <span className="sr-only">Thao tác</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="tabular">{formatDate(row.date)}</td>
            <td>
              <div className="stack gap-0.5" style={{ minWidth: 0 }}>
                <span className="cell-title">{row.name}</span>
                {row.note ? <span className="muted truncate">{row.note}</span> : null}
              </div>
            </td>
            <td>{row.paid ? <span className="badge badge-accent">Có</span> : <span className="badge">Không</span>}</td>
            <td>
              <StatusBadge status={row.status} />
            </td>
            <td className="muted tabular">{formatDateTime(row.updatedAt)}</td>
            <td>
              <div className="row gap-1 justify-end">
                <EditButton onEdit={() => onEdit(row)} />
                <StatusToggle
                  status={row.status}
                  pending={pendingId === row.id}
                  onToggle={() => onToggle(row)}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function NetworkTable({
  rows,
  pendingId,
  onEdit,
  onToggle,
}: {
  rows: Network[];
  pendingId: string | null;
  onEdit: (row: Network) => void;
  onToggle: (row: Network) => void;
}) {
  return (
    <table className="data-table">
      <caption className="sr-only">
        Danh sách mạng văn phòng được phép chấm công, sắp xếp theo trạng thái rồi tên
      </caption>
      <thead>
        <tr>
          <th scope="col">Tên mạng</th>
          <th scope="col">Dải mạng</th>
          <th scope="col">Trạng thái</th>
          <th scope="col">Cập nhật</th>
          <th scope="col">
            <span className="sr-only">Thao tác</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <div className="stack gap-0.5" style={{ minWidth: 0 }}>
                <span className="cell-title">{row.label}</span>
                {row.note ? <span className="muted truncate">{row.note}</span> : null}
              </div>
            </td>
            <td className="mono">{row.cidr}</td>
            <td>
              <StatusBadge status={row.status} />
            </td>
            <td className="muted tabular">{formatDateTime(row.updatedAt)}</td>
            <td>
              <div className="row gap-1 justify-end">
                <EditButton onEdit={() => onEdit(row)} />
                <StatusToggle
                  status={row.status}
                  pending={pendingId === row.id}
                  onToggle={() => onToggle(row)}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function QuotaTable({
  rows,
  onEdit,
}: {
  rows: Quota[];
  onEdit: (row: Quota) => void;
}) {
  return (
    <table className="data-table">
      <caption className="sr-only">Hạn mức phép theo năm, mới nhất trước</caption>
      <thead>
        <tr>
          <th scope="col">Năm</th>
          <th scope="col">Ngày phép/năm</th>
          <th scope="col">Mang sang tối đa</th>
          <th scope="col">Ghi chú</th>
          <th scope="col">Cập nhật</th>
          <th scope="col">
            <span className="sr-only">Thao tác</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="tabular">{row.year}</td>
            <td className="tabular">{row.daysPerYear.toLocaleString("vi-VN")} ngày</td>
            <td className="tabular">{row.maxCarryOverDays.toLocaleString("vi-VN")} ngày</td>
            <td className="muted truncate">{row.note || "—"}</td>
            <td className="muted tabular">{formatDateTime(row.updatedAt)}</td>
            <td>
              <div className="row gap-1 justify-end">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEdit(row)}>
                  <PencilGlyph />
                  Sửa
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Signed-out or missing grant on the singleton policy; the tables have the same states. */
export function PolicyUnavailable({ error, onRetry }: { error: { status: number; message: string }; onRetry: () => void }) {
  if (error.status === 401) {
    return (
      <div className="forbidden-state" role="alert">
        <span className="empty-title">Phiên đăng nhập đã hết hạn</span>
        <p className="empty-body">Đăng nhập lại để xem chính sách làm việc.</p>
        <Link className="btn btn-primary" href="/tenant-system/auth">
          Đăng nhập
        </Link>
      </div>
    );
  }
  if (error.status === 403) {
    return (
      <div className="forbidden-state" role="alert">
        <span className="empty-title">Bạn chưa được cấp quyền xem chính sách</span>
        <p className="empty-body">
          Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Chính sách làm việc rồi tải lại trang.
        </p>
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Thử lại
        </button>
      </div>
    );
  }
  return (
    <div className="error-state" role="alert">
      <AlertGlyph />
      <span className="empty-title">Không tải được chính sách làm việc</span>
      <p className="empty-body">{error.message}</p>
      <button type="button" className="btn btn-primary" onClick={onRetry}>
        Thử lại
      </button>
    </div>
  );
}

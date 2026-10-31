"use client";

import { useMemo, useState } from "react";
import {
  EXPLANATION_DEADLINE_WORKDAYS,
  EXPORT_FILE_PREFIX,
  STATUS_HINT,
  STATUS_LABEL,
  STATUS_TONE,
  TYPE_LABEL,
} from "../constants";
import {
  deadlineFor,
  downloadCsv,
  formatClock,
  formatDate,
  formatDateTime,
  isPastDeadline,
  todayIso,
} from "../format";
import { useExplanations } from "../hooks/use-explanations";
import {
  EXPLANATION_STATUSES,
  EXPLANATION_TYPES,
  type Explanation,
  type ExplanationStatus,
  type ExplanationType,
} from "../types";
import { ConfirmDialog, DecisionDialog } from "./decision-dialog";
import { ExplanationDialog } from "./explanation-form";
import {
  BanGlyph,
  CheckGlyph,
  CloseGlyph,
  DownloadGlyph,
  Pagination,
  PlusGlyph,
  RefreshGlyph,
  SearchGlyph,
  Sheet,
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

type SortKey = "employeeName" | "workDate" | "status";

const STATUS_RANK = (status: ExplanationStatus): number => EXPLANATION_STATUSES.indexOf(status);

export function ExplanationsPage() {
  const list = useExplanations();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "workDate",
    dir: "desc",
  });
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<Explanation | null>(null);
  const [deciding, setDeciding] = useState<Explanation | null>(null);
  const [cancelling, setCancelling] = useState<Explanation | null>(null);
  const [reading, setReading] = useState<Explanation | null>(null);

  const rows = useMemo(() => {
    const withOverride = list.data.items.map((record) => {
      const next = list.optimistic[record.id];
      return next ? { ...record, status: next } : record;
    });
    const factor = sort.dir === "asc" ? 1 : -1;
    const value = (record: Explanation): number | string => {
      if (sort.key === "status") return STATUS_RANK(record.status);
      if (sort.key === "workDate") return record.workDate;
      return record.employeeName;
    };
    return [...withOverride].sort((left, right) => {
      const a = value(left);
      const b = value(right);
      if (typeof a === "number" && typeof b === "number") return factor * (a - b);
      return factor * String(a).localeCompare(String(b), "vi");
    });
  }, [list.data.items, list.optimistic, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  const readingFresh = reading ? list.data.items.find((item) => item.id === reading.id) : undefined;

  const forbidden = list.error?.status === 403;
  const isEmployee = list.permission?.role === "EMPLOYEE";
  const canDecide = !isEmployee && list.can("approve");

  const exportRows = () => {
    const header = [
      "Nhân sự",
      "Mã nhân sự",
      "Ngày công",
      "Kiểu giải trình",
      "Giờ vào đề nghị",
      "Giờ ra đề nghị",
      "Trạng thái",
      "Người quyết định",
      "Ghi chú quyết định",
      "Giải trình",
    ];
    const body = rows.map((record) => [
      record.employeeName,
      record.employeeId,
      formatDate(record.workDate),
      TYPE_LABEL[record.type],
      formatClock(record.requestedCheckIn),
      formatClock(record.requestedCheckOut),
      STATUS_LABEL[record.status],
      record.decidedBy,
      record.decisionNote,
      record.reason,
    ]);
    downloadCsv(`${EXPORT_FILE_PREFIX}-${todayIso()}.csv`, [header, ...body]);
    list.setFeedback({
      tone: "info",
      message: `Đã xuất ${rows.length} dòng đang hiển thị ra tệp CSV.`,
    });
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Nhân sự · Chấm công</p>
          <h1>Giải trình chấm công</h1>
          <p className="page-lede">
            Nhân sự gửi yêu cầu bổ sung hoặc sửa giờ vào – giờ ra; quản lý duyệt hoặc từ chối
            kèm lý do. Đơn đã xử lý không sửa được, chỉ còn trong lịch sử để đối chiếu.
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
            onClick={list.reload}
            title="Tải lại danh sách giải trình"
          >
            <RefreshGlyph /> Tải lại
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setComposing(true)}
            disabled={!list.can("create")}
            title={
              list.can("create")
                ? "Gửi đơn giải trình mới"
                : "Bạn không có quyền gửi đơn giải trình"
            }
          >
            <PlusGlyph /> Gửi giải trình
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Số đơn giải trình theo trạng thái">
        {EXPLANATION_STATUSES.map((status) => (
          <div className="metric" key={status}>
            <span className="metric-value tabular">
              {(list.totals[status] ?? 0).toLocaleString("vi-VN")}
            </span>
            <span className="metric-label">{STATUS_LABEL[status]}</span>
            <span className="metric-note">{STATUS_HINT[status]}</span>
          </div>
        ))}
      </section>

      {list.feedback ? (
        <div className={ALERT_TONE[list.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{list.feedback.message}</span>
            {list.feedback.hint ? <span className="muted">{list.feedback.hint}</span> : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => list.setFeedback(null)}
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
                  id="explanations-search"
                  className="input"
                  type="search"
                  value={list.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo tên nhân sự hoặc nội dung…"
                  aria-label="Tìm đơn giải trình theo tên hoặc nội dung"
                  onChange={(event) => list.patchQuery({ q: event.target.value, page: 1 })}
                />
                {list.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => list.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={list.query.status ?? ""}
                aria-label="Lọc theo trạng thái đơn"
                onChange={(event) =>
                  list.patchQuery({
                    status: event.target.value as ExplanationStatus | "",
                    page: 1,
                  })
                }
                style={{ width: 176 }}
              >
                <option value="">Mọi trạng thái</option>
                {EXPLANATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>

              <select
                className="select"
                value={list.query.type ?? ""}
                aria-label="Lọc theo kiểu giải trình"
                onChange={(event) =>
                  list.patchQuery({ type: event.target.value as ExplanationType | "", page: 1 })
                }
                style={{ width: 190 }}
              >
                <option value="">Mọi kiểu</option>
                {EXPLANATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABEL[type]}
                  </option>
                ))}
              </select>

              <div className="row items-center gap-2">
                <label className="muted" htmlFor="explanations-from">
                  Từ ngày
                </label>
                <input
                  id="explanations-from"
                  className="input"
                  type="date"
                  value={list.query.from ?? ""}
                  max={list.query.to || todayIso()}
                  onChange={(event) => list.patchQuery({ from: event.target.value, page: 1 })}
                  style={{ width: 148 }}
                />
                <label className="muted" htmlFor="explanations-to">
                  đến
                </label>
                <input
                  id="explanations-to"
                  className="input"
                  type="date"
                  value={list.query.to ?? ""}
                  min={list.query.from || undefined}
                  max={todayIso()}
                  onChange={(event) => list.patchQuery({ to: event.target.value, page: 1 })}
                  style={{ width: 148 }}
                />
              </div>
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {list.data.total.toLocaleString("vi-VN")} đơn
              </span>
              {!isEmployee && list.me ? (
                <div className="segmented" role="group" aria-label="Phạm vi đơn hiển thị">
                  <button
                    type="button"
                    className="segment"
                    aria-pressed={list.scope === "all"}
                    onClick={() => list.setScope("all")}
                  >
                    Toàn bộ
                  </button>
                  <button
                    type="button"
                    className="segment"
                    aria-pressed={list.scope === "mine"}
                    onClick={() => list.setScope("mine")}
                  >
                    Của tôi
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {list.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {list.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{list.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => list.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {list.query.status ? (
                <span className="chip" data-active="true">
                  {STATUS_LABEL[list.query.status]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => list.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {list.query.type ? (
                <span className="chip" data-active="true">
                  {TYPE_LABEL[list.query.type]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => list.patchQuery({ type: "", page: 1 })}
                    aria-label="Bỏ lọc kiểu giải trình"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {list.query.from ? (
                <span className="chip" data-active="true">
                  Từ <span className="tabular">{formatDate(list.query.from)}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => list.patchQuery({ from: "", page: 1 })}
                    aria-label="Bỏ mốc ngày bắt đầu"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {list.query.to ? (
                <span className="chip" data-active="true">
                  Đến <span className="tabular">{formatDate(list.query.to)}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => list.patchQuery({ to: "", page: 1 })}
                    aria-label="Bỏ mốc ngày kết thúc"
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

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem đơn giải trình</span>
            <p className="empty-body">
              Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Giải trình chấm công rồi tải
              lại trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={list.reload}>
              Tải lại
            </button>
          </div>
        ) : list.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được danh sách giải trình</span>
            <p className="empty-body">{list.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={list.reload}>
              Thử lại
            </button>
          </div>
        ) : !list.loading && rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {list.filtersActive ? "Không có đơn nào khớp bộ lọc" : "Chưa có đơn giải trình nào"}
            </span>
            <p className="empty-body">
              {list.filtersActive
                ? "Bỏ một vài điều kiện lọc để xem toàn bộ đơn trong kỳ."
                : "Khi quên chấm công hoặc chấm sai giờ, gửi giải trình trong vòng ba ngày làm việc để quản lý điều chỉnh."}
            </p>
            {list.filtersActive ? (
              <button type="button" className="btn btn-ghost" onClick={list.clearFilters}>
                Xoá bộ lọc
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setComposing(true)}
                disabled={!list.can("create")}
              >
                <PlusGlyph /> Gửi giải trình
              </button>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">
                Danh sách đơn giải trình chấm công, sắp xếp theo cột đang chọn trong trang hiện
                tại.
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
                      sort.key === "workDate"
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <SortButton
                      label="Ngày công"
                      active={sort.key === "workDate"}
                      direction={sort.dir}
                      onClick={() => toggleSort("workDate")}
                    />
                  </th>
                  <th scope="col">Kiểu</th>
                  <th scope="col">Giờ đề nghị</th>
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
                  <th scope="col">Quyết định</th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              {list.loading ? (
                <SkeletonRows rows={Math.min(8, Math.max(3, rows.length || 6))} columns={7} />
              ) : (
                <tbody>
                  {rows.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <div className="stack gap-1">
                          <span className="cell-title">{record.employeeName}</span>
                          <span className="muted mono">{record.employeeId}</span>
                        </div>
                      </td>
                      <td className="tabular">{formatDate(record.workDate)}</td>
                      <td>{TYPE_LABEL[record.type]}</td>
                      <td className="tabular">
                        {record.requestedCheckIn || record.requestedCheckOut ? (
                          <>
                            {formatClock(record.requestedCheckIn)} →{" "}
                            {formatClock(record.requestedCheckOut)}
                          </>
                        ) : (
                          <span className="subtle">Không đề nghị giờ</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge
                          label={STATUS_LABEL[record.status]}
                          tone={STATUS_TONE[record.status]}
                        />
                      </td>
                      <td>
                        {record.status === "PENDING" ? (
                          <span className="subtle">Chưa xử lý</span>
                        ) : (
                          <div className="stack gap-1">
                            <span>{record.decidedBy || "—"}</span>
                            <span className="muted tabular">
                              {formatDateTime(record.decidedAt)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="row wrap justify-end gap-2">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setReading(record)}
                          >
                            Xem
                          </button>
                          {record.status === "PENDING" && list.can("update") ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setEditing(record)}
                            >
                              Sửa
                            </button>
                          ) : null}
                          {record.status === "PENDING" && canDecide ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => setDeciding(record)}
                              disabled={list.savingId === record.id}
                            >
                              <CheckGlyph /> Xử lý
                            </button>
                          ) : null}
                          {record.status === "PENDING" && list.can("update") ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setCancelling(record)}
                              disabled={list.savingId === record.id}
                              aria-label={`Huỷ đơn của ${record.employeeName} ngày ${formatDate(
                                record.workDate,
                              )}`}
                            >
                              <BanGlyph /> Huỷ
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

        {!forbidden && !list.error && rows.length > 0 ? (
          <Pagination
            page={list.query.page}
            pageSize={list.query.pageSize}
            total={list.data.total}
            onPage={(page) => list.patchQuery({ page })}
            onPageSize={(pageSize) => list.patchQuery({ pageSize, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Sắp xếp áp dụng cho trang đang tải; máy chủ luôn trả về theo ngày công giảm dần. Hạn gửi
        giải trình là {EXPLANATION_DEADLINE_WORKDAYS} ngày làm việc sau ngày công. Dữ liệu giải
        trình chưa có trường tệp đính kèm và chưa có cờ nộp muộn / vượt hạn mức, nên màn hình
        không hiển thị hai thông tin đó.
      </p>

      {composing ? (
        <ExplanationDialog
          me={list.me}
          onSubmit={list.submit}
          onClose={() => setComposing(false)}
        />
      ) : null}

      {editing ? (
        <ExplanationDialog
          record={editing}
          me={list.me}
          onSubmit={list.submit}
          onPatch={list.patch}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {deciding ? (
        <DecisionDialog
          record={deciding}
          busy={list.savingId === deciding.id}
          onDecide={(input) => list.decide(deciding, input)}
          onClose={() => setDeciding(null)}
        />
      ) : null}

      {cancelling ? (
        <ConfirmDialog
          title="Huỷ đơn giải trình"
          body={`Đơn ngày ${formatDate(cancelling.workDate)} của ${
            cancelling.employeeName
          } sẽ chuyển sang trạng thái đã huỷ.`}
          confirmLabel="Huỷ đơn"
          busy={list.savingId === cancelling.id}
          onConfirm={() => list.cancel(cancelling)}
          onClose={() => setCancelling(null)}
        />
      ) : null}

      {readingFresh ? (
        <Sheet
          title="Chi tiết đơn giải trình"
          onClose={() => setReading(null)}
          footer={
            <button type="button" className="btn btn-ghost" onClick={() => setReading(null)}>
              Đóng
            </button>
          }
        >
          <div className="stack gap-3">
            <div className="spread wrap items-center gap-2">
              <div className="stack gap-1">
                <strong>{readingFresh.employeeName}</strong>
                <span className="muted mono">{readingFresh.employeeId}</span>
              </div>
              <StatusBadge
                label={STATUS_LABEL[readingFresh.status]}
                tone={STATUS_TONE[readingFresh.status]}
              />
            </div>

            <dl className="stack gap-2">
              <div className="spread gap-2">
                <dt className="muted">Ngày công</dt>
                <dd className="tabular" style={{ margin: 0 }}>
                  {formatDate(readingFresh.workDate)}
                </dd>
              </div>
              <div className="spread gap-2">
                <dt className="muted">Kiểu giải trình</dt>
                <dd style={{ margin: 0 }}>{TYPE_LABEL[readingFresh.type]}</dd>
              </div>
              <div className="spread gap-2">
                <dt className="muted">Giờ vào đề nghị</dt>
                <dd className="tabular" style={{ margin: 0 }}>
                  {formatClock(readingFresh.requestedCheckIn)}
                </dd>
              </div>
              <div className="spread gap-2">
                <dt className="muted">Giờ ra đề nghị</dt>
                <dd className="tabular" style={{ margin: 0 }}>
                  {formatClock(readingFresh.requestedCheckOut)}
                </dd>
              </div>
              <div className="spread gap-2">
                <dt className="muted">Gửi lúc</dt>
                <dd className="tabular" style={{ margin: 0 }}>
                  {formatDateTime(readingFresh.createdAt)}
                </dd>
              </div>
              <div className="spread gap-2">
                <dt className="muted">Hạn nộp theo quy định</dt>
                <dd style={{ margin: 0 }}>
                  <span className="tabular">
                    {formatDate(deadlineFor(readingFresh.workDate, EXPLANATION_DEADLINE_WORKDAYS))}
                  </span>
                  {isPastDeadline(readingFresh.workDate, EXPLANATION_DEADLINE_WORKDAYS) ? (
                    <span className="deadline deadline-danger"> · đã quá hạn</span>
                  ) : null}
                </dd>
              </div>
            </dl>

            <div className="divider" />

            <div className="stack gap-1">
              <span className="field-label">Nội dung giải trình</span>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{readingFresh.reason}</p>
            </div>

            <div className="divider" />

            <div className="stack gap-1">
              <span className="field-label">Quyết định</span>
              {readingFresh.status === "PENDING" ? (
                <p className="muted" style={{ margin: 0 }}>
                  Đơn đang chờ duyệt, chưa có người quyết định.
                </p>
              ) : (
                <div className="stack gap-1">
                  <span>
                    {readingFresh.decidedBy || "—"} ·{" "}
                    <span className="tabular">{formatDateTime(readingFresh.decidedAt)}</span>
                  </span>
                  <span className="muted">
                    {readingFresh.decisionNote || "Không để lại ghi chú."}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Sheet>
      ) : null}

      {list.savingId ? (
        <p className="sr-only" role="status" aria-live="polite">
          Đang gửi quyết định cho đơn giải trình.
        </p>
      ) : null}
    </div>
  );
}

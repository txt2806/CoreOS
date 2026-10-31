"use client";

import { useEffect, useMemo, useState } from "react";
import { KanbanBoard, type BoardMove, type BoardTask } from "../../kanban";
import { allowedMap, transitionTask } from "../api/client";
import { EXPORT_FILE_PREFIX } from "../constants";
import { downloadCsv, formatDate, today } from "../format";
import { useTasks, type Feedback } from "../hooks/use-tasks";
import { TASK_STATUSES, type Task } from "../types";
import { CreateTaskDialog } from "./create-dialog";
import { TaskDetailSheet } from "./detail-sheet";
import {
  CloseGlyph,
  Confirm,
  DownloadGlyph,
  Pagination,
  PlusGlyph,
  SearchGlyph,
} from "./primitives";
import {
  ALL_COLUMNS,
  COLUMN_LABELS,
  OPTIONAL_COLUMNS,
  TaskTable,
  nextSort,
  sortTasks,
  type ColumnKey,
  type SortState,
} from "./table";

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

export function TasksPage({ initialView = "table" }: { initialView?: "table" | "board" }) {
  const tasks = useTasks();
  const [view, setView] = useState<"table" | "board">(initialView);
  const [sort, setSort] = useState<SortState>({ key: "date", dir: "asc" });
  const [hidden, setHidden] = useState<ColumnKey[]>(["reviewer"]);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [askBulk, setAskBulk] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [moves, setMoves] = useState<Record<string, BoardMove[]>>({});
  const [pendingMove, setPendingMove] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, string>>({});

  const rows = useMemo(() => sortTasks(tasks.data.items, sort), [tasks.data.items, sort]);

  /* The reload that follows a move carries the real status; drop the guess. */
  useEffect(() => setOptimistic({}), [tasks.data]);

  useEffect(() => {
    if (view !== "board") return;
    let cancelled = false;
    allowedMap(tasks.data.items.map((task) => task.id))
      .then((map) => {
        if (!cancelled) setMoves(map);
      })
      .catch(() => {
        /* Without the rules the board stays read-only instead of guessing. */
        if (!cancelled) setMoves({});
      });
    return () => {
      cancelled = true;
    };
  }, [view, tasks.data.items]);

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

  const changeView = (next: "table" | "board") => {
    setView(next);
    if (next === "board" && tasks.query.pageSize < 100)
      tasks.patchQuery({ page: 1, pageSize: 100 });
  };

  const toggleColumn = (key: ColumnKey) => {
    setHidden((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  const toggleRow = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleAll = () => {
    setSelected((current) =>
      current.length === rows.length ? [] : rows.map((task) => task.id),
    );
  };

  const selectedTasks = rows.filter((task) => selected.includes(task.id));

  const exportRows = (list: Task[]) => {
    const header = [
      "Mã",
      "Tên",
      "Phạm vi",
      "Trạng thái",
      "Ưu tiên",
      "Phụ trách",
      "Kiểm tra",
      "Hạn",
      "Tiến độ",
      "Dự án",
      "Nhãn",
      "Cập nhật",
    ];
    const body = list.map((task) => [
      task.code,
      task.name,
      task.scope,
      task.status,
      task.fields.priority ?? "",
      task.assignee,
      task.reviewer,
      formatDate(task.date),
      typeof task.fields.progress === "number" ? `${task.fields.progress}%` : "",
      task.fields.project ?? "",
      task.fields.tags ?? "",
      formatDate(task.updatedAt),
    ]);
    downloadCsv(`${EXPORT_FILE_PREFIX}-${today()}.csv`, [header, ...body]);
    tasks.setFeedback({
      tone: "info",
      message: `Đã xuất ${list.length} dòng ra tệp CSV.`,
    });
  };

  const move = async (task: BoardTask, to: string) => {
    setPendingMove(task.id);
    setOptimistic((current) => ({ ...current, [task.id]: to }));
    try {
      await transitionTask(task.id, { toStatus: to, version: task.version });
      tasks.setFeedback({
        tone: "success",
        message: `${task.code} đã chuyển sang “${to}”.`,
      });
      tasks.reload();
    } catch (caught) {
      setOptimistic((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
      tasks.setFeedback({
        tone: "error",
        message: caught instanceof Error ? caught.message : "Chưa chuyển được trạng thái.",
        hint: "Thẻ đã trở về trạng thái trước đó. Mở chi tiết để xem bước nào được phép.",
      });
    } finally {
      setPendingMove(null);
    }
  };

  const confirmBulk = async () => {
    setBulkBusy(true);
    await tasks.bulkRemove(selectedTasks);
    setSelected([]);
    setAskBulk(false);
    setBulkBusy(false);
  };

  const detail = openId ? (tasks.data.items.find((task) => task.id === openId) ?? null) : null;
  const total = tasks.data.total;
  const sums = Object.values(tasks.totals);
  const all = sums.reduce((sum, value) => sum + value, 0);
  const forbidden = tasks.error?.status === 403;

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Điều phối công việc</p>
          <h1>Công việc</h1>
          <p className="page-lede">
            Theo dõi việc đang mở, ai phụ trách và việc nào sắp trễ. Trạng thái chỉ đổi
            qua luồng công việc để giữ lịch sử chuyển bước.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => exportRows(rows)}
            disabled={rows.length === 0}
            title="Xuất các dòng đang hiển thị ra CSV"
          >
            <DownloadGlyph /> Xuất CSV
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreating(true)}
            disabled={!tasks.can("create")}
            title={
              tasks.can("create")
                ? "Tạo công việc mới"
                : "Bạn không có quyền tạo công việc"
            }
          >
            <PlusGlyph /> Tạo công việc
          </button>
        </div>
      </header>

      {sums.length > 0 ? (
        <section className="metric-strip" aria-label="Số lượng công việc theo trạng thái">
          <div className="metric">
            <span className="metric-value tabular">{tasks.totals.todo ?? 0}</span>
            <span className="metric-label">Cần làm</span>
            <span className="metric-note">{share(tasks.totals.todo ?? 0, all)}</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{tasks.totals.doing ?? 0}</span>
            <span className="metric-label">Đang làm</span>
            <span className="metric-note">{share(tasks.totals.doing ?? 0, all)}</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{tasks.totals.review ?? 0}</span>
            <span className="metric-label">Chờ kiểm tra</span>
            <span className="metric-note">cần người nghiệm thu</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{tasks.totals.done ?? 0}</span>
            <span className="metric-label">Hoàn thành</span>
            <span className="metric-note">{share(tasks.totals.done ?? 0, all)}</span>
          </div>
        </section>
      ) : null}

      {tasks.feedback ? (
        <div className={ALERT_TONE[tasks.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{tasks.feedback.message}</span>
            {tasks.feedback.hint ? (
              <span className="muted">{tasks.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => tasks.setFeedback(null)}
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
                  id="task-search"
                  className="input"
                  type="search"
                  value={tasks.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo mã, tên, phạm vi…"
                  aria-label="Tìm công việc"
                  onChange={(event) =>
                    tasks.patchQuery({ q: event.target.value, page: 1 })
                  }
                />
                {tasks.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => tasks.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={tasks.query.status ?? ""}
                aria-label="Lọc theo trạng thái"
                onChange={(event) =>
                  tasks.patchQuery({
                    status: event.target.value as Task["status"] | "",
                    page: 1,
                  })
                }
                style={{ width: 176 }}
              >
                <option value="">Mọi trạng thái</option>
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

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
                    <button
                      type="button"
                      className="menu-item"
                      onClick={() => setHidden([])}
                    >
                      Hiện tất cả {ALL_COLUMNS.length} cột
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {total.toLocaleString("vi-VN")} công việc
                {tasks.filtersActive ? ` · ${rows.length} dòng khớp` : ""}
              </span>
              <div className="segmented" role="group" aria-label="Kiểu hiển thị">
                <button
                  type="button"
                  className="segment"
                  aria-pressed={view === "table"}
                  onClick={() => changeView("table")}
                >
                  Bảng
                </button>
                <button
                  type="button"
                  className="segment"
                  aria-pressed={view === "board"}
                  onClick={() => changeView("board")}
                >
                  Kanban
                </button>
              </div>
            </div>
          </div>

          {tasks.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {tasks.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{tasks.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => tasks.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {tasks.query.status ? (
                <span className="chip" data-active="true">
                  Trạng thái: {tasks.query.status}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => tasks.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={tasks.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {selected.length > 0 ? (
          <div className="bulk-bar" role="region" aria-label="Thao tác với dòng đã chọn">
            <strong className="tabular">{selected.length} dòng đã chọn</strong>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => exportRows(selectedTasks)}
            >
              <DownloadGlyph /> Xuất đã chọn
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setAskBulk(true)}
              disabled={!tasks.can("delete")}
              title={
                tasks.can("delete")
                  ? "Xoá các dòng đã chọn"
                  : "Bạn không có quyền xoá công việc"
              }
            >
              Xoá đã chọn
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelected([])}
              style={{ marginLeft: "auto" }}
            >
              Bỏ chọn
            </button>
          </div>
        ) : null}

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem công việc</span>
            <p className="empty-body">
              Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Công việc rồi tải lại
              trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={tasks.reload}>
              Tải lại
            </button>
          </div>
        ) : tasks.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được danh sách công việc</span>
            <p className="empty-body">{tasks.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={tasks.reload}>
              Thử lại
            </button>
          </div>
        ) : !tasks.loading && rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {tasks.filtersActive
                ? "Không có công việc nào khớp bộ lọc"
                : "Chưa có công việc nào"}
            </span>
            <p className="empty-body">
              {tasks.filtersActive
                ? "Thử bỏ một vài điều kiện, hoặc xoá hết bộ lọc để xem toàn bộ danh sách."
                : "Tạo công việc đầu tiên để cả nhóm thấy việc đang mở và ai đang phụ trách."}
            </p>
            {tasks.filtersActive ? (
              <button type="button" className="btn btn-ghost" onClick={tasks.clearFilters}>
                Xoá bộ lọc
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCreating(true)}
                disabled={!tasks.can("create")}
              >
                <PlusGlyph /> Tạo công việc
              </button>
            )}
          </div>
        ) : view === "table" ? (
          <TaskTable
            tasks={rows}
            loading={tasks.loading}
            sort={sort}
            onSort={(key) => setSort((current) => nextSort(current, key))}
            hidden={hidden}
            selected={selected}
            onSelect={toggleRow}
            onSelectAll={toggleAll}
            onOpen={(task) => setOpenId(task.id)}
          />
        ) : (
          <div className="surface-body">
            <KanbanBoard
              tasks={rows.map((task) => {
                const moving = optimistic[task.id];
                return moving ? { ...task, status: moving } : task;
              })}
              allowed={moves}
              pendingId={pendingMove}
              onMove={move}
              onOpen={(task) => setOpenId(task.id)}
            />
          </div>
        )}

        {!forbidden && !tasks.error && rows.length > 0 ? (
          <Pagination
            page={tasks.query.page}
            pageSize={tasks.query.pageSize}
            total={total}
            onPage={(page) => tasks.patchQuery({ page })}
            onPageSize={(pageSize) => tasks.patchQuery({ pageSize, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Sắp xếp áp dụng cho các dòng đang tải trên trang này. Kanban hiển thị tối đa 100
        công việc gần nhất theo bộ lọc hiện tại.
      </p>

      {askBulk ? (
        <Confirm
          title={`Xoá ${selectedTasks.length} công việc đã chọn?`}
          body="Hành động này không khôi phục được từ giao diện. Lịch sử chuyển trạng thái của từng công việc vẫn được giữ cho kiểm toán."
          confirmLabel="Xoá vĩnh viễn"
          busy={bulkBusy}
          onConfirm={confirmBulk}
          onClose={() => setAskBulk(false)}
        />
      ) : null}

      {creating ? (
        <CreateTaskDialog onCreate={tasks.create} onClose={() => setCreating(false)} />
      ) : null}

      {detail ? (
        <TaskDetailSheet
          task={detail}
          canUpdate={tasks.can("update")}
          canDelete={tasks.can("delete")}
          canComment={tasks.canComment}
          onSave={(values) => tasks.patch(detail.id, { ...values, version: detail.version })}
          onDelete={() => tasks.remove(detail)}
          onChanged={tasks.reload}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

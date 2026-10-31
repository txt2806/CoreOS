"use client";

import { useEffect, useMemo, useState } from "react";
import { EXPORT_FILE_PREFIX } from "../constants";
import { downloadCsv, formatDate, today } from "../format";
import { useProjects, type Feedback } from "../hooks/use-projects";
import { PROJECT_STATUSES, type Project } from "../types";
import { CreateProjectDialog } from "./create-dialog";
import { ProjectDetailSheet } from "./detail-sheet";
import {
  CloseGlyph,
  DownloadGlyph,
  Pagination,
  PlusGlyph,
  ProgressCell,
  SearchGlyph,
  StatusBadge,
} from "./primitives";
import {
  ALL_COLUMNS,
  COLUMN_LABELS,
  OPTIONAL_COLUMNS,
  ProjectTable,
  nextSort,
  sortProjects,
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

export function ProjectSpacesPage() {
  const projects = useProjects();
  const [view, setView] = useState<"table" | "cards">("table");
  const [sort, setSort] = useState<SortState>({ key: "date", dir: "asc" });
  const [hidden, setHidden] = useState<ColumnKey[]>(["members"]);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(
    () => sortProjects(projects.data.items, sort),
    [projects.data.items, sort],
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

  const exportRows = (list: Project[]) => {
    const header = [
      "Mã",
      "Dự án",
      "Phạm vi",
      "Trạng thái",
      "Quản lý",
      "Mốc thời gian",
      "Tiến độ",
      "Nhóm",
      "Thành viên",
      "Cập nhật",
    ];
    const body = list.map((project) => [
      project.code,
      project.name,
      project.scope,
      project.status,
      project.assignee,
      formatDate(project.date),
      typeof project.fields.progress === "number" ? `${project.fields.progress}%` : "",
      project.fields.team ?? "",
      project.fields.members ?? "",
      formatDate(project.updatedAt),
    ]);
    downloadCsv(`${EXPORT_FILE_PREFIX}-${today()}.csv`, [header, ...body]);
    projects.setFeedback({
      tone: "info",
      message: `Đã xuất ${list.length} dòng ra tệp CSV.`,
    });
  };

  const detail = openId
    ? (projects.data.items.find((project) => project.id === openId) ?? null)
    : null;
  const total = projects.data.total;
  const sums = Object.values(projects.totals);
  const all = sums.reduce((sum, value) => sum + value, 0);
  const forbidden = projects.error?.status === 403;

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Quản lý dự án</p>
          <h1>Không gian dự án</h1>
          <p className="page-lede">
            Mỗi dự án gắn một quản lý, một nhóm và các sprint có cam kết điểm. Trạng thái
            dự án phản ánh giai đoạn thực tế, không phải mức ưu tiên.
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
            disabled={!projects.can("create")}
            title={
              projects.can("create")
                ? "Tạo dự án mới"
                : "Bạn không có quyền tạo dự án"
            }
          >
            <PlusGlyph /> Tạo dự án
          </button>
        </div>
      </header>

      {sums.length > 0 ? (
        <section className="metric-strip" aria-label="Số lượng dự án theo trạng thái">
          <div className="metric">
            <span className="metric-value tabular">
              {(projects.totals["Lên kế hoạch"] ?? 0).toLocaleString("vi-VN")}
            </span>
            <span className="metric-label">Lên kế hoạch</span>
            <span className="metric-note">
              {share(projects.totals["Lên kế hoạch"] ?? 0, all)}
            </span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">
              {(projects.totals["Đang triển khai"] ?? 0).toLocaleString("vi-VN")}
            </span>
            <span className="metric-label">Đang triển khai</span>
            <span className="metric-note">
              {share(projects.totals["Đang triển khai"] ?? 0, all)}
            </span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">
              {(projects.totals["Tạm dừng"] ?? 0).toLocaleString("vi-VN")}
            </span>
            <span className="metric-label">Tạm dừng</span>
            <span className="metric-note">
              {(projects.totals["Tạm dừng"] ?? 0) > 0
                ? "cần rà soát nguồn lực"
                : "không có dự án treo"}
            </span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">
              {(projects.totals["Hoàn thành"] ?? 0).toLocaleString("vi-VN")}
            </span>
            <span className="metric-label">Hoàn thành</span>
            <span className="metric-note">
              {share(projects.totals["Hoàn thành"] ?? 0, all)}
            </span>
          </div>
        </section>
      ) : null}

      {projects.feedback ? (
        <div className={ALERT_TONE[projects.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{projects.feedback.message}</span>
            {projects.feedback.hint ? (
              <span className="muted">{projects.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => projects.setFeedback(null)}
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
                  id="project-search"
                  className="input"
                  type="search"
                  value={projects.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo mã, tên, phạm vi…"
                  aria-label="Tìm dự án"
                  onChange={(event) =>
                    projects.patchQuery({ q: event.target.value, page: 1 })
                  }
                />
                {projects.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => projects.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={projects.query.status ?? ""}
                aria-label="Lọc theo trạng thái"
                onChange={(event) =>
                  projects.patchQuery({
                    status: event.target.value as Project["status"] | "",
                    page: 1,
                  })
                }
                style={{ width: 176 }}
              >
                <option value="">Mọi trạng thái</option>
                {PROJECT_STATUSES.map((status) => (
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
                {total.toLocaleString("vi-VN")} dự án
                {projects.filtersActive ? ` · ${rows.length} dòng khớp` : ""}
              </span>
              <div className="segmented" role="group" aria-label="Kiểu hiển thị">
                <button
                  type="button"
                  className="segment"
                  aria-pressed={view === "table"}
                  onClick={() => setView("table")}
                >
                  Bảng
                </button>
                <button
                  type="button"
                  className="segment"
                  aria-pressed={view === "cards"}
                  onClick={() => setView("cards")}
                >
                  Thẻ
                </button>
              </div>
            </div>
          </div>

          {projects.filtersActive ? (
            <div
              className="row wrap items-center gap-2"
              style={{ paddingTop: "var(--space-3)" }}
            >
              {projects.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{projects.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => projects.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {projects.query.status ? (
                <span className="chip" data-active="true">
                  Trạng thái: {projects.query.status}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => projects.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={projects.clearFilters}
              >
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem dự án</span>
            <p className="empty-body">
              Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Không gian dự án rồi
              tải lại trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={projects.reload}>
              Tải lại
            </button>
          </div>
        ) : projects.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được danh sách dự án</span>
            <p className="empty-body">{projects.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={projects.reload}>
              Thử lại
            </button>
          </div>
        ) : !projects.loading && rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {projects.filtersActive
                ? "Không có dự án nào khớp bộ lọc"
                : "Chưa có dự án nào"}
            </span>
            <p className="empty-body">
              {projects.filtersActive
                ? "Thử bỏ một vài điều kiện, hoặc xoá hết bộ lọc để xem toàn bộ danh sách."
                : "Tạo dự án đầu tiên để gắn quản lý, nhóm và các sprint có cam kết điểm."}
            </p>
            {projects.filtersActive ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={projects.clearFilters}
              >
                Xoá bộ lọc
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCreating(true)}
                disabled={!projects.can("create")}
              >
                <PlusGlyph /> Tạo dự án
              </button>
            )}
          </div>
        ) : view === "table" ? (
          <ProjectTable
            projects={rows}
            loading={projects.loading}
            sort={sort}
            onSort={(key) => setSort((current) => nextSort(current, key))}
            hidden={hidden}
            onOpen={(project) => setOpenId(project.id)}
          />
        ) : (
          <div className="surface-body">
            <div className="bento">
              {rows.map((project) => (
                <article key={project.id} className="widget bento-4">
                  <div className="widget-head">
                    <div className="stack gap-1" style={{ minWidth: 0 }}>
                      <span className="eyebrow mono">{project.code}</span>
                      <h2 className="widget-title truncate">{project.name}</h2>
                      <span className="muted truncate">
                        {project.fields.team || project.scope || "Chưa gắn nhóm"}
                      </span>
                    </div>
                  </div>
                  <div className="widget-body">
                    <div className="row wrap items-center gap-2">
                      <StatusBadge status={project.status} />
                      <span className="muted tabular">
                        {formatDate(project.date)}
                      </span>
                    </div>
                    <ProgressCell value={project.fields.progress} />
                    <span className="muted truncate">
                      Quản lý: {project.assignee || "Chưa chỉ định"}
                    </span>
                  </div>
                  <div className="widget-foot">
                    <span className="muted">
                      {project.fields.members
                        ? `${project.fields.members.split(",").filter((item) => item.trim()).length.toLocaleString("vi-VN")} thành viên`
                        : "Chưa có thành viên"}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setOpenId(project.id)}
                      aria-label={`Mở chi tiết dự án ${project.name}`}
                    >
                      Mở chi tiết
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {!forbidden && !projects.error && rows.length > 0 ? (
          <Pagination
            page={projects.query.page}
            pageSize={projects.query.pageSize}
            total={total}
            idPrefix="project"
            onPage={(page) => projects.patchQuery({ page })}
            onPageSize={(pageSize) => projects.patchQuery({ pageSize, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Sắp xếp và tìm kiếm áp dụng cho các dòng đang tải trên trang này. Sprint, cam kết
        năng lực và backlog nằm trong trang chi tiết của từng dự án.
      </p>

      {creating ? (
        <CreateProjectDialog onCreate={projects.create} onClose={() => setCreating(false)} />
      ) : null}

      {detail ? (
        <ProjectDetailSheet
          project={detail}
          permission={projects.permission}
          canUpdate={projects.can("update")}
          canDelete={projects.can("delete")}
          onSave={(values) =>
            projects.patch(detail.id, { ...values, version: detail.version })
          }
          onDelete={() => projects.remove(detail)}
          onChanged={projects.reload}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

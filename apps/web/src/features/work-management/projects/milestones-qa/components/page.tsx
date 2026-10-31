"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, listProjectOptions } from "../api/client";
import { EXPORT_FILE_PREFIX, FILTER_STATUSES, MILESTONE_STATUS_LABEL } from "../constants";
import { downloadCsv, formatDate, today } from "../format";
import { useMilestones, type Feedback } from "../hooks/use-milestones";
import type { Milestone, MilestoneStatus, ProjectRef } from "../types";
import { CreateMilestoneDialog } from "./create-dialog";
import { MilestoneDetailSheet } from "./detail-sheet";
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
  MilestoneTable,
  OPTIONAL_COLUMNS,
  nextSort,
  sortMilestones,
  type ColumnKey,
  type SortState,
} from "./table";

const ALERT_TONE: Record<Feedback["tone"], string> = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
};

/** The row carries only a projectId; names come from the real `/projects` list. */
function labelOf(projectId: string, names: Record<string, string>): string {
  return names[projectId] ?? `Dự án ${projectId.slice(0, 8)}…`;
}

export function MilestonesQaPage() {
  const milestones = useMilestones();
  const [sort, setSort] = useState<SortState>({ key: "targetDate", dir: "asc" });
  const [hidden, setHidden] = useState<ColumnKey[]>(["updatedAt"]);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [projectsError, setProjectsError] = useState<string | null>(null);

  /* One read serves both the column labels and the project picker in the sheet. */
  useEffect(() => {
    let cancelled = false;
    listProjectOptions("")
      .then((page) => {
        if (cancelled) return;
        setProjects(page.items);
        setProjectNames(
          Object.fromEntries(
            page.items.map((project) => [project.id, `${project.code} · ${project.name}`]),
          ),
        );
        setProjectsError(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setProjects([]);
        setProjectNames({});
        setProjectsError(
          caught instanceof ApiError && caught.status === 403
            ? "Không đọc được danh sách dự án (thiếu quyền xem Không gian dự án). Cột dự án hiển thị mã rút gọn."
            : caught instanceof Error
              ? caught.message
              : "Không đọc được danh sách dự án.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(
    () => sortMilestones(milestones.data.items, sort),
    [milestones.data.items, sort],
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

  const exportRows = (list: Milestone[]) => {
    const header = [
      "Mốc",
      "Dự án",
      "Trạng thái",
      "Ngày mục tiêu",
      "Công việc xong",
      "Tổng công việc",
      "Tham chiếu hợp đồng",
      "Mô tả",
      "Cập nhật",
    ];
    const body = list.map((milestone) => [
      milestone.name,
      labelOf(milestone.projectId, projectNames),
      MILESTONE_STATUS_LABEL[milestone.status],
      formatDate(milestone.targetDate),
      String(milestone.completedCount),
      String(milestone.itemCount),
      milestone.contractRef,
      milestone.description,
      formatDate(milestone.updatedAt),
    ]);
    downloadCsv(`${EXPORT_FILE_PREFIX}-${today()}.csv`, [header, ...body]);
    milestones.setFeedback({
      tone: "info",
      message: `Đã xuất ${list.length} dòng ra tệp CSV.`,
    });
  };

  const detail = openId
    ? (milestones.data.items.find((milestone) => milestone.id === openId) ?? null)
    : null;

  const total = milestones.data.total;
  const loaded = rows.length;
  const overdue = rows.filter((milestone) => milestone.status === "MISSED").length;
  const running = rows.filter((milestone) => milestone.status === "IN_PROGRESS").length;
  const done = rows.filter((milestone) => milestone.status === "COMPLETED").length;
  const forbidden = milestones.error?.status === 403;
  const scopeNote = `${loaded.toLocaleString("vi-VN")} dòng đang tải`;

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Quản lý dự án</p>
          <h1>Mốc &amp; nghiệm thu</h1>
          <p className="page-lede">
            Mỗi mốc gắn với một dự án và một ngày mục tiêu; quá hạn được tính tự động từ
            ngày đó. Tiêu chí kiểm tra được ghi kết quả Đạt / Không đạt / Bị chặn trước khi
            công việc được hoàn thành.
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
            disabled={!milestones.can("create")}
            title={
              milestones.can("create")
                ? "Tạo mốc mới"
                : "Bạn không có quyền tạo mốc"
            }
          >
            <PlusGlyph /> Tạo mốc
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Số lượng mốc">
        <div className="metric">
          <span className="metric-value tabular">{total.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Tổng số mốc</span>
          <span className="metric-note">theo bộ lọc hiện tại</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{overdue.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Quá hạn</span>
          <span className="metric-note">trên {scopeNote}</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{running.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Đang thực hiện</span>
          <span className="metric-note">trên {scopeNote}</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{done.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Hoàn thành</span>
          <span className="metric-note">trên {scopeNote}</span>
        </div>
      </section>

      {milestones.feedback ? (
        <div className={ALERT_TONE[milestones.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{milestones.feedback.message}</span>
            {milestones.feedback.hint ? (
              <span className="muted">{milestones.feedback.hint}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => milestones.setFeedback(null)}
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
                  id="milestone-search"
                  className="input"
                  type="search"
                  value={milestones.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo tên mốc…"
                  aria-label="Tìm mốc"
                  onChange={(event) =>
                    milestones.patchQuery({ q: event.target.value, page: 1 })
                  }
                />
                {milestones.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => milestones.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={milestones.query.status ?? ""}
                aria-label="Lọc theo trạng thái mốc"
                onChange={(event) =>
                  milestones.patchQuery({
                    status: event.target.value as MilestoneStatus | "",
                    page: 1,
                  })
                }
                style={{ width: 184 }}
              >
                <option value="">Mọi trạng thái</option>
                {FILTER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {MILESTONE_STATUS_LABEL[status]}
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
                {total.toLocaleString("vi-VN")} mốc
                {milestones.filtersActive ? ` · ${rows.length} dòng khớp` : ""}
              </span>
            </div>
          </div>

          {milestones.filtersActive ? (
            <div
              className="row wrap items-center gap-2"
              style={{ paddingTop: "var(--space-3)" }}
            >
              {milestones.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{milestones.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => milestones.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {milestones.query.status ? (
                <span className="chip" data-active="true">
                  Trạng thái: {MILESTONE_STATUS_LABEL[milestones.query.status]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => milestones.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={milestones.clearFilters}
              >
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem mốc dự án</span>
            <p className="empty-body">
              Yêu cầu quản trị hệ thống cấp quyền “Xem” cho phân hệ Mốc &amp; nghiệm thu
              rồi tải lại trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={milestones.reload}>
              Tải lại
            </button>
          </div>
        ) : milestones.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được danh sách mốc</span>
            <p className="empty-body">{milestones.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={milestones.reload}>
              Thử lại
            </button>
          </div>
        ) : !milestones.loading && rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {milestones.filtersActive
                ? "Không có mốc nào khớp bộ lọc"
                : "Chưa có mốc nào"}
            </span>
            <p className="empty-body">
              {milestones.filtersActive
                ? "Thử bỏ một vài điều kiện, hoặc xoá hết bộ lọc để xem toàn bộ danh sách."
                : "Tạo mốc đầu tiên để gắn ngày mục tiêu và tiêu chí nghiệm thu cho dự án."}
            </p>
            {milestones.filtersActive ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={milestones.clearFilters}
              >
                Xoá bộ lọc
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCreating(true)}
                disabled={!milestones.can("create")}
              >
                <PlusGlyph /> Tạo mốc
              </button>
            )}
          </div>
        ) : (
          <MilestoneTable
            milestones={rows}
            loading={milestones.loading}
            sort={sort}
            onSort={(key) => setSort((current) => nextSort(current, key))}
            hidden={hidden}
            projectName={(projectId) => labelOf(projectId, projectNames)}
            onOpen={(milestone) => setOpenId(milestone.id)}
          />
        )}

        {!forbidden && !milestones.error && rows.length > 0 ? (
          <Pagination
            page={milestones.query.page}
            pageSize={milestones.query.pageSize}
            total={total}
            idPrefix="milestone"
            onPage={(page) => milestones.patchQuery({ page })}
            onPageSize={(pageSize) => milestones.patchQuery({ pageSize, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Mốc quá hạn được suy ra từ ngày mục tiêu nên không lọc được theo trạng thái “Quá
        hạn”; bảng đánh dấu từng dòng. Tên dự án đọc từ 100 dự án gần nhất, mốc ngoài
        phạm vi đó hiển thị mã rút gọn. Tổng ở đây dùng số liệu máy chủ; các ô còn lại
        đếm trên dòng đang tải.
      </p>

      {creating ? (
        <CreateMilestoneDialog
          onCreate={milestones.create}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {detail ? (
        <MilestoneDetailSheet
          milestoneId={detail.id}
          projectLabel={labelOf(detail.projectId, projectNames)}
          canUpdate={milestones.can("update")}
          projectOptions={projects}
          projectOptionsError={projectsError}
          onSave={(values) =>
            milestones.patch(detail.id, { ...values, version: detail.version })
          }
          onChanged={milestones.reload}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

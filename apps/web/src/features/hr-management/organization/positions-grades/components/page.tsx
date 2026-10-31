"use client";

import { useState } from "react";
import {
  createGrade,
  createPosition,
  updateGrade,
  updatePosition,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, EXPORT_FILE_PREFIX, ROLE_RULE, SHARED_GRADE_LABEL, STATUS_LABEL } from "../constants";
import { downloadCsv, formatDateTime, number } from "../format";
import { usePositionsGrades, type Feedback } from "../hooks/use-positions-grades";
import type { Grade, GradeInput, OrgStatus, Position, PositionInput } from "../types";
import { ORG_STATUSES } from "../types";
import { GradeForm } from "./grade-form";
import { PositionForm } from "./position-form";
import {
  CloseGlyph,
  DownloadGlyph,
  Modal,
  Pagination,
  PlusGlyph,
  SearchGlyph,
  SkeletonList,
  SkeletonRows,
  StatusBadge,
} from "./primitives";

const ALERT_TONE: Record<Feedback["tone"], string> = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
};

type PositionDialog = { mode: "create" } | { mode: "edit"; row: Position } | null;
type GradeDialog = { mode: "create" } | { mode: "edit"; row: Grade } | null;

function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function PositionsGradesPage() {
  const org = usePositionsGrades();
  const [positionDialog, setPositionDialog] = useState<PositionDialog>(null);
  const [gradeDialog, setGradeDialog] = useState<GradeDialog>(null);

  const forbidden = org.positionError?.status === 403;
  const selected = org.selected;
  const canCreate = org.can("create");
  const canUpdate = org.can("update");

  const exportRows = () => {
    const header = ["Mã chức danh", "Tên chức danh", "Trạng thái", "Số cấp bậc"];
    const body = org.positions.items.map((row) => [
      row.code,
      row.name,
      STATUS_LABEL[org.statusOf(row)],
      String(row.gradeCount),
    ]);
    downloadCsv(`${EXPORT_FILE_PREFIX}-${today()}.csv`, [header, ...body]);
    org.setFeedback({
      tone: "info",
      message: `Đã xuất ${number(org.positions.items.length)} chức danh ra tệp CSV.`,
    });
  };

  const savePosition = async (values: PositionInput) => {
    if (positionDialog?.mode === "edit") {
      await updatePosition(positionDialog.row.id, {
        ...values,
        version: positionDialog.row.version,
      });
      org.setFeedback({ tone: "success", message: `Đã lưu chức danh ${values.name}.` });
    } else {
      const created = await createPosition(values);
      org.setFeedback({
        tone: "success",
        message: `Đã tạo chức danh ${created.name}.`,
        hint: "Thêm cấp bậc cho chức danh này ở khung bên phải.",
      });
    }
    setPositionDialog(null);
    org.reload();
  };

  const saveGrade = async (values: GradeInput) => {
    if (gradeDialog?.mode === "edit") {
      await updateGrade(gradeDialog.row.id, {
        ...values,
        version: gradeDialog.row.version,
      });
      org.setFeedback({ tone: "success", message: `Đã lưu cấp bậc ${values.name}.` });
    } else {
      const created = await createGrade(values);
      org.setFeedback({ tone: "success", message: `Đã tạo cấp bậc ${created.name}.` });
    }
    setGradeDialog(null);
    org.reload();
  };

  const gradeScopeLabel = selected ? selected.name : SHARED_GRADE_LABEL;

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Nhân sự · Tổ chức</p>
          <h1>Chức danh &amp; cấp bậc</h1>
          <p className="page-lede">
            Chức danh mô tả công việc, cấp bậc mô tả mức trong công việc đó. Cả hai chỉ là thuộc
            tính của hồ sơ nhân sự — vai trò hệ thống chỉ có EMPLOYEE và MANAGER.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={exportRows}
            disabled={org.positions.items.length === 0}
            title="Xuất danh sách chức danh đang tải ra CSV"
          >
            <DownloadGlyph /> Xuất CSV
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setGradeDialog({ mode: "create" })}
            disabled={!canCreate}
            title={canCreate ? "Tạo cấp bậc" : "Bạn không có quyền tạo cấp bậc"}
          >
            <PlusGlyph /> Tạo cấp bậc
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setPositionDialog({ mode: "create" })}
            disabled={!canCreate}
            title={canCreate ? "Tạo chức danh" : "Bạn không có quyền tạo chức danh"}
          >
            <PlusGlyph /> Tạo chức danh
          </button>
        </div>
      </header>

      {org.totals ? (
        <section className="metric-strip" aria-label="Quy mô chức danh và cấp bậc">
          <div className="metric">
            <span className="metric-value tabular">{number(org.totals.positions)}</span>
            <span className="metric-label">Chức danh</span>
            <span className="metric-note">
              {number(org.totals.activePositions)} đang áp dụng
            </span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{number(org.totals.grades)}</span>
            <span className="metric-label">Cấp bậc</span>
            <span className="metric-note">{number(org.totals.activeGrades)} đang áp dụng</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">
              {number(
                org.totals.positions -
                  org.totals.activePositions +
                  (org.totals.grades - org.totals.activeGrades),
              )}
            </span>
            <span className="metric-label">Ngừng áp dụng</span>
            <span className="metric-note">vẫn giữ trên hồ sơ nhân sự đã có</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">2</span>
            <span className="metric-label">Vai trò hệ thống</span>
            <span className="metric-note">EMPLOYEE và MANAGER — cố định</span>
          </div>
        </section>
      ) : null}

      {org.feedback ? (
        <div className={ALERT_TONE[org.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{org.feedback.message}</span>
            {org.feedback.hint ? <span className="muted">{org.feedback.hint}</span> : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => org.setFeedback(null)}
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
                  id="position-search"
                  className="input"
                  type="search"
                  value={org.positionQuery.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm chức danh theo mã hoặc tên…"
                  aria-label="Tìm chức danh"
                  onChange={(event) =>
                    org.patchPositionQuery({ q: event.target.value, page: 1 })
                  }
                />
                {org.positionQuery.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => org.patchPositionQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={org.positionQuery.status ?? ""}
                aria-label="Lọc chức danh theo trạng thái"
                onChange={(event) =>
                  org.patchPositionQuery({
                    status: event.target.value as OrgStatus | "",
                    page: 1,
                  })
                }
                style={{ width: 180 }}
              >
                <option value="">Mọi trạng thái</option>
                {ORG_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {number(org.positions.total)} chức danh · {number(org.grades.total)} cấp bậc
                {org.filtersActive ? " · đang lọc" : ""}
              </span>
            </div>
          </div>

          {org.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {org.positionTerm ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{org.positionTerm}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => org.patchPositionQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {org.positionQuery.status ? (
                <span className="chip" data-active="true">
                  Trạng thái: {STATUS_LABEL[org.positionQuery.status]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => org.patchPositionQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={org.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="status">
            <h2 className="empty-title">Bạn không có quyền xem chức danh và cấp bậc</h2>
            <p className="empty-body">
              Màn hình này cần quyền xem trên phân hệ Chức danh &amp; cấp bậc. Liên hệ quản trị viên
              nếu bạn cần được cấp quyền.
            </p>
            <button type="button" className="btn btn-ghost" onClick={org.reload}>
              Thử lại
            </button>
          </div>
        ) : org.positionError ? (
          <div className="error-state" role="alert">
            <h2 className="empty-title">Không tải được danh mục</h2>
            <p className="empty-body">{org.positionError.message}</p>
            <button type="button" className="btn btn-primary" onClick={org.reload}>
              Thử lại
            </button>
          </div>
        ) : !org.positionLoading && org.positions.items.length === 0 ? (
          org.filtersActive ? (
            <div className="empty-state">
              <h2 className="empty-title">Không có chức danh nào khớp bộ lọc</h2>
              <p className="empty-body">
                Đang có {number(org.positions.total)} chức danh nhưng không chức danh nào khớp từ
                khoá “{org.positionTerm}”.
              </p>
              <button type="button" className="btn btn-ghost" onClick={org.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <h2 className="empty-title">Chưa có chức danh nào</h2>
              <p className="empty-body">
                Tạo chức danh trước, sau đó thêm các cấp bậc. Cấp bậc không gắn chức danh được coi là
                dùng chung cho mọi vị trí.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setPositionDialog({ mode: "create" })}
                disabled={!canCreate}
              >
                <PlusGlyph /> Tạo chức danh đầu tiên
              </button>
            </div>
          )
        ) : (
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
            {/* ---- master: job titles ------------------------------------ */}
            <section className="stack gap-3" aria-label="Danh sách chức danh">
              <div className="spread items-center">
                <h2 className="surface-title">Chức danh</h2>
                <span className="muted tabular">{number(org.positions.total)}</span>
              </div>

              {org.positionLoading ? (
                <SkeletonList rows={5} />
              ) : (
                <ul className="list">
                  {org.positions.items.map((row) => {
                    const status = org.statusOf(row);
                    const active = row.id === org.selectedId && org.scope === "position";
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          className="list-row"
                          aria-pressed={active}
                          onClick={() => org.select(row.id)}
                          style={{ width: "100%", textAlign: "left" }}
                        >
                          <span className="list-main">
                            <span className="cell-title">{row.name}</span>
                            <span className="list-meta">
                              <span className="mono">{row.code}</span> · {number(row.gradeCount)} cấp
                              bậc
                            </span>
                          </span>
                          <StatusBadge status={status} />
                        </button>
                      </li>
                    );
                  })}
                  <li>
                    <button
                      type="button"
                      className="list-row"
                      aria-pressed={org.scope === "shared"}
                      onClick={() => org.setScope("shared")}
                      style={{ width: "100%", textAlign: "left" }}
                    >
                      <span className="list-main">
                        <span className="cell-title">{SHARED_GRADE_LABEL}</span>
                        <span className="list-meta">Cấp bậc không gắn chức danh</span>
                      </span>
                    </button>
                  </li>
                </ul>
              )}
            </section>

            {/* ---- detail: grades of the chosen scope --------------------- */}
            <section className="stack gap-4" aria-label="Cấp bậc của chức danh đang chọn">
              {org.scope === "position" && selected ? (
                <div className="spread wrap items-start gap-3">
                  <div className="stack gap-1">
                    <h2 className="surface-title">{selected.name}</h2>
                    <span className="mono muted">{selected.code}</span>
                    <p className="muted">{selected.description || "Chưa có mô tả."}</p>
                  </div>
                  <div className="row items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setPositionDialog({ mode: "edit", row: selected })}
                      disabled={!canUpdate}
                    >
                      Sửa chức danh
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => void org.flipPosition(selected)}
                      disabled={!canUpdate || org.pendingId === selected.id}
                      aria-busy={org.pendingId === selected.id ? "true" : undefined}
                    >
                      {org.statusOf(selected) === "ACTIVE" ? "Ngừng áp dụng" : "Kích hoạt"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="stack gap-1">
                  <h2 className="surface-title">Cấp bậc dùng chung</h2>
                  <p className="muted">
                    Những cấp bậc không gắn chức danh cụ thể. API không lọc được điều kiện “không
                    thuộc chức danh”, nên danh sách này được lọc từ trang dữ liệu đang tải.
                  </p>
                </div>
              )}

              {org.scope === "position" && selected ? (
                <dl className="row wrap items-start gap-6">
                  <div className="stack gap-1">
                    <dt className="muted">Trạng thái</dt>
                    <dd>
                      <StatusBadge status={org.statusOf(selected)} />
                    </dd>
                  </div>
                  <div className="stack gap-1">
                    <dt className="muted">Số cấp bậc</dt>
                    <dd className="tabular">{number(selected.gradeCount)}</dd>
                  </div>
                  <div className="stack gap-1">
                    <dt className="muted">Cập nhật</dt>
                    <dd className="tabular">{formatDateTime(selected.updatedAt)}</dd>
                  </div>
                </dl>
              ) : null}

              <div className="spread items-center">
                <h3 className="surface-title">Cấp bậc · {gradeScopeLabel}</h3>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setGradeDialog({ mode: "create" })}
                  disabled={!canCreate}
                >
                  <PlusGlyph /> Tạo cấp bậc
                </button>
              </div>

              {org.gradeError ? (
                <div className="error-state" role="alert">
                  <h2 className="empty-title">Không tải được danh sách cấp bậc</h2>
                  <p className="empty-body">{org.gradeError.message}</p>
                  <button type="button" className="btn btn-primary" onClick={org.reload}>
                    Thử lại
                  </button>
                </div>
              ) : !org.gradeLoading && org.orderedGrades.length === 0 ? (
                <div className="empty-state">
                  <h2 className="empty-title">
                    {org.scope === "shared"
                      ? "Không có cấp bậc dùng chung"
                      : "Chức danh này chưa có cấp bậc"}
                  </h2>
                  <p className="empty-body">
                    {org.scope === "shared"
                      ? "Mọi cấp bậc hiện có đều đã gắn với một chức danh. Cấp bậc dùng chung phù hợp khi nhiều chức danh chia sẻ cùng thang bậc."
                      : "Thêm cấp bậc để mô tả các mức trong chức danh này, ví dụ Junior → Senior."}
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setGradeDialog({ mode: "create" })}
                    disabled={!canCreate}
                  >
                    <PlusGlyph /> Tạo cấp bậc
                  </button>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <caption className="sr-only">
                      Cấp bậc thuộc {gradeScopeLabel}, sắp xếp theo bậc tăng dần
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col" aria-sort="ascending">
                          Bậc
                        </th>
                        <th scope="col">Mã</th>
                        <th scope="col">Tên cấp bậc</th>
                        <th scope="col">Chức danh</th>
                        <th scope="col">Trạng thái</th>
                        <th scope="col">
                          <span className="sr-only">Thao tác</span>
                        </th>
                      </tr>
                    </thead>
                    {org.gradeLoading ? (
                      <SkeletonRows rows={4} columns={6} />
                    ) : (
                      <tbody>
                        {org.orderedGrades.map((row) => {
                          const status = org.statusOf(row);
                          const busy = org.pendingId === row.id;
                          const owner =
                            row.positionId === selected?.id
                              ? (selected?.name ?? SHARED_GRADE_LABEL)
                              : SHARED_GRADE_LABEL;
                          return (
                            <tr key={row.id} data-busy={busy ? "true" : undefined}>
                              <td>
                                <span className="badge badge-accent">
                                  Bậc {number(row.rank)}
                                </span>
                              </td>
                              <td className="mono">{row.code}</td>
                              <td>
                                <span className="cell-title">{row.name}</span>
                                {row.description ? (
                                  <span className="muted truncate" style={{ display: "block" }}>
                                    {row.description}
                                  </span>
                                ) : null}
                              </td>
                              <td>
                                {org.scope === "shared" ? (
                                  <span className="subtle">{SHARED_GRADE_LABEL}</span>
                                ) : (
                                  owner
                                )}
                              </td>
                              <td>
                                <StatusBadge status={status} />
                              </td>
                              <td>
                                <div className="row items-center gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setGradeDialog({ mode: "edit", row })}
                                    disabled={!canUpdate}
                                    aria-label={`Sửa cấp bậc ${row.name}`}
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => void org.flipGrade(row)}
                                    disabled={!canUpdate || busy}
                                    aria-label={`${
                                      status === "ACTIVE" ? "Ngừng áp dụng" : "Kích hoạt"
                                    } cấp bậc ${row.name}`}
                                  >
                                    {status === "ACTIVE" ? "Ngừng" : "Kích hoạt"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    )}
                  </table>
                </div>
              )}

              {org.scope === "shared" && org.grades.total > org.grades.pageSize ? (
                <Pagination
                  page={org.grades.page}
                  pageSize={org.grades.pageSize}
                  total={org.grades.total}
                  onPage={(page) => org.patchGradeQuery({ page })}
                  onPageSize={(pageSize) => org.patchGradeQuery({ page: 1, pageSize })}
                  idPrefix="position-grades"
                  label="cấp bậc"
                />
              ) : null}

              <div className="alert alert-warning" role="note">
                <span>{ROLE_RULE}</span>
              </div>
            </section>
          </div>
        )}

        {!forbidden && !org.positionError && org.positions.total > 0 ? (
          <div style={{ borderTop: "1px solid var(--color-border, #e4e7ec)" }}>
            <Pagination
              page={org.positions.page}
              pageSize={org.positions.pageSize || DEFAULT_PAGE_SIZE}
              total={org.positions.total}
              onPage={(page) => org.patchPositionQuery({ page })}
              onPageSize={(pageSize) => org.patchPositionQuery({ page: 1, pageSize })}
              idPrefix="positions"
              label="chức danh"
            />
          </div>
        ) : null}
      </div>

      <p className="page-footnote">
        Cấp bậc luôn sắp xếp theo bậc tăng dần trong một chức danh. Chức danh và cấp bậc không cấp
        quyền gì trong hệ thống: quyền đến từ vai trò EMPLOYEE hoặc MANAGER và từ phân quyền theo
        phân hệ.
      </p>

      {positionDialog ? (
        <Modal
          title={
            positionDialog.mode === "edit"
              ? `Sửa chức danh ${positionDialog.row.name}`
              : "Tạo chức danh"
          }
          onClose={() => setPositionDialog(null)}
          wide
        >
          <PositionForm
            initial={positionDialog.mode === "edit" ? positionDialog.row : null}
            submitLabel={positionDialog.mode === "edit" ? "Lưu thay đổi" : "Tạo chức danh"}
            onSubmit={savePosition}
            onCancel={() => setPositionDialog(null)}
          />
        </Modal>
      ) : null}

      {gradeDialog ? (
        <Modal
          title={
            gradeDialog.mode === "edit" ? `Sửa cấp bậc ${gradeDialog.row.name}` : "Tạo cấp bậc"
          }
          onClose={() => setGradeDialog(null)}
          wide
        >
          <GradeForm
            initial={gradeDialog.mode === "edit" ? gradeDialog.row : null}
            positions={org.positions.items}
            defaultPositionId={org.scope === "position" ? org.selectedId : null}
            submitLabel={gradeDialog.mode === "edit" ? "Lưu thay đổi" : "Tạo cấp bậc"}
            onSubmit={saveGrade}
            onCancel={() => setGradeDialog(null)}
          />
        </Modal>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  createDepartment,
  createTeam,
  updateDepartment,
  updateTeam,
} from "../api/client";
import {
  DEFAULT_PAGE_SIZE,
  EXPORT_FILE_PREFIX,
  MANAGER_RULE,
  STATUS_LABEL,
} from "../constants";
import { downloadCsv, formatDateTime, number } from "../format";
import { useOrgStructure, type Feedback } from "../hooks/use-org-structure";
import type { Department, DepartmentInput, OrgStatus, Team, TeamInput } from "../types";
import { ORG_STATUSES } from "../types";
import { DepartmentForm } from "./department-form";
import {
  AlertGlyph,
  BuildingGlyph,
  CloseGlyph,
  DownloadGlyph,
  Modal,
  Pagination,
  PlusGlyph,
  SearchGlyph,
  SkeletonList,
  SkeletonRows,
  StatusBadge,
  UsersGlyph,
} from "./primitives";
import { TeamForm } from "./team-form";

const ALERT_TONE: Record<Feedback["tone"], string> = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
};

type DeptDialog = { mode: "create" } | { mode: "edit"; row: Department } | null;
type TeamDialog = { mode: "create" } | { mode: "edit"; row: Team } | null;

function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function DepartmentsTeamsPage() {
  const org = useOrgStructure();
  const [deptDialog, setDeptDialog] = useState<DeptDialog>(null);
  const [teamDialog, setTeamDialog] = useState<TeamDialog>(null);

  const forbidden = org.deptError?.status === 403;
  const selected = org.selected;
  const canCreate = org.can("create");
  const canUpdate = org.can("update");

  const exportRows = () => {
    const header = ["Mã phòng ban", "Tên phòng ban", "Người quản lý", "Trạng thái", "Số nhóm"];
    const body = org.departments.items.map((row) => [
      row.code,
      row.name,
      row.managerName || "(chưa có)",
      STATUS_LABEL[org.statusOf(row)],
      String(row.teamCount),
    ]);
    downloadCsv(`${EXPORT_FILE_PREFIX}-${today()}.csv`, [header, ...body]);
    org.setFeedback({
      tone: "info",
      message: `Đã xuất ${number(org.departments.items.length)} phòng ban ra tệp CSV.`,
    });
  };

  const saveDepartment = async (values: DepartmentInput) => {
    if (deptDialog?.mode === "edit") {
      await updateDepartment(deptDialog.row.id, {
        ...values,
        version: deptDialog.row.version,
      });
      org.setFeedback({ tone: "success", message: `Đã lưu phòng ban ${values.name}.` });
    } else {
      const created = await createDepartment(values);
      org.setFeedback({
        tone: "success",
        message: `Đã tạo phòng ban ${created.name}.`,
        hint: "Tạo nhóm đầu tiên cho phòng ban này ở khung bên phải.",
      });
    }
    setDeptDialog(null);
    org.reload();
  };

  const saveTeam = async (values: TeamInput) => {
    if (teamDialog?.mode === "edit") {
      /* `updateTeamSchema` omits `departmentId`, so it never travels on a patch. */
      await updateTeam(teamDialog.row.id, {
        code: values.code,
        name: values.name,
        description: values.description,
        managerName: values.managerName,
        status: values.status,
        version: teamDialog.row.version,
      });
      org.setFeedback({ tone: "success", message: `Đã lưu nhóm ${values.name}.` });
    } else {
      const created = await createTeam(values);
      org.setFeedback({
        tone: "success",
        message: `Đã tạo nhóm ${created.name}.`,
      });
    }
    setTeamDialog(null);
    org.reload();
  };

  const toggleDepartment = (row: Department) => {
    void org.flipDepartment(row);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Nhân sự · Tổ chức</p>
          <h1>Phòng ban &amp; nhóm</h1>
          <p className="page-lede">
            Mỗi nhóm thuộc đúng một phòng ban. Đơn vị đang hoạt động cần ít nhất một người mang vai
            trò MANAGER; chức danh là thuộc tính của nhân sự, không phải vai trò hệ thống.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={exportRows}
            disabled={org.departments.items.length === 0}
            title="Xuất danh sách phòng ban đang tải ra CSV"
          >
            <DownloadGlyph /> Xuất CSV
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setTeamDialog({ mode: "create" })}
            disabled={!canCreate || !selected}
            title={selected ? "Tạo nhóm trong phòng ban đang chọn" : "Chọn một phòng ban trước"}
          >
            <PlusGlyph /> Tạo nhóm
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setDeptDialog({ mode: "create" })}
            disabled={!canCreate}
            title={canCreate ? "Tạo phòng ban" : "Bạn không có quyền tạo phòng ban"}
          >
            <PlusGlyph /> Tạo phòng ban
          </button>
        </div>
      </header>

      {org.totals ? (
        <section className="metric-strip" aria-label="Quy mô tổ chức">
          <div className="metric">
            <span className="metric-value tabular">{number(org.totals.departments)}</span>
            <span className="metric-label">Phòng ban</span>
            <span className="metric-note">
              {number(org.totals.activeDepartments)} đang hoạt động
            </span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{number(org.totals.teams)}</span>
            <span className="metric-label">Nhóm</span>
            <span className="metric-note">{number(org.totals.activeTeams)} đang hoạt động</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">
              {number(
                org.totals.departments -
                  org.totals.activeDepartments +
                  (org.totals.teams - org.totals.activeTeams),
              )}
            </span>
            <span className="metric-label">Ngừng hoạt động</span>
            <span className="metric-note">phòng ban và nhóm không nhận nhân sự mới</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{number(org.missingManager)}</span>
            <span className="metric-label">Thiếu người quản lý</span>
            <span className="metric-note">tính trên dữ liệu đang tải</span>
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
                  id="org-search"
                  className="input"
                  type="search"
                  value={org.deptQuery.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm phòng ban theo mã, tên hoặc người quản lý…"
                  aria-label="Tìm phòng ban"
                  onChange={(event) =>
                    org.patchDeptQuery({ q: event.target.value, page: 1 })
                  }
                />
                {org.deptQuery.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => org.patchDeptQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={org.deptQuery.status ?? ""}
                aria-label="Lọc phòng ban theo trạng thái"
                onChange={(event) =>
                  org.patchDeptQuery({
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
                {number(org.departments.total)} phòng ban · {number(org.teams.total)} nhóm
                {org.filtersActive ? " · đang lọc" : ""}
              </span>
            </div>
          </div>

          {org.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {org.deptTerm ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{org.deptTerm}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => org.patchDeptQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {org.deptQuery.status ? (
                <span className="chip" data-active="true">
                  Trạng thái: {STATUS_LABEL[org.deptQuery.status]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => org.patchDeptQuery({ status: "", page: 1 })}
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
            <h2 className="empty-title">Bạn không có quyền xem cơ cấu tổ chức</h2>
            <p className="empty-body">
              Màn hình này cần quyền xem trên phân hệ Phòng ban &amp; nhóm. Liên hệ quản trị viên nếu
              bạn cần được cấp quyền.
            </p>
            <button type="button" className="btn btn-ghost" onClick={org.reload}>
              Thử lại
            </button>
          </div>
        ) : org.deptError ? (
          <div className="error-state" role="alert">
            <h2 className="empty-title">Không tải được cơ cấu tổ chức</h2>
            <p className="empty-body">{org.deptError.message}</p>
            <button type="button" className="btn btn-primary" onClick={org.reload}>
              Thử lại
            </button>
          </div>
        ) : !org.deptLoading && org.departments.items.length === 0 ? (
          org.filtersActive ? (
            <div className="empty-state">
              <h2 className="empty-title">Không có phòng ban nào khớp bộ lọc</h2>
              <p className="empty-body">
                Đang có {number(org.departments.total)} phòng ban nhưng không phòng ban nào khớp từ
                khoá “{org.deptTerm}”.
              </p>
              <button type="button" className="btn btn-ghost" onClick={org.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <h2 className="empty-title">Chưa có phòng ban nào</h2>
              <p className="empty-body">
                Bắt đầu bằng một phòng ban, sau đó thêm nhóm bên trong. Mỗi nhóm chỉ thuộc một phòng
                ban và mỗi nhân sự chỉ thuộc tối đa một nhóm.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setDeptDialog({ mode: "create" })}
                disabled={!canCreate}
              >
                <PlusGlyph /> Tạo phòng ban đầu tiên
              </button>
            </div>
          )
        ) : (
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
            {/* ---- master: departments ---------------------------------- */}
            <section className="stack gap-3" aria-label="Danh sách phòng ban">
              <div className="spread items-center">
                <h2 className="surface-title">Phòng ban</h2>
                <span className="muted tabular">{number(org.departments.total)}</span>
              </div>

              {org.deptLoading ? (
                <SkeletonList rows={5} />
              ) : (
                <ul className="list">
                  {org.departments.items.map((row) => {
                    const status = org.statusOf(row);
                    const active = row.id === org.selectedId;
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
                              <span className="mono">{row.code}</span> · {number(row.teamCount)} nhóm
                            </span>
                          </span>
                          <span className="row items-center gap-2">
                            {status === "ACTIVE" && !row.managerName.trim() ? (
                              <span className="badge badge-warning">
                                <span className="dot" />
                                Thiếu quản lý
                              </span>
                            ) : null}
                            <StatusBadge status={status} />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* ---- detail: selected department + its teams ---------------- */}
            <section className="stack gap-4" aria-label="Chi tiết phòng ban đang chọn">
              {selected ? (
                <>
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
                        onClick={() => setDeptDialog({ mode: "edit", row: selected })}
                        disabled={!canUpdate}
                        title={canUpdate ? "Sửa phòng ban" : "Bạn không có quyền sửa"}
                      >
                        Sửa phòng ban
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => toggleDepartment(selected)}
                        disabled={!canUpdate || org.pendingId === selected.id}
                        aria-busy={org.pendingId === selected.id ? "true" : undefined}
                      >
                        {org.statusOf(selected) === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt"}
                      </button>
                    </div>
                  </div>

                  <dl className="row wrap items-start gap-6">
                    <div className="stack gap-1">
                      <dt className="muted">Người quản lý</dt>
                      <dd className="tabular">
                        {selected.managerName || <span className="subtle">Chưa chỉ định</span>}
                      </dd>
                    </div>
                    <div className="stack gap-1">
                      <dt className="muted">Trạng thái</dt>
                      <dd>
                        <StatusBadge status={org.statusOf(selected)} />
                      </dd>
                    </div>
                    <div className="stack gap-1">
                      <dt className="muted">Nhóm hoạt động</dt>
                      <dd className="tabular">
                        {number(selected.activeTeamCount)}/{number(selected.teamCount)}
                      </dd>
                    </div>
                    <div className="stack gap-1">
                      <dt className="muted">Cập nhật</dt>
                      <dd className="tabular">{formatDateTime(selected.updatedAt)}</dd>
                    </div>
                  </dl>

                  {org.statusOf(selected) === "ACTIVE" && !selected.managerName.trim() ? (
                    <div className="alert alert-warning" role="status">
                      <AlertGlyph />
                      <span>{MANAGER_RULE} Phòng ban này chưa có người quản lý.</span>
                    </div>
                  ) : null}

                  <div className="spread items-center">
                    <h3 className="surface-title">Nhóm thuộc phòng ban</h3>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setTeamDialog({ mode: "create" })}
                      disabled={!canCreate}
                    >
                      <PlusGlyph /> Tạo nhóm
                    </button>
                  </div>

                  {org.teamError ? (
                    <div className="error-state" role="alert">
                      <h2 className="empty-title">Không tải được danh sách nhóm</h2>
                      <p className="empty-body">{org.teamError.message}</p>
                      <button type="button" className="btn btn-primary" onClick={org.reload}>
                        Thử lại
                      </button>
                    </div>
                  ) : !org.teamLoading && org.teams.items.length === 0 ? (
                    <div className="empty-state">
                      <h2 className="empty-title">Phòng ban này chưa có nhóm</h2>
                      <p className="empty-body">
                        Tạo nhóm đầu tiên để bắt đầu xếp nhân sự. Một nhân sự chỉ thuộc tối đa một
                        nhóm, nên hãy kiểm tra nhóm hiện tại của họ trước khi xếp.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setTeamDialog({ mode: "create" })}
                        disabled={!canCreate}
                      >
                        <PlusGlyph /> Tạo nhóm cho phòng ban này
                      </button>
                    </div>
                  ) : (
                    <div className="table-scroll">
                      <table className="data-table">
                        <caption className="sr-only">
                          Nhóm thuộc phòng ban {selected.name}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Mã</th>
                            <th scope="col">Tên nhóm</th>
                            <th scope="col">Người quản lý</th>
                            <th scope="col">Trạng thái</th>
                            <th scope="col">Cập nhật</th>
                            <th scope="col">
                              <span className="sr-only">Thao tác</span>
                            </th>
                          </tr>
                        </thead>
                        {org.teamLoading ? (
                          <SkeletonRows rows={4} columns={6} />
                        ) : (
                          <tbody>
                            {org.teams.items.map((row) => {
                              const status = org.statusOf(row);
                              const busy = org.pendingId === row.id;
                              return (
                                <tr key={row.id} data-busy={busy ? "true" : undefined}>
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
                                    {row.managerName || (
                                      <span className="subtle">Chưa chỉ định</span>
                                    )}
                                  </td>
                                  <td>
                                    <StatusBadge status={status} />
                                  </td>
                                  <td className="tabular">{formatDateTime(row.updatedAt)}</td>
                                  <td>
                                    <div className="row items-center gap-2">
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setTeamDialog({ mode: "edit", row })}
                                        disabled={!canUpdate}
                                        aria-label={`Sửa nhóm ${row.name}`}
                                      >
                                        Sửa
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => void org.flipTeam(row)}
                                        disabled={!canUpdate || busy}
                                        aria-label={`${
                                          status === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt"
                                        } nhóm ${row.name}`}
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

                  {org.teams.total > org.teams.pageSize ? (
                    <Pagination
                      page={org.teams.page}
                      pageSize={org.teams.pageSize}
                      total={org.teams.total}
                      onPage={(page) =>
                        org.setTeamQuery((current) => ({ ...current, page }))
                      }
                      onPageSize={(pageSize) =>
                        org.setTeamQuery((current) => ({ ...current, page: 1, pageSize }))
                      }
                      idPrefix="org-teams"
                      label="nhóm"
                    />
                  ) : null}

                  {/* The API exposes no team-membership route (no list, add or remove
                      endpoint under `org/teams`), so membership cannot be edited here.
                      The rule is still stated because it decides who may be assigned
                      once the endpoint exists. */}
                  <div className="alert alert-warning" role="note">
                    <UsersGlyph />
                    <div className="stack gap-1">
                      <strong>Quy tắc thành viên</strong>
                      <span className="muted">
                        Mỗi nhân sự chỉ thuộc tối đa một nhóm. Hệ thống từ chối khi xếp một người
                        đã có nhóm vào nhóm khác — cần gỡ khỏi nhóm cũ trước. Hiện chưa có API quản
                        lý thành viên nhóm nên màn hình này chưa thêm hoặc gỡ thành viên được; xem
                        danh bạ nhân sự để biết nhóm hiện tại của từng người.
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <h2 className="empty-title">Chọn một phòng ban</h2>
                  <p className="empty-body">
                    Chọn phòng ban ở khung bên trái để xem nhóm và tình trạng người quản lý.
                  </p>
                  <BuildingGlyph />
                </div>
              )}
            </section>
          </div>
        )}

        {!forbidden && !org.deptError && org.departments.total > 0 ? (
          <div style={{ borderTop: "1px solid var(--color-border, #e4e7ec)" }}>
            <Pagination
              page={org.departments.page}
              pageSize={org.departments.pageSize || DEFAULT_PAGE_SIZE}
              total={org.departments.total}
              onPage={(page) => org.patchDeptQuery({ page })}
              onPageSize={(pageSize) => org.patchDeptQuery({ page: 1, pageSize })}
              idPrefix="org-departments"
              label="phòng ban"
            />
          </div>
        ) : null}
      </div>

      <p className="page-footnote">
        Phòng ban đang hoạt động mà còn nhóm đang hoạt động thì không ngừng được — hãy ngừng hoặc
        chuyển các nhóm trước. Danh sách nhóm luôn lọc theo phòng ban đang chọn; danh bạ nhân sự là
        nơi duy nhất cho biết một người đang thuộc nhóm nào.
      </p>

      {deptDialog ? (
        <Modal
          title={deptDialog.mode === "edit" ? `Sửa phòng ban ${deptDialog.row.name}` : "Tạo phòng ban"}
          onClose={() => setDeptDialog(null)}
          wide
        >
          <DepartmentForm
            initial={deptDialog.mode === "edit" ? deptDialog.row : null}
            submitLabel={deptDialog.mode === "edit" ? "Lưu thay đổi" : "Tạo phòng ban"}
            onSubmit={saveDepartment}
            onCancel={() => setDeptDialog(null)}
          />
        </Modal>
      ) : null}

      {teamDialog && selected ? (
        <Modal
          title={teamDialog.mode === "edit" ? `Sửa nhóm ${teamDialog.row.name}` : "Tạo nhóm"}
          onClose={() => setTeamDialog(null)}
          wide
        >
          <TeamForm
            initial={teamDialog.mode === "edit" ? teamDialog.row : null}
            departmentId={
              teamDialog.mode === "edit" ? teamDialog.row.departmentId : selected.id
            }
            departmentName={selected.name}
            submitLabel={teamDialog.mode === "edit" ? "Lưu thay đổi" : "Tạo nhóm"}
            onSubmit={saveTeam}
            onCancel={() => setTeamDialog(null)}
          />
        </Modal>
      ) : null}
    </div>
  );
}

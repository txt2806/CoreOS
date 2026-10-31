"use client";

import { useState } from "react";
import { createEmployee, updateEmployee } from "../api/client";
import {
  EXPORT_FILE_PREFIX,
  ROLE_LABEL,
  SEARCH_HINT,
  STATUS_LABEL,
} from "../constants";
import { downloadCsv, formatDate, number } from "../format";
import { useEmployees, type Feedback } from "../hooks/use-employees";
import type { Employee, EmployeeInput, EmployeeStatus } from "../types";
import { EMPLOYEE_STATUSES } from "../types";
import { EmployeeForm } from "./employee-form";
import {
  BuildingGlyph,
  CloseGlyph,
  DownloadGlyph,
  Modal,
  Pagination,
  PlusGlyph,
  SearchGlyph,
  SkeletonRows,
  StatusBadge,
  UsersGlyph,
} from "./primitives";
import { ProfileSheet } from "./profile-sheet";

const ALERT_TONE: Record<Feedback["tone"], string> = {
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert",
};

type Dialog = { mode: "create" } | { mode: "edit"; row: Employee } | null;

function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function EmployeeDirectoryPage() {
  const dir = useEmployees();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const forbidden = dir.error?.status === 403;
  const canCreate = dir.can("create");
  const canUpdate = dir.can("update");
  const rows = dir.data.items;
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  const exportRows = () => {
    const header = [
      "Mã nhân sự",
      "Họ và tên",
      "Email",
      "Điện thoại",
      "Chức danh",
      "Phòng ban",
      "Nhóm",
      "Người quản lý",
      "Ngày vào làm",
      "Trạng thái",
    ];
    const body = rows.map((row) => [
      row.code,
      row.fullName,
      row.email,
      row.phone,
      row.jobTitle,
      row.departmentName,
      row.teamName,
      row.managerName,
      formatDate(row.startDate),
      STATUS_LABEL[dir.statusOf(row)],
    ]);
    downloadCsv(`${EXPORT_FILE_PREFIX}-${today()}.csv`, [header, ...body]);
    dir.setFeedback({
      tone: "info",
      message: `Đã xuất ${number(rows.length)} hồ sơ đang hiển thị ra tệp CSV.`,
      hint: "Tệp chỉ chứa trang hiện tại, không phải toàn bộ danh bạ.",
    });
  };

  const saveEmployee = async (values: EmployeeInput) => {
    if (dialog?.mode === "edit") {
      /* `updateEmployeeSchema` is `.partial()`, but `version` is mandatory —
         a stale version comes back as 409 instead of silently overwriting. */
      await updateEmployee(dialog.row.id, { ...values, version: dialog.row.version });
      dir.setFeedback({ tone: "success", message: `Đã lưu hồ sơ ${values.fullName}.` });
    } else {
      const created = await createEmployee(values);
      dir.setFeedback({
        tone: "success",
        message: `Đã thêm ${created.fullName} vào danh bạ.`,
        hint: created.teamName
          ? `Đang thuộc nhóm ${created.teamName}.`
          : "Hồ sơ chưa được xếp nhóm — mỗi người chỉ thuộc tối đa một nhóm.",
      });
    }
    setDialog(null);
    dir.reload();
  };

  const inactiveCount = dir.totals ? dir.totals.all - dir.totals.active : 0;

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Nhân sự · Danh bạ</p>
          <h1>Danh bạ nhân sự</h1>
          <p className="page-lede">
            Hồ sơ nhân sự kèm phòng ban, nhóm và chức danh. Chức danh là thuộc tính công việc; vai
            trò hệ thống chỉ có EMPLOYEE và MANAGER và không suy ra từ chức danh.
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
            className="btn btn-primary"
            onClick={() => setDialog({ mode: "create" })}
            disabled={!canCreate}
            title={canCreate ? "Thêm hồ sơ nhân sự" : "Bạn không có quyền thêm hồ sơ"}
          >
            <PlusGlyph /> Thêm nhân sự
          </button>
        </div>
      </header>

      {dir.totals ? (
        <section className="metric-strip" aria-label="Quy mô danh bạ">
          <div className="metric">
            <span className="metric-value tabular">{number(dir.totals.all)}</span>
            <span className="metric-label">Hồ sơ nhân sự</span>
            <span className="metric-note">toàn bộ danh bạ</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{number(dir.totals.active)}</span>
            <span className="metric-label">Đang làm việc</span>
            <span className="metric-note">theo trạng thái ACTIVE</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">{number(inactiveCount)}</span>
            <span className="metric-label">Đã nghỉ</span>
            <span className="metric-note">vẫn tra cứu được trong danh bạ</span>
          </div>
          <div className="metric">
            <span className="metric-value tabular">2</span>
            <span className="metric-label">Vai trò hệ thống</span>
            <span className="metric-note">
              {ROLE_LABEL.EMPLOYEE} và {ROLE_LABEL.MANAGER} — cố định
            </span>
          </div>
        </section>
      ) : null}

      {dir.feedback ? (
        <div className={ALERT_TONE[dir.feedback.tone]} role="status" aria-live="polite">
          <div className="stack gap-1">
            <span>{dir.feedback.message}</span>
            {dir.feedback.hint ? <span className="muted">{dir.feedback.hint}</span> : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => dir.setFeedback(null)}
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
                  id="employee-search"
                  className="input"
                  type="search"
                  value={dir.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm theo mã, họ tên, email hoặc chức danh…"
                  aria-label="Tìm nhân sự theo mã, họ tên, email hoặc chức danh"
                  aria-describedby="employee-search-hint"
                  onChange={(event) => dir.patchQuery({ q: event.target.value, page: 1 })}
                />
                {dir.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => dir.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <select
                className="select"
                value={dir.query.status ?? ""}
                aria-label="Lọc nhân sự theo trạng thái"
                onChange={(event) =>
                  dir.patchQuery({
                    status: event.target.value as EmployeeStatus | "",
                    page: 1,
                  })
                }
                style={{ width: 170 }}
              >
                <option value="">Mọi trạng thái</option>
                {EMPLOYEE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>

              {/* `departmentName` is compared for equality by the repository, so
                  this is a name picker in spirit — the hint says so out loud. */}
              <input
                id="employee-department"
                className="input"
                type="search"
                value={dir.query.departmentName ?? ""}
                autoComplete="off"
                placeholder="Tên phòng ban (khớp chính xác)…"
                aria-label="Lọc theo tên phòng ban, khớp chính xác"
                onChange={(event) =>
                  dir.patchQuery({ departmentName: event.target.value, page: 1 })
                }
                style={{ maxWidth: 260 }}
              />
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {number(dir.data.total)} nhân sự
                {dir.filtersActive ? " · đang lọc" : ""}
              </span>
            </div>
          </div>

          <p className="muted" id="employee-search-hint" style={{ paddingTop: "var(--space-2)" }}>
            {SEARCH_HINT}
          </p>

          {dir.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {dir.term ? (
                <span className="chip" data-active="true">
                  Từ khoá: “{dir.term}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => dir.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ lọc từ khoá"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {dir.query.status ? (
                <span className="chip" data-active="true">
                  Trạng thái: {STATUS_LABEL[dir.query.status]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => dir.patchQuery({ status: "", page: 1 })}
                    aria-label="Bỏ lọc trạng thái"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {dir.department ? (
                <span className="chip" data-active="true">
                  Phòng ban: {dir.department}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => dir.patchQuery({ departmentName: "", page: 1 })}
                    aria-label="Bỏ lọc phòng ban"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={dir.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="status">
            <h2 className="empty-title">Bạn không có quyền xem danh bạ nhân sự</h2>
            <p className="empty-body">
              Màn hình này cần quyền xem trên phân hệ Danh bạ nhân sự. Liên hệ quản trị viên nếu bạn
              cần được cấp quyền.
            </p>
            <button type="button" className="btn btn-ghost" onClick={dir.reload}>
              Thử lại
            </button>
          </div>
        ) : dir.error ? (
          <div className="error-state" role="alert">
            <h2 className="empty-title">Không tải được danh bạ nhân sự</h2>
            <p className="empty-body">{dir.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={dir.reload}>
              Thử lại
            </button>
          </div>
        ) : !dir.loading && rows.length === 0 ? (
          dir.filtersActive ? (
            <div className="empty-state">
              <h2 className="empty-title">Không nhân sự nào khớp bộ lọc</h2>
              <p className="empty-body">
                Danh bạ đang có {number(dir.data.total)} hồ sơ nhưng không hồ sơ nào khớp điều kiện
                hiện tại. Từ khoá không tìm trong tên nhóm — hãy dùng ô phòng ban.
              </p>
              <button type="button" className="btn btn-ghost" onClick={dir.clearFilters}>
                Xoá bộ lọc
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <h2 className="empty-title">Danh bạ chưa có hồ sơ nào</h2>
              <p className="empty-body">
                Thêm hồ sơ đầu tiên để bắt đầu. Mỗi người chỉ thuộc tối đa một nhóm và cần một phòng
                ban để bộ lọc theo phòng ban dùng được.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setDialog({ mode: "create" })}
                disabled={!canCreate}
              >
                <PlusGlyph /> Thêm nhân sự đầu tiên
              </button>
            </div>
          )
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">
                Danh bạ nhân sự, sắp xếp cố định theo trạng thái rồi họ tên
              </caption>
              <thead>
                <tr>
                  <th scope="col">Mã</th>
                  <th scope="col">Họ và tên</th>
                  <th scope="col">Chức danh</th>
                  <th scope="col">Phòng ban / Nhóm</th>
                  <th scope="col">Ngày vào làm</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              {dir.loading ? (
                <SkeletonRows rows={6} columns={7} />
              ) : (
                <tbody>
                  {rows.map((row) => {
                    const status = dir.statusOf(row);
                    return (
                      <tr key={row.id}>
                        <td className="mono">{row.code}</td>
                        <td>
                          <button
                            type="button"
                            className="link cell-title"
                            onClick={() => setSelectedId(row.id)}
                            aria-label={`Xem hồ sơ ${row.fullName}`}
                          >
                            {row.fullName}
                          </button>
                          <div className="list-meta">{row.email || "Chưa có email"}</div>
                        </td>
                        <td>{row.jobTitle || <span className="subtle">Chưa cập nhật</span>}</td>
                        <td>
                          <div className="row items-center gap-2">
                            <BuildingGlyph />
                            <span>{row.departmentName || "—"}</span>
                          </div>
                          <div className="list-meta row items-center gap-2">
                            <UsersGlyph />
                            {row.teamName || "Chưa vào nhóm"}
                          </div>
                        </td>
                        <td className="tabular">{formatDate(row.startDate)}</td>
                        <td>
                          <StatusBadge status={status} />
                        </td>
                        <td>
                          <div className="row items-center gap-2">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setSelectedId(row.id)}
                            >
                              Hồ sơ
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setDialog({ mode: "edit", row })}
                              disabled={!canUpdate}
                              title={canUpdate ? "Sửa hồ sơ" : "Bạn không có quyền sửa hồ sơ"}
                            >
                              Sửa
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

        {!forbidden && !dir.error && rows.length > 0 ? (
          <Pagination
            page={dir.query.page}
            pageSize={dir.query.pageSize}
            total={dir.data.total}
            onPage={(page) => dir.patchQuery({ page })}
            onPageSize={(pageSize) => dir.patchQuery({ pageSize, page: 1 })}
            idPrefix="employee"
            label="nhân sự"
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Dữ liệu từ <span className="mono">GET /api/v1/employees</span> (lọc{" "}
        <span className="mono">q</span>, <span className="mono">status</span>,{" "}
        <span className="mono">departmentName</span>, <span className="mono">jobTitle</span>). Danh
        bạ không trả về thông tin tài khoản hay vai trò: vai trò hệ thống chỉ có EMPLOYEE và MANAGER,
        còn <span className="mono">jobTitle</span> là thuộc tính công việc. Sắp xếp cố định theo
        trạng thái rồi họ tên vì API không nhận tham số sắp xếp.
      </p>

      {dialog ? (
        <Modal
          title={dialog.mode === "edit" ? "Sửa hồ sơ nhân sự" : "Thêm nhân sự"}
          onClose={() => setDialog(null)}
          wide
        >
          <EmployeeForm
            initial={dialog.mode === "edit" ? dialog.row : null}
            submitLabel={dialog.mode === "edit" ? "Lưu thay đổi" : "Thêm nhân sự"}
            onSubmit={saveEmployee}
            onCancel={() => setDialog(null)}
          />
        </Modal>
      ) : null}

      {selected ? (
        <ProfileSheet
          employee={selected}
          status={dir.statusOf(selected)}
          actor={dir.actor}
          canUpdate={canUpdate}
          pending={dir.pendingId === selected.id}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            setSelectedId(null);
            setDialog({ mode: "edit", row: selected });
          }}
          onToggleStatus={() => void dir.toggleStatus(selected)}
        />
      ) : null}
    </div>
  );
}

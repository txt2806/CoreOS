"use client";

import { useEffect, useId, type ReactNode } from "react";
import { ROLE_LABEL } from "../constants";
import { formatDate, formatDateTime, initialsOf } from "../format";
import type { Employee, EmployeeStatus, Session } from "../types";
import { AlertGlyph, CloseGlyph, StatusBadge } from "./primitives";

interface ProfileSheetProps {
  employee: Employee;
  status: EmployeeStatus;
  actor: Session["actor"] | null;
  canUpdate: boolean;
  pending: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="stack gap-1">
      <dt className="muted">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function ProfileSheet({
  employee,
  status,
  actor,
  canUpdate,
  pending,
  onClose,
  onEdit,
  onToggleStatus,
}: ProfileSheetProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* The directory row carries no account, so a role badge is only truthful for
     the signed-in person — never inferred from the job title. */
  const isSelf = actor?.employeeId === employee.id;

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="row items-center gap-3">
            <span className="avatar avatar-sm" aria-hidden="true">
              {initialsOf(employee.fullName)}
            </span>
            <div className="stack gap-1">
              <h2 className="dialog-title" id={titleId}>
                {employee.fullName}
              </h2>
              <span className="mono muted">{employee.code}</span>
            </div>
          </div>
          <div className="row wrap items-center gap-2">
            <StatusBadge status={status} />
            {isSelf && actor ? (
              <span className="badge badge-info">
                <span className="dot" />
                {ROLE_LABEL[actor.role]}
              </span>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              onClick={onClose}
              aria-label="Đóng hồ sơ nhân sự"
            >
              <CloseGlyph />
            </button>
          </div>
        </div>

        <div className="sheet-body stack gap-5">
          <section className="stack gap-3" aria-label="Thông tin nhân sự">
            <h3 className="surface-title">Thông tin nhân sự</h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact term="Chức danh">
                {employee.jobTitle || <span className="subtle">Chưa cập nhật</span>}
              </Fact>
              <Fact term="Phòng ban">
                {employee.departmentName || <span className="subtle">Chưa xếp phòng ban</span>}
              </Fact>
              <Fact term="Nhóm">
                {employee.teamName || <span className="subtle">Chưa vào nhóm</span>}
              </Fact>
              <Fact term="Người quản lý">
                {employee.managerName || <span className="subtle">Chưa chỉ định</span>}
              </Fact>
              <Fact term="Ngày vào làm">
                <span className="tabular">{formatDate(employee.startDate)}</span>
              </Fact>
              <Fact term="Trạng thái">
                <StatusBadge status={status} />
              </Fact>
            </dl>
          </section>

          <section className="stack gap-3" aria-label="Liên hệ">
            <h3 className="surface-title">Liên hệ</h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact term="Email">
                {employee.email ? (
                  <a className="link truncate" href={`mailto:${employee.email}`}>
                    {employee.email}
                  </a>
                ) : (
                  <span className="subtle">Chưa cập nhật</span>
                )}
              </Fact>
              <Fact term="Điện thoại">
                <span className="tabular">
                  {employee.phone || <span className="subtle">Chưa cập nhật</span>}
                </span>
              </Fact>
            </dl>
          </section>

          <section className="stack gap-3" aria-label="Thông tin tài khoản">
            <h3 className="surface-title">Thông tin tài khoản</h3>
            {isSelf && actor ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <Fact term="Tên đăng nhập">
                  <span className="mono">{actor.username}</span>
                </Fact>
                <Fact term="Vai trò hệ thống">
                  <span className="badge">
                    <span className="dot" />
                    {ROLE_LABEL[actor.role]}
                  </span>
                </Fact>
              </dl>
            ) : (
              <div className="alert alert-warning" role="note">
                <AlertGlyph />
                <div className="stack gap-1">
                  <span>Danh bạ không trả về thông tin tài khoản.</span>
                  <span className="muted">
                    API nhân sự chỉ có hồ sơ: không có tên đăng nhập, vai trò hay thông tin xác
                    thực. Vai trò hệ thống chỉ gồm EMPLOYEE và MANAGER; chức danh không phải vai
                    trò.
                  </span>
                </div>
              </div>
            )}
          </section>

          {employee.note ? (
            <section className="stack gap-2" aria-label="Ghi chú hồ sơ">
              <h3 className="surface-title">Ghi chú</h3>
              <p className="muted">{employee.note}</p>
            </section>
          ) : null}

          <p className="muted tabular">
            Cập nhật lần cuối {formatDateTime(employee.updatedAt)} · phiên bản {employee.version}
          </p>
        </div>

        <div className="sheet-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
          <div className="row items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onToggleStatus}
              disabled={!canUpdate || pending}
              aria-busy={pending ? "true" : undefined}
              title={canUpdate ? undefined : "Bạn không có quyền sửa hồ sơ nhân sự"}
            >
              {status === "ACTIVE" ? "Đánh dấu đã nghỉ" : "Đánh dấu đang làm việc"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onEdit}
              disabled={!canUpdate}
              title={canUpdate ? undefined : "Bạn không có quyền sửa hồ sơ nhân sự"}
            >
              Sửa hồ sơ
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

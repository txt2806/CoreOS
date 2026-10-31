"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { ApiError, accountHistory } from "../api/client";
import { ACCESS_KIND_LABELS, HISTORY_NOTE, ROLE_LABELS } from "../constants";
import { formatDateTime } from "../format";
import type { AccessChangeEntry, Account, AccountRole } from "../types";
import { AdminBadge, CloseGlyph, KeyGlyph, LockGlyph, RoleBadge, StatusBadge, UnlockGlyph } from "./primitives";

interface SheetProps {
  account: Account;
  canManage: boolean;
  pending: boolean;
  onAccess: (patch: { role?: AccountRole; isSystemAdmin?: boolean }) => Promise<unknown>;
  onEdit: () => void;
  onToggleLock: () => void;
  onResetPassword: () => void;
  onClose: () => void;
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="spread gap-3 py-1">
      <dt className="muted">{term}</dt>
      <dd className="tabular">{children}</dd>
    </div>
  );
}

export function AccountDetailSheet({
  account,
  canManage,
  pending,
  onAccess,
  onEdit,
  onToggleLock,
  onResetPassword,
  onClose,
}: SheetProps) {
  const titleId = useId();
  const [role, setRole] = useState<AccountRole>(account.role);
  const [admin, setAdmin] = useState(account.isSystemAdmin);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [history, setHistory] = useState<AccessChangeEntry[] | null>(null);
  const [historyProblem, setHistoryProblem] = useState<string | null>(null);
  const [historyTick, setHistoryTick] = useState(0);

  /* A new server version means someone (maybe this admin) saved; resync the draft. */
  useEffect(() => {
    setRole(account.role);
    setAdmin(account.isSystemAdmin);
  }, [account.role, account.isSystemAdmin, account.version]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const loadHistory = useCallback(() => {
    let cancelled = false;
    setHistory(null);
    setHistoryProblem(null);
    accountHistory(account.id)
      .then((body) => {
        if (!cancelled) setHistory(body.items);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setHistoryProblem(
          caught instanceof ApiError ? caught.message : "Không tải được lịch sử thay đổi.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [account.id]);

  useEffect(loadHistory, [loadHistory, account.version, historyTick]);

  const dirty = role !== account.role || admin !== account.isSystemAdmin;

  const save = async () => {
    setSaving(true);
    setProblem(null);
    try {
      await onAccess({ role, isSystemAdmin: admin });
      setHistoryTick((value) => value + 1);
    } catch (caught) {
      setProblem(caught instanceof ApiError ? caught.message : "Chưa lưu được thay đổi quyền.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div className="stack gap-2">
            <span className="page-eyebrow mono">@{account.username}</span>
            <h2 className="surface-title" id={titleId}>
              {account.displayName}
            </h2>
            <div className="row wrap items-center gap-2">
              <StatusBadge status={account.status} />
              <RoleBadge role={account.role} />
              <AdminBadge granted={account.isSystemAdmin} />
              {account.mustChangePassword ? (
                <span className="badge badge-warning">Mật khẩu tạm</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết tài khoản"
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="sheet-body">
          {problem ? (
            <div className="alert alert-danger" role="alert">
              <span>{problem}</span>
            </div>
          ) : null}

          {account.status === "LOCKED" ? (
            <div className="alert alert-warning">
              <LockGlyph />
              <span>
                Tài khoản đang khoá nên không đăng nhập được. Mở khoá để người dùng vào lại bằng mật
                khẩu hiện có.
              </span>
            </div>
          ) : null}

          <dl className="stack gap-0">
            <Row term="Tên đăng nhập">{account.username}</Row>
            <Row term="Email">{account.email || "Chưa có"}</Row>
            <Row term="Mã nhân viên">{account.employeeCode || "Chưa gắn"}</Row>
            <Row term="Vai trò">{ROLE_LABELS[account.role]}</Row>
            <Row term="Lý do khoá">{account.lockedReason || "—"}</Row>
            <Row term="Đăng nhập gần nhất">{formatDateTime(account.lastLoginAt)}</Row>
            <Row term="Tạo lúc">{formatDateTime(account.createdAt)}</Row>
            <Row term="Cập nhật">{formatDateTime(account.updatedAt)}</Row>
            <Row term="Phiên bản">{account.version.toLocaleString("vi-VN")}</Row>
          </dl>

          <section className="stack gap-3" aria-label="Quyền truy cập">
            <h3 className="surface-title">Quyền truy cập</h3>
            {canManage ? (
              <>
                <div className="field-grid">
                  <div className="field">
                    <label className="field-label" htmlFor={`${titleId}-role`}>
                      Vai trò
                    </label>
                    <select
                      id={`${titleId}-role`}
                      className="select"
                      value={role}
                      onChange={(event) => {
                        const next = event.target.value === "MANAGER" ? "MANAGER" : "EMPLOYEE";
                        setRole(next);
                        // The API refuses an admin flag on a non-manager account.
                        if (next === "EMPLOYEE") setAdmin(false);
                      }}
                    >
                      <option value="EMPLOYEE">Nhân viên</option>
                      <option value="MANAGER">Quản lý</option>
                    </select>
                  </div>
                </div>

                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={admin}
                    onChange={(event) => {
                      setAdmin(event.target.checked);
                      if (event.target.checked) setRole("MANAGER");
                    }}
                  />
                  <span>
                    Quyền quản trị hệ thống
                    <span className="field-hint" style={{ display: "block" }}>
                      Mọi lần cấp hoặc thu hồi đều ghi nhật ký kiểm toán kèm người thực hiện.
                    </span>
                  </span>
                </label>

                <div className="row wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void save()}
                    disabled={!dirty || saving}
                    aria-busy={saving ? "true" : undefined}
                  >
                    {saving ? "Đang lưu…" : "Lưu quyền"}
                  </button>
                  <span className="muted" aria-live="polite">
                    {dirty ? "Có thay đổi chưa lưu." : "Không có thay đổi nào."}
                  </span>
                </div>
              </>
            ) : (
              <p className="muted">
                Chỉ quản trị hệ thống mới đổi được vai trò và quyền quản trị. Yêu cầu quản trị viên
                thực hiện thay đổi này.
              </p>
            )}
          </section>

          <section className="stack gap-3" aria-label="Lịch sử thay đổi quyền">
            <div className="spread items-center">
              <h3 className="surface-title">Lịch sử thay đổi</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setHistoryTick((value) => value + 1)}
              >
                Tải lại
              </button>
            </div>

            {historyProblem ? (
              <div className="alert alert-danger" role="alert">
                <span>{historyProblem}</span>
              </div>
            ) : history === null ? (
              <div className="stack gap-2" aria-hidden="true">
                <span className="skeleton skeleton-line" style={{ width: "70%" }} />
                <span className="skeleton skeleton-line" style={{ width: "55%" }} />
                <span className="skeleton skeleton-line" style={{ width: "62%" }} />
              </div>
            ) : history.length === 0 ? (
              <p className="muted">Chưa có thay đổi quyền nào được ghi nhận cho tài khoản này.</p>
            ) : (
              <ol className="timeline">
                {history.slice(0, 10).map((entry) => (
                  <li key={entry.id} className="stack gap-1">
                    <div className="row wrap items-center gap-2">
                      <strong>{ACCESS_KIND_LABELS[entry.kind]}</strong>
                      <span className="mono muted">
                        {entry.fromValue || "∅"} → {entry.toValue || "∅"}
                      </span>
                      <span className="muted tabular">{formatDateTime(entry.createdAt)}</span>
                    </div>
                    <span className="muted">{entry.actorName}</span>
                    {entry.reason ? <p className="list-main">{entry.reason}</p> : null}
                  </li>
                ))}
              </ol>
            )}
            <p className="page-footnote">{HISTORY_NOTE}</p>
          </section>
        </div>

        <div className="sheet-foot">
          {canManage ? (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onEdit}
                disabled={pending}
                style={{ marginRight: "auto" }}
              >
                Sửa hồ sơ
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onResetPassword}
                disabled={pending}
              >
                <KeyGlyph /> Đặt lại mật khẩu
              </button>
              <button
                type="button"
                className={account.status === "ACTIVE" ? "btn btn-danger" : "btn btn-primary"}
                onClick={onToggleLock}
                disabled={pending}
              >
                {account.status === "ACTIVE" ? (
                  <>
                    <LockGlyph /> Khoá tài khoản
                  </>
                ) : (
                  <>
                    <UnlockGlyph /> Mở khoá
                  </>
                )}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Đóng
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

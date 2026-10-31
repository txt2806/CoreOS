"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  SESSION_COOKIE_NOTE,
} from "../constants";
import { useLogin } from "../hooks/use-login";
import {
  AlertGlyph,
  Field,
  LockGlyph,
  PasswordInput,
  SessionFootnote,
  ShieldGlyph,
  Spinner,
} from "./primitives";

const ROLE_LABEL = { EMPLOYEE: "Nhân viên", MANAGER: "Quản lý" } as const;

export function LoginPage() {
  const router = useRouter();
  const handleSignedIn = useCallback(() => {
    router.push("/");
  }, [router]);

  /* The page owns the input refs: the hook only focuses them, it never renders them. */
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const newPasswordRef = useRef<HTMLInputElement | null>(null);

  const login = useLogin(handleSignedIn, { usernameRef, passwordRef, newPasswordRef });
  const uid = useId();
  const usernameId = `${uid}-username`;
  const passwordId = `${uid}-password`;
  const currentId = `${uid}-current`;
  const newId = `${uid}-new`;
  const confirmId = `${uid}-confirm`;

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const changingPassword = login.phase === "password";

  const handleCredentialsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void login.submitCredentials();
  };

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void login.submitPasswordChange();
  };

  /**
   * A disabled submit button also disables the browser's implicit Enter
   * submission, so the key is handled here once the form is actually valid.
   */
  const submitOnEnter = (submit: () => void) => (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter" || event.shiftKey || login.busy || !login.ready) return;
    event.preventDefault();
    submit();
  };

  return (
    <div className="stack" style={{ width: "min(1080px, 100%)", gap: "var(--space-4)" }}>
      <div className="grid gap-4 lg:grid-cols-[1.05fr_minmax(340px,420px)] lg:items-stretch">
        {/* Brand side carries the product promise; hidden on small screens so the
            form is the first thing a phone shows. */}
        <aside className="hero hidden flex-col justify-between gap-6 lg:flex" aria-label="Giới thiệu OneOps">
          <div className="stack">
            <div className="row">
              <span className="avatar" aria-hidden="true">
                <ShieldGlyph size={18} />
              </span>
              <span className="page-eyebrow">OneOps · Vận hành nội bộ</span>
            </div>
            <p
              className="font-semibold"
              style={{ fontSize: "var(--type-display-size)", lineHeight: "var(--type-display-line)" }}
            >
              Một danh tính cho toàn bộ vận hành.
            </p>
            <p className="muted" style={{ maxWidth: "34ch" }}>
              Công việc, nhân sự, khách hàng và tự động hoá dùng chung một phiên đăng nhập, một nhật ký
              kiểm toán.
            </p>
          </div>

          <ul className="list">
            <li className="list-row">
              <span className="list-main">
                <strong>Hai vai trò rõ ràng</strong>
                <span className="list-meta">Nhân viên và Quản lý, cộng cờ quản trị hệ thống khi cần.</span>
              </span>
            </li>
            <li className="list-row">
              <span className="list-main">
                <strong>Thao tác quản trị đều được ghi lại</strong>
                <span className="list-meta">Mỗi thay đổi quyền, khoá tài khoản đều có người thực hiện.</span>
              </span>
            </li>
            <li className="list-row">
              <span className="list-main">
                <strong>Mật khẩu không bao giờ hiển thị lại</strong>
                <span className="list-meta">Hệ thống chỉ lưu dấu vết kiểm tra, không trả mật khẩu về.</span>
              </span>
            </li>
          </ul>
        </aside>

        <section className="surface" aria-labelledby={`${uid}-title`}>
          <div className="surface-body stack" style={{ gap: "var(--space-5)" }}>
            <header className="stack" style={{ gap: "var(--space-1)" }}>
              <p className="page-eyebrow">{changingPassword ? "Bước 2/2 · Bảo mật" : "OneOps"}</p>
              <h1
                id={`${uid}-title`}
                className="font-semibold"
                style={{ fontSize: "var(--type-title-size)", lineHeight: "var(--type-title-line)" }}
              >
                {changingPassword ? "Đặt mật khẩu riêng" : "Đăng nhập"}
              </h1>
              <p className="muted">
                {changingPassword
                  ? "Tài khoản của bạn đang dùng mật khẩu tạm. Chọn mật khẩu riêng trước khi tiếp tục."
                  : "Dùng tài khoản nội bộ do quản trị viên cấp."}
              </p>
            </header>

            <div className="stack" style={{ gap: "var(--space-3)" }} aria-live="polite">
              {login.serverError ? (
                <div className="alert alert-danger" role="alert">
                  <AlertGlyph />
                  <span className="spread" style={{ flex: 1, gap: "var(--space-3)" }}>
                    <span>{login.serverError}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={login.dismissError}
                    >
                      Đóng
                    </button>
                  </span>
                </div>
              ) : null}

              {login.notice ? (
                <div className="alert alert-warning">
                  <LockGlyph />
                  <span>{login.notice}</span>
                </div>
              ) : null}

              {!changingPassword && login.needsSetup ? (
                <div className="alert alert-warning">
                  <AlertGlyph />
                  <span>
                    Hệ thống chưa có tài khoản nào. Nhờ quản trị viên tạo tài khoản Quản lý đầu tiên kèm
                    quyền quản trị hệ thống.
                  </span>
                </div>
              ) : null}
            </div>

            {changingPassword ? (
              <form
                className="stack"
                style={{ gap: "var(--space-4)" }}
                noValidate
                onSubmit={handlePasswordSubmit}
                onKeyDown={submitOnEnter(() => void login.submitPasswordChange())}
              >
                {login.actor ? (
                  <div className="row wrap">
                    <span className="badge badge-accent">
                      {ROLE_LABEL[login.actor.role]}
                    </span>
                    {login.actor.isSystemAdmin ? (
                      <span className="badge badge-info">Quản trị hệ thống</span>
                    ) : null}
                    <span className="badge badge-warning">
                      <span className="dot" aria-hidden="true" />
                      Mật khẩu tạm
                    </span>
                  </div>
                ) : null}

                <Field
                  label="Mật khẩu hiện tại"
                  htmlFor={currentId}
                  error={login.passwordErrors.currentPassword}
                  hint="Mật khẩu tạm vừa dùng để đăng nhập."
                >
                  <PasswordInput
                    id={currentId}
                    value={login.password.currentPassword}
                    visible={showCurrent}
                    onToggle={() => setShowCurrent((value) => !value)}
                    invalid={Boolean(login.passwordErrors.currentPassword)}
                    autoComplete="current-password"
                    maxLength={MAX_PASSWORD_LENGTH}
                    onChange={(value) => login.setPasswordField("currentPassword", value)}
                    onBlur={() => login.blurPasswordField("currentPassword")}
                  />
                </Field>

                <Field
                  label="Mật khẩu mới"
                  htmlFor={newId}
                  error={login.passwordErrors.newPassword}
                  hint={`Từ ${MIN_PASSWORD_LENGTH} đến ${MAX_PASSWORD_LENGTH} ký tự.`}
                >
                  <PasswordInput
                    id={newId}
                    value={login.password.newPassword}
                    visible={showNew}
                    onToggle={() => setShowNew((value) => !value)}
                    invalid={Boolean(login.passwordErrors.newPassword)}
                    autoComplete="new-password"
                    maxLength={MAX_PASSWORD_LENGTH}
                    inputRef={newPasswordRef}
                    onChange={(value) => login.setPasswordField("newPassword", value)}
                    onBlur={() => login.blurPasswordField("newPassword")}
                  />
                </Field>

                <Field
                  label="Nhập lại mật khẩu mới"
                  htmlFor={confirmId}
                  error={login.passwordErrors.confirmPassword}
                >
                  <PasswordInput
                    id={confirmId}
                    value={login.password.confirmPassword}
                    visible={showConfirm}
                    onToggle={() => setShowConfirm((value) => !value)}
                    invalid={Boolean(login.passwordErrors.confirmPassword)}
                    autoComplete="new-password"
                    maxLength={MAX_PASSWORD_LENGTH}
                    onChange={(value) => login.setPasswordField("confirmPassword", value)}
                    onBlur={() => login.blurPasswordField("confirmPassword")}
                  />
                </Field>

                <div className="stack" style={{ gap: "var(--space-2)" }}>
                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={!login.ready || login.busy}
                    aria-busy={login.busy}
                  >
                    {login.busy ? <Spinner /> : null}
                    <span>{login.busy ? "Đang lưu…" : "Đổi mật khẩu và tiếp tục"}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost w-full"
                    onClick={login.skipPasswordChange}
                    disabled={login.busy}
                  >
                    Để sau, vào làm việc
                  </button>
                </div>

                <SessionFootnote text="Hệ thống sẽ nhắc lại ở lần đăng nhập kế tiếp nếu bạn chưa đổi mật khẩu tạm." />
              </form>
            ) : (
              <form
                className="stack"
                style={{ gap: "var(--space-4)" }}
                noValidate
                onSubmit={handleCredentialsSubmit}
                onKeyDown={submitOnEnter(() => void login.submitCredentials())}
              >
                <Field label="Tên đăng nhập" htmlFor={usernameId} error={login.credentialErrors.username}>
                  <input
                    id={usernameId}
                    ref={usernameRef}
                    className="input"
                    type="text"
                    value={login.credentials.username}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={MAX_USERNAME_LENGTH}
                    aria-invalid={login.credentialErrors.username ? "true" : undefined}
                    aria-describedby={
                      login.credentialErrors.username ? `${usernameId}-error` : undefined
                    }
                    onChange={(event) => login.setCredential("username", event.target.value)}
                    onBlur={() => login.blurCredential("username")}
                  />
                </Field>

                <Field label="Mật khẩu" htmlFor={passwordId} error={login.credentialErrors.password}>
                  <PasswordInput
                    id={passwordId}
                    value={login.credentials.password}
                    visible={showLoginPassword}
                    onToggle={() => setShowLoginPassword((value) => !value)}
                    invalid={Boolean(login.credentialErrors.password)}
                    autoComplete="current-password"
                    maxLength={MAX_PASSWORD_LENGTH}
                    inputRef={passwordRef}
                    onChange={(value) => login.setCredential("password", value)}
                    onBlur={() => login.blurCredential("password")}
                  />
                </Field>

                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={!login.ready || login.busy}
                  aria-busy={login.busy}
                >
                  {login.busy ? <Spinner /> : null}
                  <span>{login.busy ? "Đang kiểm tra…" : "Đăng nhập"}</span>
                </button>

                <SessionFootnote
                  text={
                    login.idleMinutes
                      ? `Phiên tự đóng sau ${login.idleMinutes} phút không hoạt động. ${SESSION_COOKIE_NOTE}`
                      : SESSION_COOKIE_NOTE
                  }
                />
              </form>
            )}
          </div>
        </section>
      </div>

      <footer className="page-footnote">
        Quên mật khẩu? Liên hệ quản trị viên hệ thống để được cấp lại — hệ thống không gửi email tự động.
      </footer>
    </div>
  );
}

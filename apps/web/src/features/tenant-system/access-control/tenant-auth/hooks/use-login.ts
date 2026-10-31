"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ApiError, changePassword, login, setup } from "../api/client";
import { MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH, MIN_PASSWORD_LENGTH } from "../constants";
import type { SessionActor } from "../types";

/** Two step flow: the API flags temporary passwords through `mustChangePassword`. */
export type LoginPhase = "credentials" | "password";

export interface Credentials {
  username: string;
  password: string;
}

export interface PasswordDraft {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type CredentialField = keyof Credentials;
export type PasswordField = keyof PasswordDraft;

export type CredentialErrors = Partial<Record<CredentialField, string>>;
export type PasswordErrors = Partial<Record<PasswordField, string>>;

const CREDENTIAL_ORDER: readonly CredentialField[] = ["username", "password"];
const PASSWORD_ORDER: readonly PasswordField[] = [
  "currentPassword",
  "newPassword",
  "confirmPassword",
];

function checkCredentials(draft: Credentials): CredentialErrors {
  const errors: CredentialErrors = {};
  const username = draft.username.trim();

  if (!username) errors.username = "Nhập tên đăng nhập.";
  else if (username.length > MAX_USERNAME_LENGTH)
    errors.username = `Tên đăng nhập tối đa ${MAX_USERNAME_LENGTH} ký tự.`;

  if (!draft.password) errors.password = "Nhập mật khẩu.";
  else if (draft.password.length > MAX_PASSWORD_LENGTH)
    errors.password = `Mật khẩu tối đa ${MAX_PASSWORD_LENGTH} ký tự.`;

  return errors;
}

function checkPassword(draft: PasswordDraft): PasswordErrors {
  const errors: PasswordErrors = {};

  if (!draft.currentPassword) errors.currentPassword = "Nhập mật khẩu hiện tại.";
  else if (draft.currentPassword.length > MAX_PASSWORD_LENGTH)
    errors.currentPassword = `Mật khẩu tối đa ${MAX_PASSWORD_LENGTH} ký tự.`;

  if (!draft.newPassword) errors.newPassword = "Nhập mật khẩu mới.";
  else if (draft.newPassword.length < MIN_PASSWORD_LENGTH)
    errors.newPassword = `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  else if (draft.newPassword.length > MAX_PASSWORD_LENGTH)
    errors.newPassword = `Mật khẩu mới tối đa ${MAX_PASSWORD_LENGTH} ký tự.`;
  else if (draft.newPassword === draft.currentPassword)
    errors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại.";

  if (!draft.confirmPassword) errors.confirmPassword = "Nhập lại mật khẩu mới.";
  else if (draft.confirmPassword !== draft.newPassword)
    errors.confirmPassword = "Mật khẩu nhập lại không khớp.";

  return errors;
}

/**
 * Zod issue paths arrive as plain strings. Only the fields the form actually
 * owns may receive an error, so unknown paths are dropped instead of invented.
 */
function fieldErrorsOf<T extends string>(
  issues: readonly { path: string; message: string }[],
  allowed: readonly T[],
): Partial<Record<T, string>> {
  const mapped: Partial<Record<T, string>> = {};
  for (const issue of issues) {
    const field = allowed.find((candidate) => candidate === issue.path);
    if (field && !mapped[field]) mapped[field] = issue.message;
  }
  return mapped;
}

export interface LoginRefs {
  usernameRef: RefObject<HTMLInputElement | null>;
  passwordRef: RefObject<HTMLInputElement | null>;
  newPasswordRef: RefObject<HTMLInputElement | null>;
}

export interface UseLoginResult {
  phase: LoginPhase;
  credentials: Credentials;
  credentialErrors: CredentialErrors;
  password: PasswordDraft;
  passwordErrors: PasswordErrors;
  /** Server text is shown verbatim so the user sees the real reason. */
  serverError: string | null;
  notice: string | null;
  busy: boolean;
  ready: boolean;
  needsSetup: boolean;
  idleMinutes: number | null;
  actor: SessionActor | null;
  setCredential: (field: CredentialField, value: string) => void;
  blurCredential: (field: CredentialField) => void;
  setPasswordField: (field: PasswordField, value: string) => void;
  blurPasswordField: (field: PasswordField) => void;
  submitCredentials: () => Promise<void>;
  submitPasswordChange: () => Promise<void>;
  skipPasswordChange: () => void;
  dismissError: () => void;
}

export function useLogin(onSignedIn: () => void, refs: LoginRefs): UseLoginResult {
  const [phase, setPhase] = useState<LoginPhase>("credentials");
  const [credentials, setCredentials] = useState<Credentials>({ username: "", password: "" });
  const [credentialErrors, setCredentialErrors] = useState<CredentialErrors>({});
  const [password, setPassword] = useState<PasswordDraft>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState<number | null>(null);
  const [actor, setActor] = useState<SessionActor | null>(null);

  /* Refs arrive from the caller so this hook never hands one back to a render. */
  const { usernameRef, passwordRef, newPasswordRef } = refs;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // First-run detection only; a failed probe must not block sign-in.
    setup()
      .then((state) => {
        if (cancelled) return;
        setNeedsSetup(state.needsSetup);
        setIdleMinutes(state.idleMinutes);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const setCredential = useCallback((field: CredentialField, value: string) => {
    setCredentials((current) => ({ ...current, [field]: value }));
    setCredentialErrors((current) => ({ ...current, [field]: undefined }));
    setServerError(null);
  }, []);

  const blurCredential = useCallback(
    (field: CredentialField) => {
      const errors = checkCredentials(credentials);
      setCredentialErrors((current) =>
        current[field] === errors[field] ? current : { ...current, [field]: errors[field] },
      );
    },
    [credentials],
  );

  const setPasswordField = useCallback((field: PasswordField, value: string) => {
    setPassword((current) => ({ ...current, [field]: value }));
    setPasswordErrors((current) => ({ ...current, [field]: undefined }));
    setServerError(null);
  }, []);

  const blurPasswordField = useCallback(
    (field: PasswordField) => {
      // Cross-field rules (new vs current, confirm vs new) are re-checked on the
      // whole draft so leaving one field never hides another field's mismatch.
      const errors = checkPassword(password);
      setPasswordErrors((current) =>
        current[field] === errors[field] ? current : { ...current, [field]: errors[field] },
      );
    },
    [password],
  );

  const submitCredentials = useCallback(async () => {
    const errors = checkCredentials(credentials);
    setCredentialErrors(errors);
    const firstError = CREDENTIAL_ORDER.find((field) => errors[field]);
    if (firstError) {
      if (firstError === "username") usernameRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    setBusy(true);
    setServerError(null);
    setNotice(null);

    try {
      const result = await login({
        username: credentials.username.trim(),
        password: credentials.password,
      });
      if (!mounted.current) return;

      setActor(result.actor);
      setIdleMinutes(result.idleMinutes);

      if (result.actor.mustChangePassword) {
        // Reuse the credential just typed: it is already in memory and the API
        // checks it against the stored hash anyway.
        setPassword({ currentPassword: credentials.password, newPassword: "", confirmPassword: "" });
        setPasswordErrors({});
        setPhase("password");
        setNotice(
          "Mật khẩu này là mật khẩu tạm do quản trị viên cấp. Đổi sang mật khẩu riêng trước khi làm việc.",
        );
        window.setTimeout(() => newPasswordRef.current?.focus(), 0);
        return;
      }

      onSignedIn();
    } catch (error) {
      if (!mounted.current) return;
      if (error instanceof ApiError) {
        setServerError(error.message);
        const mapped = fieldErrorsOf(error.issues, CREDENTIAL_ORDER);
        if (Object.keys(mapped).length > 0) setCredentialErrors(mapped);
        else if (error.status === 401) passwordRef.current?.focus();
      } else {
        setServerError("Không đăng nhập được. Thử lại sau ít phút.");
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [credentials, onSignedIn]);

  const submitPasswordChange = useCallback(async () => {
    const errors = checkPassword(password);
    setPasswordErrors(errors);
    const firstError = PASSWORD_ORDER.find((field) => errors[field]);
    if (firstError) {
      if (firstError === "currentPassword") passwordRef.current?.focus();
      else newPasswordRef.current?.focus();
      return;
    }

    setBusy(true);
    setServerError(null);

    try {
      await changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      if (!mounted.current) return;
      setNotice("Đã đổi mật khẩu. Đang mở bảng điều khiển…");
      onSignedIn();
    } catch (error) {
      if (!mounted.current) return;
      if (error instanceof ApiError) {
        setServerError(error.message);
        const mapped = fieldErrorsOf(error.issues, PASSWORD_ORDER);
        if (Object.keys(mapped).length > 0) setPasswordErrors(mapped);
        else if (error.status === 401 || error.status === 422) passwordRef.current?.focus();
      } else {
        setServerError("Không đổi được mật khẩu. Thử lại sau ít phút.");
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [password, onSignedIn]);

  const skipPasswordChange = useCallback(() => {
    onSignedIn();
  }, [onSignedIn]);

  const dismissError = useCallback(() => setServerError(null), []);

  const ready =
    phase === "credentials"
      ? credentials.username.trim().length > 0 && credentials.password.length > 0
      : password.currentPassword.length > 0 &&
        password.newPassword.length > 0 &&
        password.confirmPassword.length > 0;

  return {
    phase,
    credentials,
    credentialErrors,
    password,
    passwordErrors,
    serverError,
    notice,
    busy,
    ready,
    needsSetup,
    idleMinutes,
    actor,
    setCredential,
    blurCredential,
    setPasswordField,
    blurPasswordField,
    submitCredentials,
    submitPasswordChange,
    skipPasswordChange,
    dismissError,
  };
}

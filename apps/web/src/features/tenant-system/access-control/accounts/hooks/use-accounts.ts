"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  accountTotal,
  changeAccess,
  createAccount,
  currentSession,
  listAccounts,
  resetPassword,
  updateAccount,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, ROLE_LABELS } from "../constants";
import type {
  Account,
  AccountListQuery,
  AccountStatus,
  ChangeAccessInput,
  CreateAccountInput,
  PageResult,
  SessionActor,
  UpdateAccountInput,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

export interface AccountTotals {
  all: number;
  active: number;
  locked: number;
  managers: number;
}

type AccessPatch = Omit<ChangeAccessInput, "actorName" | "version">;

const EMPTY: PageResult<Account> = { items: [], total: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE };

/** Rollback copy for every failed mutation, kept in one place. */
export function toFeedback(caught: unknown, fallback: string): Feedback {
  if (caught instanceof ApiError) {
    return caught.status === 409
      ? {
          tone: "error",
          message: caught.message,
          hint: "Dữ liệu vừa thay đổi ở nơi khác. Tải lại danh sách rồi thực hiện lại thao tác.",
        }
      : { tone: "error", message: caught.message };
  }
  return { tone: "error", message: fallback };
}

function accessMessage(account: Account, patch: AccessPatch): string {
  if (patch.status === "LOCKED") return `Đã khoá tài khoản ${account.username}.`;
  if (patch.status === "ACTIVE") return `Đã mở khoá tài khoản ${account.username}.`;
  if (patch.role) return `Đã đổi vai trò ${account.username} thành “${ROLE_LABELS[patch.role]}”.`;
  if (patch.isSystemAdmin !== undefined)
    return patch.isSystemAdmin
      ? `Đã cấp quyền quản trị hệ thống cho ${account.username}.`
      : `Đã thu hồi quyền quản trị hệ thống của ${account.username}.`;
  return `Đã cập nhật quyền truy cập của ${account.username}.`;
}

/**
 * Owns the account list, its filters and the signed-in actor. Mutations are
 * optimistic only where a status flip is reversible (lock / unlock); every other
 * change waits for the server answer.
 */
export function useAccounts() {
  const [query, setQuery] = useState<AccountListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    role: "",
    status: "",
  });
  const [term, setTerm] = useState("");
  const [data, setData] = useState<PageResult<Account>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [actor, setActor] = useState<SessionActor | null>(null);
  const [actorMissing, setActorMissing] = useState(false);
  const [totals, setTotals] = useState<AccountTotals | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, AccountStatus>>({});
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  /* Typing must not fire a request per keystroke. */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(query.q ?? "");
      setQuery((current) => (current.page === 1 ? current : { ...current, page: 1 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query.q]);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    listAccounts({ ...query, q: term })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
        setOptimistic({});
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError ? caught : new ApiError(0, "Không tải được danh sách tài khoản."),
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [query, term, tick]);

  useEffect(() => {
    let cancelled = false;
    currentSession()
      .then((session) => {
        if (cancelled) return;
        setActor(session.actor);
        setActorMissing(false);
      })
      .catch(() => {
        /* Without a session every write is refused anyway; the page shows it. */
        if (!cancelled) {
          setActor(null);
          setActorMissing(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      accountTotal({}),
      accountTotal({ status: "ACTIVE" }),
      accountTotal({ status: "LOCKED" }),
      accountTotal({ role: "MANAGER" }),
    ])
      .then(([all, active, locked, managers]) => {
        if (cancelled) return;
        setTotals({ all, active, locked, managers });
      })
      .catch(() => {
        /* The strip hides itself rather than showing invented numbers. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const patchQuery = useCallback((patch: Partial<AccountListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, q: "", role: "", status: "", page: 1 }));
  }, []);

  const actorName = useCallback(() => {
    if (!actor) throw new ApiError(401, "Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi thử tiếp.");
    return actor.displayName;
  }, [actor]);

  const create = useCallback(
    async (draft: Omit<CreateAccountInput, "actorName">) => {
      const created = await createAccount({ ...draft, actorName: actorName() });
      setFeedback({
        tone: "success",
        message: `Đã tạo tài khoản ${created.username}.`,
        hint: created.mustChangePassword
          ? "Người dùng sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập kế tiếp."
          : "Chia sẻ mật khẩu ban đầu cho người dùng qua kênh nội bộ, không gửi qua hệ thống.",
      });
      reload();
      return created;
    },
    [actorName, reload],
  );

  const update = useCallback(
    async (account: Account, patch: Omit<UpdateAccountInput, "version">) => {
      const updated = await updateAccount(account.id, { ...patch, version: account.version });
      setFeedback({
        tone: "success",
        message: `Đã lưu thông tin của ${updated.username}.`,
      });
      reload();
      return updated;
    },
    [reload],
  );

  const setAccess = useCallback(
    async (account: Account, patch: AccessPatch) => {
      const nextStatus = patch.status;
      if (nextStatus) setOptimistic((current) => ({ ...current, [account.id]: nextStatus }));
      setPendingId(account.id);
      try {
        const updated = await changeAccess(account.id, {
          ...patch,
          actorName: actorName(),
          version: account.version,
        });
        setFeedback({ tone: "success", message: accessMessage(updated, patch) });
        reload();
        return updated;
      } catch (caught) {
        setOptimistic((current) => {
          const next = { ...current };
          delete next[account.id];
          return next;
        });
        setFeedback(toFeedback(caught, "Chưa đổi được quyền truy cập của tài khoản."));
        throw caught;
      } finally {
        setPendingId(null);
      }
    },
    [actorName, reload],
  );

  const setPassword = useCallback(
    async (account: Account, password: string, reason: string) => {
      setPendingId(account.id);
      try {
        const updated = await resetPassword(account.id, {
          password,
          reason: reason.trim() || undefined,
          actorName: actorName(),
          version: account.version,
        });
        setFeedback({
          tone: "success",
          message: `Đã đặt lại mật khẩu cho ${updated.username}.`,
          hint: "Mật khẩu không hiển thị lại ở đâu. Người dùng phải đổi ở lần đăng nhập kế tiếp.",
        });
        reload();
        return updated;
      } catch (caught) {
        setFeedback(toFeedback(caught, "Chưa đặt lại được mật khẩu."));
        throw caught;
      } finally {
        setPendingId(null);
      }
    },
    [actorName, reload],
  );

  const filtersActive = Boolean(term || query.role || query.status);
  const canManage = actor?.isSystemAdmin ?? false;

  return {
    query,
    term,
    data,
    loading,
    error,
    actor,
    actorMissing,
    totals,
    feedback,
    pendingId,
    optimistic,
    filtersActive,
    canManage,
    patchQuery,
    clearFilters,
    reload,
    create,
    update,
    setAccess,
    setPassword,
    setFeedback,
  };
}

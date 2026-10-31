"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  actionsOf,
  attendanceTotal,
  createAttendance,
  listAttendance,
  lockAttendance,
  permissionsMe,
  session,
  updateAttendance,
  type AttendanceListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY } from "../constants";
import { nowClock, todayIso } from "../format";
import type {
  AttendanceRecord,
  AttendanceStatus,
  PageResult,
  PermissionSnapshot,
  Session,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

type Scope = "mine" | "all";

const EMPTY: PageResult<AttendanceRecord> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

function reason(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

/**
 * Owns the record list, the “my day” record and the permission snapshot.
 * Locking is applied optimistically and rolled back on refusal, because the row
 * must not look locked while the server still says otherwise.
 */
export function useDailyCheckin() {
  const [query, setQuery] = useState<AttendanceListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
    from: "",
    to: "",
  });
  const [term, setTerm] = useState("");
  const [scope, setScope] = useState<Scope>("mine");
  const [data, setData] = useState<PageResult<AttendanceRecord>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayIssue, setTodayIssue] = useState<string | null>(null);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [locked, setLocked] = useState<Record<string, AttendanceStatus>>({});
  const [busy, setBusy] = useState<"in" | "out" | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  const myId = sessionData?.actor.employeeId ?? "";

  /* Typing must not fire a request per keystroke. */
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query.q ?? ""), 350);
    return () => window.clearTimeout(timer);
  }, [query.q]);

  useEffect(() => {
    let cancelled = false;
    session()
      .then((me) => {
        if (!cancelled) setSessionData(me);
      })
      .catch(() => {
        if (!cancelled) setTodayIssue("Chưa đọc được phiên đăng nhập.");
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    permissionsMe()
      .then((body) => {
        if (cancelled) return;
        setPermission({
          role: body.role,
          isSystemAdmin: body.isSystemAdmin,
          actions: actionsOf(body, FEATURE_KEY),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setPermission({ role: "EMPLOYEE", isSystemAdmin: false, actions: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const employeeFilter = scope === "mine" ? myId : "";

  useEffect(() => {
    /* “Của tôi” cannot run before the session names the employee. */
    if (scope === "mine" && !myId) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    listAttendance({ ...query, q: term, employeeId: employeeFilter || undefined })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được danh sách chấm công."),
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [query, term, employeeFilter, scope, myId, tick]);

  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    const day = todayIso();
    setTodayLoading(true);
    listAttendance({ page: 1, pageSize: 1, employeeId: myId, from: day, to: day })
      .then((result) => {
        if (cancelled) return;
        setTodayRecord(result.items[0] ?? null);
        setTodayIssue(null);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setTodayIssue(reason(caught, "Không tải được bản ghi hôm nay."));
      })
      .finally(() => {
        if (!cancelled) setTodayLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [myId, tick]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      attendanceTotal("OPEN"),
      attendanceTotal("COMPLETE"),
      attendanceTotal("LOCKED"),
    ])
      .then(([open, complete, lockedCount]) => {
        if (!cancelled) setTotals({ open, complete, locked: lockedCount });
      })
      .catch(() => {
        /* The strip hides itself rather than showing invented numbers. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  /* The reload that follows a lock carries the real status; drop the guess. */
  useEffect(() => setLocked({}), [data]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const can = useCallback(
    (action: string) => permission?.actions.includes(action) ?? false,
    [permission],
  );

  const patchQuery = useCallback((patch: Partial<AttendanceListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const changeScope = useCallback((next: Scope) => {
    setScope(next);
    setQuery((current) => ({ ...current, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, q: "", status: "", from: "", to: "", page: 1 }));
  }, []);

  const clockIn = useCallback(async () => {
    if (!sessionData) {
      setFeedback({
        tone: "error",
        message: "Chưa đọc được phiên đăng nhập nên không ghi được giờ vào.",
        hint: "Đăng nhập lại rồi thử tiếp.",
      });
      return;
    }
    setBusy("in");
    setFeedback(null);
    try {
      const created = await createAttendance({
        employeeId: sessionData.actor.employeeId,
        employeeName: sessionData.actor.displayName || sessionData.actor.username,
        workDate: todayIso(),
        checkIn: nowClock(),
        source: "WEB",
        note: "",
      });
      setTodayRecord(created);
      setFeedback({ tone: "success", message: `Đã ghi nhận giờ vào lúc ${created.checkIn}.` });
      reload();
    } catch (caught) {
      setFeedback({
        tone: "error",
        message: reason(caught, "Chưa ghi được giờ vào."),
        hint: "Bản ghi hôm nay không thay đổi. Nếu đã chấm công, kiểm tra lịch sử bên dưới.",
      });
    } finally {
      setBusy(null);
    }
  }, [reload, sessionData]);

  const clockOut = useCallback(async () => {
    if (!todayRecord) return;
    setBusy("out");
    setFeedback(null);
    try {
      const updated = await updateAttendance(todayRecord.id, {
        checkOut: nowClock(),
        version: todayRecord.version,
      });
      setTodayRecord(updated);
      setFeedback({ tone: "success", message: `Đã ghi nhận giờ ra lúc ${updated.checkOut ?? "—"}.` });
      reload();
    } catch (caught) {
      setFeedback({
        tone: "error",
        message: reason(caught, "Chưa ghi được giờ ra."),
        hint: "Giờ ra cũ vẫn được giữ nguyên.",
      });
    } finally {
      setBusy(null);
    }
  }, [reload, todayRecord]);

  const patch = useCallback(
    async (id: string, changes: { checkIn?: string; checkOut?: string | null; note?: string }) => {
      const current = data.items.find((item) => item.id === id);
      if (!current) return;
      setSavingId(id);
      try {
        const updated = await updateAttendance(id, { ...changes, version: current.version });
        setFeedback({
          tone: "success",
          message: `Đã lưu bản ghi ngày ${updated.workDate}.`,
          hint: "Giờ mới có hiệu lực cho lần tính công tiếp theo.",
        });
        reload();
      } catch (caught) {
        setFeedback({
          tone: "error",
          message: reason(caught, "Chưa lưu được bản ghi."),
          hint: "Dữ liệu trên màn hình vẫn là bản trước khi sửa.",
        });
        throw caught;
      } finally {
        setSavingId(null);
      }
    },
    [data.items, reload],
  );

  const lock = useCallback(
    async (record: AttendanceRecord) => {
      setLocked((current) => ({ ...current, [record.id]: "LOCKED" }));
      setSavingId(record.id);
      try {
        await lockAttendance(record.id, record.version);
        setFeedback({
          tone: "success",
          message: `Đã chốt bản ghi ngày ${record.workDate} của ${record.employeeName}.`,
          hint: "Bản ghi đã chốt không sửa được nữa; điều chỉnh phải gửi giải trình.",
        });
        reload();
        return true;
      } catch (caught) {
        setLocked((current) => {
          const next = { ...current };
          delete next[record.id];
          return next;
        });
        setFeedback({
          tone: "error",
          message: reason(caught, "Chưa chốt được bản ghi."),
          hint: "Bản ghi đã trở về trạng thái trước đó. Tải lại để xem bản mới nhất.",
        });
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [reload],
  );

  const filtersActive = Boolean(term || query.status || query.from || query.to);

  const result = useMemo(
    () => ({
      data,
      loading,
      error,
      session: sessionData,
      permission,
      todayRecord,
      todayLoading,
      todayIssue,
      totals,
      locked,
      busy,
      savingId,
      feedback,
      scope,
      filtersActive,
    }),
    [
      data,
      loading,
      error,
      sessionData,
      permission,
      todayRecord,
      todayLoading,
      todayIssue,
      totals,
      locked,
      busy,
      savingId,
      feedback,
      scope,
      filtersActive,
    ],
  );

  return {
    ...result,
    query,
    term,
    patchQuery,
    changeScope,
    clearFilters,
    reload,
    can,
    clockIn,
    clockOut,
    lock,
    patch,
    setFeedback,
  };
}

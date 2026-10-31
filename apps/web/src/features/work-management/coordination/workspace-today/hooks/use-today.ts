"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approvalsInbox,
  attendanceOf,
  checkIn,
  checkOut,
  myTasks,
  permissionsMe,
  session,
  unreadNotices,
} from "../api/client";
import { ATTENDANCE_KEY } from "../constants";
import { nowClock, todayIso } from "../format";
import type {
  Attendance,
  InboxEntry,
  Notice,
  PageResult,
  PermissionsMe,
  Session,
  TodayTask,
} from "../types";

type Slice = "attendance" | "tasks" | "notices" | "approvals";
type Issues = Partial<Record<Slice, string>>;

const NO_TASKS: PageResult<TodayTask> = { items: [], total: 0, page: 1, pageSize: 0 };
const NO_NOTICES: PageResult<Notice> = { items: [], total: 0, page: 1, pageSize: 0 };
const NO_APPROVALS: PageResult<InboxEntry> = { items: [], total: 0, page: 1, pageSize: 0 };

function reason(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

/**
 * Composes the dashboard from five existing endpoints. Each slice fails on its
 * own: one refused permission must not blank the whole morning.
 */
export function useToday() {
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [permissions, setPermissions] = useState<PermissionsMe | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [tasks, setTasks] = useState<PageResult<TodayTask>>(NO_TASKS);
  const [notices, setNotices] = useState<PageResult<Notice>>(NO_NOTICES);
  const [approvals, setApprovals] = useState<PageResult<InboxEntry>>(NO_APPROVALS);
  const [issues, setIssues] = useState<Issues>({});
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"in" | "out" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const workDate = todayIso();
    setLoading(true);
    setSessionError(null);

    permissionsMe()
      .then((body) => {
        if (!cancelled) setPermissions(body);
      })
      .catch(() => {
        if (!cancelled) setPermissions(null);
      });

    session()
      .then(async (me) => {
        if (cancelled) return;
        setSessionData(me);
        const [attendanceResult, taskResult, noticeResult, approvalResult] =
          await Promise.allSettled([
            attendanceOf(me.actor.employeeId, workDate),
            myTasks(me.actor.displayName),
            unreadNotices(me.actor.employeeId),
            approvalsInbox(),
          ]);
        if (cancelled) return;

        const nextIssues: Issues = {};
        if (attendanceResult.status === "fulfilled")
          setAttendance(attendanceResult.value.items[0] ?? null);
        else nextIssues.attendance = reason(attendanceResult.reason, "Không tải được điểm danh.");

        if (taskResult.status === "fulfilled") setTasks(taskResult.value);
        else nextIssues.tasks = reason(taskResult.reason, "Không tải được công việc.");

        if (noticeResult.status === "fulfilled") setNotices(noticeResult.value);
        else nextIssues.notices = reason(noticeResult.reason, "Không tải được thông báo.");

        if (approvalResult.status === "fulfilled") setApprovals(approvalResult.value);
        else nextIssues.approvals = reason(approvalResult.reason, "Không tải được hàng đợi duyệt.");

        setIssues(nextIssues);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setSessionError(reason(caught, "Chưa đọc được phiên đăng nhập."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const can = useCallback(
    (featureKey: string, action: string) =>
      permissions?.items.some(
        (item) => item.featureKey === featureKey && item.actions.includes(action),
      ) ?? false,
    [permissions],
  );

  const clockIn = async () => {
    if (!sessionData) return;
    setBusy("in");
    setFeedback(null);
    try {
      const created = await checkIn({
        employeeId: sessionData.actor.employeeId,
        employeeName: sessionData.actor.displayName || sessionData.actor.username,
        workDate: todayIso(),
        checkIn: nowClock(),
      });
      setAttendance(created);
      setFeedback(`Đã ghi nhận vào ca lúc ${created.checkIn}.`);
    } catch (caught) {
      setFeedback(reason(caught, "Chưa ghi được giờ vào."));
    } finally {
      setBusy(null);
    }
  };

  const clockOut = async () => {
    if (!attendance) return;
    setBusy("out");
    setFeedback(null);
    try {
      const updated = await checkOut(attendance.id, attendance.version, nowClock());
      setAttendance(updated);
      setFeedback(`Đã ghi nhận ra ca lúc ${updated.checkOut ?? "—"}.`);
    } catch (caught) {
      setFeedback(reason(caught, "Chưa ghi được giờ ra."));
    } finally {
      setBusy(null);
    }
  };

  const result = useMemo(
    () => ({
      session: sessionData,
      attendance,
      tasks,
      notices,
      approvals,
      issues,
      loading,
      sessionError,
      busy,
      feedback,
    }),
    [
      sessionData,
      attendance,
      tasks,
      notices,
      approvals,
      issues,
      loading,
      sessionError,
      busy,
      feedback,
    ],
  );

  return {
    ...result,
    reload,
    can,
    clockIn,
    clockOut,
    setFeedback,
    attendanceAccess: can(ATTENDANCE_KEY, "view"),
    accessReady: permissions !== null,
  };
}

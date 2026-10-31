"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  actionsOf,
  createLine,
  createPeriod,
  listLines,
  listPeriods,
  permissionsMe,
  periodSummary,
  session,
  updateLine,
  updatePeriod,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY, PERIOD_STATUS_LABEL } from "../constants";
import type {
  AttendancePeriod,
  LineInput,
  LinePatch,
  PageResult,
  PeriodInput,
  PeriodLine,
  PeriodPatch,
  PeriodStatus,
  PeriodSummary,
  PermissionSnapshot,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

const emptyPage = <T,>(pageSize: number): PageResult<T> => ({
  items: [],
  total: 0,
  page: 1,
  pageSize,
});

function reason(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

function toApiError(caught: unknown, fallback: string): ApiError {
  return caught instanceof ApiError ? caught : new ApiError(0, fallback);
}

export function useAttendanceReports() {
  const [periodStatusFilter, setPeriodStatusFilter] = useState<PeriodStatus | "">("");
  const [periods, setPeriods] = useState<PageResult<AttendancePeriod>>(
    emptyPage<AttendancePeriod>(100),
  );
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [periodError, setPeriodError] = useState<ApiError | null>(null);

  const [selectedId, setSelectedId] = useState("");
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [summaryIssue, setSummaryIssue] = useState<string | null>(null);

  const [lineQuery, setLineQuery] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, q: "" });
  const [term, setTerm] = useState("");
  const [lines, setLines] = useState<PageResult<PeriodLine>>(
    emptyPage<PeriodLine>(DEFAULT_PAGE_SIZE),
  );
  const [loadingLines, setLoadingLines] = useState(false);
  const [lineError, setLineError] = useState<ApiError | null>(null);

  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [optimisticPeriod, setOptimisticPeriod] = useState<Record<string, PeriodStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [tick, setTick] = useState(0);

  const periodRequest = useRef(0);
  const lineRequest = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(lineQuery.q), 350);
    return () => window.clearTimeout(timer);
  }, [lineQuery.q]);

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
        if (!cancelled) setPermission({ role: "EMPLOYEE", isSystemAdmin: false, actions: [] });
      });
    session()
      .then(() => {
        /* The screen needs no actor data; the call keeps parity with the session
           check other screens perform and surfaces a dead cookie early. */
      })
      .catch(() => {
        /* A missing session shows up as a 401 on the data calls themselves. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    const id = ++periodRequest.current;
    setLoadingPeriods(true);
    setPeriodError(null);
    listPeriods({ page: 1, pageSize: 100, status: periodStatusFilter })
      .then((result) => {
        if (id !== periodRequest.current) return;
        setPeriods(result);
        setSelectedId((current) => {
          if (current && result.items.some((item) => item.id === current)) return current;
          return result.items[0]?.id ?? "";
        });
      })
      .catch((caught: unknown) => {
        if (id === periodRequest.current)
          setPeriodError(toApiError(caught, "Không tải được danh sách kỳ công."));
      })
      .finally(() => {
        if (id === periodRequest.current) setLoadingPeriods(false);
      });
  }, [periodStatusFilter, tick]);

  useEffect(() => {
    if (!selectedId) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    periodSummary(selectedId)
      .then((result) => {
        if (cancelled) return;
        setSummary(result);
        setSummaryIssue(null);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setSummary(null);
          setSummaryIssue(reason(caught, "Không tải được tổng hợp của kỳ công."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, tick]);

  useEffect(() => {
    if (!selectedId) {
      setLines(emptyPage<PeriodLine>(lineQuery.pageSize));
      return;
    }
    const id = ++lineRequest.current;
    setLoadingLines(true);
    setLineError(null);
    listLines({ periodId: selectedId, page: lineQuery.page, pageSize: lineQuery.pageSize, q: term })
      .then((result) => {
        if (id === lineRequest.current) setLines(result);
      })
      .catch((caught: unknown) => {
        if (id === lineRequest.current)
          setLineError(toApiError(caught, "Không tải được bảng công của kỳ."));
      })
      .finally(() => {
        if (id === lineRequest.current) setLoadingLines(false);
      });
  }, [selectedId, lineQuery.page, lineQuery.pageSize, term, tick]);

  /* The reload that follows a change carries the real status; drop the guess. */
  useEffect(() => setOptimisticPeriod({}), [periods]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const can = useCallback(
    (action: string) => permission?.actions.includes(action) ?? false,
    [permission],
  );

  const periodList = useMemo(
    () =>
      periods.items.map((period) => {
        const next = optimisticPeriod[period.id];
        return next ? { ...period, status: next } : period;
      }),
    [periods.items, optimisticPeriod],
  );

  const selected = periodList.find((period) => period.id === selectedId) ?? null;
  const readOnly = selected?.status === "CLOSED";

  const patchLineQuery = useCallback((patch: Partial<typeof lineQuery>) => {
    setLineQuery((current) => ({ ...current, ...patch }));
  }, []);

  const createPeriodRow = useCallback(
    async (input: PeriodInput) => {
      const created = await createPeriod(input);
      setFeedback({
        tone: "success",
        message: `Đã tạo kỳ công “${created.name}” (${created.periodKey}).`,
        hint: "Thêm dòng công cho từng nhân sự, hoặc để bộ phận nhân sự nhập tiếp.",
      });
      setSelectedId(created.id);
      reload();
      return created;
    },
    [reload],
  );

  const patchPeriodRow = useCallback(
    async (period: AttendancePeriod, change: Omit<PeriodPatch, "version">) => {
      const updated = await updatePeriod(period.id, { ...change, version: period.version });
      setFeedback({ tone: "success", message: `Đã cập nhật kỳ công “${updated.name}”.` });
      reload();
      return updated;
    },
    [reload],
  );

  const togglePeriodStatus = useCallback(
    async (period: AttendancePeriod) => {
      const next: PeriodStatus = period.status === "CLOSED" ? "DRAFT" : "CLOSED";
      const before = period.status;
      setOptimisticPeriod((current) => ({ ...current, [period.id]: next }));
      setSavingId(period.id);
      try {
        await updatePeriod(period.id, { status: next, version: period.version });
        setFeedback({
          tone: next === "CLOSED" ? "success" : "warning",
          message: `Kỳ “${period.name}” đã chuyển sang “${PERIOD_STATUS_LABEL[next]}”.`,
          hint:
            next === "CLOSED"
              ? "Kỳ đã chốt là chỉ đọc; mở lại thành nháp nếu cần sửa dòng công."
              : "Kỳ đã mở lại để chỉnh sửa dòng công.",
        });
        reload();
        return true;
      } catch (caught) {
        setOptimisticPeriod((current) => {
          const copy = { ...current };
          delete copy[period.id];
          return copy;
        });
        setFeedback({
          tone: "error",
          message: reason(caught, "Chưa đổi được trạng thái kỳ công."),
          hint: `Trạng thái đã trở về “${PERIOD_STATUS_LABEL[before]}”. Tải lại để thấy bản mới nhất.`,
        });
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [reload],
  );

  const createLineRow = useCallback(
    async (input: LineInput) => {
      const created = await createLine(input);
      setFeedback({
        tone: "success",
        message: `Đã thêm dòng công cho ${created.employeeName}.`,
      });
      reload();
      return created;
    },
    [reload],
  );

  const patchLineRow = useCallback(
    async (line: PeriodLine, change: Omit<LinePatch, "version">) => {
      const updated = await updateLine(line.id, { ...change, version: line.version });
      setFeedback({
        tone: "success",
        message: `Đã cập nhật dòng công của ${updated.employeeName}.`,
      });
      reload();
      return updated;
    },
    [reload],
  );

  const result = useMemo(
    () => ({
      periods: periodList,
      periodCount: periods.total,
      loadingPeriods,
      periodError,
      selected,
      selectedId,
      readOnly,
      summary,
      summaryIssue,
      lines,
      loadingLines,
      lineError,
      lineQuery,
      term,
      permission,
      optimisticPeriod,
      savingId,
      feedback,
    }),
    [
      periodList,
      periods.total,
      loadingPeriods,
      periodError,
      selected,
      selectedId,
      readOnly,
      summary,
      summaryIssue,
      lines,
      loadingLines,
      lineError,
      lineQuery,
      term,
      permission,
      optimisticPeriod,
      savingId,
      feedback,
    ],
  );

  return {
    ...result,
    periodStatusFilter,
    setPeriodStatusFilter,
    setSelectedId,
    patchLineQuery,
    reload,
    can,
    createPeriodRow,
    patchPeriodRow,
    togglePeriodStatus,
    createLineRow,
    patchLineRow,
    setFeedback,
  };
}

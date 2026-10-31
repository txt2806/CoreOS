"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  actionsOf,
  applyPattern,
  assignmentTotal,
  bulkAssign,
  createAssignment,
  createPattern,
  createShift,
  listAssignments,
  listPatterns,
  listShifts,
  patternTotal,
  permissionsMe,
  session,
  shiftTotal,
  updateAssignment,
  updatePattern,
  updateShift,
  type ScheduleListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY, SHIFT_STATUS_LABEL, type WorkspaceTab } from "../constants";
import type {
  ApplyPatternInput,
  AssignmentInput,
  AssignmentPatch,
  BulkInput,
  BulkResult,
  PageResult,
  PatternInput,
  PatternPatch,
  PermissionSnapshot,
  ScheduleAssignment,
  SchedulePattern,
  ShiftInput,
  ShiftPatch,
  ShiftStatus,
  ShiftTemplate,
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

const SHIFT_QUERY: ScheduleListQuery = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  q: "",
  status: "",
};

const PATTERN_QUERY: ScheduleListQuery = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  q: "",
  status: "",
};

const ASSIGNMENT_QUERY: ScheduleListQuery = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  q: "",
  from: "",
  to: "",
};

function reason(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

function toApiError(caught: unknown, fallback: string): ApiError {
  return caught instanceof ApiError ? caught : new ApiError(0, fallback);
}

export function useShiftsSchedules() {
  const [tab, setTab] = useState<WorkspaceTab>("assignments");

  const [shiftsQuery, setShiftsQuery] = useState<ScheduleListQuery>(SHIFT_QUERY);
  const [patternsQuery, setPatternsQuery] = useState<ScheduleListQuery>(PATTERN_QUERY);
  const [assignmentsQuery, setAssignmentsQuery] = useState<ScheduleListQuery>(ASSIGNMENT_QUERY);

  const [shiftsTerm, setShiftsTerm] = useState("");
  const [patternsTerm, setPatternsTerm] = useState("");
  const [assignmentsTerm, setAssignmentsTerm] = useState("");

  const [shifts, setShifts] = useState<PageResult<ShiftTemplate>>(
    emptyPage<ShiftTemplate>(DEFAULT_PAGE_SIZE),
  );
  const [patterns, setPatterns] = useState<PageResult<SchedulePattern>>(
    emptyPage<SchedulePattern>(DEFAULT_PAGE_SIZE),
  );
  const [assignments, setAssignments] = useState<PageResult<ScheduleAssignment>>(
    emptyPage<ScheduleAssignment>(DEFAULT_PAGE_SIZE),
  );
  /** Active shifts for the pickers; the paged list may not contain every shift. */
  const [pickerShifts, setPickerShifts] = useState<ShiftTemplate[]>([]);

  const [totals, setTotals] = useState<{ active: number; inactive: number; patterns: number; assignments: number }>({
    active: 0,
    inactive: 0,
    patterns: 0,
    assignments: 0,
  });

  const [loadingShifts, setLoadingShifts] = useState(true);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [errorShifts, setErrorShifts] = useState<ApiError | null>(null);
  const [errorPatterns, setErrorPatterns] = useState<ApiError | null>(null);
  const [errorAssignments, setErrorAssignments] = useState<ApiError | null>(null);

  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [shiftStatus, setShiftStatus] = useState<Record<string, ShiftStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [tick, setTick] = useState(0);

  const shiftRequest = useRef(0);
  const patternRequest = useRef(0);
  const assignmentRequest = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setShiftsTerm(shiftsQuery.q ?? ""), 350);
    return () => window.clearTimeout(timer);
  }, [shiftsQuery.q]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPatternsTerm(patternsQuery.q ?? ""), 350);
    return () => window.clearTimeout(timer);
  }, [patternsQuery.q]);

  useEffect(() => {
    const timer = window.setTimeout(() => setAssignmentsTerm(assignmentsQuery.q ?? ""), 350);
    return () => window.clearTimeout(timer);
  }, [assignmentsQuery.q]);

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
      .then((body) => {
        if (!cancelled) {
          setMe({
            id: body.actor.employeeId,
            name: body.actor.displayName || body.actor.username,
          });
        }
      })
      .catch(() => {
        /* Without a session the “me” shortcut stays hidden; forms still work. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    const id = ++shiftRequest.current;
    setLoadingShifts(true);
    setErrorShifts(null);
    listShifts({ ...shiftsQuery, q: shiftsTerm })
      .then((result) => {
        if (id === shiftRequest.current) setShifts(result);
      })
      .catch((caught: unknown) => {
        if (id === shiftRequest.current)
          setErrorShifts(toApiError(caught, "Không tải được danh sách ca làm việc."));
      })
      .finally(() => {
        if (id === shiftRequest.current) setLoadingShifts(false);
      });
  }, [shiftsQuery, shiftsTerm, tick]);

  useEffect(() => {
    if (tab !== "patterns") return;
    const id = ++patternRequest.current;
    setLoadingPatterns(true);
    setErrorPatterns(null);
    listPatterns({ ...patternsQuery, q: patternsTerm })
      .then((result) => {
        if (id === patternRequest.current) setPatterns(result);
      })
      .catch((caught: unknown) => {
        if (id === patternRequest.current)
          setErrorPatterns(toApiError(caught, "Không tải được mẫu tuần."));
      })
      .finally(() => {
        if (id === patternRequest.current) setLoadingPatterns(false);
      });
  }, [tab, patternsQuery, patternsTerm, tick]);

  useEffect(() => {
    if (tab !== "assignments") return;
    const id = ++assignmentRequest.current;
    setLoadingAssignments(true);
    setErrorAssignments(null);
    listAssignments({ ...assignmentsQuery, q: assignmentsTerm })
      .then((result) => {
        if (id === assignmentRequest.current) setAssignments(result);
      })
      .catch((caught: unknown) => {
        if (id === assignmentRequest.current)
          setErrorAssignments(toApiError(caught, "Không tải được lịch phân ca."));
      })
      .finally(() => {
        if (id === assignmentRequest.current) setLoadingAssignments(false);
      });
  }, [tab, assignmentsQuery, assignmentsTerm, tick]);

  useEffect(() => {
    let cancelled = false;
    listShifts({ page: 1, pageSize: 100, status: "ACTIVE" })
      .then((result) => {
        if (!cancelled) setPickerShifts(result.items);
      })
      .catch(() => {
        /* Pickers fall back to “no shift available” instead of blocking the screen. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      shiftTotal("ACTIVE").catch(() => 0),
      shiftTotal("INACTIVE").catch(() => 0),
      patternTotal().catch(() => 0),
      assignmentTotal().catch(() => 0),
    ])
      .then(([active, inactive, patternCount, assignmentCount]) => {
        if (cancelled) return;
        setTotals({
          active,
          inactive,
          patterns: patternCount,
          assignments: assignmentCount,
        });
      })
      .catch(() => {
        /* The strip degrades to zeros rather than blocking the tables. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  /* The reload that follows an edit carries the real status; drop the guess. */
  useEffect(() => setShiftStatus({}), [shifts]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const can = useCallback(
    (action: string) => permission?.actions.includes(action) ?? false,
    [permission],
  );

  const activeQuery =
    tab === "shifts" ? shiftsQuery : tab === "patterns" ? patternsQuery : assignmentsQuery;

  const patchActiveQuery = useCallback(
    (patch: Partial<ScheduleListQuery>) => {
      if (tab === "shifts") setShiftsQuery((current) => ({ ...current, ...patch }));
      else if (tab === "patterns") setPatternsQuery((current) => ({ ...current, ...patch }));
      else setAssignmentsQuery((current) => ({ ...current, ...patch }));
    },
    [tab],
  );

  const clearFilters = useCallback(() => {
    if (tab === "shifts") setShiftsQuery((current) => ({ ...current, q: "", status: "", page: 1 }));
    else if (tab === "patterns")
      setPatternsQuery((current) => ({ ...current, q: "", status: "", page: 1 }));
    else
      setAssignmentsQuery((current) => ({
        ...current,
        q: "",
        employeeId: "",
        from: "",
        to: "",
        page: 1,
      }));
  }, [tab]);

  const term =
    tab === "shifts" ? shiftsTerm : tab === "patterns" ? patternsTerm : assignmentsTerm;

  const filtersActive =
    tab === "assignments"
      ? Boolean(
          assignmentsTerm ||
            assignmentsQuery.employeeId ||
            assignmentsQuery.from ||
            assignmentsQuery.to,
        )
      : tab === "patterns"
        ? Boolean(patternsTerm || patternsQuery.status)
        : Boolean(shiftsTerm || shiftsQuery.status);

  const createShiftRow = useCallback(
    async (input: ShiftInput) => {
      const created = await createShift(input);
      setFeedback({
        tone: "success",
        message: `Đã tạo ca “${created.name}”.`,
        hint: "Gán ca cho nhân sự ở thẻ Lịch phân ca.",
      });
      reload();
      return created;
    },
    [reload],
  );

  const patchShift = useCallback(
    async (shift: ShiftTemplate, change: Omit<ShiftPatch, "version">) => {
      const updated = await updateShift(shift.id, { ...change, version: shift.version });
      setFeedback({ tone: "success", message: `Đã cập nhật ca “${updated.name}”.` });
      reload();
      return updated;
    },
    [reload],
  );

  const toggleShiftStatus = useCallback(
    async (shift: ShiftTemplate) => {
      const next: ShiftStatus = shift.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const before = shift.status;
      setShiftStatus((current) => ({ ...current, [shift.id]: next }));
      setSavingId(shift.id);
      try {
        await updateShift(shift.id, { status: next, version: shift.version });
        setFeedback({
          tone: next === "ACTIVE" ? "success" : "warning",
          message: `Ca “${shift.name}” đã chuyển sang “${SHIFT_STATUS_LABEL[next]}”.`,
          hint:
            next === "INACTIVE"
              ? "Ca đã ngừng không gán được cho ngày mới; lịch cũ vẫn giữ nguyên."
              : undefined,
        });
        reload();
        return true;
      } catch (caught) {
        setShiftStatus((current) => {
          const copy = { ...current };
          delete copy[shift.id];
          return copy;
        });
        setFeedback({
          tone: "error",
          message: reason(caught, "Chưa đổi được trạng thái ca."),
          hint: `Trạng thái đã trở về “${SHIFT_STATUS_LABEL[before]}”. Tải lại để thấy bản mới nhất.`,
        });
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [reload],
  );

  const createPatternRow = useCallback(
    async (input: PatternInput) => {
      const created = await createPattern(input);
      setFeedback({
        tone: "success",
        message: `Đã tạo mẫu tuần “${created.name}” với ${created.slots.length} ngày.`,
      });
      reload();
      return created;
    },
    [reload],
  );

  const patchPattern = useCallback(
    async (pattern: SchedulePattern, change: Omit<PatternPatch, "version">) => {
      const updated = await updatePattern(pattern.id, {
        ...change,
        version: pattern.version,
      });
      setFeedback({ tone: "success", message: `Đã cập nhật mẫu “${updated.name}”.` });
      reload();
      return updated;
    },
    [reload],
  );

  const runApply = useCallback(
    async (pattern: SchedulePattern, input: ApplyPatternInput) => {
      const result = await applyPattern(pattern.id, input);
      const skipped = result.skipped > 0 ? ` Bỏ qua ${result.skipped} ngày đã có ca.` : "";
      setFeedback({
        tone: result.created > 0 ? "success" : "warning",
        message: `Mẫu “${pattern.name}”: tạo ${result.created} lịch cho ${result.employees} nhân sự.${skipped}`,
        hint:
          result.skipped > 0
            ? "Ngày bị bỏ qua là ngày nhân sự đã có ca; gỡ lịch cũ nếu cần thay bằng ca của mẫu."
            : undefined,
      });
      reload();
      return result;
    },
    [reload],
  );

  const createAssignmentRow = useCallback(
    async (input: AssignmentInput) => {
      const created = await createAssignment(input);
      setFeedback({
        tone: "success",
        message: `Đã gán ca cho ${created.employeeName} ngày ${created.workDate}.`,
      });
      reload();
      return created;
    },
    [reload],
  );

  const runBulk = useCallback(
    async (input: BulkInput): Promise<BulkResult> => {
      const result = await bulkAssign(input);
      const skipped = result.skipped > 0 ? ` Bỏ qua ${result.skipped} ngày đã có ca.` : "";
      setFeedback({
        tone: result.created > 0 ? "success" : "warning",
        message: `Đã tạo ${result.created} lịch cho ${result.employees} nhân sự.${skipped}`,
        hint:
          result.skipped > 0
            ? "Ngày bị bỏ qua là ngày nhân sự đã có ca; mỗi ngày chỉ một ca."
            : undefined,
      });
      reload();
      return result;
    },
    [reload],
  );

  const patchAssignment = useCallback(
    async (assignment: ScheduleAssignment, change: Omit<AssignmentPatch, "version">) => {
      const updated = await updateAssignment(assignment.id, {
        ...change,
        version: assignment.version,
      });
      setFeedback({
        tone: "success",
        message: `Đã cập nhật lịch của ${updated.employeeName} ngày ${updated.workDate}.`,
      });
      reload();
      return updated;
    },
    [reload],
  );

  const pageState = useMemo(() => {
    if (tab === "shifts")
      return {
        loading: loadingShifts,
        error: errorShifts,
        total: shifts.total,
        page: shiftsQuery.page,
        pageSize: shiftsQuery.pageSize,
      };
    if (tab === "patterns")
      return {
        loading: loadingPatterns,
        error: errorPatterns,
        total: patterns.total,
        page: patternsQuery.page,
        pageSize: patternsQuery.pageSize,
      };
    return {
      loading: loadingAssignments,
      error: errorAssignments,
      total: assignments.total,
      page: assignmentsQuery.page,
      pageSize: assignmentsQuery.pageSize,
    };
  }, [
    tab,
    loadingShifts,
    loadingPatterns,
    loadingAssignments,
    errorShifts,
    errorPatterns,
    errorAssignments,
    shifts.total,
    patterns.total,
    assignments.total,
    shiftsQuery.page,
    shiftsQuery.pageSize,
    patternsQuery.page,
    patternsQuery.pageSize,
    assignmentsQuery.page,
    assignmentsQuery.pageSize,
  ]);

  return {
    tab,
    setTab,
    shifts,
    patterns,
    assignments,
    pickerShifts,
    totals,
    loading: pageState.loading,
    error: pageState.error,
    total: pageState.total,
    page: pageState.page,
    pageSize: pageState.pageSize,
    shiftsQuery,
    patternsQuery,
    assignmentsQuery,
    activeQuery,
    term,
    filtersActive,
    permission,
    me,
    shiftStatus,
    savingId,
    feedback,
    setFeedback,
    patchActiveQuery,
    clearFilters,
    reload,
    can,
    createShiftRow,
    patchShift,
    toggleShiftStatus,
    createPatternRow,
    patchPattern,
    runApply,
    createAssignmentRow,
    runBulk,
    patchAssignment,
  };
}

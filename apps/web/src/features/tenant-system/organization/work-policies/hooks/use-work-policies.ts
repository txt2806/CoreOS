"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  createHoliday,
  createNetwork,
  createQuota,
  listHolidays,
  listNetworks,
  listQuotas,
  readPolicy,
  savePolicy,
  updateHoliday,
  updateNetwork,
  updateQuota,
} from "../api/client";
import { DEFAULT_PAGE_SIZE } from "../constants";
import type {
  Holiday,
  HolidayInput,
  HolidayPatch,
  ListQuery,
  Network,
  NetworkInput,
  NetworkPatch,
  PageResult,
  Policy,
  PolicyFields,
  Quota,
  QuotaInput,
  QuotaPatch,
  Status,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

/** What each table can actually be filtered by; the DTO accepts the rest but the SQL ignores it. */
interface Capabilities {
  q: boolean;
  status: boolean;
  year: boolean;
}

const HOLIDAY_CAPS: Capabilities = { q: true, status: true, year: true };
const NETWORK_CAPS: Capabilities = { q: true, status: true, year: false };
/** Quotas have no status and `listQuotas` only reads `year`, so `q`/`status` are never sent. */
const QUOTA_CAPS: Capabilities = { q: false, status: false, year: true };

export interface PagedList<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  refreshing: boolean;
  error: ApiError | null;
  q: string;
  term: string;
  status: Status | "";
  year: number | "";
  setQ: (value: string) => void;
  setStatus: (value: Status | "") => void;
  setYear: (value: number | "") => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  filtersActive: boolean;
  clearFilters: () => void;
  reload: () => void;
  replace: (row: T) => void;
  removeLocal: (id: string) => void;
}

function usePagedList<T extends { id: string }>(
  load: (query: ListQuery) => Promise<PageResult<T>>,
  caps: Capabilities,
  fallbackMessage: string,
): PagedList<T> {
  const [result, setResult] = useState<PageResult<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [q, setQState] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatusState] = useState<Status | "">("");
  const [year, setYearState] = useState<number | "">("");
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [tick, setTick] = useState(0);
  const hasData = useRef(false);

  // One request per pause, not per keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setTerm(q.trim()), 350);
    return () => window.clearTimeout(id);
  }, [q]);

  const query = useMemo<ListQuery>(() => {
    const next: ListQuery = { page, pageSize };
    if (caps.q && term) next.q = term;
    if (caps.status && status) next.status = status;
    if (caps.year && year !== "") next.year = year;
    return next;
  }, [caps.q, caps.status, caps.year, page, pageSize, status, term, year]);

  useEffect(() => {
    let cancelled = false;
    if (hasData.current) setRefreshing(true);
    else setLoading(true);
    setError(null);
    load(query)
      .then((body) => {
        if (cancelled) return;
        hasData.current = true;
        setResult(body);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof ApiError ? caught : new ApiError(0, fallbackMessage));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fallbackMessage, load, query, tick]);

  const items = useMemo(() => result?.items ?? [], [result]);
  const total = result?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  // A filter change can leave the operator on a page that no longer exists.
  useEffect(() => {
    if (result && result.items.length === 0 && result.page > 1) setPageState(result.page - 1);
  }, [result]);

  const replace = useCallback((row: T) => {
    setResult((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) => (item.id === row.id ? row : item)),
          }
        : current,
    );
  }, []);

  const removeLocal = useCallback((id: string) => {
    setResult((current) =>
      current
        ? {
            ...current,
            items: current.items.filter((item) => item.id !== id),
            total: Math.max(0, current.total - 1),
          }
        : current,
    );
  }, []);

  const filtersActive = Boolean(term || status || year !== "");

  return {
    items,
    total,
    page: Math.min(page, lastPage),
    pageSize,
    loading,
    refreshing,
    error,
    q,
    term,
    status,
    year,
    setQ: (value) => {
      setQState(value);
      setPageState(1);
    },
    setStatus: (value) => {
      setStatusState(value);
      setPageState(1);
    },
    setYear: (value) => {
      setYearState(value);
      setPageState(1);
    },
    setPage: setPageState,
    setPageSize: (size) => {
      setPageSizeState(size);
      setPageState(1);
    },
    filtersActive,
    clearFilters: () => {
      setQState("");
      setStatusState("");
      setYearState("");
      setPageState(1);
    },
    reload: () => setTick((value) => value + 1),
    replace,
    removeLocal,
  };
}

/**
 * Optimistic status flip with rollback. When a status filter is on, the flipped
 * row can no longer match, so it leaves the table and the message says why —
 * leaving it there would promise a row a refresh would drop anyway.
 */
async function flipStatus<T extends { id: string; version: number; status: Status }>(options: {
  list: Pick<PagedList<T>, "status" | "replace" | "removeLocal">;
  row: T;
  next: Status;
  send: () => Promise<T>;
  describe: (row: T) => string;
  setPendingId: (id: string | null) => void;
  setFeedback: (feedback: Feedback | null) => void;
}) {
  const { list, row, next, send, describe, setPendingId, setFeedback } = options;
  setPendingId(row.id);
  setFeedback(null);
  list.replace({ ...row, status: next });

  try {
    const saved = await send();
    if (list.status && list.status !== saved.status) list.removeLocal(saved.id);
    else list.replace(saved);
    setFeedback({
      tone: "success",
      message:
        next === "ACTIVE"
          ? `Đã áp dụng lại ${describe(saved)}.`
          : `Đã tạm ngưng ${describe(saved)}.`,
      hint: list.status
        ? "Dòng rời danh sách vì không còn khớp bộ lọc trạng thái đang chọn."
        : "Dữ liệu chấm công đã ghi không thay đổi; chỉ lượt tính tiếp theo dùng trạng thái mới.",
    });
  } catch (caught) {
    list.replace(row);
    setFeedback({
      tone: "error",
      message:
        caught instanceof ApiError
          ? caught.message
          : `Chưa đổi được trạng thái ${describe(row)}. Đã trả lại như cũ.`,
      hint:
        caught instanceof ApiError && caught.status === 409
          ? "Bản ghi đã đổi ở nơi khác. Tải lại để lấy phiên bản mới nhất."
          : undefined,
    });
  } finally {
    setPendingId(null);
  }
}

export function useWorkPolicies() {
  const holidays = usePagedList<Holiday>(
    listHolidays,
    HOLIDAY_CAPS,
    "Không tải được danh sách ngày lễ.",
  );
  const networks = usePagedList<Network>(
    listNetworks,
    NETWORK_CAPS,
    "Không tải được danh sách mạng văn phòng.",
  );
  const quotas = usePagedList<Quota>(listQuotas, QUOTA_CAPS, "Không tải được danh sách hạn mức phép.");

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [policyError, setPolicyError] = useState<ApiError | null>(null);
  const [counts, setCounts] = useState<{ holidays: number; networks: number } | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPolicyLoading(true);
    setPolicyError(null);
    readPolicy()
      .then((body) => {
        if (!cancelled) setPolicy(body);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setPolicyError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được chính sách làm việc."),
        );
      })
      .finally(() => {
        if (!cancelled) setPolicyLoading(false);
      });

    // Separate chain: the KPI counts must not hide the policy if they fail.
    Promise.all([
      listHolidays({ status: "ACTIVE", page: 1, pageSize: 1 }),
      listNetworks({ status: "ACTIVE", page: 1, pageSize: 1 }),
    ])
      .then(([activeHolidays, activeNetworks]) => {
        if (!cancelled) {
          setCounts({ holidays: activeHolidays.total, networks: activeNetworks.total });
        }
      })
      .catch(() => {
        if (!cancelled) setCounts(null);
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const saveFields = useCallback(
    async (fields: PolicyFields) => {
      if (!policy) throw new ApiError(0, "Chính sách chưa tải xong. Thử lại sau khi trang tải xong.");
      setSavingPolicy(true);
      try {
        const saved = await savePolicy({ ...fields, version: policy.version });
        setPolicy(saved);
        setFeedback({
          tone: "success",
          message: "Đã lưu chính sách làm việc.",
          hint: `Phiên bản ${saved.version}. Không có ngày hiệu lực, nên lượt chấm công kế tiếp đã dùng cấu hình mới.`,
        });
        return saved;
      } finally {
        setSavingPolicy(false);
      }
    },
    [policy],
  );

  const describeHoliday = (row: Holiday) => `ngày lễ “${row.name}”`;
  const describeNetwork = (row: Network) => `mạng “${row.label}”`;

  const toggleHoliday = (row: Holiday) => {
    const next: Status = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    return flipStatus({
      list: holidays,
      row,
      next,
      send: () => updateHoliday(row.id, { status: next, version: row.version }),
      describe: describeHoliday,
      setPendingId,
      setFeedback,
    });
  };

  const toggleNetwork = (row: Network) => {
    const next: Status = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    return flipStatus({
      list: networks,
      row,
      next,
      send: () => updateNetwork(row.id, { status: next, version: row.version }),
      describe: describeNetwork,
      setPendingId,
      setFeedback,
    });
  };

  /*
   * Create and edit re-read the list: the server owns the ordering (date asc,
   * status then label, year desc) and the paging offsets, so a local insert
   * would put the new row on the wrong page.
   */
  const createHolidayRow = useCallback(
    async (input: HolidayInput) => {
      const saved = await createHoliday(input);
      holidays.reload();
      setFeedback({
        tone: "success",
        message: `Đã thêm ${describeHoliday(saved)} vào ${saved.date.slice(0, 4)}.`,
        hint: "Danh sách vừa tải lại để giữ đúng thứ tự ngày của máy chủ.",
      });
      return saved;
    },
    [holidays],
  );

  const updateHolidayRow = useCallback(
    async (row: Holiday, patch: HolidayPatch) => {
      const saved = await updateHoliday(row.id, patch);
      holidays.reload();
      setFeedback({
        tone: "success",
        message: `Đã cập nhật ${describeHoliday(saved)}.`,
        hint: "Danh sách vừa tải lại để giữ đúng thứ tự ngày của máy chủ.",
      });
      return saved;
    },
    [holidays],
  );

  const createNetworkRow = useCallback(
    async (input: NetworkInput) => {
      const saved = await createNetwork(input);
      networks.reload();
      setFeedback({
        tone: "success",
        message: `Đã khai báo ${describeNetwork(saved)}.`,
        hint: "Danh sách vừa tải lại để giữ thứ tự trạng thái rồi tên của máy chủ.",
      });
      return saved;
    },
    [networks],
  );

  const updateNetworkRow = useCallback(
    async (row: Network, patch: NetworkPatch) => {
      const saved = await updateNetwork(row.id, patch);
      networks.reload();
      setFeedback({
        tone: "success",
        message: `Đã cập nhật ${describeNetwork(saved)}.`,
        hint: "Danh sách vừa tải lại để giữ thứ tự trạng thái rồi tên của máy chủ.",
      });
      return saved;
    },
    [networks],
  );

  const createQuotaRow = useCallback(
    async (input: QuotaInput) => {
      const saved = await createQuota(input);
      quotas.reload();
      setFeedback({
        tone: "success",
        message: `Đã thêm hạn mức phép năm ${saved.year}.`,
        hint: "Danh sách vừa tải lại theo thứ tự năm giảm dần của máy chủ.",
      });
      return saved;
    },
    [quotas],
  );

  const updateQuotaRow = useCallback(
    async (row: Quota, patch: QuotaPatch) => {
      const saved = await updateQuota(row.id, patch);
      quotas.reload();
      setFeedback({
        tone: "success",
        message: `Đã cập nhật hạn mức phép năm ${saved.year}.`,
        hint: "Danh sách vừa tải lại theo thứ tự năm giảm dần của máy chủ.",
      });
      return saved;
    },
    [quotas],
  );

  const reloadAll = useCallback(() => {
    setTick((value) => value + 1);
    holidays.reload();
    networks.reload();
    quotas.reload();
  }, [holidays, networks, quotas]);

  return {
    policy: {
      data: policy,
      loading: policyLoading,
      error: policyError,
      saving: savingPolicy,
      counts,
      save: saveFields,
      reload: () => setTick((value) => value + 1),
    },
    holidays: {
      ...holidays,
      toggle: toggleHoliday,
      create: createHolidayRow,
      update: updateHolidayRow,
    },
    networks: {
      ...networks,
      toggle: toggleNetwork,
      create: createNetworkRow,
      update: updateNetworkRow,
    },
    quotas: {
      ...quotas,
      create: createQuotaRow,
      update: updateQuotaRow,
    },
    pendingId,
    feedback,
    setFeedback,
    reloadAll,
  };
}

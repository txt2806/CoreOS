"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  actionsOf,
  conversationTotal,
  createConversation,
  listConversations,
  permissionsMe,
  session,
  updateConversation,
  type ConversationListQuery,
} from "../api/client";
import { DEFAULT_PAGE_SIZE, FEATURE_KEY, POLL_INTERVAL_MS } from "../constants";
import type {
  Conversation,
  ConversationInput,
  ConversationStatus,
  PageResult,
  PermissionSnapshot,
} from "../types";

export interface Feedback {
  tone: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
}

const EMPTY: PageResult<Conversation> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

/**
 * Owns the conversation page, the signed-in display name and the optimistic
 * message append. There is no websocket route, so the page is re-read on focus
 * and on a 30 second interval while the tab is visible.
 */
export function useChat() {
  const [query, setQuery] = useState<ConversationListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
    status: "",
  });
  const [term, setTerm] = useState("");
  const [data, setData] = useState<PageResult<Conversation>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [author, setAuthor] = useState<string | null>(null);
  const [totals, setTotals] = useState<Partial<Record<ConversationStatus, number>>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, Conversation>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);
  const pendingRef = useRef(false);
  const queryRef = useRef({ ...query, q: term });

  /* The polling timer reads the newest query without re-arming itself every keystroke. */
  useEffect(() => {
    queryRef.current = { ...query, q: term };
  }, [query, term]);

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
    listConversations({ ...query, q: term })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (id !== requestId.current) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "Không tải được danh sách trao đổi."),
        );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [query, term, tick]);

  /* The reload after a write carries the real record; drop the guess. */
  useEffect(() => setOptimistic({}), [data]);

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
        if (!cancelled) setAuthor(body.actor.displayName);
      })
      .catch(() => {
        /* Without a name a message would be signed by nobody; keep the composer off. */
        if (!cancelled) setAuthor(null);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      (["Đang mở", "Đã đóng"] as ConversationStatus[]).map((status) =>
        conversationTotal(status).then((total) => [status, total] as const),
      ),
    )
      .then((pairs) => {
        if (cancelled) return;
        setTotals(Object.fromEntries(pairs) as Partial<Record<ConversationStatus, number>>);
      })
      .catch(() => {
        /* The strip hides itself rather than showing invented numbers. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  /* Quiet refresh: never flips the skeleton, never fights an in-flight write. */
  useEffect(() => {
    const pull = () => {
      if (document.visibilityState !== "visible" || pendingRef.current) return;
      const current = queryRef.current;
      listConversations({
        page: current.page,
        pageSize: current.pageSize,
        q: current.q ?? "",
        status: current.status ?? "",
      })
        .then((result) => setData(result))
        .catch(() => {
          /* A failed poll keeps the last good page on screen. */
        });
    };
    const timer = window.setInterval(pull, POLL_INTERVAL_MS);
    window.addEventListener("focus", pull);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", pull);
    };
  }, []);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  const can = useCallback(
    (action: string) => permission?.actions.includes(action) ?? false,
    [permission],
  );

  const patchQuery = useCallback((patch: Partial<ConversationListQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery((current) => ({ ...current, q: "", status: "", page: 1 }));
  }, []);

  const create = useCallback(
    async (input: ConversationInput) => {
      const created = await createConversation(input);
      setFeedback({
        tone: "success",
        message: `Đã mở cuộc trao đổi ${created.code}.`,
        hint: "Gửi tin nhắn đầu tiên để người tham gia vào mạch trao đổi.",
      });
      reload();
      return created;
    },
    [reload],
  );

  const send = useCallback(
    async (conversation: Conversation, text: string) => {
      const body = text.trim();
      if (!body) return false;
      if (!author) {
        setFeedback({
          tone: "error",
          message: "Chưa xác định được người dùng nên không gửi được tin nhắn.",
          hint: "Tải lại trang để lấy lại phiên đăng nhập.",
        });
        return false;
      }
      const comment = {
        id: crypto.randomUUID(),
        text: body,
        author,
        createdAt: new Date().toISOString(),
      };
      const next: Conversation = {
        ...conversation,
        fields: {
          ...conversation.fields,
          comments: [...(conversation.fields.comments ?? []), comment],
        },
      };
      pendingRef.current = true;
      setPending(conversation.id);
      setOptimistic((current) => ({ ...current, [conversation.id]: next }));
      try {
        const saved = await updateConversation(conversation.id, {
          fields: next.fields,
          version: conversation.version,
        });
        setOptimistic((current) => ({ ...current, [conversation.id]: saved }));
        reload();
        return true;
      } catch (caught) {
        setOptimistic((current) => {
          const copy = { ...current };
          delete copy[conversation.id];
          return copy;
        });
        setFeedback({
          tone: "error",
          message: "Tin nhắn chưa gửi được.",
          hint:
            caught instanceof Error
              ? `${caught.message} Nội dung vẫn còn trong ô soạn.`
              : "Nội dung vẫn còn trong ô soạn.",
        });
        return false;
      } finally {
        pendingRef.current = false;
        setPending(null);
      }
    },
    [author, reload],
  );

  const changeStatus = useCallback(
    async (conversation: Conversation, status: ConversationStatus) => {
      const previous = conversation.status;
      setPending(conversation.id);
      setOptimistic((current) => ({
        ...current,
        [conversation.id]: { ...conversation, status },
      }));
      try {
        const saved = await updateConversation(conversation.id, {
          status,
          version: conversation.version,
        });
        setOptimistic((current) => ({ ...current, [conversation.id]: saved }));
        setFeedback({
          tone: "success",
          message:
            status === "Đã đóng"
              ? `${conversation.code} đã đóng. Mọi người vẫn đọc được nội dung cũ.`
              : `${conversation.code} đã mở lại để trao đổi tiếp.`,
        });
        reload();
      } catch (caught) {
        setOptimistic((current) => {
          const copy = { ...current };
          delete copy[conversation.id];
          return copy;
        });
        setFeedback({
          tone: "error",
          message: caught instanceof Error ? caught.message : "Chưa đổi được trạng thái.",
          hint: `Cuộc trao đổi vẫn ở trạng thái “${previous}”.`,
        });
      } finally {
        setPending(null);
      }
    },
    [reload],
  );

  const filtersActive = Boolean(term || query.status);

  const rows = useMemo(
    () => data.items.map((conversation) => optimistic[conversation.id] ?? conversation),
    [data.items, optimistic],
  );

  return {
    data,
    rows,
    loading,
    error,
    permission,
    author,
    totals,
    feedback,
    pending,
    query,
    term,
    filtersActive,
    patchQuery,
    clearFilters,
    reload,
    can,
    create,
    send,
    changeStatus,
    setFeedback,
  };
}

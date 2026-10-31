"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/**
 * Subset of `GET /api/v1/auth/session` this banner needs. That call also slides
 * the server-side idle window, so it doubles as the renew endpoint — there is no
 * separate refresh route, and nothing in the form is lost when it runs.
 */
interface SessionProbe {
  idleMinutes: number;
  expiresAt: string;
}

const WARN_BEFORE_MS = 5 * 60_000;
const TICK_MS = 15_000;

const WarningGlyph = () => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 4.5 21 19H3z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);

/**
 * Guideline group #25: warn before the session dies and let the operator renew
 * in place. Mount, renew and tab-refocus all hit the session route, which is the
 * only renewal the backend offers (a sliding 30-minute idle window).
 */
export function SessionBanner() {
  const [probe, setProbe] = useState<SessionProbe | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [renewing, setRenewing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  const read = useCallback(async () => {
    let response: Response;
    try {
      response = await fetch("/api/v1/auth/session", { credentials: "same-origin" });
    } catch {
      setProblem("Mất kết nối nên chưa kiểm tra được phiên đăng nhập. Dữ liệu đang nhập vẫn giữ nguyên.");
      return;
    }
    if (response.status === 401) {
      setSignedOut(true);
      setProbe(null);
      return;
    }
    if (!response.ok) {
      setProblem("Máy chủ chưa trả được thông tin phiên đăng nhập. Thử lại sau ít phút.");
      return;
    }
    const body = (await response.json()) as SessionProbe;
    setSignedOut(false);
    setProblem(null);
    setProbe({ idleMinutes: body.idleMinutes, expiresAt: body.expiresAt });
    setNow(Date.now());
  }, []);

  useEffect(() => {
    void read();
  }, [read]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // A tab left in the background must re-check instead of ticking on stale data.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void read();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [read]);

  const renew = async () => {
    setRenewing(true);
    await read();
    setRenewing(false);
  };

  const remaining = probe ? new Date(probe.expiresAt).getTime() - now : Number.POSITIVE_INFINITY;
  const minutes = Math.max(1, Math.ceil(remaining / 60_000));

  if (problem) {
    return (
      <div className="alert alert-warning" role="status">
        <WarningGlyph />
        <span>{problem}</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: "auto" }}
          onClick={() => void renew()}
          disabled={renewing}
        >
          Kiểm tra lại
        </button>
      </div>
    );
  }

  if (signedOut || (probe !== null && remaining <= 0)) {
    return (
      <div className="alert alert-danger" role="alert">
        <WarningGlyph />
        <div className="stack gap-1">
          <span>Phiên đăng nhập đã hết hạn theo lần đồng bộ gần nhất.</span>
          <span className="muted">
            Nội dung đang nhập vẫn còn trên màn hình: sao chép ra ngoài trước khi đăng nhập lại, vì
            đăng nhập lại sẽ tải lại trang và xoá nội dung chưa lưu.
          </span>
        </div>
        <div className="row gap-2" style={{ marginLeft: "auto" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => void renew()}
            disabled={renewing}
            aria-busy={renewing}
          >
            {renewing ? "Đang kiểm tra…" : "Kiểm tra lại phiên"}
          </button>
          <Link className="btn btn-primary btn-sm" href="/tenant-system/auth">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  if (!probe || remaining > WARN_BEFORE_MS) return null;

  return (
    <div className="alert alert-warning" role="status" aria-live="polite">
      <WarningGlyph />
      <div className="stack gap-1">
        <span>Sắp hết phiên đăng nhập — còn khoảng {minutes} phút.</span>
        <span className="muted">
          Phiên tự hết hạn sau {probe.idleMinutes} phút không hoạt động. Gia hạn ngay để tiếp tục làm
          việc; nội dung đang nhập trong biểu mẫu vẫn giữ nguyên.
        </span>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        style={{ marginLeft: "auto" }}
        onClick={() => void renew()}
        disabled={renewing}
        aria-busy={renewing}
      >
        {renewing ? "Đang gia hạn…" : "Gia hạn phiên"}
      </button>
    </div>
  );
}

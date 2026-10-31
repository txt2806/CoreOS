"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  APPROVAL_LIMIT,
  ATTENDANCE_STATUS_LABEL,
  NOTICE_LIMIT,
  TASK_LIMIT,
  TASK_STATUS_TONE,
} from "../constants";
import {
  durationLabel,
  formatDate,
  formatDateTime,
  greeting,
  minutesBetween,
  nowClock,
  todayIso,
  weekdayLabel,
} from "../format";
import { useToday } from "../hooks/use-today";

const CLOSED = ["Hoàn thành", "Đã hủy"];

function WidgetHead({ id, title, note }: { id: string; title: string; note: string }) {
  return (
    <div className="widget-head">
      <div className="stack gap-1">
        <h2 className="widget-title" id={id}>
          {title}
        </h2>
        <span className="widget-note">{note}</span>
      </div>
    </div>
  );
}

function Lines({ rows = 2 }: { rows?: number }) {
  return (
    <div className="stack gap-2" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <span
          key={index}
          className="skeleton skeleton-line"
          style={{ width: index === 0 ? "82%" : "64%" }}
        />
      ))}
    </div>
  );
}

/**
 * The morning screen. It composes five existing endpoints — no summary route was
 * invented for it, and every widget states its own failure.
 */
export function WorkspaceTodayPage() {
  const today = useToday();
  const [now, setNow] = useState<Date | null>(null);

  /* Time-dependent text renders after mount so SSR and client agree exactly. */
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const dayKey = now ? todayIso(now) : "";

  const openTasks = useMemo(
    () =>
      today.tasks.items
        .filter((task) => !CLOSED.includes(task.status))
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(0, TASK_LIMIT),
    [today.tasks.items],
  );

  const overdue = dayKey
    ? openTasks.filter((task) => task.date < dayKey).length
    : 0;

  const attendance = today.attendance;
  const worked =
    attendance?.checkOut ? minutesBetween(attendance.checkIn, attendance.checkOut) : null;
  const name = today.session?.actor.displayName ?? today.session?.actor.username ?? "";

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Trung tâm điều hành</p>
          <h1>
            {now ? greeting(now) : "Chào bạn"}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="page-lede">
            {now ? weekdayLabel(now) : "Đang tải ngày làm việc…"} · Đây là những việc cần
            bạn quyết định trước khi mở các phân hệ khác.
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" href="/work-management/tasks">
            Mở bảng công việc
          </Link>
          <Link className="btn btn-primary" href="/work-management/kanban">
            Bảng Kanban
          </Link>
        </div>
      </header>

      {today.sessionError ? (
        <div className="alert alert-danger" role="alert">
          <div className="stack gap-1">
            <span>{today.sessionError}</span>
            <span className="muted">
              Phiên đăng nhập có thể đã hết hạn sau 30 phút không thao tác.
            </span>
          </div>
          <Link className="btn btn-ghost btn-sm" href="/tenant-system/auth" style={{ marginLeft: "auto" }}>
            Đăng nhập lại
          </Link>
        </div>
      ) : null}

      {today.feedback ? (
        <div className="alert alert-success" role="status" aria-live="polite">
          <span>{today.feedback}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => today.setFeedback(null)}
            style={{ marginLeft: "auto" }}
          >
            Đóng
          </button>
        </div>
      ) : null}

      <div className="bento">
        <section className="widget bento-8" aria-labelledby="widget-tasks">
          <WidgetHead
            id="widget-tasks"
            title="Việc của tôi"
            note={
              dayKey
                ? `${openTasks.length} việc đang mở · ${overdue} quá hạn`
                : "Đang tải…"
            }
          />
          <div className="widget-body">
            {today.loading ? (
              <Lines rows={4} />
            ) : today.issues.tasks ? (
              <div className="error-state">
                <span className="empty-title">Không tải được công việc</span>
                <p className="empty-body">{today.issues.tasks}</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={today.reload}>
                  Thử lại
                </button>
              </div>
            ) : openTasks.length === 0 ? (
              <div className="empty-state">
                <span className="empty-title">Không có việc nào đang mở</span>
                <p className="empty-body">
                  Khi được giao việc, công việc gần hạn nhất sẽ xuất hiện ở đây kèm trạng
                  thái và người kiểm tra.
                </p>
                <Link className="btn btn-ghost btn-sm" href="/work-management/tasks">
                  Xem toàn bộ công việc
                </Link>
              </div>
            ) : (
              <ul className="list">
                {openTasks.map((task) => (
                  <li key={task.id}>
                    <Link className="list-row" href="/work-management/tasks">
                      <div className="list-main">
                        <strong>{task.name}</strong>
                        <span className="list-meta">
                          {task.code} · Hạn {formatDate(task.date)}
                          {task.scope ? ` · ${task.scope}` : ""}
                        </span>
                      </div>
                      <span className={TASK_STATUS_TONE[task.status] ?? "badge"}>
                        <span className="dot" />
                        {task.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="widget-foot">
            <span>{today.tasks.total.toLocaleString("vi-VN")} việc được giao cho bạn</span>
            <Link className="link" href="/work-management/tasks">
              Xem tất cả
            </Link>
          </div>
        </section>

        <section className="widget bento-4" aria-labelledby="widget-attendance">
          <WidgetHead
            id="widget-attendance"
            title="Điểm danh hôm nay"
            note="Ghi giờ vào và giờ ra của bạn"
          />
          <div className="widget-body">
            {today.loading ? (
              <Lines rows={3} />
            ) : today.issues.attendance ? (
              <div className="error-state">
                <span className="empty-title">Không tải được điểm danh</span>
                <p className="empty-body">{today.issues.attendance}</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={today.reload}>
                  Thử lại
                </button>
              </div>
            ) : (
              <div className="stack gap-2">
                <span className="hero-priority-value tabular">
                  {attendance ? attendance.checkIn : "--:--"}
                </span>
                <span className="muted">
                  {attendance
                    ? `Giờ vào · ${ATTENDANCE_STATUS_LABEL[attendance.status] ?? attendance.status}`
                    : "Chưa có bản ghi điểm danh hôm nay."}
                </span>
                {attendance ? (
                  <div className="row wrap gap-4">
                    <span>
                      Ra:{" "}
                      <strong className="tabular">{attendance.checkOut ?? "chưa ghi"}</strong>
                    </span>
                    {worked !== null ? (
                      <span>
                        Đã làm: <strong className="tabular">{durationLabel(worked)}</strong>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <div className="widget-foot">
            <span>{now ? `Bây giờ ${nowClock(now)}` : "—"}</span>
            {attendance && !attendance.checkOut ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={today.clockOut}
                disabled={today.busy !== null}
                aria-busy={today.busy === "out" ? "true" : undefined}
              >
                {today.busy === "out" ? "Đang ghi…" : "Chấm công ra"}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={today.clockIn}
                disabled={
                  Boolean(attendance) ||
                  today.busy !== null ||
                  (today.accessReady && !today.attendanceAccess)
                }
                aria-busy={today.busy === "in" ? "true" : undefined}
                title={
                  attendance
                    ? "Hôm nay đã có bản ghi điểm danh"
                    : today.accessReady && !today.attendanceAccess
                      ? "Bạn không có quyền chấm công"
                      : "Ghi giờ vào ngay bây giờ"
                }
              >
                {today.busy === "in" ? "Đang ghi…" : "Chấm công vào"}
              </button>
            )}
          </div>
        </section>

        <section className="widget bento-4" aria-labelledby="widget-approvals">
          <WidgetHead
            id="widget-approvals"
            title="Chờ tôi duyệt"
            note={
              today.issues.approvals
                ? "Không tải được hàng đợi"
                : `${today.approvals.total.toLocaleString("vi-VN")} đề xuất cần quyết định`
            }
          />
          <div className="widget-body">
            {today.loading ? (
              <Lines rows={2} />
            ) : today.issues.approvals ? (
              <p className="muted">{today.issues.approvals}</p>
            ) : today.approvals.items.length === 0 ? (
              <p className="muted">
                Không có đề xuất nào đang chờ bạn. Hàng đợi sẽ tự cập nhật khi có người
                gửi.
              </p>
            ) : (
              <ul className="list">
                {today.approvals.items.slice(0, APPROVAL_LIMIT).map((entry) => (
                  <li key={entry.request.id}>
                    <Link className="list-row" href="/work-management/tickets-approvals">
                      <div className="list-main">
                        <strong>{entry.request.name}</strong>
                        <span className="list-meta">
                          {entry.request.code} · {entry.request.fields.requester ?? "—"} ·{" "}
                          {formatDate(entry.request.date)}
                        </span>
                      </div>
                      <span className="badge badge-warning">{entry.request.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="widget-foot">
            <span>Bước {today.approvals.items[0]?.step.sequence ?? "—"}</span>
            <Link className="link" href="/work-management/tickets-approvals">
              Mở hàng đợi
            </Link>
          </div>
        </section>

        <section className="widget bento-4" aria-labelledby="widget-notices">
          <WidgetHead
            id="widget-notices"
            title="Thông báo chưa đọc"
            note={
              today.issues.notices
                ? "Không tải được thông báo"
                : `${today.notices.total.toLocaleString("vi-VN")} thông báo mới`
            }
          />
          <div className="widget-body">
            {today.loading ? (
              <Lines rows={2} />
            ) : today.issues.notices ? (
              <p className="muted">{today.issues.notices}</p>
            ) : today.notices.items.length === 0 ? (
              <p className="muted">Bạn đã đọc hết thông báo. Không có gì đang chờ.</p>
            ) : (
              <ul className="list">
                {today.notices.items.slice(0, NOTICE_LIMIT).map((notice) => (
                  <li key={notice.id}>
                    <Link className="list-row" href={notice.link || "/work-management/notifications"}>
                      <div className="list-main">
                        <strong>{notice.title}</strong>
                        <span className="list-meta">{formatDateTime(notice.createdAt)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="widget-foot">
            <span>Cập nhật theo thời gian thực</span>
            <Link className="link" href="/work-management/notifications">
              Mở thông báo
            </Link>
          </div>
        </section>

        <section className="widget bento-4" aria-labelledby="widget-shortcuts">
          <WidgetHead
            id="widget-shortcuts"
            title="Đi thẳng"
            note="Các màn hình dùng nhiều nhất trong ngày"
          />
          <div className="widget-body">
            <ul className="list">
              <li>
                <Link className="list-row" href="/hr-management/attendance">
                  <div className="list-main">
                    <strong>Chấm công của tôi</strong>
                    <span className="list-meta">Xem lịch sử vào/ra theo ngày</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link className="list-row" href="/hr-management/leaves">
                  <div className="list-main">
                    <strong>Đơn nghỉ phép</strong>
                    <span className="list-meta">Gửi và theo dõi đơn của bạn</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link className="list-row" href="/hr-management/explanations">
                  <div className="list-main">
                    <strong>Giải trình điểm danh</strong>
                    <span className="list-meta">Bổ sung giờ khi quên chấm công</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link className="list-row" href="/work-management/calendar">
                  <div className="list-main">
                    <strong>Lịch làm việc</strong>
                    <span className="list-meta">Sự kiện và mốc của tuần này</span>
                  </div>
                </Link>
              </li>
            </ul>
          </div>
          <div className="widget-foot">
            <span>Phím tắt ⌘K / Ctrl K để tìm nhanh mọi màn hình</span>
          </div>
        </section>
      </div>

      <p className="page-footnote">
        Số liệu lấy trực tiếp từ phân hệ công việc, điểm danh, phê duyệt và thông báo. Nếu
        một khối không tải được, các khối còn lại vẫn hoạt động độc lập.
      </p>
    </div>
  );
}

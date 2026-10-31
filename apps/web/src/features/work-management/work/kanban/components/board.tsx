"use client";

import { useMemo, useState } from "react";
import type { BoardMove, BoardTask, KanbanBoardProps } from "../types";

const COLUMNS = [
  "Cần làm",
  "Đang làm",
  "Làm lại",
  "Chờ kiểm tra",
  "Hoãn lại",
  "Hoàn thành",
  "Đã hủy",
];

const CLOSED = new Set(["Hoàn thành", "Đã hủy"]);

function sortValue(task: BoardTask): number {
  if (CLOSED.has(task.status)) return Number.MAX_SAFE_INTEGER;
  const limit = new Date(`${task.date}T00:00:00`).getTime();
  return Number.isNaN(limit) ? Number.MAX_SAFE_INTEGER : limit;
}

/** Overdue first, then the nearest deadline — the board reads top-down as urgency. */
function order(a: BoardTask, b: BoardTask): number {
  return sortValue(a) - sortValue(b) || a.code.localeCompare(b.code);
}

function urgency(task: BoardTask): "overdue" | "soon" | "normal" {
  if (CLOSED.has(task.status)) return "normal";
  const limit = new Date(`${task.date}T00:00:00`).getTime();
  if (Number.isNaN(limit)) return "normal";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.round((limit - now.getTime()) / 86_400_000);
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "normal";
}

function dayLabel(date: string): string {
  const [year, month, day] = date.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

export function KanbanBoard({ tasks, allowed, pendingId, onMove, onOpen }: KanbanBoardProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, BoardTask[]>();
    for (const column of COLUMNS) map.set(column, []);
    for (const task of tasks) {
      const bucket = map.get(task.status);
      if (bucket) bucket.push(task);
    }
    for (const bucket of map.values()) bucket.sort(order);
    return map;
  }, [tasks]);

  const canDrop = (task: BoardTask, to: string) =>
    (allowed[task.id] ?? []).some((move: BoardMove) => move.to === to);

  const taskOf = (id: string | null) => tasks.find((task) => task.id === id) ?? null;

  return (
    <div className="kanban" aria-label="Bảng công việc theo trạng thái">
      {COLUMNS.map((column) => {
        const items = grouped.get(column) ?? [];
        const dragged = taskOf(dragging);
        const accepting = dragged ? canDrop(dragged, column) : false;
        return (
          <section
            key={column}
            className="kanban-column"
            aria-label={`${column}, ${items.length} công việc`}
          >
            <header className="kanban-column-head">
              <span className="kanban-column-title">{column}</span>
              <span className="kanban-count">{items.length}</span>
            </header>
            <div
              className="kanban-drop"
              data-over={over === column ? "true" : "false"}
              onDragOver={(event) => {
                if (!dragged || !accepting) return;
                event.preventDefault();
                setOver(column);
              }}
              onDragLeave={() => setOver((current) => (current === column ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                setOver(null);
                const task = dragged;
                setDragging(null);
                if (task && accepting) onMove(task, column);
              }}
            >
              {items.length === 0 ? (
                <p className="muted" style={{ padding: "8px 4px" }}>
                  {dragged && accepting
                    ? "Thả công việc vào đây"
                    : "Chưa có công việc nào ở bước này."}
                </p>
              ) : (
                items.map((task) => {
                  const tone = urgency(task);
                  return (
                    <article
                      key={task.id}
                      className="kanban-card"
                      draggable
                      data-dragging={dragging === task.id ? "true" : "false"}
                      onDragStart={() => setDragging(task.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      onClick={() => onOpen(task)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onOpen(task);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-busy={pendingId === task.id ? "true" : undefined}
                      aria-label={`${task.code}: ${task.name}. Mở chi tiết để đổi trạng thái.`}
                    >
                      <span className="kanban-card-code mono">{task.code}</span>
                      <h3 className="kanban-card-title">{task.name}</h3>
                      <div className="kanban-card-meta">
                        <span
                          className={
                            tone === "overdue"
                              ? "deadline deadline-danger"
                              : tone === "soon"
                                ? "deadline deadline-warning"
                                : "muted"
                          }
                        >
                          {tone === "overdue" ? "Quá hạn · " : ""}
                          {dayLabel(task.date)}
                        </span>
                        {task.fields.priority ? (
                          <span className="badge">{task.fields.priority}</span>
                        ) : null}
                      </div>
                      {task.assignee ? (
                        <span className="muted truncate">{task.assignee}</span>
                      ) : (
                        <span className="subtle">Chưa giao</span>
                      )}
                      {pendingId === task.id ? (
                        <span className="muted">Đang chuyển trạng thái…</span>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

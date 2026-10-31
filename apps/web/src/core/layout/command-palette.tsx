"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconArrowRight, IconSearch } from "../../icons";
import { ALL_LINKS } from "./nav";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Jump-to-screen palette. It only lists routes the application really renders,
 * so every result navigates somewhere.
 */
export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const seen = new Set<string>();
    return ALL_LINKS.filter((link) => {
      if (seen.has(link.href)) return false;
      seen.add(link.href);
      return term.length === 0 || link.label.toLowerCase().includes(term);
    }).slice(0, 12);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Tìm nhanh màn hình"
      >
        <div className="row items-center px-4">
          <IconSearch size={18} />
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Tìm màn hình, ví dụ: nghỉ phép, kanban, phân quyền"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setCursor((value) => Math.min(value + 1, results.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setCursor((value) => Math.max(value - 1, 0));
              }
              if (event.key === "Enter") {
                const target = results[cursor];
                if (target) go(target.href);
              }
            }}
            aria-controls="palette-results"
            aria-activedescendant={results[cursor] ? `palette-${cursor}` : undefined}
          />
        </div>
        <div className="palette-list" id="palette-results" role="listbox">
          {results.length === 0 ? (
            <p className="muted px-3 py-4">
              Không có màn hình nào khớp “{query}”. Thử một từ khoá khác.
            </p>
          ) : (
            results.map((link, index) => (
              <button
                key={link.href}
                id={`palette-${index}`}
                type="button"
                role="option"
                aria-selected={index === cursor}
                className="palette-item"
                data-active={index === cursor ? "true" : "false"}
                onPointerEnter={() => setCursor(index)}
                onClick={() => go(link.href)}
              >
                <IconArrowRight size={16} />
                <span>{link.label}</span>
                <small className="mono">{link.href}</small>
              </button>
            ))
          )}
        </div>
        <div className="palette-hint">
          <span>↑ ↓ di chuyển</span>
          <span>Enter mở</span>
          <span>Esc đóng</span>
        </div>
      </div>
    </>
  );
}

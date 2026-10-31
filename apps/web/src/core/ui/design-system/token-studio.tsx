"use client";

import { useMemo, useState } from "react";
import { CloseGlyph, SearchGlyph } from "./glyphs";

/** The generated catalogue, flattened. Values arrive per profile from tokens/source.json. */
export interface TokenRecord {
  name: string;
  layer: string;
  category: string;
  type: string;
  value: string;
  light: string;
  dark: string;
  description: string;
}

export interface ContrastCheck {
  theme: string;
  label: string;
  text: string;
  bg: string;
  foreground: string;
  background: string;
  ratio: number;
}

const LAYERS = ["all", "primitive", "semantic", "component", "density"] as const;
type Layer = (typeof LAYERS)[number];

const LAYER_LABEL: Record<Layer, string> = {
  all: "Tất cả",
  primitive: "Nguyên thuỷ",
  semantic: "Ngữ nghĩa",
  component: "Thành phần",
  density: "Mật độ",
};

/** AA for normal text. AA-large (3.0) is too weak to advertise as a pass. */
const AA_TEXT = 4.5;

function swatchOf(token: TokenRecord, theme: "light" | "dark"): string | null {
  if (token.type !== "color") return null;
  return theme === "dark" ? token.dark : token.light;
}

function verdictOf(ratio: number): { tone: string; label: string } {
  if (ratio >= AA_TEXT) return { tone: "badge badge-success", label: "Đạt AA" };
  if (ratio >= 3) return { tone: "badge badge-warning", label: "Chỉ đạt AA lớn" };
  return { tone: "badge badge-danger", label: "Không đạt" };
}

export function TokenStudio({
  tokens,
  contrast,
  profiles,
  version,
}: {
  tokens: TokenRecord[];
  contrast: ContrastCheck[];
  profiles: string[];
  version: string;
}) {
  const [query, setQuery] = useState("");
  const [layer, setLayer] = useState<Layer>("all");
  const [category, setCategory] = useState("all");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [copied, setCopied] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(tokens.map((token) => token.category))].sort(),
    [tokens],
  );

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tokens.filter((token) => {
      if (layer !== "all" && token.layer !== layer) return false;
      if (category !== "all" && token.category !== category) return false;
      if (!term) return true;
      return (
        token.name.toLowerCase().includes(term) ||
        token.description.toLowerCase().includes(term) ||
        token.value.toLowerCase().includes(term)
      );
    });
  }, [tokens, layer, category, query]);

  const passing = contrast.filter((check) => check.ratio >= AA_TEXT).length;
  const filtering = query.trim() !== "" || layer !== "all" || category !== "all";

  const copy = async (name: string) => {
    const reference = `var(--${name})`;
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(reference);
    } catch {
      /* Clipboard is blocked outside a secure context — the name stays selectable. */
      setCopied(null);
    }
  };

  const clear = () => {
    setQuery("");
    setLayer("all");
    setCategory("all");
  };

  return (
    <>
      <div className="metric-strip">
        <div className="metric">
          <span className="metric-label">Token</span>
          <span className="metric-value tabular">{tokens.length}</span>
          <span className="metric-note">Phiên bản {version}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Màu</span>
          <span className="metric-value tabular">
            {tokens.filter((token) => token.type === "color").length}
          </span>
          <span className="metric-note">Sáng và tối cùng một tên</span>
        </div>
        <div className="metric">
          <span className="metric-label">Thành phần</span>
          <span className="metric-value tabular">
            {tokens.filter((token) => token.layer === "component").length}
          </span>
          <span className="metric-note">Ánh xạ ngữ nghĩa, không hex</span>
        </div>
        <div className="metric">
          <span className="metric-label">Tương phản đạt AA</span>
          <span className="metric-value tabular">
            {passing}/{contrast.length}
          </span>
          <span className="metric-note">Ngưỡng {AA_TEXT}:1 cho chữ thường</span>
        </div>
      </div>

      <section className="surface" aria-labelledby="token-catalogue">
        <div className="surface-head">
          <div className="stack gap-1">
            <h2 className="surface-title" id="token-catalogue">
              Danh mục token
            </h2>
            <span className="muted">
              Mỗi dòng là một biến CSS thật trong tokens.css. Bấm tên để sao chép tham chiếu.
            </span>
          </div>
          <div className="toolbar-actions">
            <div className="segmented" role="group" aria-label="Xem giá trị theo giao diện">
              <button
                type="button"
                className="segment"
                aria-pressed={theme === "light"}
                onClick={() => setTheme("light")}
              >
                Sáng
              </button>
              <button
                type="button"
                className="segment"
                aria-pressed={theme === "dark"}
                onClick={() => setTheme("dark")}
              >
                Tối
              </button>
            </div>
          </div>
        </div>

        <div className="surface-body stack gap-4">
          <div className="toolbar wrap gap-3">
            <div className="search">
              <SearchGlyph aria-hidden="true" width={16} height={16} />
              <label className="sr-only" htmlFor="token-query">
                Tìm token theo tên hoặc giá trị
              </label>
              <input
                id="token-query"
                className="input"
                type="search"
                placeholder="Tìm theo tên, mô tả hoặc giá trị…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query ? (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Xoá từ khoá"
                  onClick={() => setQuery("")}
                >
                  <CloseGlyph aria-hidden="true" width={14} height={14} />
                </button>
              ) : null}
            </div>

            <div className="segmented" role="group" aria-label="Lọc theo lớp token">
              {LAYERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="segment"
                  aria-pressed={layer === value}
                  onClick={() => setLayer(value)}
                >
                  {LAYER_LABEL[value]}
                </button>
              ))}
            </div>

            <label className="sr-only" htmlFor="token-category">
              Lọc theo nhóm
            </label>
            <select
              id="token-category"
              className="select"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">Mọi nhóm</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <span className="result-count tabular">
              {rows.length.toLocaleString("vi-VN")} / {tokens.length.toLocaleString("vi-VN")}
            </span>
          </div>

          {copied ? (
            <p className="muted" role="status" aria-live="polite">
              Đã sao chép <span className="mono">{copied}</span>
            </p>
          ) : null}

          {rows.length === 0 ? (
            <div className="empty-state">
              <span className="empty-title">
                {filtering ? "Không có token nào khớp bộ lọc" : "Chưa có token nào"}
              </span>
              <p className="empty-body">
                {filtering
                  ? "Bộ lọc hiện tại không khớp tên, mô tả hay giá trị nào trong danh mục."
                  : "Chạy npm run tokens:build để sinh lại danh mục từ tokens/source.json."}
              </p>
              {filtering ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
                  Xoá bộ lọc
                </button>
              ) : null}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <caption className="sr-only">
                  Danh mục token thiết kế kèm giá trị theo giao diện {theme === "light" ? "sáng" : "tối"}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Token</th>
                    <th scope="col">Lớp</th>
                    <th scope="col">Giá trị</th>
                    <th scope="col">Mô tả</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((token) => {
                    const swatch = swatchOf(token, theme);
                    const shown = theme === "dark" ? token.dark : token.light;
                    return (
                      <tr key={token.name}>
                        <td>
                          <button
                            type="button"
                            className="link mono"
                            onClick={() => copy(token.name)}
                            title={`Sao chép var(--${token.name})`}
                          >
                            --{token.name}
                          </button>
                        </td>
                        <td>
                          <span className="badge">{token.layer}</span>
                        </td>
                        <td>
                          <span className="row items-center gap-2">
                            {swatch ? (
                              <span
                                aria-hidden="true"
                                style={{
                                  display: "inline-block",
                                  width: 20,
                                  height: 20,
                                  flex: "none",
                                  background: swatch,
                                  border: "1px solid var(--line)",
                                  borderRadius: "var(--radius-sm)",
                                }}
                              />
                            ) : null}
                            <span className="mono tabular">{shown || token.value}</span>
                          </span>
                        </td>
                        <td className="muted">
                          {token.description}
                          {token.value !== shown && token.value.startsWith("{") ? (
                            <span className="mono"> · {token.value}</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          className="spread wrap gap-3 px-4 py-3"
          style={{ borderTop: "1px solid var(--line-soft)" }}
        >
          <span>
            Hồ sơ: {profiles.join(" · ")}
          </span>
          <span className="mono">npm run tokens:build</span>
        </div>
      </section>

      <section className="surface" aria-labelledby="token-contrast">
        <div className="surface-head">
          <div className="stack gap-1">
            <h2 className="surface-title" id="token-contrast">
              Kiểm tra tương phản
            </h2>
            <span className="muted">
              Cặp màu chữ trên nền do tokens/source.json khai báo và được tính lại mỗi lần build.
            </span>
          </div>
        </div>
        <div className="surface-body">
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">Tỷ lệ tương phản của các cặp màu ngữ nghĩa</caption>
              <thead>
                <tr>
                  <th scope="col">Cặp màu</th>
                  <th scope="col">Giao diện</th>
                  <th scope="col">Mẫu</th>
                  <th scope="col">Tỷ lệ</th>
                  <th scope="col">Kết luận</th>
                </tr>
              </thead>
              <tbody>
                {contrast.map((check) => {
                  const verdict = verdictOf(check.ratio);
                  return (
                    <tr key={`${check.theme}-${check.label}`}>
                      <td>
                        <strong>{check.label}</strong>
                        <span className="list-meta mono">
                          {check.text} trên {check.bg}
                        </span>
                      </td>
                      <td>
                        <span className="badge">{check.theme === "dark" ? "Tối" : "Sáng"}</span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 10px",
                            borderRadius: "var(--radius-sm)",
                            background: check.background,
                            color: check.foreground,
                            border: "1px solid var(--line)",
                          }}
                        >
                          Aa
                        </span>
                      </td>
                      <td className="tabular">{check.ratio.toFixed(2)}:1</td>
                      <td>
                        <span className={verdict.tone}>
                          <span className="dot" />
                          {verdict.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

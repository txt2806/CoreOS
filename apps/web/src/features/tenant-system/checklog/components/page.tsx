"use client";

import { useState } from "react";
import { AUDIT_RESULTS } from "../types";
import type { AuditEntry, AuditResult } from "../types";
import { RESULT_LABEL } from "../constants";
import { compactStamp, diffPreview } from "../format";
import { useAudit, type SortKey } from "../hooks/use-audit";
import { AuditDetailSheet } from "./detail-sheet";
import {
  CloseGlyph,
  OverrideBadge,
  Pagination,
  ResultBadge,
  SearchGlyph,
  ShieldGlyph,
  SkeletonRows,
  SortButton,
} from "./primitives";

const COLUMNS = 7;

export function ChecklogPage() {
  const audit = useAudit();
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const forbidden = audit.error?.status === 403;
  const denied = audit.rows.filter((row) => row.result === "DENIED").length;
  const failed = audit.rows.filter((row) => row.result === "FAILED").length;
  const overrides = audit.rows.filter((row) => row.isOutOfScopeOverride).length;

  const ariaSort = (key: SortKey) =>
    audit.sort.key === key
      ? audit.sort.dir === "asc"
        ? ("ascending" as const)
        : ("descending" as const)
      : ("none" as const);

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Hệ thống &amp; phân quyền</p>
          <h1>Nhật ký hệ thống</h1>
          <p className="page-lede">
            Dấu vết thao tác trên toàn hệ thống: ai làm gì, trên đối tượng nào, giá trị
            trước và sau, kèm lý do. Nhật ký chỉ ghi thêm — không sửa, không xoá.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={audit.reload}
            aria-busy={audit.loading ? "true" : undefined}
          >
            <ShieldGlyph />
            Tải lại
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Tình hình nhật ký trên trang này">
        <div className="metric">
          <span className="metric-value tabular">
            {audit.data.total.toLocaleString("vi-VN")}
          </span>
          <span className="metric-label">Bản ghi khớp bộ lọc</span>
          <span className="metric-note">tổng theo máy chủ</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{denied.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Bị từ chối</span>
          <span className="metric-note">trên trang này</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{failed.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Thất bại</span>
          <span className="metric-note">trên trang này</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">{overrides.toLocaleString("vi-VN")}</span>
          <span className="metric-label">Ghi đè ngoài phạm vi</span>
          <span className="metric-note">trên trang này</span>
        </div>
      </section>

      <div className="surface">
        <div className="surface-head">
          <div className="toolbar">
            <div className="toolbar-filters">
              <div className="search">
                <SearchGlyph />
                <input
                  id="audit-search"
                  className="input"
                  type="search"
                  value={audit.query.q ?? ""}
                  autoComplete="off"
                  placeholder="Tìm trong tóm tắt, lý do, mã đối tượng…"
                  aria-label="Tìm trong nhật ký theo tóm tắt, lý do, mã đối tượng"
                  onChange={(event) => audit.patchQuery({ q: event.target.value, page: 1 })}
                />
                {audit.query.q ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => audit.patchQuery({ q: "", page: 1 })}
                    aria-label="Xoá từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                ) : null}
              </div>

              <div className="row items-center gap-2">
                <label className="muted" htmlFor="audit-actor" style={{ fontSize: 12 }}>
                  Người thực hiện
                </label>
                <input
                  id="audit-actor"
                  className="input"
                  type="search"
                  value={audit.query.actor ?? ""}
                  autoComplete="off"
                  placeholder="Tên người thực hiện…"
                  onChange={(event) => audit.patchQuery({ actor: event.target.value, page: 1 })}
                  style={{ width: 180 }}
                />
              </div>

              <select
                className="select"
                value={audit.query.feature ?? ""}
                aria-label="Lọc theo phân hệ"
                onChange={(event) => audit.patchQuery({ feature: event.target.value, page: 1 })}
                style={{ width: 210 }}
              >
                <option value="">Mọi phân hệ</option>
                {(audit.facets?.features ?? []).map((facet) => (
                  <option key={facet.key} value={facet.key}>
                    {facet.key} ({facet.count.toLocaleString("vi-VN")})
                  </option>
                ))}
              </select>

              <select
                className="select"
                value={audit.query.action ?? ""}
                aria-label="Lọc theo hành động"
                onChange={(event) => audit.patchQuery({ action: event.target.value, page: 1 })}
                style={{ width: 168 }}
              >
                <option value="">Mọi hành động</option>
                {(audit.facets?.actions ?? []).map((facet) => (
                  <option key={facet.key} value={facet.key}>
                    {facet.key} ({facet.count.toLocaleString("vi-VN")})
                  </option>
                ))}
              </select>

              <select
                className="select"
                value={audit.query.result ?? ""}
                aria-label="Lọc theo kết quả"
                onChange={(event) =>
                  audit.patchQuery({ result: event.target.value as AuditResult | "", page: 1 })
                }
                style={{ width: 148 }}
              >
                <option value="">Mọi kết quả</option>
                {AUDIT_RESULTS.map((result) => (
                  <option key={result} value={result}>
                    {RESULT_LABEL[result]}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar-actions">
              <span className="result-count">
                {audit.data.total.toLocaleString("vi-VN")} bản ghi ·{" "}
                {audit.rows.length} hiển thị
              </span>
            </div>
          </div>

          <div
            className="row wrap items-end gap-3"
            style={{ paddingTop: "var(--space-3)" }}
          >
            <div className="row items-center gap-2">
              <label className="muted" htmlFor="audit-from" style={{ fontSize: 12 }}>
                Từ ngày
              </label>
              <input
                id="audit-from"
                className="input"
                type="date"
                value={audit.query.from ?? ""}
                onChange={(event) => audit.patchQuery({ from: event.target.value, page: 1 })}
                style={{ width: 160 }}
              />
            </div>
            <div className="row items-center gap-2">
              <label className="muted" htmlFor="audit-to" style={{ fontSize: 12 }}>
                Đến ngày
              </label>
              <input
                id="audit-to"
                className="input"
                type="date"
                value={audit.query.to ?? ""}
                onChange={(event) => audit.patchQuery({ to: event.target.value, page: 1 })}
                style={{ width: 160 }}
              />
            </div>
            <label className="row items-center gap-2" htmlFor="audit-override">
              <input
                id="audit-override"
                className="checkbox"
                type="checkbox"
                checked={Boolean(audit.query.override)}
                onChange={(event) =>
                  audit.patchQuery({ override: event.target.checked, page: 1 })
                }
              />
              <span className="muted" style={{ fontSize: 12 }}>
                Chỉ bản ghi ghi đè ngoài phạm vi
              </span>
            </label>

            {audit.filtersActive ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={audit.clearFilters}>
                Xoá bộ lọc
              </button>
            ) : null}
          </div>

          {audit.rangeInvalid ? (
            <div
              className="alert alert-warning"
              role="status"
              aria-live="polite"
              style={{ marginTop: "var(--space-3)" }}
            >
              “Từ ngày” đang sau “Đến ngày” nên kết quả sẽ rỗng. Đổi lại một trong hai mốc.
            </div>
          ) : null}

          {audit.facetsError ? (
            <p className="muted" role="status" aria-live="polite" style={{ marginTop: "var(--space-2)" }}>
              Không tải được danh sách phân hệ và hành động; ô tìm kiếm vẫn lọc được.
            </p>
          ) : null}

          {audit.filtersActive ? (
            <div className="row wrap items-center gap-2" style={{ paddingTop: "var(--space-3)" }}>
              {audit.query.q ? (
                <span className="chip" data-active="true">
                  Tìm: “{audit.query.q}”
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => audit.patchQuery({ q: "", page: 1 })}
                    aria-label="Bỏ từ khoá tìm kiếm"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {audit.query.actor ? (
                <span className="chip" data-active="true">
                  Người thực hiện: {audit.query.actor}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => audit.patchQuery({ actor: "", page: 1 })}
                    aria-label="Bỏ lọc người thực hiện"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {audit.query.feature ? (
                <span className="chip" data-active="true">
                  Phân hệ: {audit.query.feature}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => audit.patchQuery({ feature: "", page: 1 })}
                    aria-label="Bỏ lọc phân hệ"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {audit.query.action ? (
                <span className="chip" data-active="true">
                  Hành động: {audit.query.action}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => audit.patchQuery({ action: "", page: 1 })}
                    aria-label="Bỏ lọc hành động"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {audit.query.result ? (
                <span className="chip" data-active="true">
                  Kết quả: {RESULT_LABEL[audit.query.result]}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => audit.patchQuery({ result: "", page: 1 })}
                    aria-label="Bỏ lọc kết quả"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {audit.query.override ? (
                <span className="chip" data-active="true">
                  Ghi đè ngoài phạm vi
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => audit.patchQuery({ override: false, page: 1 })}
                    aria-label="Bỏ lọc ghi đè ngoài phạm vi"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {audit.query.from ? (
                <span className="chip" data-active="true">
                  Từ {audit.query.from.split("-").reverse().join("/")}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => audit.patchQuery({ from: "", page: 1 })}
                    aria-label="Bỏ mốc bắt đầu"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
              {audit.query.to ? (
                <span className="chip" data-active="true">
                  Đến {audit.query.to.split("-").reverse().join("/")}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => audit.patchQuery({ to: "", page: 1 })}
                    aria-label="Bỏ mốc kết thúc"
                  >
                    <CloseGlyph />
                  </button>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {forbidden ? (
          <div className="forbidden-state" role="alert">
            <span className="empty-title">Bạn chưa được cấp quyền xem nhật ký hệ thống</span>
            <p className="empty-body">
              Phân hệ Nhật ký hệ thống chỉ mở cho người có quyền “Xem”. Yêu cầu quản trị hệ
              thống cấp quyền rồi tải lại trang.
            </p>
            <button type="button" className="btn btn-ghost" onClick={audit.reload}>
              Tải lại
            </button>
          </div>
        ) : audit.error ? (
          <div className="error-state" role="alert">
            <span className="empty-title">Không tải được nhật ký hệ thống</span>
            <p className="empty-body">{audit.error.message}</p>
            <button type="button" className="btn btn-primary" onClick={audit.reload}>
              Thử lại
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">
                Nhật ký thao tác của trang hiện tại. Cột Thời điểm, Người thực hiện và Kết
                quả sắp xếp được trên các dòng đang tải.
              </caption>
              <thead>
                <tr>
                  <th scope="col" aria-sort={ariaSort("createdAt")} style={{ width: 112 }}>
                    <SortButton
                      label="Thời điểm"
                      active={audit.sort.key === "createdAt"}
                      direction={audit.sort.dir}
                      onClick={() => audit.toggleSort("createdAt")}
                    />
                  </th>
                  <th scope="col" aria-sort={ariaSort("actorName")} style={{ width: 150 }}>
                    <SortButton
                      label="Người thực hiện"
                      active={audit.sort.key === "actorName"}
                      direction={audit.sort.dir}
                      onClick={() => audit.toggleSort("actorName")}
                    />
                  </th>
                  <th scope="col" style={{ width: 190 }}>
                    Hành động
                  </th>
                  <th scope="col" style={{ width: 180 }}>
                    Đối tượng
                  </th>
                  <th scope="col">Thay đổi</th>
                  <th scope="col" aria-sort={ariaSort("result")} style={{ width: 150 }}>
                    <SortButton
                      label="Kết quả"
                      active={audit.sort.key === "result"}
                      direction={audit.sort.dir}
                      onClick={() => audit.toggleSort("result")}
                    />
                  </th>
                  <th scope="col" style={{ width: 190 }}>
                    Lý do
                  </th>
                </tr>
              </thead>

              {audit.loading && audit.rows.length === 0 ? (
                <SkeletonRows rows={8} columns={COLUMNS} />
              ) : (
                <tbody>
                  {audit.rows.map((entry) => (
                    <tr key={entry.id}>
                      <td className="tabular mono" style={{ whiteSpace: "nowrap" }}>
                        {compactStamp(entry.createdAt)}
                      </td>
                      <td>
                        <div className="stack gap-1">
                          <span className="truncate">{entry.actorName || "Không ghi tên"}</span>
                          <span className="muted truncate" style={{ fontSize: 11 }}>
                            {entry.actorRole || "—"}
                            {entry.isSystemAdmin ? " · QTHT" : ""}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="stack gap-1">
                          <span className="mono truncate">{entry.action}</span>
                          <span className="muted truncate" style={{ fontSize: 11 }}>
                            {entry.featureKey}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="stack gap-1">
                          <span className="truncate">{entry.targetType || "—"}</span>
                          {entry.targetId ? (
                            <span className="mono muted truncate" style={{ fontSize: 11 }}>
                              {entry.targetId}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div className="stack gap-1">
                          <button
                            type="button"
                            className="link truncate"
                            onClick={() => setSelected(entry)}
                            title={entry.summary}
                            aria-label={`Xem chi tiết bản ghi: ${entry.summary}`}
                          >
                            {entry.summary}
                          </button>
                          <span className="mono muted truncate" style={{ fontSize: 11 }}>
                            {diffPreview(entry.before, entry.after)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="row wrap items-center gap-1">
                          <ResultBadge result={entry.result} />
                          {entry.isOutOfScopeOverride ? <OverrideBadge /> : null}
                        </div>
                      </td>
                      <td>
                        <span className="truncate" title={entry.reason || undefined}>
                          {entry.reason || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}

        {!forbidden &&
        !audit.error &&
        !audit.loading &&
        audit.rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-title">
              {audit.filtersActive
                ? "Không có bản ghi nào khớp bộ lọc"
                : "Nhật ký chưa có bản ghi nào"}
            </span>
            <p className="empty-body">
              {audit.filtersActive
                ? "Nới khoảng ngày hoặc bỏ bớt điều kiện để xem lại toàn bộ nhật ký."
                : "Khi các phân hệ ghi thao tác đầu tiên, dấu vết sẽ xuất hiện ở đây."}
            </p>
            {audit.filtersActive ? (
              <button type="button" className="btn btn-ghost" onClick={audit.clearFilters}>
                Xoá bộ lọc
              </button>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={audit.reload}>
                Tải lại
              </button>
            )}
          </div>
        ) : null}

        {!forbidden && !audit.error && audit.data.total > 0 ? (
          <Pagination
            id="audit"
            page={audit.data.page}
            pageSize={audit.data.pageSize}
            total={audit.data.total}
            onPage={(page) => audit.patchQuery({ page })}
            onPageSize={(size) => audit.patchQuery({ pageSize: size, page: 1 })}
          />
        ) : null}
      </div>

      <p className="page-footnote">
        Nhật ký chỉ ghi thêm: mỗi dòng do phân hệ nghiệp vụ gửi vào lúc thao tác xảy ra,
        máy chủ tự thêm người thực hiện và thay giá trị nhạy cảm bằng “[đã ẩn]”. Bộ lọc
        theo phân hệ và hành động lấy từ danh sách máy chủ tổng hợp; ô sắp xếp chỉ đổi thứ
        tự các dòng đang tải, còn thứ tự mặc định là mới nhất trước.
      </p>

      {selected ? (
        <AuditDetailSheet entry={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

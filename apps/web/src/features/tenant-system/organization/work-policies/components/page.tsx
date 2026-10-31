"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ApiError } from "../api/client";
import {
  NO_DELETE_NOTE,
  QUOTA_NO_STATUS_NOTE,
  SIGN_IN_NOTE,
} from "../constants";
import { span, weekdaySummary } from "../format";
import { useWorkPolicies } from "../hooks/use-work-policies";
import type {
  Holiday,
  HolidayInput,
  Network,
  NetworkInput,
  PolicyFields,
  Quota,
  QuotaInput,
} from "../types";
import { HolidayDialog, NetworkDialog, QuotaDialog } from "./dialogs";
import { HolidayTable, ListSurface, NetworkTable, PolicyUnavailable, QuotaTable } from "./lists";
import { AlertGlyph, CloseGlyph } from "./primitives";
import { PolicyForm } from "./policy-form";
import { SessionBanner } from "./session-banner";

type TabKey = "holidays" | "networks" | "quotas";

const TAB_ORDER: readonly TabKey[] = ["holidays", "networks", "quotas"];

const TAB_LABELS: Record<TabKey, string> = {
  holidays: "Ngày lễ",
  networks: "Mạng văn phòng",
  quotas: "Hạn mức phép",
};

type DialogState =
  | { kind: "holiday"; holiday?: Holiday }
  | { kind: "network"; network?: Network }
  | { kind: "quota"; quota?: Quota }
  | null;

export function WorkPoliciesPage() {
  const policies = useWorkPolicies();
  const [tab, setTab] = useState<TabKey>("holidays");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    holidays: null,
    networks: null,
    quotas: null,
  });

  const policy = policies.policy.data;
  const loading = policies.policy.loading;

  const openHolidayCreate = () => {
    setDialogError(null);
    setDialog({ kind: "holiday" });
  };
  const openHolidayEdit = (holiday: Holiday) => {
    setDialogError(null);
    setDialog({ kind: "holiday", holiday });
  };
  const openNetworkCreate = () => {
    setDialogError(null);
    setDialog({ kind: "network" });
  };
  const openNetworkEdit = (network: Network) => {
    setDialogError(null);
    setDialog({ kind: "network", network });
  };
  const openQuotaCreate = () => {
    setDialogError(null);
    setDialog({ kind: "quota" });
  };
  const openQuotaEdit = (quota: Quota) => {
    setDialogError(null);
    setDialog({ kind: "quota", quota });
  };

  const savePolicy = async (fields: PolicyFields) => {
    setFormError(null);
    try {
      await policies.policy.save(fields);
    } catch (caught) {
      setFormError(
        caught instanceof ApiError ? caught.message : "Chưa lưu được chính sách. Thử lại giúp mình.",
      );
    }
  };

  const saveHoliday = async (input: HolidayInput) => {
    if (dialog?.kind !== "holiday") return;
    setDialogBusy(true);
    setDialogError(null);
    try {
      if (dialog.holiday) {
        await policies.holidays.update(dialog.holiday, {
          ...input,
          version: dialog.holiday.version,
        });
      } else {
        await policies.holidays.create(input);
      }
      setDialog(null);
    } catch (caught) {
      setDialogError(
        caught instanceof ApiError ? caught.message : "Chưa lưu được ngày lễ. Thử lại giúp mình.",
      );
    } finally {
      setDialogBusy(false);
    }
  };

  const saveNetwork = async (input: NetworkInput) => {
    if (dialog?.kind !== "network") return;
    setDialogBusy(true);
    setDialogError(null);
    try {
      if (dialog.network) {
        await policies.networks.update(dialog.network, {
          ...input,
          version: dialog.network.version,
        });
      } else {
        await policies.networks.create(input);
      }
      setDialog(null);
    } catch (caught) {
      setDialogError(
        caught instanceof ApiError ? caught.message : "Chưa lưu được mạng văn phòng. Thử lại giúp mình.",
      );
    } finally {
      setDialogBusy(false);
    }
  };

  const saveQuota = async (input: QuotaInput) => {
    if (dialog?.kind !== "quota") return;
    setDialogBusy(true);
    setDialogError(null);
    try {
      if (dialog.quota) {
        await policies.quotas.update(dialog.quota, { ...input, version: dialog.quota.version });
      } else {
        await policies.quotas.create(input);
      }
      setDialog(null);
    } catch (caught) {
      setDialogError(
        caught instanceof ApiError ? caught.message : "Chưa lưu được hạn mức phép. Thử lại giúp mình.",
      );
    } finally {
      setDialogBusy(false);
    }
  };

  /** Arrow keys must move between tabs, otherwise the strip is mouse-only. */
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = TAB_ORDER.indexOf(tab);
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";
    let next = -1;
    if (forward) next = (index + 1) % TAB_ORDER.length;
    else if (backward) next = (index - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TAB_ORDER.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const target = TAB_ORDER[next];
    if (!target) return;
    setTab(target);
    tabRefs.current[target]?.focus();
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-2">
          <p className="page-eyebrow">Tổ chức</p>
          <h1>Chính sách làm việc</h1>
          <p className="page-lede">
            Cấu hình giờ làm, ngày làm việc, ân hạn đi muộn, ngày lễ, dải mạng được phép chấm công và
            hạn mức phép theo năm. Mọi thay đổi đều được ghi vào nhật ký kiểm toán kèm người thực hiện.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={policies.reloadAll}
            disabled={loading}
          >
            Tải lại
          </button>
        </div>
      </header>

      <section className="metric-strip" aria-label="Tổng quan chính sách làm việc">
        <div className="metric">
          <span className="metric-value tabular">
            {policy ? span(policy.workStart, policy.workEnd) : "—"}
          </span>
          <span className="metric-label">Khung giờ làm việc</span>
          <span className="metric-note">{policy ? policy.timezone : "chưa tải được"}</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {policy ? `${policy.workDays.length.toLocaleString("vi-VN")}/7` : "—"}
          </span>
          <span className="metric-label">Ngày làm việc mỗi tuần</span>
          <span className="metric-note">{policy ? weekdaySummary(policy.workDays) : "chưa tải được"}</span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {policy ? `${policy.lateGraceMinutes.toLocaleString("vi-VN")} phút` : "—"}
          </span>
          <span className="metric-label">Ân hạn đi muộn</span>
          <span className="metric-note">
            {policy ? `nghỉ giữa ca ${policy.breakMinutes.toLocaleString("vi-VN")} phút` : "chưa tải được"}
          </span>
        </div>
        <div className="metric">
          <span className="metric-value tabular">
            {policies.policy.counts ? policies.policy.counts.holidays.toLocaleString("vi-VN") : "—"}
          </span>
          <span className="metric-label">Ngày lễ đang áp dụng</span>
          <span className="metric-note">
            {policies.policy.counts
              ? `${policies.policy.counts.networks.toLocaleString("vi-VN")} mạng văn phòng đang mở`
              : "chưa đếm được"}
          </span>
        </div>
      </section>

      <SessionBanner />

      <div className="stack gap-2" aria-live="polite">
        {policies.feedback ? (
          <div
            className={
              policies.feedback.tone === "error"
                ? "alert alert-danger"
                : policies.feedback.tone === "warning"
                  ? "alert alert-warning"
                  : policies.feedback.tone === "success"
                    ? "alert alert-success"
                    : "alert"
            }
            role={policies.feedback.tone === "error" ? "alert" : "status"}
          >
            <AlertGlyph />
            <div className="stack gap-1">
              <span>{policies.feedback.message}</span>
              {policies.feedback.hint ? <span className="muted">{policies.feedback.hint}</span> : null}
            </div>
            <button
              type="button"
              className="btn btn-icon"
              aria-label="Đóng thông báo"
              onClick={() => policies.setFeedback(null)}
              style={{ marginLeft: "auto" }}
            >
              <CloseGlyph />
            </button>
          </div>
        ) : null}
      </div>

      <section className="surface" aria-label="Chính sách chung">
        <div className="surface-head">
          <div className="stack gap-1">
            <h2 className="surface-title">Chính sách chung</h2>
            <p className="muted">Một bản duy nhất cho toàn hệ thống, không chia theo phòng ban.</p>
          </div>
          <div className="toolbar-actions">
            <span className="result-count">
              {policy ? `Phiên bản ${policy.version} · áp dụng ngay` : "Chưa tải được cấu hình"}
            </span>
          </div>
        </div>

        {policies.policy.error ? (
          <PolicyUnavailable error={policies.policy.error} onRetry={policies.policy.reload} />
        ) : loading || !policy ? (
          <div className="surface-body stack gap-3" aria-busy="true">
            <span className="sr-only">Đang tải chính sách làm việc…</span>
            <div className="skeleton skeleton-line" aria-hidden="true" />
            <div className="skeleton skeleton-line" aria-hidden="true" />
            <div className="skeleton skeleton-line" aria-hidden="true" />
          </div>
        ) : (
          <div className="surface-body">
            <PolicyForm
              key={policy.version}
              policy={policy}
              saving={policies.policy.saving}
              serverError={formError}
              onSubmit={(fields) => void savePolicy(fields)}
            />
          </div>
        )}
      </section>

      <div className="tabs" role="tablist" aria-label="Cấu hình chi tiết">
        {TAB_ORDER.map((key) => (
          <button
            key={key}
            ref={(node) => {
              tabRefs.current[key] = node;
            }}
            id={`tab-${key}`}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === key}
            aria-controls={tab === key ? `panel-${key}` : undefined}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={onTabKeyDown}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {tab === "holidays" ? (
        <div role="tabpanel" id="panel-holidays" aria-labelledby="tab-holidays">
          <ListSurface
            label="Ngày lễ"
            list={policies.holidays}
            unit="ngày lễ"
            placeholder="Tìm theo tên hoặc ghi chú…"
            searchable
            filterByStatus
            filterByYear
            createLabel="Thêm ngày lễ"
            onCreate={openHolidayCreate}
            emptyTitle="Chưa khai báo ngày lễ nào"
            emptyBody="Thêm ngày lễ để hệ thống không trừ vào quỹ phép và không coi là vắng mặt."
            forbiddenTitle="Bạn chưa được cấp quyền xem ngày lễ"
          >
            {(rows) => (
              <HolidayTable
                rows={rows}
                pendingId={policies.pendingId}
                onEdit={openHolidayEdit}
                onToggle={(row) => void policies.holidays.toggle(row)}
              />
            )}
          </ListSurface>
        </div>
      ) : null}

      {tab === "networks" ? (
        <div role="tabpanel" id="panel-networks" aria-labelledby="tab-networks">
          <ListSurface
            label="Mạng văn phòng"
            list={policies.networks}
            unit="mạng"
            placeholder="Tìm theo tên hoặc dải mạng…"
            searchable
            filterByStatus
            filterByYear={false}
            createLabel="Thêm mạng"
            onCreate={openNetworkCreate}
            emptyTitle="Chưa khai báo mạng văn phòng nào"
            emptyBody="Khai báo dải IPv4 của văn phòng để hệ thống phân biệt chấm công tại văn phòng và ngoài văn phòng."
            forbiddenTitle="Bạn chưa được cấp quyền xem mạng văn phòng"
          >
            {(rows) => (
              <NetworkTable
                rows={rows}
                pendingId={policies.pendingId}
                onEdit={openNetworkEdit}
                onToggle={(row) => void policies.networks.toggle(row)}
              />
            )}
          </ListSurface>
        </div>
      ) : null}

      {tab === "quotas" ? (
        <div role="tabpanel" id="panel-quotas" aria-labelledby="tab-quotas">
          <ListSurface
            label="Hạn mức phép"
            list={policies.quotas}
            unit="hạn mức"
            placeholder="Hạn mức phép không hỗ trợ tìm kiếm"
            searchable={false}
            filterByStatus={false}
            filterByYear
            createLabel="Thêm hạn mức"
            onCreate={openQuotaCreate}
            emptyTitle="Chưa khai báo hạn mức phép cho năm nào"
            emptyBody="Khai báo hạn mức cho năm hiện tại để hệ thống tính đúng số ngày phép còn lại."
            forbiddenTitle="Bạn chưa được cấp quyền xem hạn mức phép"
          >
            {(rows) => <QuotaTable rows={rows} onEdit={openQuotaEdit} />}
          </ListSurface>
        </div>
      ) : null}

      <p className="page-footnote">
        {SIGN_IN_NOTE} {NO_DELETE_NOTE} {QUOTA_NO_STATUS_NOTE} Tìm kiếm, lọc và phân trang do máy chủ
        thực hiện nên số dòng luôn khớp dữ liệu thật; mỗi lần lưu đều kèm số phiên bản để không ghi đè
        thay đổi của người khác.
      </p>

      {dialog?.kind === "holiday" ? (
        <HolidayDialog
          holiday={dialog.holiday}
          busy={dialogBusy}
          serverError={dialogError}
          onSubmit={(input) => void saveHoliday(input)}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog?.kind === "network" ? (
        <NetworkDialog
          network={dialog.network}
          busy={dialogBusy}
          serverError={dialogError}
          onSubmit={(input) => void saveNetwork(input)}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog?.kind === "quota" ? (
        <QuotaDialog
          quota={dialog.quota}
          busy={dialogBusy}
          serverError={dialogError}
          onSubmit={(input) => void saveQuota(input)}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { Sheet } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/badge";
import { utcIsoToJalali } from "@/lib/dates/jalali";
import { DEFAULT_DASHBOARD_RANGE, type DashboardRangePreset } from "@/lib/domain/dashboard-rules";
import { useDashboardSummary } from "@/features/dashboard/use-dashboard-queries";
import { useDashboardLayout } from "@/features/dashboard/use-dashboard-layout";
import { DASHBOARD_WIDGETS, type DashboardWidgetId } from "@/features/dashboard/widget-catalog";
import { DashboardWidget } from "@/features/dashboard/dashboard-widget";
import { DashboardKpiCard } from "@/features/dashboard/dashboard-kpi-card";
import { BarChart, DonutChart } from "@/features/dashboard/dashboard-charts";
import type { DashboardSummary } from "@/features/dashboard/types";

/** مقاصد drill-down بر اساس نقش کاربر؛ لینکی که کاربر مجاز نیست اصلاً رندر نمی‌شود. */
export interface DashboardPermissions {
  missions: boolean;
  shipments: boolean;
  fleet: boolean;
  organization: boolean;
}

const RANGE_LABELS: Record<DashboardRangePreset, string> = {
  ALL: "همه",
  TODAY: "امروز",
  LAST_7_DAYS: "۷ روز اخیر",
  LAST_30_DAYS: "۳۰ روز اخیر",
};

const RANGE_ORDER: DashboardRangePreset[] = ["ALL", "TODAY", "LAST_7_DAYS", "LAST_30_DAYS"];

function formatJalaliDateTime(iso: string): string {
  const jalali = utcIsoToJalali(iso);
  const seconds = new Date(iso).getUTCSeconds();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${jalali.year}/${pad(jalali.month)}/${pad(jalali.day)} — ${pad(jalali.hour)}:${pad(jalali.minute)}:${pad(seconds)}`;
}

export interface DashboardViewProps {
  permissions: DashboardPermissions;
  username: string;
  /**
   * برچسب فارسی نقش‌ها، *از پیش ترجمه‌شده* در server component.
   *
   * عمداً `RoleCode` خام گرفته نمی‌شود: `@/lib/permissions/roles` مقدار enum را از
   * `@/generated/prisma/client` می‌گیرد، و import آن در یک کامپوننت `"use client"` کل Prisma
   * client (که به `node:module` نیاز دارد) را وارد bundle مرورگر می‌کند و build را می‌شکند.
   */
  roleLabels: string[];
}

export function DashboardView({ permissions, username, roleLabels }: DashboardViewProps) {
  const [range, setRange] = useState<DashboardRangePreset>(DEFAULT_DASHBOARD_RANGE);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const layout = useDashboardLayout();
  const query = useDashboardSummary({ range, autoRefresh });

  const summary = query.data;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <DashboardHeader
        username={username}
        roleLabels={roleLabels}
        range={range}
        onRangeChange={setRange}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
        onRefresh={() => void query.refetch()}
        isFetching={query.isFetching}
        computedAt={summary?.computedAt ?? null}
        onOpenSettings={() => setSettingsOpen(true)}
        isCustomized={layout.isCustomized}
      />

      {query.isError && !summary && (
        <Panel className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
            <Icon name="alert" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">دریافت آمار فرانما ناموفق بود</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              ارتباط با سرویس داخلی برقرار نشد. اتصال شبکه داخلی را بررسی کنید و دوباره تلاش کنید.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)]"
          >
            تلاش مجدد
          </button>
        </Panel>
      )}

      {!summary && query.isLoading && <DashboardSkeleton />}

      {summary && <DashboardGrid summary={summary} permissions={permissions} layout={layout} isStale={query.isPlaceholderData} />}

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="تنظیم چیدمان فرانما">
        <WidgetSettings layout={layout} />
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface DashboardHeaderProps {
  username: string;
  roleLabels: string[];
  range: DashboardRangePreset;
  onRangeChange: (range: DashboardRangePreset) => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (value: boolean) => void;
  onRefresh: () => void;
  isFetching: boolean;
  computedAt: string | null;
  onOpenSettings: () => void;
  isCustomized: boolean;
}

function DashboardHeader({
  username,
  roleLabels,
  range,
  onRangeChange,
  autoRefresh,
  onAutoRefreshChange,
  onRefresh,
  isFetching,
  computedAt,
  onOpenSettings,
  isCustomized,
}: DashboardHeaderProps) {
  return (
    <Panel className="dashboard-widget flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">فرانمای وضعیت</h1>

          {/*
            خوشامد و نقش‌های کاربر از صفحه فاز ۱ حفظ شده‌اند: فرانمای فاز ۱۳ جای آن صفحه را گرفت،
            ولی «کاربر بداند با چه حسابی و چه نقش‌هایی وارد شده» یک قرارداد شیپ‌شده است (و در
            tests/e2e/auth.spec.ts هم assert می‌شود)، نه جزئیات موقتی placeholder.
          */}
          <h2 className="mt-1 text-sm font-semibold text-[var(--color-text)]">خوش آمدید، {username}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {roleLabels.map((label) => (
              <StatusBadge key={label} tone="primary" label={label} />
            ))}
          </div>

          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)]">
            <span>آخرین به‌روزرسانی:</span>
            {computedAt ? (
              <span className="ltr-inline tabular-nums font-medium text-[var(--color-text)]" dir="ltr">
                {formatJalaliDateTime(computedAt)}
              </span>
            ) : (
              <span className="text-[var(--color-text-subtle)]">در حال محاسبه…</span>
            )}
            {isFetching && <span className="text-[var(--color-primary)]">در حال دریافت…</span>}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            aria-label="به‌روزرسانی دستی آمار"
            className="flex h-11 items-center gap-2 rounded-xl border border-[var(--color-panel-border)] px-3 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
          >
            <Icon name="refresh" className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            به‌روزرسانی
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="تنظیم چیدمان فرانما"
            className="flex h-11 items-center gap-2 rounded-xl border border-[var(--color-panel-border)] px-3 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
          >
            <Icon name="layout" className="h-4 w-4" />
            چیدمان
            {isCustomized && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div role="group" aria-label="بازه زمانی" className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[var(--color-text-muted)]">بازه زمانی مأموریت‌ها:</span>
          {RANGE_ORDER.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onRangeChange(preset)}
              aria-pressed={range === preset}
              className={`min-h-11 rounded-xl px-3 text-xs font-medium transition-colors ${
                range === preset
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "border border-[var(--color-panel-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {RANGE_LABELS[preset]}
            </button>
          ))}
        </div>

        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(event) => onAutoRefreshChange(event.target.checked)}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          به‌روزرسانی خودکار هر ۳۰ ثانیه
        </label>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------

function DashboardGrid({
  summary,
  permissions,
  layout,
  isStale,
}: {
  summary: DashboardSummary;
  permissions: DashboardPermissions;
  layout: ReturnType<typeof useDashboardLayout>;
  isStale: boolean;
}) {
  const isNetworkEmpty =
    summary.missions.total === 0 && summary.fleet.total === 0 && summary.shipments.total === 0;

  if (isNetworkEmpty) {
    return <DashboardEmptyState permissions={permissions} />;
  }

  if (layout.visibleWidgets.length === 0) {
    return (
      <Panel className="flex flex-col items-center gap-2 p-8 text-center">
        <p className="text-sm font-semibold text-[var(--color-text)]">همه widgetها پنهان شده‌اند</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          از دکمه «چیدمان» در بالای صفحه، دست‌کم یک widget را دوباره نمایان کنید.
        </p>
        <button
          type="button"
          onClick={layout.reset}
          className="mt-1 rounded-xl border border-[var(--color-panel-border)] px-4 py-2.5 text-xs font-medium text-[var(--color-text)]"
        >
          بازگرداندن چیدمان پیش‌فرض
        </button>
      </Panel>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {layout.visibleWidgets.map((id) => (
        <DashboardWidget key={id} meta={DASHBOARD_WIDGETS[id]} isStale={isStale}>
          <WidgetBody id={id} summary={summary} permissions={permissions} />
        </DashboardWidget>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

function WidgetBody({
  id,
  summary,
  permissions,
}: {
  id: DashboardWidgetId;
  summary: DashboardSummary;
  permissions: DashboardPermissions;
}) {
  switch (id) {
    case "missions":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <DashboardKpiCard
            label="کل مأموریت‌های بازه"
            value={summary.missions.total}
            tone="primary"
            icon="missions"
            href={permissions.missions ? "/missions" : undefined}
            drillDownLabel="مشاهده فهرست مأموریت‌ها"
          />
          <DashboardKpiCard
            label="در انتظار حرکت"
            value={summary.missions.waiting}
            tone="warning"
            icon="clock"
            href="/map?missionStatus=WAITING"
            drillDownLabel="مشاهده روی نقشه عملیات"
          />
          <DashboardKpiCard
            label="در حال حرکت"
            value={summary.missions.inProgress}
            tone="primary"
            icon="truck"
            href="/map?missionStatus=IN_PROGRESS"
            drillDownLabel="مشاهده روی نقشه عملیات"
          />
          <DashboardKpiCard
            label="رسیده"
            value={summary.missions.arrived}
            tone="success"
            icon="ready"
            href="/map?missionStatus=ARRIVED"
            drillDownLabel="مشاهده روی نقشه عملیات"
          />
          <DashboardKpiCard
            label="لغوشده"
            value={summary.missions.cancelled}
            tone="danger"
            icon="alert"
            href={permissions.missions ? "/missions?persistedStatus=CANCELLED" : undefined}
            drillDownLabel="مشاهده فهرست مأموریت‌های لغوشده"
          />
          <DashboardKpiCard
            label="شروع در ۲۴ ساعت آینده"
            value={summary.missions.startingNext24h}
            tone="info"
            icon="clock"
            href={permissions.missions ? "/missions?persistedStatus=SCHEDULED" : undefined}
            drillDownLabel="مشاهده مأموریت‌های منتشرشده"
          />
        </div>
      );

    case "fleet":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DashboardKpiCard
            label="کل خودروها"
            value={summary.fleet.total}
            tone="primary"
            icon="vehicles"
            href={permissions.fleet ? "/system/vehicles" : undefined}
            drillDownLabel="مشاهده ناوگان"
          />
          <DashboardKpiCard
            label="آماده به کار"
            value={summary.fleet.ready}
            tone="success"
            icon="ready"
            href={permissions.fleet ? "/system/vehicles?readiness=READY" : undefined}
            drillDownLabel="مشاهده خودروهای آماده"
          />
          <DashboardKpiCard
            label="خارج از سرویس"
            value={summary.fleet.outOfService}
            tone="danger"
            icon="alert"
            href={permissions.fleet ? "/system/vehicles?readiness=OUT_OF_SERVICE" : undefined}
            drillDownLabel="مشاهده خودروهای خارج از سرویس"
          />
        </div>
      );

    case "shipments":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          <DashboardKpiCard
            label="کل مرسوله‌ها"
            value={summary.shipments.total}
            tone="primary"
            icon="shipments"
            href={permissions.shipments ? "/shipments" : undefined}
            drillDownLabel="مشاهده فهرست مرسوله‌ها"
          />
          <DashboardKpiCard
            label="در انتظار ارسال"
            value={summary.shipments.waitingForDispatch}
            tone="warning"
            icon="package"
            href={permissions.shipments ? "/shipments?status=WAITING_FOR_DISPATCH" : undefined}
            drillDownLabel="مشاهده مرسوله‌های در انتظار ارسال"
          />
          <DashboardKpiCard
            label="در مسیر"
            value={summary.shipments.inTransit}
            tone="info"
            icon="truck"
            href={permissions.shipments ? "/shipments?status=IN_TRANSIT" : undefined}
            drillDownLabel="مشاهده مرسوله‌های در مسیر"
          />
          <DashboardKpiCard
            label="رسیده"
            value={summary.shipments.delivered}
            tone="success"
            icon="ready"
            href={permissions.shipments ? "/shipments?status=DELIVERED" : undefined}
            drillDownLabel="مشاهده مرسوله‌های رسیده"
          />
        </div>
      );

    case "mission-status":
      return (
        <DonutChart
          slices={summary.missionStatusDistribution}
          centerValue={summary.missions.total}
          centerLabel="مأموریت"
          emptyMessage="در این بازه هیچ مأموریتی ثبت نشده است."
        />
      );

    case "vehicle-types":
      return (
        <BarChart
          slices={summary.vehicleTypeDistribution}
          emptyMessage="هنوز خودرویی با نوع مشخص ثبت نشده است."
        />
      );

    case "missions-by-vehicle-type":
      return (
        <BarChart
          slices={summary.missionsByVehicleType}
          emptyMessage="در این بازه هیچ مأموریتی برای تفکیک بر اساس نوع خودرو وجود ندارد."
        />
      );

    case "network":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DashboardKpiCard
            label="دفاتر (کشوری، گروه، توزیع)"
            value={summary.organization.totalOffices}
            tone="purple"
            icon="organization"
            href={permissions.organization ? "/system/organization" : undefined}
            drillDownLabel="مشاهده ساختار سازمانی"
          />
          <DashboardKpiCard
            label="انبارها"
            value={summary.organization.warehouses}
            tone="info"
            icon="shipments"
            href={permissions.organization ? "/system/organization" : undefined}
            drillDownLabel="مشاهده ساختار سازمانی"
          />
        </div>
      );
  }
}

// ---------------------------------------------------------------------------

function WidgetSettings({ layout }: { layout: ReturnType<typeof useDashboardLayout> }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-6 text-[var(--color-text-muted)]">
        نمایان‌بودن و ترتیب widgetها فقط روی همین مرورگر ذخیره می‌شود و بین نشست‌ها باقی می‌ماند. بازه
        زمانی و به‌روزرسانی خودکار عمداً ذخیره نمی‌شوند و در هر بار ورود به حالت پیش‌فرض بازمی‌گردند.
      </p>

      <ul className="flex flex-col gap-2">
        {layout.layout.order.map((id, index) => {
          const meta = DASHBOARD_WIDGETS[id];
          const hidden = layout.isHidden(id);
          return (
            <li
              key={id}
              className="flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] p-2.5"
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={!hidden}
                  onChange={() => layout.toggleVisibility(id)}
                  aria-label={`نمایش ${meta.title}`}
                  className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-[var(--color-text)]">{meta.title}</span>
                  <span className="block truncate text-[11px] text-[var(--color-text-subtle)]">
                    {meta.description}
                  </span>
                </span>
              </label>

              {/*
                جابه‌جایی با دکمه «بالا/پایین» انجام می‌شود نه drag & drop: کشیدن‌ورهاکردن روی لمس،
                کیبورد و صفحه‌خوان یا کار نمی‌کند یا نیازمند کتابخانه جدید است. این روش با هر سه
                ورودی کار می‌کند و target لمسی ۴۴px را هم رعایت می‌کند.
              */}
              <button
                type="button"
                onClick={() => layout.moveEarlier(id)}
                disabled={index === 0}
                aria-label={`انتقال ${meta.title} به بالا`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)] disabled:opacity-30"
              >
                <Icon name="chevron-down" className="h-4 w-4 rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => layout.moveLater(id)}
                disabled={index === layout.layout.order.length - 1}
                aria-label={`انتقال ${meta.title} به پایین`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)] disabled:opacity-30"
              >
                <Icon name="chevron-down" className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={layout.reset}
        disabled={!layout.isCustomized}
        className="min-h-11 rounded-xl border border-[var(--color-panel-border)] px-4 text-xs font-medium text-[var(--color-text)] disabled:opacity-40"
      >
        بازگرداندن چیدمان پیش‌فرض
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <Panel key={index} className={`dashboard-widget p-4 sm:p-5 ${index === 0 ? "xl:col-span-12" : "xl:col-span-6"}`}>
          <div className="mb-4 h-4 w-32 animate-pulse rounded bg-[var(--color-bg-sunken)]" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((cell) => (
              <div key={cell} className="h-20 animate-pulse rounded-xl bg-[var(--color-bg-sunken)]" />
            ))}
          </div>
        </Panel>
      ))}
      <span className="sr-only">در حال بارگذاری آمار فرانمای وضعیت…</span>
    </div>
  );
}

function DashboardEmptyState({ permissions }: { permissions: DashboardPermissions }) {
  return (
    <Panel className="dashboard-widget flex flex-col items-center gap-3 p-8 text-center sm:p-12">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-bg)] text-[var(--color-primary)]">
        <Icon name="dashboard" className="h-6 w-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-[var(--color-text)]">هنوز داده‌ای برای نمایش وجود ندارد</p>
        <p className="mt-1 max-w-md text-xs leading-6 text-[var(--color-text-muted)]">
          هیچ خودرو، مرسوله یا مأموریتی در سامانه ثبت نشده است. پس از ثبت اولین داده‌های عملیاتی،
          شمارنده‌ها و نمودارهای این صفحه به‌طور خودکار پر می‌شوند.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {permissions.fleet && (
          <Link
            href="/system/vehicles"
            className="min-h-11 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--color-primary-foreground)]"
          >
            افزودن خودرو
          </Link>
        )}
        {permissions.shipments && (
          <Link
            href="/shipments/new"
            className="min-h-11 rounded-xl border border-[var(--color-panel-border)] px-4 py-2.5 text-xs font-medium text-[var(--color-text)]"
          >
            ثبت مرسوله
          </Link>
        )}
        <Link
          href="/map"
          className="min-h-11 rounded-xl border border-[var(--color-panel-border)] px-4 py-2.5 text-xs font-medium text-[var(--color-text)]"
        >
          نقشه عملیات
        </Link>
      </div>
    </Panel>
  );
}

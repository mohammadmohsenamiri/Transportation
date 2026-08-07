import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icons";
import type { StatTone } from "@/components/ui/stat-card";

const toneClass: Record<StatTone, string> = {
  primary: "text-[var(--color-primary)] bg-[var(--color-primary-bg)]",
  success: "text-[var(--color-success)] bg-[var(--color-success-bg)]",
  warning: "text-[var(--color-warning)] bg-[var(--color-warning-bg)]",
  danger: "text-[var(--color-danger)] bg-[var(--color-danger-bg)]",
  purple: "text-[var(--color-purple)] bg-[var(--color-purple-bg)]",
  info: "text-[var(--color-info)] bg-[var(--color-info-bg)]",
};

export interface DashboardKpiCardProps {
  label: string;
  value: number;
  tone: StatTone;
  icon: IconName;
  /** مقصد drill-down؛ بدون آن کارت یک عنصر غیرتعاملی است، نه دکمه‌ای که کاری نمی‌کند. */
  href?: string;
  /** متن جایگزین برای صفحه‌خوان درباره مقصد drill-down. */
  drillDownLabel?: string;
}

/**
 * Phase 13 — کارت KPI فرانما.
 *
 * تفاوت با `components/ui/stat-card.tsx` (که در صفحات فهرست دست‌نخورده باقی می‌ماند): این کارت
 * می‌تواند لینک drill-down باشد و ظاهر «اتاق فرمان» دارد. عدد همیشه به‌صورت متن واقعی رندر
 * می‌شود (نه انیمیشن شمارنده JS) تا هم قابل انتخاب/کپی باشد و هم صفحه‌خوان و آزمون خودکار همان
 * مقدار نهایی را ببینند — طبق `UX_MAP_AND_DESIGN_SYSTEM.md` §۵ «ارقام همیشه قابل خواندن».
 */
export function DashboardKpiCard({ label, value, tone, icon, href, drillDownLabel }: DashboardKpiCardProps) {
  const body = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass[tone]}`}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-[var(--color-text-muted)]">{label}</span>
        <span
          data-testid="dashboard-kpi-value"
          className="tabular-nums mt-0.5 block text-xl font-bold text-[var(--color-text)] sm:text-2xl"
        >
          {value.toLocaleString("fa-IR")}
        </span>
      </span>
      {href && (
        <Icon
          name="chevron-left"
          className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)] transition-transform group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
      )}
    </>
  );

  const shared =
    "dashboard-kpi group flex items-center gap-3 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] p-3 sm:p-4";

  if (!href) {
    return (
      <div className={shared} data-kpi-label={label}>
        {body}
      </div>
    );
  }

  return (
    <Link
      href={href}
      data-kpi-label={label}
      aria-label={drillDownLabel ? `${label}: ${value.toLocaleString("fa-IR")} — ${drillDownLabel}` : undefined}
      className={`${shared} transition-colors hover:border-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]`}
    >
      {body}
    </Link>
  );
}

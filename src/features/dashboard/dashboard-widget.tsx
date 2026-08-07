import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import type { DashboardWidgetMeta } from "@/features/dashboard/widget-catalog";

const spanClass: Record<DashboardWidgetMeta["span"], string> = {
  full: "xl:col-span-12",
  half: "xl:col-span-6",
  third: "xl:col-span-4",
};

export interface DashboardWidgetProps {
  meta: DashboardWidgetMeta;
  children: ReactNode;
  /** کنترل‌های اختیاری گوشه header (مثلاً دکمه‌های جابه‌جایی در حالت ویرایش چیدمان). */
  actions?: ReactNode;
  /** با true محتوای widget با شفافیت کم نمایش داده می‌شود (در حال دریافت داده تازه). */
  isStale?: boolean;
}

/**
 * Phase 13 — قاب مشترک هر widget فرانما.
 *
 * ظاهر «اتاق فرمان» با همان design tokenهای موجود ساخته می‌شود: کلاس `dashboard-widget` در
 * `globals.css` یک hairline نورانی بالای کارت اضافه می‌کند که از `--color-panel-glow` می‌آید —
 * تنها token از پیش تعریف‌شده‌ای که تا فاز ۱۲ هیچ مصرف‌کننده‌ای نداشت. هیچ رنگ hardcode نشده است.
 */
export function DashboardWidget({ meta, children, actions, isStale = false }: DashboardWidgetProps) {
  const headingId = `widget-${meta.id}-title`;
  const descriptionId = `widget-${meta.id}-description`;

  return (
    <Panel
      className={`dashboard-widget flex flex-col ${spanClass[meta.span]}`}
      role="region"
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      data-widget-id={meta.id}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-panel-border)] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-sunken)] text-[var(--color-text-muted)]">
            <Icon name={meta.icon} className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="truncate text-sm font-semibold text-[var(--color-text)]">
              {meta.title}
            </h2>
            <p id={descriptionId} className="truncate text-[11px] text-[var(--color-text-subtle)]">
              {meta.description}
            </p>
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>

      <div
        className={`flex-1 p-4 transition-opacity sm:p-5 ${isStale ? "opacity-60" : "opacity-100"}`}
        aria-busy={isStale}
      >
        {children}
      </div>
    </Panel>
  );
}

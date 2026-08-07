import { toDonutSegments, type DistributionSlice } from "@/lib/domain/dashboard-rules";

/**
 * Phase 13 — نمودارهای فرانما، تماماً SVG درون‌خطی.
 *
 * طبق `CLAUDE.md` §۲ هیچ asset یا کتابخانه‌ای از CDN بارگذاری نمی‌شود و هیچ dependency نموداری
 * جدیدی هم به پروژه اضافه نشده است؛ همان مسیری که `components/ui/icons.tsx` رفته است.
 *
 * دسترس‌پذیری: خودِ SVG با `aria-hidden` از درخت دسترسی حذف می‌شود و legend متنی (برچسب + مقدار +
 * درصد) جایگزین واقعی و قابل‌خواندن با screen reader است — نه یک زیرنویس تزئینی. بنابراین رنگ
 * هرگز تنها حامل معنا نیست (`UX_MAP_AND_DESIGN_SYSTEM.md` §۴).
 */

/** پالت چرخشی برای توزیع‌های با کلید پویا (نوع خودرو). همه از design token می‌آیند. */
const SERIES_COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-purple)",
  "var(--color-info)",
  "var(--color-danger)",
  "var(--color-accent)",
] as const;

/** رنگ ثابت هر وضعیت مأموریت، هم‌راستا با `missionDisplayStatusTone` صفحه مأموریت‌ها. */
const MISSION_STATUS_COLORS: Record<string, string> = {
  WAITING: "var(--color-warning)",
  IN_PROGRESS: "var(--color-primary)",
  ARRIVED: "var(--color-success)",
  DRAFT: "var(--color-info)",
  CANCELLED: "var(--color-danger)",
  ARCHIVED: "var(--color-text-subtle)",
};

export function colorForSlice(slice: DistributionSlice, index: number): string {
  return MISSION_STATUS_COLORS[slice.key] ?? SERIES_COLORS[index % SERIES_COLORS.length];
}

function faNumber(value: number): string {
  return value.toLocaleString("fa-IR");
}

function faPercent(value: number): string {
  return `${value.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
}

// ---------------------------------------------------------------------------

const DONUT_RADIUS = 42;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

export interface DonutChartProps {
  slices: DistributionSlice[];
  /** عدد بزرگ وسط دونات (معمولاً جمع کل). */
  centerValue: number;
  centerLabel: string;
  emptyMessage: string;
}

export function DonutChart({ slices, centerValue, centerLabel, emptyMessage }: DonutChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return <ChartEmptyState message={emptyMessage} />;
  }

  const segments = toDonutSegments(slices, DONUT_CIRCUMFERENCE);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
      <div className="relative h-36 w-36 shrink-0 sm:h-40 sm:w-40">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r={DONUT_RADIUS}
            fill="none"
            stroke="var(--color-bg-sunken)"
            strokeWidth="12"
          />
          {segments.map((segment, index) => (
            <circle
              key={segment.key}
              cx="50"
              cy="50"
              r={DONUT_RADIUS}
              fill="none"
              stroke={colorForSlice(segment, index)}
              strokeWidth="12"
              strokeDasharray={segment.dashArray}
              strokeDashoffset={segment.dashOffset}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular-nums text-2xl font-bold text-[var(--color-text)]">{faNumber(centerValue)}</span>
          <span className="text-[11px] text-[var(--color-text-muted)]">{centerLabel}</span>
        </div>
      </div>

      <ChartLegend slices={slices} />
    </div>
  );
}

// ---------------------------------------------------------------------------

export interface BarChartProps {
  slices: DistributionSlice[];
  emptyMessage: string;
  /** حداکثر تعداد میله نمایش‌داده‌شده؛ بقیه در یک ردیف «سایر» جمع می‌شوند. */
  maxBars?: number;
}

/**
 * میله‌های افقی (نه عمودی): برچسب‌های فارسی نوع خودرو طول متغیر و بلندی دارند و در میله عمودی
 * ناخوانا یا چرخانده می‌شوند. میله افقی در RTL هم به‌طور طبیعی از راست شروع می‌شود.
 */
export function BarChart({ slices, emptyMessage, maxBars = 6 }: BarChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return <ChartEmptyState message={emptyMessage} />;
  }

  // برای مجموعه‌های بزرگ (دهها نوع خودرو) فقط پرتکرارترین‌ها میله می‌گیرند تا widget قابل خواندن
  // بماند؛ باقی‌مانده در یک ردیف تجمیعی نمایش داده می‌شود، نه اینکه بی‌صدا حذف شود.
  const visible = slices.slice(0, maxBars);
  const remainder = slices.slice(maxBars);
  const remainderValue = remainder.reduce((sum, slice) => sum + slice.value, 0);
  const largest = Math.max(...visible.map((slice) => slice.value), remainderValue);

  const rows: { key: string; label: string; value: number; percentage: number; color: string }[] = visible.map(
    (slice, index) => ({ ...slice, color: colorForSlice(slice, index) }),
  );

  if (remainderValue > 0) {
    rows.push({
      key: "__other__",
      label: `سایر (${faNumber(remainder.length)} مورد)`,
      value: remainderValue,
      percentage: Math.round((remainderValue / total) * 1000) / 10,
      color: "var(--color-text-subtle)",
    });
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 flex-1 truncate text-[var(--color-text)]" title={row.label}>
              {row.label}
            </span>
            <span className="tabular-nums shrink-0 font-medium text-[var(--color-text)]">
              {faNumber(row.value)}
              <span className="ms-1.5 text-[var(--color-text-subtle)]">{faPercent(row.percentage)}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-sunken)]">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${largest === 0 ? 0 : (row.value / largest) * 100}%`, background: row.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------

export function ChartLegend({ slices }: { slices: DistributionSlice[] }) {
  return (
    <ul className="flex min-w-0 flex-1 flex-col gap-2">
      {slices.map((slice, index) => (
        <li key={slice.key} className="flex items-center gap-2 text-xs">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: colorForSlice(slice, index) }}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate text-[var(--color-text-muted)]" title={slice.label}>
            {slice.label}
          </span>
          <span className="tabular-nums shrink-0 font-medium text-[var(--color-text)]">
            {faNumber(slice.value)}
            <span className="ms-1.5 text-[var(--color-text-subtle)]">{faPercent(slice.percentage)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[9rem] flex-col items-center justify-center gap-2 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-bg-sunken)] text-[var(--color-text-subtle)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8.5 12h7" strokeLinecap="round" />
        </svg>
      </span>
      <p className="text-xs text-[var(--color-text-muted)]">{message}</p>
    </div>
  );
}

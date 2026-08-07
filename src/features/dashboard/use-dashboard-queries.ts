import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "@/features/dashboard/api";
import type { DashboardRangePreset } from "@/features/dashboard/types";

/**
 * بازه به‌روزرسانی خودکار فرانما — عمداً ۳۰ ثانیه، نه ۵ ثانیه نقشه (فاز ۱۰).
 *
 * نقشه موقعیت متحرک نشان می‌دهد و هر ثانیه تغییر می‌کند؛ شمارنده‌های مدیریتی فرانما با این سرعت
 * معنا ندارند و هر refetch یک اسکن کامل جدول مأموریت است. ۳۰ ثانیه تازگی کافی برای یک اتاق
 * فرمان می‌دهد بدون بار غیرضروری روی DB.
 */
export const DASHBOARD_REFRESH_INTERVAL_MS = 30_000;

export interface UseDashboardSummaryOptions {
  range: DashboardRangePreset;
  /** فقط در حالت «بازسازی زمانی» مقدار دارد؛ در حالت زنده undefined است. */
  viewTime?: string;
  /** با false، به‌روزرسانی خودکار خاموش می‌شود (حالت تاریخی یا انتخاب کاربر). */
  autoRefresh: boolean;
}

export function useDashboardSummary(options: UseDashboardSummaryOptions) {
  return useQuery({
    queryKey: ["dashboard", "summary", options.range, options.viewTime ?? "live"],
    queryFn: () => fetchDashboardSummary({ range: options.range, viewTime: options.viewTime }),
    // مانند فاز ۱۲: با تغییر بازه/زمان، queryKey عوض می‌شود؛ بدون این گزینه کل فرانما برای یک لحظه
    // به حالت loading برمی‌گردد و کارت‌ها می‌پرند. داده قبلی تا رسیدن داده تازه روی صفحه می‌ماند.
    placeholderData: keepPreviousData,
    refetchInterval: options.autoRefresh && !options.viewTime ? DASHBOARD_REFRESH_INTERVAL_MS : false,
  });
}

import { z } from "zod";
import { DASHBOARD_RANGE_PRESETS, DEFAULT_DASHBOARD_RANGE } from "@/lib/domain/dashboard-rules";

/**
 * Phase 13 — اعتبارسنجی query فرانمای وضعیت.
 *
 * `viewTime` همان قرارداد فاز ۹/۱۰ است (ISO-8601 با offset، بدون محدودیت بازه — گذشته و آینده هر
 * دو مجازند) تا داشبورد و نقشه با یک لحظه مشترک قابل مقایسه بمانند.
 */
export const dashboardSummaryQuerySchema = z.object({
  viewTime: z.string().datetime({ offset: true }).optional(),
  range: z.enum(DASHBOARD_RANGE_PRESETS).default(DEFAULT_DASHBOARD_RANGE),
});

export type DashboardSummaryQueryInput = z.infer<typeof dashboardSummaryQuerySchema>;

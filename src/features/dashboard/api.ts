import { ApiError } from "@/lib/http/api-client-error";
import type { DashboardRangePreset, DashboardSummary } from "@/features/dashboard/types";

export interface FetchDashboardSummaryParams {
  range: DashboardRangePreset;
  viewTime?: string;
}

export async function fetchDashboardSummary(params: FetchDashboardSummaryParams): Promise<DashboardSummary> {
  const query = new URLSearchParams({ range: params.range });
  if (params.viewTime) query.set("viewTime", params.viewTime);

  const response = await fetch(`/api/v1/dashboard/summary?${query.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.error);
  return data as DashboardSummary;
}

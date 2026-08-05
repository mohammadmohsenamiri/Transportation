import type { OrganizationLevelValue } from "@/features/organization/level-labels";

export interface OrganizationUnit {
  id: string;
  code: string;
  name: string;
  level: OrganizationLevelValue;
  parentId: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  childCount: number;
}

export interface OrganizationUnitFormValues {
  code: string;
  name: string;
  level: OrganizationLevelValue;
  parentId: string | null;
  latitude: string;
  longitude: string;
  address: string;
}

export interface OrganizationHistoryEntry {
  id: string;
  action: string;
  actorUserId: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  occurredAt: string;
}

export type { ApiFieldError } from "@/lib/http/api-client-error";
export { ApiError } from "@/lib/http/api-client-error";

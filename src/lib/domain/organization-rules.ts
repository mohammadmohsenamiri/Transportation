import type { OrganizationLevel } from "@/generated/prisma/client";

export const REQUIRED_PARENT_LEVEL: Record<OrganizationLevel, OrganizationLevel | null> = {
  COUNTRY_OFFICE: null,
  GROUP_OFFICE: "COUNTRY_OFFICE",
  DISTRIBUTOR_OFFICE: "GROUP_OFFICE",
  WAREHOUSE: "DISTRIBUTOR_OFFICE",
};

export function isValidParentLevel(
  level: OrganizationLevel,
  parentLevel: OrganizationLevel | null,
): boolean {
  return REQUIRED_PARENT_LEVEL[level] === parentLevel;
}

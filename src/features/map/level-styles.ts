import type { OrganizationLevelValue } from "@/features/organization/level-labels";

export const levelColor: Record<OrganizationLevelValue, string> = {
  COUNTRY_OFFICE: "#2f6fed",
  GROUP_OFFICE: "#7c3aed",
  DISTRIBUTOR_OFFICE: "#14b8c4",
  WAREHOUSE: "#16a34a",
};

export const levelDisplayLabel: Record<OrganizationLevelValue, string> = {
  COUNTRY_OFFICE: "دفتر کشوری",
  GROUP_OFFICE: "دفتر گروه",
  DISTRIBUTOR_OFFICE: "دفتر توزیع‌کننده",
  WAREHOUSE: "انبار",
};

export const levelOrder: OrganizationLevelValue[] = [
  "COUNTRY_OFFICE",
  "GROUP_OFFICE",
  "DISTRIBUTOR_OFFICE",
  "WAREHOUSE",
];

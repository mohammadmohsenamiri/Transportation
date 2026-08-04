import type { IconName } from "@/components/ui/icons";

export const organizationLevelValues = [
  "COUNTRY_OFFICE",
  "GROUP_OFFICE",
  "DISTRIBUTOR_OFFICE",
  "WAREHOUSE",
] as const;

export type OrganizationLevelValue = (typeof organizationLevelValues)[number];

export const levelLabel: Record<OrganizationLevelValue, string> = {
  COUNTRY_OFFICE: "دفتر کشوری",
  GROUP_OFFICE: "دفتر گروه",
  DISTRIBUTOR_OFFICE: "دفتر توزیع‌کننده",
  WAREHOUSE: "انبار",
};

export const levelIcon: Record<OrganizationLevelValue, IconName> = {
  COUNTRY_OFFICE: "organization",
  GROUP_OFFICE: "organization",
  DISTRIBUTOR_OFFICE: "organization",
  WAREHOUSE: "package",
};

export const requiredParentLevel: Record<OrganizationLevelValue, OrganizationLevelValue | null> = {
  COUNTRY_OFFICE: null,
  GROUP_OFFICE: "COUNTRY_OFFICE",
  DISTRIBUTOR_OFFICE: "GROUP_OFFICE",
  WAREHOUSE: "DISTRIBUTOR_OFFICE",
};

export const childLevel: Record<OrganizationLevelValue, OrganizationLevelValue | null> = {
  COUNTRY_OFFICE: "GROUP_OFFICE",
  GROUP_OFFICE: "DISTRIBUTOR_OFFICE",
  DISTRIBUTOR_OFFICE: "WAREHOUSE",
  WAREHOUSE: null,
};

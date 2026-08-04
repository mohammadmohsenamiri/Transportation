import { RoleCode } from "@/generated/prisma/client";

export { RoleCode };

export const roleLabel: Record<RoleCode, string> = {
  MISSION_PLANNER: "برنامه‌ریز مأموریت",
  STATUS_VIEWER: "بیننده وضعیت",
  ADMIN: "مدیر سامانه",
};

export function isAdmin(roles: readonly RoleCode[]): boolean {
  return roles.includes(RoleCode.ADMIN);
}

export function hasAnyRole(roles: readonly RoleCode[], allowed: readonly RoleCode[]): boolean {
  return roles.some((role) => allowed.includes(role));
}

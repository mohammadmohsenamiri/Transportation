import type { KpiTone } from "@/demo/fixtures";

/** Phase 14 — تایپ‌های سمت کلاینت مدیریت کاربران (بازتاب `UserDTO` سرور). */

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
export type UserRoleCode = "ADMIN" | "MISSION_PLANNER" | "STATUS_VIEWER";

export interface AdminUser {
  id: string;
  username: string;
  displayName: string | null;
  status: UserStatus;
  isActive: boolean;
  suspendedAt: string | null;
  suspensionReason: string | null;
  deletedAt: string | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  roles: UserRoleCode[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface PagedUsers {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export const userStatusLabels: Record<UserStatus, { label: string; tone: KpiTone }> = {
  ACTIVE: { label: "فعال", tone: "success" },
  INACTIVE: { label: "غیرفعال", tone: "info" },
  SUSPENDED: { label: "معلق", tone: "warning" },
  DELETED: { label: "حذف‌شده", tone: "danger" },
};

export const userRoleLabels: Record<UserRoleCode, string> = {
  ADMIN: "مدیر سامانه",
  MISSION_PLANNER: "برنامه‌ریز مأموریت",
  STATUS_VIEWER: "ناظر وضعیت",
};

/** Phase 14 — تایپ‌های سمت کلاینت گزارش تغییرات (بازتاب `AuditEntryDTO` سرور). */

export interface AuditEntry {
  id: string;
  actorUserId: string | null;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  ipAddress: string | null;
  occurredAt: string;
}

export interface PagedAuditEntries {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * برچسب فارسی برای نوع موجودیت‌ها. کلیدهای ناشناخته عیناً نمایش داده می‌شوند تا افزودن یک
 * موجودیت جدید در فاز بعد، سیاهه را خالی نکند.
 */
export const auditEntityLabels: Record<string, string> = {
  User: "کاربر",
  IconAsset: "آیکن",
  SystemSetting: "تنظیم سامانه",
  OrganizationUnit: "واحد سازمانی",
  VehicleType: "نوع خودرو",
  Vehicle: "خودرو",
  CargoType: "نوع بار",
  Shipment: "مرسوله",
  Mission: "مأموریت",
  Route: "مسیر",
  MapProvider: "Provider نقشه",
  Session: "نشست",
};

export function auditEntityLabel(entityType: string): string {
  return auditEntityLabels[entityType] ?? entityType;
}

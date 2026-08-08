/** Phase 14 — تایپ‌های سمت کلاینت کتابخانه آیکن (بازتاب `IconAssetDTO` سرور). */

export type IconCategory = "VEHICLE" | "OFFICE" | "WAREHOUSE" | "DESTINATION" | "OTHER";

export interface IconAsset {
  id: string;
  name: string;
  category: IconCategory;
  mimeType: string;
  sha256: string;
  width: number | null;
  height: number | null;
  fileSize: number;
  originalFilename: string | null;
  isActive: boolean;
  deletedAt: string | null;
  /** همیشه `/api/v1/icons/{id}/content` — هرگز مسیر فایل روی دیسک (SEC-11). */
  contentUrl: string;
  usageCount: number;
  uploadedById: string | null;
  createdAt: string;
  version: number;
}

export interface PagedIcons {
  items: IconAsset[];
  total: number;
  page: number;
  pageSize: number;
}

export const iconCategoryLabels: Record<IconCategory, string> = {
  VEHICLE: "خودرو",
  OFFICE: "دفتر",
  WAREHOUSE: "انبار",
  DESTINATION: "مقصد",
  OTHER: "سایر",
};

export const iconCategoryValues: IconCategory[] = ["VEHICLE", "OFFICE", "WAREHOUSE", "DESTINATION", "OTHER"];

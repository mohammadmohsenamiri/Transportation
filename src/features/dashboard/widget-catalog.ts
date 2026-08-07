import type { IconName } from "@/components/ui/icons";

/**
 * Phase 13 — فهرست ثابت widgetهای فرانمای وضعیت.
 *
 * شناسه‌ها بخشی از قرارداد ماندگار `localStorage` هستند (چیدمان ذخیره‌شده کاربر با همین کلیدها
 * نوشته می‌شود)؛ تغییر یا حذف یک شناسه یعنی شکستن چیدمان ذخیره‌شده همه کاربران. برای افزودن
 * widget جدید فقط به انتهای این فهرست اضافه کنید — `reconcileLayout` آن را به‌طور خودکار به
 * چیدمان‌های ذخیره‌شده قبلی الحاق می‌کند.
 */
export const DASHBOARD_WIDGET_IDS = [
  "missions",
  "fleet",
  "shipments",
  "mission-status",
  "vehicle-types",
  "missions-by-vehicle-type",
  "network",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export interface DashboardWidgetMeta {
  id: DashboardWidgetId;
  title: string;
  /** توضیح کوتاه برای پنل تنظیمات و `aria-describedby` — نه صرفاً تزئین. */
  description: string;
  icon: IconName;
  /** عرض widget در گرید ۱۲ ستونی دسکتاپ بزرگ. */
  span: "full" | "half" | "third";
}

export const DASHBOARD_WIDGETS: Record<DashboardWidgetId, DashboardWidgetMeta> = {
  missions: {
    id: "missions",
    title: "مأموریت‌ها",
    description: "شمارنده مأموریت بر اساس وضعیت محاسبه‌شده در زمان مشاهده",
    icon: "missions",
    span: "full",
  },
  fleet: {
    id: "fleet",
    title: "ناوگان",
    description: "تعداد کل خودروها، آماده به کار و خارج از سرویس",
    icon: "truck",
    span: "half",
  },
  shipments: {
    id: "shipments",
    title: "مرسوله‌ها",
    description: "شمارنده مرسوله بر اساس وضعیت ثبت‌شده",
    icon: "package",
    span: "half",
  },
  "mission-status": {
    id: "mission-status",
    title: "توزیع وضعیت مأموریت",
    description: "سهم هر وضعیت از کل مأموریت‌های بازه انتخاب‌شده",
    icon: "chart-donut",
    span: "half",
  },
  "vehicle-types": {
    id: "vehicle-types",
    title: "توزیع ناوگان بر اساس نوع خودرو",
    description: "تعداد خودروهای هر نوع در کل ناوگان",
    icon: "chart-bar",
    span: "half",
  },
  "missions-by-vehicle-type": {
    id: "missions-by-vehicle-type",
    title: "مأموریت بر اساس نوع خودرو",
    description: "تعداد مأموریت‌های بازه به تفکیک نوع خودروی مأمور",
    icon: "chart-bar",
    span: "half",
  },
  network: {
    id: "network",
    title: "شبکه سازمانی",
    description: "تعداد دفاتر و انبارهای ثبت‌شده در ساختار سازمانی",
    icon: "organization",
    span: "half",
  },
};

export const DEFAULT_WIDGET_ORDER: readonly DashboardWidgetId[] = DASHBOARD_WIDGET_IDS;
